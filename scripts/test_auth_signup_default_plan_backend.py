"""Regression harness for default-plan allocation during backend signup.

The production plan catalogue stores the free plan as ``plan_type='Free'``.  A
case-sensitive lookup for ``'free'`` caused new users to be inserted with
``current_plan_id = NULL``.  This harness imports the FastAPI proxy module,
replaces the database pool and email sender with deterministic fakes, and
invokes the signup endpoint directly to ensure the backend:

- looks up the free plan case-insensitively with title/id fallbacks
- refuses signup if no free plan is configured
- inserts new profiles with ``current_plan_id`` and ``subscription_status``
- includes an idempotent startup migration to backfill existing missing plans
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


class Row(dict):
    """Small dict-like row that mirrors asyncpg row access used by the endpoint."""


@dataclass
class FakeDB:
    existing_profile: Row | None = None
    free_plan: Row | None = field(default_factory=lambda: Row(id=1, title="Free", plan_type="Free"))
    executed: list[tuple[str, tuple[Any, ...]]] = field(default_factory=list)
    emails_sent: list[tuple[str, str, str]] = field(default_factory=list)


class FakeConnection:
    def __init__(self, db: FakeDB):
        self.db = db

    async def fetchrow(self, sql: str, *args):
        compact_sql = " ".join(sql.split())
        if "FROM profiles WHERE email = $1" in compact_sql:
            return self.db.existing_profile
        if "FROM plans" in compact_sql and "LOWER(plan_type) = 'free'" in compact_sql:
            assert "LOWER(title) = 'free'" in compact_sql, "free plan lookup must include title fallback"
            assert "OR id = 1" in compact_sql, "free plan lookup must include id fallback"
            return self.db.free_plan
        raise AssertionError(f"Unhandled SQL in harness: {compact_sql}")

    async def fetchval(self, sql: str, *args):
        compact_sql = " ".join(sql.split())
        if "information_schema.tables" in compact_sql and "marketing_user_attribution" in compact_sql:
            return False
        raise AssertionError(f"Unhandled fetchval SQL in harness: {compact_sql}")

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


def patch_email_sender(db: FakeDB) -> None:
    def fake_send_verification_email(email: str, full_name: str, token: str) -> None:
        db.emails_sent.append((email, full_name, token))

    server.send_verification_email = fake_send_verification_email


async def invoke(body: dict[str, Any]):
    endpoint = server.auth_signup
    while hasattr(endpoint, "__wrapped__"):
        endpoint = endpoint.__wrapped__
    return await endpoint(FakeRequest(body))


async def expect_http_error(name: str, status_code: int, body: dict[str, Any], db: FakeDB):
    server._pool = FakePool(db)
    patch_email_sender(db)
    try:
        await invoke(body)
    except server.HTTPException as exc:
        assert exc.status_code == status_code, f"{name}: expected {status_code}, got {exc.status_code}"
        return exc
    raise AssertionError(f"{name}: expected HTTP {status_code}")


async def main():
    db = FakeDB()
    server._pool = FakePool(db)
    patch_email_sender(db)

    response = await invoke(
        {
            "email": " NewUser@Example.com ",
            "password": "correct horse battery staple",
            "options": {"data": {"name": "New User"}},
        }
    )
    assert response.status_code == 200
    assert len(db.executed) == 2

    insert_sql, insert_args = db.executed[0]
    assert "INSERT INTO profiles" in insert_sql
    assert "current_plan_id, subscription_status" in insert_sql
    assert "VALUES ($1, $2, $3, 'free', $4, FALSE, $5, 'free', NOW(), NOW())" in insert_sql
    assert insert_args[1] == "newuser@example.com"
    assert insert_args[2] == "New User"
    assert insert_args[4] == 1, "signup must insert the production Free plan id"

    token_sql, token_args = db.executed[1]
    assert "INSERT INTO email_verification_tokens" in token_sql
    assert token_args[2] == "newuser@example.com"
    assert len(db.emails_sent) == 1
    assert db.emails_sent[0][0] == "newuser@example.com"

    missing_plan_db = FakeDB(free_plan=None)
    exc = await expect_http_error(
        "missing free plan",
        500,
        {"email": "missing-plan@example.com", "password": "correct horse battery staple"},
        missing_plan_db,
    )
    assert exc.detail["code"] == "free_plan_missing"
    assert missing_plan_db.executed == [], "profile must not be inserted without a default plan"

    server_source = (ROOT / "supabase_proxy" / "server_fastapi.py").read_text(encoding="utf-8")
    assert "Backfill users created before the free-plan lookup was made case-insensitive" in server_source
    assert "WHERE current_plan_id IS NULL" in server_source
    assert "SET current_plan_id = (" in server_source
    assert "subscription_status = COALESCE(subscription_status, 'free')" in server_source

    print("AUTH_SIGNUP_DEFAULT_PLAN_BACKEND_HARNESS_PASS")
    print(f"profile_insert_statements={len(db.executed)} missing_plan_insert_statements={len(missing_plan_db.executed)}")


if __name__ == "__main__":
    asyncio.run(main())
