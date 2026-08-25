"""Regression harness for durable participant-to-facilitator continuation recovery.

This harness drives `_maybe_generate_facilitator_response` through two failures that
previously left the room in `Facilitator reply is preparing` after a participant
message persisted:

1. Optional adaptive technique selection fails before the main model call.
2. An unexpected post-answer error occurs after the idempotency lock is acquired.

Both paths must leave exactly one visible assistant message and one room broadcast.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import SimpleNamespace
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "supabase_proxy"))
os.environ.setdefault("JWT_SECRET", "continuation-recovery-harness-secret")

import server_fastapi as server  # noqa: E402

CONVERSATION_ID = 724
LAST_ASSISTANT_ID = 41


@dataclass
class FakeDB:
    inserted_messages: list[dict[str, Any]] = field(default_factory=list)
    broadcasts: list[tuple[str, dict[str, Any]]] = field(default_factory=list)


class FakeTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeConnection:
    def __init__(self, db: FakeDB):
        self.db = db

    def transaction(self):
        return FakeTransaction()

    async def fetchrow(self, sql: str, *args: Any):
        compact = " ".join(sql.split())
        if "FROM conversations c" in compact and "LEFT JOIN sessions s" in compact:
            return {
                "id": CONVERSATION_ID,
                "is_session_ended": False,
                "participants": 1,
                "conversation_language": "en",
                "participant_description": "Product team",
                "title": "Continuation workshop",
                "objective": "Improve onboarding",
                "prompt": None,
                "scope": None,
                "duration_minutes": 30,
                "gpt_version": None,
                "max_tokens": None,
                "randomness": None,
                "facilitator_id": 9,
                "facilitator_name": "Ada",
                "facilitator_details": "A thoughtful facilitator",
                "profile_picture": None,
                "facilitator_languages": ["English"],
                "tts_avatar_enabled": True,
            }
        if compact.startswith("SELECT id FROM messages WHERE conversation_id"):
            return {"id": LAST_ASSISTANT_ID}
        if "COUNT(DISTINCT COALESCE(participant_id::text" in compact:
            return {"cnt": 1}
        if compact.startswith("SELECT default_ai_model FROM configurations"):
            return None
        if compact.startswith("INSERT INTO messages"):
            content = json.loads(args[1])
            self.db.inserted_messages.append(
                {
                    "conversation_id": args[0],
                    "content": content,
                    "name": args[2],
                    "model_used": args[3] if len(args) > 3 else None,
                }
            )
            return {"id": 903 + len(self.db.inserted_messages)}
        raise AssertionError(f"Unhandled fetchrow SQL: {compact}")

    async def fetch(self, sql: str, *args: Any):
        compact = " ".join(sql.split())
        if compact.startswith("SELECT content, role, name FROM messages"):
            return [
                {"content": {"text": "Welcome"}, "role": "assistant", "name": "Ada"},
                {"content": {"text": "Faster onboarding is our priority."}, "role": "user", "name": "Independent QA"},
            ]
        raise AssertionError(f"Unhandled fetch SQL: {compact}")

    async def execute(self, sql: str, *args: Any):
        compact = " ".join(sql.split())
        if compact.startswith("UPDATE conversations SET total_cost_usd"):
            return "UPDATE 1"
        raise AssertionError(f"Unhandled execute SQL: {compact}")


class FakeAcquire:
    def __init__(self, db: FakeDB):
        self.connection = FakeConnection(db)

    async def __aenter__(self):
        return self.connection

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakePool:
    def __init__(self, db: FakeDB):
        self.db = db

    def acquire(self):
        return FakeAcquire(self.db)


class FakeCompletions:
    def create(self, **_kwargs: Any):
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="A durable facilitator follow-up."))],
            usage=None,
            model="gpt-4.1-mini",
        )


class FakeClient:
    chat = SimpleNamespace(completions=FakeCompletions())


async def run_selector_failure_case() -> None:
    db = FakeDB()
    original_pool = server._pool
    original_selector = server._select_facilitation_technique
    original_client_resolver = server._get_openai_client
    original_broadcast = server.manager.broadcast
    original_locks = dict(server._ai_response_locks)

    async def fail_selector(*_args: Any, **_kwargs: Any):
        raise RuntimeError("selector unavailable")

    async def resolve_client(_model: str):
        return FakeClient()

    async def capture_broadcast(topic: str, event: dict[str, Any]):
        db.broadcasts.append((topic, event))

    try:
        server._pool = FakePool(db)
        server._select_facilitation_technique = fail_selector
        server._get_openai_client = resolve_client
        server.manager.broadcast = capture_broadcast
        server._ai_response_locks.clear()

        await server._maybe_generate_facilitator_response(CONVERSATION_ID)
        await asyncio.sleep(0)

        assert len(db.inserted_messages) == 1
        persisted = db.inserted_messages[0]
        assert persisted["conversation_id"] == CONVERSATION_ID
        assert persisted["name"] == "Ada"
        assert persisted["content"]["text"] == "A durable facilitator follow-up."
        assert "fallback_reason" not in persisted["content"]
        assert len(db.broadcasts) == 1
        assert db.broadcasts[0][0] == str(CONVERSATION_ID)
        assert db.broadcasts[0][1]["payload"]["new"]["role"] == "assistant"
    finally:
        server._pool = original_pool
        server._select_facilitation_technique = original_selector
        server._get_openai_client = original_client_resolver
        server.manager.broadcast = original_broadcast
        server._ai_response_locks.clear()
        server._ai_response_locks.update(original_locks)


async def run_unexpected_error_case() -> None:
    db = FakeDB()
    original_pool = server._pool
    original_selector = server._select_facilitation_technique
    original_setup_context = server._format_session_setup_context
    original_broadcast = server.manager.broadcast
    original_locks = dict(server._ai_response_locks)

    async def safe_selector(*_args: Any, **_kwargs: Any):
        return server._fallback_facilitation_selection(reason="harness selector fallback")

    def explode_setup_context(_value: Any):
        raise RuntimeError("unexpected setup-context failure")

    async def capture_broadcast(topic: str, event: dict[str, Any]):
        db.broadcasts.append((topic, event))

    try:
        server._pool = FakePool(db)
        server._select_facilitation_technique = safe_selector
        server._format_session_setup_context = explode_setup_context
        server.manager.broadcast = capture_broadcast
        server._ai_response_locks.clear()

        await server._maybe_generate_facilitator_response(CONVERSATION_ID)
        await asyncio.sleep(0)

        assert len(db.inserted_messages) == 1
        persisted = db.inserted_messages[0]
        assert persisted["name"] == "Ada"
        assert persisted["content"]["fallback_reason"] == "continuation_recovery"
        assert "What is one concrete example" in persisted["content"]["text"]
        assert len(db.broadcasts) == 1
        assert db.broadcasts[0][1]["payload"]["new"]["content"] == persisted["content"]
    finally:
        server._pool = original_pool
        server._select_facilitation_technique = original_selector
        server._format_session_setup_context = original_setup_context
        server.manager.broadcast = original_broadcast
        server._ai_response_locks.clear()
        server._ai_response_locks.update(original_locks)


async def main() -> None:
    await run_selector_failure_case()
    await run_unexpected_error_case()
    print("FACILITATOR_CONTINUATION_RECOVERY_HARNESS_PASS")
    print("selector_failure=assistant_reply unexpected_error=deterministic_recovery")


if __name__ == "__main__":
    asyncio.run(main())
