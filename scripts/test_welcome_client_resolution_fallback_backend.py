"""Regression harness for the background welcome fallback boundary.

This test drives `_maybe_generate_welcome_message` with the configured AI-client
resolver replaced by a failure sentinel. It verifies that the atomic welcome
claim persists and broadcasts a deterministic assistant opening without invoking
a provider client, and reaches a `fallback_ready` terminal status instead of
remaining `ai_generating`.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "supabase_proxy"))
os.environ.setdefault("JWT_SECRET", "welcome-fallback-harness-secret")

import server_fastapi as server  # noqa: E402

CONVERSATION_ID = 418


@dataclass
class FakeDB:
    inserted_messages: list[dict[str, Any]] = field(default_factory=list)
    status_updates: list[tuple[Any, ...]] = field(default_factory=list)
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
        if compact.startswith("UPDATE conversations SET welcome_message_status = 'ai_generating'"):
            assert args == (CONVERSATION_ID,)
            return {"id": CONVERSATION_ID}
        if "FROM conversations c" in compact and "LEFT JOIN sessions s" in compact:
            assert args == (CONVERSATION_ID,)
            return {
                "id": CONVERSATION_ID,
                "user_id": "host-user",
                "language": "en",
                "participants": 1,
                "participant_description": "Product team",
                "title": "Discovery workshop",
                "objective": "align on the next experiment",
                "welcome_message": None,
                "scope": None,
                "duration_minutes": 45,
                "gpt_version": None,
                "max_tokens": None,
                "randomness": None,
                "prompt": None,
                "facilitator_name": "Ada",
                "facilitator_details": "A thoughtful facilitator",
                "profile_picture": None,
                "facilitator_language": ["English"],
            }
        if compact.startswith("SELECT default_ai_model FROM configurations"):
            return None
        if compact.startswith("INSERT INTO messages"):
            content = json.loads(args[1])
            self.db.inserted_messages.append({"conversation_id": args[0], "content": content, "name": args[2]})
            return {"id": 901}
        raise AssertionError(f"Unhandled fetchrow SQL: {compact}")

    async def execute(self, sql: str, *args: Any):
        compact = " ".join(sql.split())
        if compact.startswith("UPDATE conversations SET welcome_message_status = $1"):
            self.db.status_updates.append(args)
            return "UPDATE 1"
        if compact.startswith("UPDATE conversations SET welcome_message_status = 'pending'"):
            self.db.status_updates.append(("pending", *args))
            return "UPDATE 1"
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


async def main() -> None:
    db = FakeDB()
    original_pool = server._pool
    original_client_resolver = server._get_openai_client
    original_broadcast = server.manager.broadcast

    client_resolution_calls = 0

    async def fail_if_called(_model: str):
        nonlocal client_resolution_calls
        client_resolution_calls += 1
        raise AssertionError("the deterministic welcome must not resolve a provider client")

    async def capture_broadcast(topic: str, event: dict[str, Any]):
        db.broadcasts.append((topic, event))

    try:
        server._pool = FakePool(db)
        server._get_openai_client = fail_if_called
        server.manager.broadcast = capture_broadcast

        await server._maybe_generate_welcome_message(CONVERSATION_ID)
        await asyncio.sleep(0)

        assert client_resolution_calls == 0
        assert len(db.inserted_messages) == 1
        persisted = db.inserted_messages[0]
        assert persisted["conversation_id"] == CONVERSATION_ID
        assert persisted["name"] == "Ada"
        assert "Welcome to \"Discovery workshop\"" in persisted["content"]["text"]
        assert db.status_updates == [("fallback_ready", CONVERSATION_ID)]
        assert len(db.broadcasts) == 1
        topic, event = db.broadcasts[0]
        assert topic == str(CONVERSATION_ID)
        assert event["payload"]["new"]["role"] == "assistant"
        assert event["payload"]["new"]["content"] == persisted["content"]
    finally:
        server._pool = original_pool
        server._get_openai_client = original_client_resolver
        server.manager.broadcast = original_broadcast

    print("WELCOME_DETERMINISTIC_OPENING_HARNESS_PASS")
    print(f"messages={len(db.inserted_messages)} broadcasts={len(db.broadcasts)} status={db.status_updates[0][0]}")


if __name__ == "__main__":
    asyncio.run(main())
