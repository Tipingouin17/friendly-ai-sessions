"""Regression harness for Supabase-compatible TOTP MFA endpoints.

The harness imports the FastAPI proxy module, replaces the database pool with a
small deterministic fake, and invokes the MFA endpoints directly. It verifies
that the former compatibility stubs now provide a real authenticated TOTP flow:

- unauthenticated enrollment is rejected
- enrollment persists an unverified factor and returns an otpauth URI
- challenge validates ownership and records challenge time
- invalid TOTP codes are rejected
- valid TOTP codes mark the factor as verified
- factor listing returns the verified factor
"""

from __future__ import annotations

import asyncio
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "supabase_proxy"))

os.environ.setdefault("JWT_SECRET", "super-secret-jwt-token-for-local-dev")

import server_fastapi as server  # noqa: E402

USER_ID = "11111111-1111-1111-1111-111111111111"
USER_EMAIL = "mfa-user@example.com"


class Factor(dict):
    """Small dict-like row object that mirrors asyncpg row access patterns."""


@dataclass
class FakeDB:
    factors: dict[str, Factor] = field(default_factory=dict)
    executed: list[tuple[str, tuple[Any, ...]]] = field(default_factory=list)


class FakeConnection:
    def __init__(self, db: FakeDB):
        self.db = db

    async def fetch(self, sql: str, *args):
        compact_sql = " ".join(sql.split())
        if "FROM auth_mfa_factors WHERE user_id" in compact_sql:
            user_id = str(args[0])
            return [factor for factor in self.db.factors.values() if factor["user_id"] == user_id]
        raise AssertionError(f"Unhandled SQL fetch in harness: {compact_sql}")

    async def fetchrow(self, sql: str, *args):
        compact_sql = " ".join(sql.split())
        if "SELECT id FROM auth_mfa_factors" in compact_sql:
            factor_id, user_id = str(args[0]), str(args[1])
            factor = self.db.factors.get(factor_id)
            if factor and factor["user_id"] == user_id:
                return Factor(id=factor_id)
            return None
        if "SELECT id, secret FROM auth_mfa_factors" in compact_sql:
            factor_id, user_id = str(args[0]), str(args[1])
            factor = self.db.factors.get(factor_id)
            if factor and factor["user_id"] == user_id:
                return Factor(id=factor_id, secret=factor["secret"])
            return None
        raise AssertionError(f"Unhandled SQL fetchrow in harness: {compact_sql}")

    async def execute(self, sql: str, *args):
        compact_sql = " ".join(sql.split())
        self.db.executed.append((compact_sql, args))
        if "INSERT INTO auth_mfa_factors" in compact_sql:
            factor_id, user_id, secret, friendly_name = map(str, args)
            self.db.factors[factor_id] = Factor(
                id=factor_id,
                user_id=user_id,
                factor_type="totp",
                secret=secret,
                status="unverified",
                friendly_name=friendly_name,
                created_at=datetime.utcnow(),
                verified_at=None,
            )
            return "INSERT 0 1"
        if "SET last_challenged_at" in compact_sql:
            self.db.factors[str(args[0])]["last_challenged_at"] = datetime.utcnow()
            return "UPDATE 1"
        if "SET status = 'verified'" in compact_sql:
            factor = self.db.factors[str(args[0])]
            factor["status"] = "verified"
            factor["verified_at"] = datetime.utcnow()
            return "UPDATE 1"
        raise AssertionError(f"Unhandled SQL execute in harness: {compact_sql}")


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
    def __init__(self, body: dict[str, Any] | None = None, authenticated: bool = True):
        self._body = body or {}
        self.headers = {"content-type": "application/json"}
        if authenticated:
            token = server._make_token(USER_ID, USER_EMAIL)
            self.headers["authorization"] = f"Bearer {token}"

    async def json(self):
        return self._body


async def invoke(endpoint, request: FakeRequest):
    while hasattr(endpoint, "__wrapped__"):
        endpoint = endpoint.__wrapped__
    return await endpoint(request)


async def expect_http_error(name: str, status_code: int, endpoint, request: FakeRequest):
    try:
        await invoke(endpoint, request)
    except server.HTTPException as exc:
        assert exc.status_code == status_code, f"{name}: expected {status_code}, got {exc.status_code}"
        return exc
    raise AssertionError(f"{name}: expected HTTP {status_code}")


async def main():
    db = FakeDB()
    server._pool = FakePool(db)

    await expect_http_error("unauthenticated enrollment", 401, server.auth_mfa_enroll, FakeRequest(authenticated=False))

    enrollment = await invoke(server.auth_mfa_enroll, FakeRequest({"factorType": "totp", "friendlyName": "Primary phone"}))
    factor_id = enrollment["id"]
    secret = enrollment["totp"]["secret"]
    assert factor_id in db.factors
    assert enrollment["status"] == "unverified"
    assert enrollment["totp"]["uri"].startswith("otpauth://totp/AIFacilitator%3A")
    assert enrollment["totp"]["qr_code"] == enrollment["totp"]["uri"]
    assert secret == db.factors[factor_id]["secret"]

    challenge = await invoke(server.auth_mfa_challenge, FakeRequest({"factorId": factor_id}))
    assert challenge["factor_id"] == factor_id
    assert "last_challenged_at" in db.factors[factor_id]

    await expect_http_error(
        "invalid totp",
        400,
        server.auth_mfa_verify,
        FakeRequest({"factorId": factor_id, "code": "000000"}),
    )

    code = server._totp_code(secret)
    verified = await invoke(server.auth_mfa_verify, FakeRequest({"factorId": factor_id, "code": code}))
    assert verified == {"success": True, "factor_id": factor_id}
    assert db.factors[factor_id]["status"] == "verified"
    assert db.factors[factor_id]["verified_at"] is not None

    factors = await invoke(server.auth_mfa_factors, FakeRequest())
    assert factors["phone"] == []
    assert len(factors["totp"]) == 1
    assert factors["totp"][0]["id"] == factor_id
    assert factors["totp"][0]["status"] == "verified"

    print("AUTH_MFA_BACKEND_HARNESS_PASS")
    print(f"factors={len(db.factors)} executed_statements={len(db.executed)}")


if __name__ == "__main__":
    asyncio.run(main())
