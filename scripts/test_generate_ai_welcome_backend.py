"""Validate the generate-ai-welcome edge-function compatibility endpoint.

The harness imports the FastAPI proxy module, replaces the async database pool
and welcome-generation helper with deterministic fakes, and invokes the same
function-dispatch branch used by /functions/v1/*. It avoids live database and
AI-provider dependencies while covering the behavior that replaced the previous
static placeholder response:

- contextual fallback when no conversation id is supplied
- validation of malformed conversation ids
- idempotent reuse of the backend welcome-generation helper
- return of the latest assistant welcome message when available
- contextual fallback when no assistant message was persisted
"""

from __future__ import annotations

import asyncio
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "supabase_proxy"))

os.environ.setdefault("JWT_SECRET", "super-secret-jwt-token-for-local-dev")

import server_fastapi as server  # noqa: E402


CONVERSATION_ID = 77


@dataclass
class FakeDB:
    helper_calls: list[int] = field(default_factory=list)
    assistant_message: dict[str, Any] | None = field(
        default_factory=lambda: {
            "id": 123,
            "content": {"text": "Hello from the generated AI welcome.", "avatar": "/avatar.png"},
            "role": "assistant",
            "name": "Ada",
            "created_at": datetime.now(timezone.utc),
            "title": "Discovery Workshop",
            "objective": "align on the next product milestone",
            "facilitator_name": "Ada",
        }
    )
    conversation_exists: bool = True


class FakeConnection:
    def __init__(self, db: FakeDB):
        self.db = db

    async def fetchval(self, sql: str, *args):
        compact_sql = " ".join(sql.split())
        if "SELECT EXISTS" in compact_sql and "FROM public.conversations c" in compact_sql:
            return args[0] == CONVERSATION_ID
        raise AssertionError(f"Unhandled scalar SQL in harness: {compact_sql}")

    async def fetchrow(self, sql: str, *args):
        compact_sql = " ".join(sql.split())
        if "FROM conversations c" in compact_sql and "LEFT JOIN messages m" in compact_sql:
            conv_id = args[0]
            if conv_id != CONVERSATION_ID or not self.db.conversation_exists:
                return None
            if self.db.assistant_message:
                return self.db.assistant_message
            return {
                "id": None,
                "content": None,
                "role": None,
                "name": None,
                "created_at": None,
                "title": "Discovery Workshop",
                "objective": "align on the next product milestone",
                "facilitator_name": "Ada",
            }
        raise AssertionError(f"Unhandled SQL in harness: {compact_sql}")


class FakeAcquire:
    def __init__(self, db: FakeDB):
        self.conn = FakeConnection(db)

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakePool:
    def __init__(self, db: FakeDB):
        self.db = db

    def acquire(self):
        return FakeAcquire(self.db)


class FakeRequest:
    def __init__(self, body: dict[str, Any], authenticated: bool = True):
        self._body = body
        self.headers = {"content-type": "application/json"}
        if authenticated:
            token = server.jwt.encode(
                {"sub": "host-user", "role": "authenticated", "exp": 4_000_000_000},
                server.JWT_SECRET,
                algorithm="HS256",
            )
            self.headers["authorization"] = f"Bearer {token}"

    async def json(self):
        return self._body


async def invoke(body: dict[str, Any], authenticated: bool = True):
    request = FakeRequest(body, authenticated=authenticated)
    endpoint = server.edge_function
    while hasattr(endpoint, "__wrapped__"):
        endpoint = endpoint.__wrapped__
    return await endpoint("generate-ai-welcome", request)


async def expect_http_error(name: str, status_code: int, body: dict[str, Any], authenticated: bool = True):
    try:
        await invoke(body, authenticated=authenticated)
    except server.HTTPException as exc:
        assert exc.status_code == status_code, f"{name}: expected {status_code}, got {exc.status_code}"
        return
    raise AssertionError(f"{name}: expected HTTP {status_code}")


async def main():
    db = FakeDB()
    server._pool = FakePool(db)

    async def fake_welcome_helper(conv_id: int) -> None:
        db.helper_calls.append(conv_id)

    server._maybe_generate_welcome_message = fake_welcome_helper

    no_conv = await invoke(
        {
            "sessionTitle": "Planning Session",
            "objective": "choose next experiments",
            "facilitatorName": "Ada",
        }
    )
    assert no_conv["success"] is True
    assert no_conv["generated"] is False
    assert no_conv["status"] == "fallback_no_conversation"
    assert "Planning Session" in no_conv["message"]
    assert "choose next experiments" in no_conv["message"]
    assert db.helper_calls == []

    await expect_http_error("invalid conversation id", 400, {"conversationId": "not-an-int"})

    await expect_http_error("welcome generation requires host authentication", 401, {"conversationId": CONVERSATION_ID}, authenticated=False)

    generated = await invoke({"conversationId": CONVERSATION_ID})
    assert generated["success"] is True
    assert generated["generated"] is True
    assert generated["status"] == "ai_ready"
    assert generated["id"] == "123"
    assert generated["message"] == "Hello from the generated AI welcome."
    assert generated["avatar"] == "/avatar.png"
    assert db.helper_calls == [CONVERSATION_ID]

    db.assistant_message = None
    fallback = await invoke({"conversationId": CONVERSATION_ID})
    assert fallback["success"] is True
    assert fallback["generated"] is False
    assert fallback["status"] == "fallback_ready"
    assert "Discovery Workshop" in fallback["message"]
    assert "align on the next product milestone" in fallback["message"]
    assert db.helper_calls == [CONVERSATION_ID, CONVERSATION_ID]

    await expect_http_error("unauthorized conversation", 403, {"conversationId": 999})

    print("GENERATE_AI_WELCOME_HARNESS_PASS")
    print(f"helper_calls={db.helper_calls}")


if __name__ == "__main__":
    asyncio.run(main())
