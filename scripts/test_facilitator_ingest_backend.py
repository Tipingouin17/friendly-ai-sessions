#!/usr/bin/env python3.11
"""Validate facilitator-ingest-stream-event without requiring a live database.

The harness imports the FastAPI proxy module, replaces its async database pool
and realtime manager with deterministic fakes, and invokes the endpoint logic
through the same function-dispatch branch used by /functions/v1/*.

It intentionally avoids logging secrets or stream text content. The assertions
cover the security and persistence behavior needed before a real-session test:

- host JWT authorization
- participant join-token authorization
- missing-auth and invalid-token rejection
- facilitator mismatch rejection
- invalid sequence rejection
- runtime event persistence
- meeting snapshot sequence guard
- avatar-state broadcast path
"""

from __future__ import annotations

import asyncio
import os
import sys
import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import jwt

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "supabase_proxy"))

os.environ.setdefault("JWT_SECRET", "super-secret-jwt-token-for-local-dev")

import server_fastapi as server  # noqa: E402


HOST_ID = "11111111-1111-4111-8111-111111111111"
OTHER_ID = "22222222-2222-4222-8222-222222222222"
JOIN_TOKEN = str(uuid.uuid4())
CONVERSATION_ID = 77
FACILITATOR_ID = 12
PARTICIPANT_ID = 34


@dataclass
class FakeDB:
    events: list[dict[str, Any]] = field(default_factory=list)
    snapshot: dict[str, Any] | None = None
    snapshot_last_sequence: int = -1
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

    async def fetchrow(self, sql: str, *args):
        compact_sql = " ".join(sql.split())

        if "FROM conversations c LEFT JOIN sessions s" in compact_sql:
            conv_id = args[0]
            if conv_id != CONVERSATION_ID:
                return None
            return {
                "id": CONVERSATION_ID,
                "user_id": HOST_ID,
                "sessions_id": 88,
                "is_session_ended": False,
                "facilitator": FACILITATOR_ID,
            }

        if "SELECT role FROM profiles" in compact_sql:
            user_id = str(args[0])
            return {"role": "admin"} if user_id == OTHER_ID else {"role": "user"}

        if 'FROM public."conversations"' in compact_sql and "join_token" in compact_sql:
            conv_id, token = args
            return {"?column?": 1} if conv_id == CONVERSATION_ID and token == JOIN_TOKEN else None

        if "INSERT INTO facilitator_runtime_events" in compact_sql:
            event = {
                "id": len(self.db.events) + 1,
                "conversation_id": args[0],
                "facilitator_id": args[1],
                "participant_id": args[2],
                "event_type": args[3],
                "sequence": args[4],
                "payload": args[5],
                "created_at": datetime.now(timezone.utc),
            }
            self.db.events.append(event)
            return event

        if "INSERT INTO facilitator_meeting_snapshots" in compact_sql:
            conv_id, facilitator_id, snapshot, memory_patch, last_sequence = args
            if last_sequence >= self.db.snapshot_last_sequence:
                self.db.snapshot_last_sequence = last_sequence
                self.db.snapshot = {
                    "id": 1,
                    "conversation_id": conv_id,
                    "facilitator_id": facilitator_id,
                    "snapshot": snapshot,
                    "memory_patch": memory_patch,
                    "last_sequence": last_sequence,
                }
                return {"id": 1, "last_sequence": last_sequence}
            return None

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


class FakeManager:
    def __init__(self, db: FakeDB):
        self.db = db

    async def broadcast(self, conversation_id: str, payload: dict[str, Any]):
        self.db.broadcasts.append((conversation_id, payload))


class FakeRequest:
    def __init__(self, body: dict[str, Any], headers: dict[str, str] | None = None):
        self._body = body
        self.headers = headers or {}

    async def json(self):
        return self._body


def host_headers(user_id: str = HOST_ID, role: str = "user") -> dict[str, str]:
    token = jwt.encode({"sub": user_id, "id": user_id, "role": role}, server.JWT_SECRET, algorithm="HS256")
    return {"content-type": "application/json", "authorization": f"Bearer {token}"}


async def invoke(body: dict[str, Any], headers: dict[str, str] | None = None):
    request = FakeRequest(body, headers={"content-type": "application/json", **(headers or {})})
    endpoint = server.edge_function
    while hasattr(endpoint, "__wrapped__"):
        endpoint = endpoint.__wrapped__
    return await endpoint("facilitator-ingest-stream-event", request)


async def expect_http_error(name: str, status_code: int, body: dict[str, Any], headers: dict[str, str] | None = None):
    try:
        await invoke(body, headers)
    except server.HTTPException as exc:
        assert exc.status_code == status_code, f"{name}: expected {status_code}, got {exc.status_code}"
        return
    raise AssertionError(f"{name}: expected HTTP {status_code}")


async def main():
    db = FakeDB()
    server._pool = FakePool(db)
    server.manager = FakeManager(db)

    base_body = {
        "conversationId": CONVERSATION_ID,
        "facilitatorId": FACILITATOR_ID,
        "participantId": PARTICIPANT_ID,
        "eventType": "stream_chunk_checkpoint",
        "sequence": 10,
        "payload": {"status": "checkpoint", "chunkLength": 42},
        "snapshot": {"lastSequence": 10, "themes": ["alignment"], "participantCount": 2},
        "memoryPatch": {"topics": ["alignment"]},
    }

    host_result = await invoke(base_body, host_headers())
    assert host_result == {"success": True, "eventId": 1, "snapshotUpdated": True, "lastSequence": 10}
    assert db.events[0]["participant_id"] is None
    persisted_payload = json.loads(db.events[0]["payload"])
    assert persisted_payload["participantId"] == PARTICIPANT_ID
    assert persisted_payload["participant_id"] == PARTICIPANT_ID
    assert db.snapshot_last_sequence == 10

    older_snapshot = {**base_body, "sequence": 9, "snapshot": {"lastSequence": 9, "themes": ["older"]}}
    older_result = await invoke(older_snapshot, host_headers())
    assert older_result["success"] is True
    assert older_result["eventId"] == 2
    assert older_result["snapshotUpdated"] is False
    assert older_result["lastSequence"] is None
    assert db.snapshot_last_sequence == 10

    join_result = await invoke(
        {
            "conversationId": CONVERSATION_ID,
            "eventType": "avatar_state_changed",
            "sequence": 11,
            "payload": {"avatarState": "thinking"},
        },
        {"x-join-token": JOIN_TOKEN},
    )
    assert join_result["success"] is True
    assert join_result["eventId"] == 3
    await asyncio.sleep(0)
    assert len(db.broadcasts) == 1
    assert db.broadcasts[0][0] == str(CONVERSATION_ID)
    assert db.broadcasts[0][1]["payload"]["table"] == "facilitator_runtime_events"

    await expect_http_error("missing auth", 401, base_body)
    await expect_http_error("bad join token", 403, base_body, {"x-join-token": str(uuid.uuid4())})
    await expect_http_error("facilitator mismatch", 403, {**base_body, "facilitatorId": 999}, host_headers())
    await expect_http_error("invalid sequence", 400, {**base_body, "sequence": "nope"}, host_headers())

    print("BACKEND_INGEST_HARNESS_PASS")
    print(f"events={len(db.events)} broadcasts={len(db.broadcasts)} snapshot_last_sequence={db.snapshot_last_sequence}")


if __name__ == "__main__":
    asyncio.run(main())
