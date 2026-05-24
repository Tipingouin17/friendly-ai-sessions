"""Regression harness for the /auth/v1/resend verification-email endpoint.

The harness imports the FastAPI proxy module, replaces the database pool and
email sender with deterministic fakes, and invokes the backend endpoint directly.
It verifies the behavior that replaced the previous compatibility stub:

- missing email validation
- unsupported resend type validation
- silent success for unknown accounts
- silent success for already verified accounts
- token invalidation, token creation, and email send for unverified accounts
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

import server_fastapi as server  # noqa: E402


class Profile(dict):
    """Small dict-like profile that mirrors the access patterns used by asyncpg rows."""


@dataclass
class FakeDB:
    profile: Profile | None = None
    executed: list[tuple[str, tuple[Any, ...]]] = field(default_factory=list)
    emails_sent: list[tuple[str, str, str]] = field(default_factory=list)


class FakeConnection:
    def __init__(self, db: FakeDB):
        self.db = db

    async def fetchrow(self, sql: str, *args):
        compact_sql = " ".join(sql.split())
        if "FROM profiles WHERE email = $1" in compact_sql:
            return self.db.profile
        raise AssertionError(f"Unhandled SQL in harness: {compact_sql}")

    async def execute(self, sql: str, *args):
        self.db.executed.append((" ".join(sql.split()), args))
        return "OK"


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

    async def json(self):
        return self._body


async def invoke(body: dict[str, Any]):
    endpoint = server.auth_resend
    while hasattr(endpoint, "__wrapped__"):
        endpoint = endpoint.__wrapped__
    return await endpoint(FakeRequest(body))


async def expect_http_error(name: str, status_code: int, body: dict[str, Any]):
    try:
        await invoke(body)
    except server.HTTPException as exc:
        assert exc.status_code == status_code, f"{name}: expected {status_code}, got {exc.status_code}"
        return
    raise AssertionError(f"{name}: expected HTTP {status_code}")


async def main():
    db = FakeDB()
    server._pool = FakePool(db)

    def fake_send_verification_email(email: str, full_name: str, token: str) -> None:
        db.emails_sent.append((email, full_name, token))

    server.send_verification_email = fake_send_verification_email

    await expect_http_error("missing email", 400, {})
    await expect_http_error("unsupported resend type", 400, {"email": "new@example.com", "type": "recovery"})

    unknown = await invoke({"email": "missing@example.com", "type": "signup"})
    assert unknown["email"] == "missing@example.com"
    assert db.executed == []
    assert db.emails_sent == []

    db.profile = Profile(
        id="11111111-1111-1111-1111-111111111111",
        email="verified@example.com",
        full_name="Verified User",
        email_verified=True,
    )
    verified = await invoke({"email": "verified@example.com"})
    assert verified["email"] == "verified@example.com"
    assert db.executed == []
    assert db.emails_sent == []

    db.profile = Profile(
        id="22222222-2222-2222-2222-222222222222",
        email="pending@example.com",
        full_name="Pending User",
        email_verified=False,
    )
    resent = await invoke({"email": " PENDING@example.com ", "type": "signup"})
    assert resent["email"] == "pending@example.com"
    assert len(db.executed) == 2
    assert "UPDATE email_verification_tokens SET used = TRUE" in db.executed[0][0]
    assert "INSERT INTO email_verification_tokens" in db.executed[1][0]
    assert len(db.emails_sent) == 1
    sent_email, sent_name, sent_token = db.emails_sent[0]
    assert sent_email == "pending@example.com"
    assert sent_name == "Pending User"
    assert sent_token == db.executed[1][1][0]

    print("AUTH_RESEND_BACKEND_HARNESS_PASS")
    print(f"executed_statements={len(db.executed)} emails_sent={len(db.emails_sent)}")


if __name__ == "__main__":
    asyncio.run(main())
