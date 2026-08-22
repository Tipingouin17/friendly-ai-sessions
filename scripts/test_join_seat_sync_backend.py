"""Executable regression harness for atomic participant join seat synchronization."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from starlette.requests import Request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "supabase_proxy"))
os.environ.setdefault("JWT_SECRET", "join-seat-sync-harness-secret")

import server_fastapi as server  # noqa: E402

CONVERSATION_ID = 731
JOIN_TOKEN = "join-seat-sync-token"


@dataclass
class FakeDB:
    events: list[dict[str, Any]] = field(default_factory=list)
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

    async def execute(self, sql: str, *args: Any):
        compact = " ".join(sql.split())
        if compact.startswith("SELECT pg_advisory_xact_lock"):
            assert args == (CONVERSATION_ID,)
            return "SELECT 1"
        if compact.startswith("INSERT INTO public.session_events"):
            self.db.events.append(json.loads(args[1]))
            return "INSERT 0 1"
        raise AssertionError(f"Unhandled execute SQL: {compact}")

    async def fetchrow(self, sql: str, *args: Any):
        compact = " ".join(sql.split())
        assert "AND COALESCE(is_host, FALSE) = FALSE" in compact
        assert "(SELECT participant_capacity FROM decision) AS participant_capacity" in compact
        assert args == (CONVERSATION_ID, "Independent QA", "seed-731", False, False, "device-731", JOIN_TOKEN)
        return {
            "conversation_exists": True,
            "is_session_ended": False,
            "status": "active",
            "access_revoked": False,
            "token_valid": True,
            "is_full": False,
            "participant_capacity": 1,
            "participant_id": 1,
            "is_rejoining": False,
            "current_participants": 1,
        }


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


def build_request() -> Request:
    body = json.dumps({
        "conversation_id": str(CONVERSATION_ID),
        "participant_name": "Independent QA",
        "avatar_seed": "seed-731",
        "is_anonymous": False,
        "is_host": False,
        "device_id": "device-731",
        "join_token": JOIN_TOKEN,
    }).encode()

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    return Request({
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "https",
        "path": "/functions/v1/join-session",
        "raw_path": b"/functions/v1/join-session",
        "query_string": b"",
        "headers": [
            (b"content-type", b"application/json"),
            (b"x-join-token", JOIN_TOKEN.encode()),
            (b"origin", b"https://aifacilitator.ai"),
        ],
        "client": ("127.0.0.1", 0),
        "server": ("testserver", 443),
    }, receive)


async def main() -> None:
    db = FakeDB()
    original_pool = server._pool
    original_broadcast = server.manager.broadcast

    async def capture_broadcast(topic: str, event: dict[str, Any]):
        db.broadcasts.append((topic, event))

    try:
        server._pool = FakePool(db)
        server.manager.broadcast = capture_broadcast
        response = await server.edge_function("join-session", build_request())
        await asyncio.sleep(0)
    finally:
        server._pool = original_pool
        server.manager.broadcast = original_broadcast

    assert response["success"] is True
    assert response["participant_id"] == 1
    assert response["current_participants"] == 1
    assert response["attendee_capacity"] == 1
    assert db.events == [{
        "participant_id": 1,
        "participant_name": "Independent QA",
        "avatar_seed": "seed-731",
        "is_anonymous": False,
        "is_host": False,
        "current_count": 1,
        "attendee_capacity": 1,
        "timestamp": db.events[0]["timestamp"],
    }]
    assert len(db.broadcasts) == 2
    _, participant_event = db.broadcasts[0]
    _, conversation_event = db.broadcasts[1]
    assert participant_event["payload"]["new"]["current_participants"] == 1
    assert conversation_event["payload"]["table"] == "conversations"
    assert conversation_event["payload"]["new"] == {
        "id": CONVERSATION_ID,
        "current_participants": 1,
        "participants": 2,
    }
    print("JOIN_SEAT_SYNC_BACKEND_HARNESS_PASS")
    print("response_count=1 event_count=1 conversation_update_count=1")


if __name__ == "__main__":
    asyncio.run(main())
