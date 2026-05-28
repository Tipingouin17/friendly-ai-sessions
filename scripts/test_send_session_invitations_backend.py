"""Regression harness for the /functions/v1/send-session-invitations endpoint.

The harness imports the FastAPI proxy module, replaces the database pool and
workshop invitation email sender with deterministic fakes, and invokes the edge
function directly. It verifies that scheduled-session invite payloads are
validated, session metadata is loaded, personalized join URLs are generated, and
provider failures surface as explicit delivery failures.
"""

from __future__ import annotations

import asyncio
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "supabase_proxy"))

os.environ.setdefault("JWT_SECRET", "super-secret-jwt-token-for-local-dev")
os.environ.setdefault("SITE_URL", "https://dev.aifacilitator.test")
os.environ.pop("TURNSTILE_SECRET_KEY", None)

import server_fastapi as server  # noqa: E402


@dataclass
class FakeDB:
    emails_sent: list[dict[str, Any]] = field(default_factory=list)
    fail_for: set[str] = field(default_factory=set)


class FakeConnection:
    def __init__(self, db: FakeDB):
        self.db = db

    async def fetchrow(self, sql: str, *args):
        compact_sql = " ".join(sql.split())
        if "FROM conversations c LEFT JOIN sessions s" in compact_sql:
            return {
                "title": "Facilitation UAT Workshop",
                "flow_config": {"scheduled_start_at": "2026-06-01T14:30:00Z"},
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
    def __init__(self, body: dict[str, Any]):
        self._body = body
        self.headers = {"content-type": "application/json"}
        self.client = None
        self.scope = {"type": "http", "path": "/functions/v1/send-session-invitations"}

    async def json(self):
        return self._body


async def invoke(body: dict[str, Any]):
    endpoint = server.edge_function
    while hasattr(endpoint, "__wrapped__"):
        endpoint = endpoint.__wrapped__
    return await endpoint("send-session-invitations", FakeRequest(body))


def invitation_payload(email: str = "contact@aifacilitator.ai") -> dict[str, Any]:
    return {
        "conversation_id": 123,
        "invitees": [
            {
                "id": "123-1",
                "name": "Contact Tester",
                "email": email,
                "token": "abc123token",
                "status": "invited",
            }
        ],
        "subject": "Invitation to your AIfacilitator workshop",
        "body": "Please join the scheduled workshop using your secure link.",
        "cf_turnstile_token": "local-test-token",
    }


async def expect_http_error(name: str, status_code: int, body: dict[str, Any]):
    try:
        await invoke(body)
    except server.HTTPException as exc:
        assert exc.status_code == status_code, f"{name}: expected {status_code}, got {exc.status_code}"
        return exc
    raise AssertionError(f"{name}: expected HTTP {status_code}")


async def main():
    db = FakeDB()
    server._pool = FakePool(db)
    server.EMAIL_ENABLED = True

    def fake_send_workshop_invitation_email(**kwargs):
        db.emails_sent.append(kwargs)
        return kwargs["to_email"] not in db.fail_for

    server.send_workshop_invitation_email = fake_send_workshop_invitation_email

    await expect_http_error("missing invitees", 400, {"conversation_id": 123, "cf_turnstile_token": "x"})
    await expect_http_error("missing turnstile", 400, {"conversation_id": 123, "invitees": [invitation_payload()["invitees"][0]]})

    result = await invoke(invitation_payload())
    assert result == {"success": True, "sent": ["contact@aifacilitator.ai"], "failed": []}
    assert len(db.emails_sent) == 1
    sent = db.emails_sent[0]
    assert sent["to_email"] == "contact@aifacilitator.ai"
    assert sent["invitee_name"] == "Contact Tester"
    assert sent["facilitator_subject"] == "Invitation to your AIfacilitator workshop"
    assert sent["session_title"] == "Facilitation UAT Workshop"
    assert sent["scheduled_time"] == "Monday, June 01, 2026 at 14:30 UTC"
    assert sent["join_url"] == "https://dev.aifacilitator.test/session?id=123&name=Contact%20Tester&token=abc123token"

    db.fail_for.add("fail@example.com")
    error = await expect_http_error("provider failure", 502, invitation_payload("fail@example.com"))
    detail = error.detail
    assert detail["error"] == "Some invitations could not be sent."
    assert detail["failed"][0]["email"] == "fail@example.com"

    print("SEND_SESSION_INVITATIONS_BACKEND_HARNESS_PASS")
    print(f"emails_attempted={len(db.emails_sent)} last_join_url={db.emails_sent[-1]['join_url']}")


if __name__ == "__main__":
    asyncio.run(main())
