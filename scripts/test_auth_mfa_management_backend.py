"""Regression harness for Supabase-compatible MFA factor management endpoints.

The harness imports the FastAPI proxy module, replaces the database pool with a
small deterministic fake, and invokes the management endpoints directly. It
verifies that authenticated users can list their own TOTP factors and unenroll a
factor without requiring a live database or Supabase provider.
"""

from __future__ import annotations

import asyncio
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "supabase_proxy"))

os.environ.setdefault("JWT_SECRET", "super-secret-jwt-token-for-local-dev")

import server_fastapi as server  # noqa: E402

USER_ID = "11111111-1111-1111-1111-111111111111"
OTHER_USER_ID = "22222222-2222-2222-2222-222222222222"
USER_EMAIL = "mfa-management-user@example.com"
VERIFIED_FACTOR_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
UNVERIFIED_FACTOR_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
OTHER_FACTOR_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"


class Factor(dict):
    """Small dict-like row object that mirrors asyncpg row access patterns."""


@dataclass
class FakeDB:
    factors: dict[str, Factor] = field(default_factory=dict)
    fetches: list[tuple[str, tuple[Any, ...]]] = field(default_factory=list)
    fetchrows: list[tuple[str, tuple[Any, ...]]] = field(default_factory=list)


class FakeConnection:
    def __init__(self, db: FakeDB):
        self.db = db

    async def fetch(self, sql: str, *args):
        compact_sql = " ".join(sql.split())
        self.db.fetches.append((compact_sql, args))
        if "FROM auth_mfa_factors WHERE user_id" in compact_sql:
            user_id = str(args[0])
            rows = [factor for factor in self.db.factors.values() if factor["user_id"] == user_id]
            return sorted(rows, key=lambda factor: factor["created_at"], reverse=True)
        raise AssertionError(f"Unhandled SQL fetch in harness: {compact_sql}")

    async def fetchrow(self, sql: str, *args):
        compact_sql = " ".join(sql.split())
        self.db.fetchrows.append((compact_sql, args))
        if "DELETE FROM auth_mfa_factors" in compact_sql:
            factor_id, user_id = str(args[0]), str(args[1])
            factor = self.db.factors.get(factor_id)
            if factor and factor["user_id"] == user_id:
                del self.db.factors[factor_id]
                return Factor(id=factor_id)
            return None
        raise AssertionError(f"Unhandled SQL fetchrow in harness: {compact_sql}")


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
    def __init__(self, authenticated: bool = True):
        self.headers = {"content-type": "application/json"}
        if authenticated:
            token = server._make_token(USER_ID, USER_EMAIL)
            self.headers["authorization"] = f"Bearer {token}"

    async def json(self):
        return {}


async def invoke(endpoint, *args):
    while hasattr(endpoint, "__wrapped__"):
        endpoint = endpoint.__wrapped__
    return await endpoint(*args)


async def expect_http_error(name: str, status_code: int, endpoint, *args):
    try:
        await invoke(endpoint, *args)
    except server.HTTPException as exc:
        assert exc.status_code == status_code, f"{name}: expected {status_code}, got {exc.status_code}"
        return exc
    raise AssertionError(f"{name}: expected HTTP {status_code}")


def seed_db() -> FakeDB:
    now = datetime.utcnow()
    return FakeDB(
        factors={
            VERIFIED_FACTOR_ID: Factor(
                id=VERIFIED_FACTOR_ID,
                user_id=USER_ID,
                factor_type="totp",
                status="verified",
                friendly_name="Primary authenticator",
                created_at=now,
                verified_at=now + timedelta(seconds=30),
            ),
            UNVERIFIED_FACTOR_ID: Factor(
                id=UNVERIFIED_FACTOR_ID,
                user_id=USER_ID,
                factor_type="totp",
                status="unverified",
                friendly_name=None,
                created_at=now - timedelta(minutes=5),
                verified_at=None,
            ),
            OTHER_FACTOR_ID: Factor(
                id=OTHER_FACTOR_ID,
                user_id=OTHER_USER_ID,
                factor_type="totp",
                status="verified",
                friendly_name="Other account",
                created_at=now + timedelta(minutes=5),
                verified_at=now + timedelta(minutes=6),
            ),
        }
    )


async def main():
    db = seed_db()
    server._pool = FakePool(db)

    await expect_http_error("unauthenticated factor list", 401, server.auth_mfa_factors, FakeRequest(authenticated=False))

    factors = await invoke(server.auth_mfa_factors, FakeRequest())
    assert factors["phone"] == []
    assert factors["all"] == factors["totp"]
    assert len(factors["totp"]) == 2
    assert {factor["id"] for factor in factors["totp"]} == {VERIFIED_FACTOR_ID, UNVERIFIED_FACTOR_ID}
    assert OTHER_FACTOR_ID not in {factor["id"] for factor in factors["totp"]}
    verified = next(factor for factor in factors["totp"] if factor["id"] == VERIFIED_FACTOR_ID)
    assert verified["type"] == "totp"
    assert verified["status"] == "verified"
    assert verified["friendly_name"] == "Primary authenticator"
    assert verified["created_at"]
    assert verified["updated_at"]

    missing = await expect_http_error(
        "unenroll missing factor",
        404,
        server.auth_mfa_unenroll,
        OTHER_FACTOR_ID,
        FakeRequest(),
    )
    assert missing.detail["code"] == "factor_not_found"
    assert OTHER_FACTOR_ID in db.factors

    await expect_http_error(
        "unauthenticated unenroll",
        401,
        server.auth_mfa_unenroll,
        VERIFIED_FACTOR_ID,
        FakeRequest(authenticated=False),
    )
    assert VERIFIED_FACTOR_ID in db.factors

    removed = await invoke(server.auth_mfa_unenroll, VERIFIED_FACTOR_ID, FakeRequest())
    assert removed == {"success": True, "factor_id": VERIFIED_FACTOR_ID}
    assert VERIFIED_FACTOR_ID not in db.factors
    assert UNVERIFIED_FACTOR_ID in db.factors
    assert OTHER_FACTOR_ID in db.factors

    factors_after_remove = await invoke(server.auth_mfa_factors, FakeRequest())
    assert factors_after_remove["all"] == factors_after_remove["totp"]
    assert len(factors_after_remove["totp"]) == 1
    assert factors_after_remove["totp"][0]["id"] == UNVERIFIED_FACTOR_ID

    print("AUTH_MFA_MANAGEMENT_BACKEND_HARNESS_PASS")
    print(f"remaining_factors={len(db.factors)} fetches={len(db.fetches)} fetchrows={len(db.fetchrows)}")


if __name__ == "__main__":
    asyncio.run(main())
