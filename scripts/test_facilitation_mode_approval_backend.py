#!/usr/bin/env python3.11
"""Validate facilitation-mode host approval without a live database.

This harness imports the FastAPI proxy module, replaces its async database pool
and realtime manager with deterministic fakes, and invokes the same edge-function
branch used by /functions/v1/facilitator-mode-event.

The assertions cover the backend state-machine behavior required by the handoff
contract:

- host-only lifecycle authorization for recommendations and starts
- pending recommendation persistence
- host approval through the existing mode.started event contract
- no duplicate active-mode row when approving an existing recommendation
- realtime UPDATE broadcast for approval transitions
- rejection of duplicate/non-pending approval attempts
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
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
JOIN_TOKEN = str(uuid.uuid4())
CONVERSATION_ID = 77
MODE_ID = 5
ACTIVE_MODE_ID = 101


def now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class FakeDB:
    active_modes: dict[int, dict[str, Any]] = field(default_factory=dict)
    events: list[dict[str, Any]] = field(default_factory=list)
    broadcasts: list[tuple[str, dict[str, Any]]] = field(default_factory=list)
    next_active_mode_id: int = ACTIVE_MODE_ID

    def mode_row(self) -> dict[str, Any]:
        return {
            "id": MODE_ID,
            "mode_key": "round_robin",
            "display_name": "Round robin",
            "purpose": "Give each participant a turn.",
            "default_timer_seconds": 60,
            "floor_rules": {"turns": "sequential"},
            "privacy_model": "public",
            "composer_component": "RoundRobinComposer",
            "composer_copy": "Share your response when it is your turn.",
            "is_active": True,
        }


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
                "facilitator": 12,
            }

        if "SELECT role FROM profiles" in compact_sql:
            return {"role": "user"}

        if 'FROM public."conversations"' in compact_sql and "join_token" in compact_sql:
            conv_id, token = args
            return {"?column?": 1} if conv_id == CONVERSATION_ID and token == JOIN_TOKEN else None

        if "SELECT * FROM facilitation_modes WHERE id" in compact_sql:
            mode_id = args[0]
            return self.db.mode_row() if mode_id == MODE_ID else None

        if "SELECT * FROM facilitation_modes WHERE mode_key" in compact_sql:
            mode_key = args[0]
            return self.db.mode_row() if mode_key == "round_robin" else None

        if "SELECT m.* FROM session_active_modes sam JOIN facilitation_modes" in compact_sql:
            active_mode_id = args[0]
            active = self.db.active_modes.get(active_mode_id)
            return self.db.mode_row() if active and active["mode_id"] == MODE_ID else None

        if "INSERT INTO session_active_modes" in compact_sql:
            active_id = self.db.next_active_mode_id
            self.db.next_active_mode_id += 1
            row = {
                "id": active_id,
                "conversation_id": args[0],
                "mode_id": args[1],
                "status": args[2],
                "started_at": now() if args[2] == "active" else None,
                "ended_at": None,
                "timer_seconds": args[3],
                "floor_rules": json.loads(args[4]),
                "privacy_model": args[5],
                "composer_component": args[6],
                "composer_copy": args[7],
                "prompt": args[8],
                "state": json.loads(args[9]),
                "started_by": args[10],
                "host_approved_by": args[10] if args[2] == "active" else None,
                "metrics": {},
                "created_at": now(),
                "updated_at": now(),
            }
            self.db.active_modes[active_id] = row
            return row

        if "UPDATE session_active_modes SET status = 'active'" in compact_sql:
            host_user_id, active_mode_id, conv_id = args
            row = self.db.active_modes.get(active_mode_id)
            if not row or row["conversation_id"] != conv_id or row["status"] not in {"recommended", "pending_host_confirmation"}:
                return None
            row.update({
                "status": "active",
                "started_at": row.get("started_at") or now(),
                "host_approved_by": host_user_id,
                "updated_at": now(),
            })
            return row

        if "INSERT INTO session_mode_events" in compact_sql:
            row = {
                "id": len(self.db.events) + 1,
                "conversation_id": args[0],
                "active_mode_id": args[1],
                "mode_id": args[2],
                "participant_id": args[3],
                "event_type": args[4],
                "payload": json.loads(args[5]),
                "reason": args[6],
                "confidence": args[7],
                "requires_confirmation": args[8],
                "trigger_signals": json.loads(args[9]),
                "created_by": args[10],
                "created_at": now(),
            }
            self.db.events.append(row)
            return row

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
    return await endpoint("facilitator-mode-event", request)


async def expect_http_error(name: str, status_code: int, body: dict[str, Any], headers: dict[str, str] | None = None):
    try:
        await invoke(body, headers)
    except server.HTTPException as exc:
        assert exc.status_code == status_code, f"{name}: expected {status_code}, got {exc.status_code}"
        return exc
    raise AssertionError(f"{name}: expected HTTP {status_code}")


async def main():
    db = FakeDB()
    server._pool = FakePool(db)
    server.manager = FakeManager(db)

    recommended = await invoke(
        {
            "conversationId": CONVERSATION_ID,
            "modeId": MODE_ID,
            "eventType": "mode.recommended",
            "requiresConfirmation": True,
            "payload": {"timerSeconds": 90, "prompt": "Take turns on the key risk."},
            "reason": "Detected uneven participation.",
            "confidence": 0.82,
        },
        host_headers(),
    )
    await asyncio.sleep(0)
    assert recommended["success"] is True
    assert recommended["activeMode"]["id"] == ACTIVE_MODE_ID
    assert recommended["activeMode"]["status"] == "pending_host_confirmation"
    assert recommended["event"]["event_type"] == "mode.recommended"
    assert db.active_modes[ACTIVE_MODE_ID]["host_approved_by"] is None
    assert db.broadcasts[-1][1]["payload"]["eventType"] == "INSERT"
    assert db.broadcasts[-1][1]["payload"]["table"] == "session_active_modes"

    await expect_http_error(
        "participant cannot approve lifecycle",
        403,
        {
            "conversationId": CONVERSATION_ID,
            "activeModeId": ACTIVE_MODE_ID,
            "eventType": "mode.started",
        },
        {"x-join-token": JOIN_TOKEN},
    )

    approved = await invoke(
        {
            "conversationId": CONVERSATION_ID,
            "activeModeId": ACTIVE_MODE_ID,
            "eventType": "mode.started",
            "reason": "Host approved the recommended facilitation mode.",
        },
        host_headers(),
    )
    await asyncio.sleep(0)
    assert approved["success"] is True
    assert approved["activeMode"]["id"] == ACTIVE_MODE_ID
    assert approved["activeMode"]["status"] == "active"
    assert approved["event"]["event_type"] == "mode.started"
    assert approved["event"]["active_mode_id"] == ACTIVE_MODE_ID
    assert db.active_modes[ACTIVE_MODE_ID]["host_approved_by"] == HOST_ID
    assert len(db.active_modes) == 1, "approval must update the pending row instead of inserting a duplicate"
    assert db.broadcasts[-1][1]["payload"]["eventType"] == "UPDATE"
    assert db.broadcasts[-1][1]["payload"]["new"]["status"] == "active"

    await expect_http_error(
        "duplicate approval is rejected",
        400,
        {
            "conversationId": CONVERSATION_ID,
            "activeModeId": ACTIVE_MODE_ID,
            "eventType": "mode.started",
        },
        host_headers(),
    )

    print("MODE_APPROVAL_HARNESS_PASS")
    print(f"active_modes={len(db.active_modes)} events={len(db.events)} broadcasts={len(db.broadcasts)}")


if __name__ == "__main__":
    asyncio.run(main())
