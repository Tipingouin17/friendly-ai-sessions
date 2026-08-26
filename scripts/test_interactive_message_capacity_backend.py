"""Regression harness for participant message pool-capacity boundaries.

A tokenized REST message request already owns one asyncpg connection.  It must
validate the join token with that connection rather than trying to acquire a
second pool slot, otherwise enough concurrent requests can self-starve the
finite pool.  Participant message acquisition must also release cleanly on
success and expose a structured retryable busy response under pressure.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "supabase_proxy"))
os.environ.setdefault("JWT_SECRET", "interactive-message-capacity-harness-secret")

import server_fastapi as server  # noqa: E402


class FakeConnection:
    def __init__(self) -> None:
        self.queries: list[tuple[str, tuple[Any, ...]]] = []

    async def fetchrow(self, sql: str, *args: Any):
        self.queries.append((" ".join(sql.split()), args))
        return {"authorized": True}


class HealthyPool:
    def __init__(self) -> None:
        self.connection = FakeConnection()
        self.acquire_calls = 0
        self.release_calls = 0

    async def acquire(self) -> FakeConnection:
        self.acquire_calls += 1
        return self.connection

    async def release(self, connection: FakeConnection) -> None:
        assert connection is self.connection
        self.release_calls += 1

    def get_size(self) -> int:
        return 1

    def get_idle_size(self) -> int:
        return 0

    def get_max_size(self) -> int:
        return 10


class BusyPool:
    async def acquire(self):
        await asyncio.Event().wait()

    async def release(self, _connection: Any) -> None:
        raise AssertionError("a busy pool never yields a connection")

    def get_size(self) -> int:
        return 10

    def get_idle_size(self) -> int:
        return 0

    def get_max_size(self) -> int:
        return 10


async def run_reused_connection_case() -> None:
    pool = HealthyPool()
    original_pool = server._pool
    try:
        server._pool = pool
        # Passing the request-owned connection must not call pool.acquire().
        authorized = await server._validate_join_token(
            "00000000-0000-0000-0000-000000000001",
            77,
            pool.connection,
        )
        assert authorized is True
        assert pool.acquire_calls == 0
        assert len(pool.connection.queries) == 1

        async with server._acquire_interactive_message_connection("harness participant write") as connection:
            assert connection is pool.connection
        assert pool.acquire_calls == 1
        assert pool.release_calls == 1
    finally:
        server._pool = original_pool


async def run_busy_message_case() -> None:
    original_pool = server._pool
    try:
        server._pool = BusyPool()
        try:
            async with server._acquire_pool_connection(
                "harness busy participant write",
                timeout_seconds=0.01,
                unavailable_code="message_service_unavailable",
                busy_code="message_service_busy",
                unavailable_message="unavailable",
                busy_message="busy",
                logger=server.log_db,
            ):
                raise AssertionError("busy pool should not yield a connection")
        except server.HTTPException as exc:
            assert exc.status_code == 503
            assert isinstance(exc.detail, dict)
            assert exc.detail["code"] == "message_service_busy"
            assert exc.detail["message"] == "busy"
        else:
            raise AssertionError("busy pool should produce a structured HTTPException")
    finally:
        server._pool = original_pool


async def main() -> None:
    await run_reused_connection_case()
    await run_busy_message_case()
    print("INTERACTIVE_MESSAGE_CAPACITY_HARNESS_PASS")
    print("join_token=request_connection message_acquisition=release busy_response=structured_503")


if __name__ == "__main__":
    asyncio.run(main())
