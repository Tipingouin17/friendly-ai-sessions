"""Focused regression harness for explicit recorded-response transcription.

The endpoint must reject unauthorized, malformed, unsupported, and oversized
recordings before any provider call.  A successful transcription is returned as
editable text only and must not touch the database or persist audio/transcript
content.  This harness calls the endpoint directly with fake request/auth and a
mocked network client; it never records audio and never contacts an external
service.
"""

from __future__ import annotations

import asyncio
import base64
import os
import sys
from pathlib import Path
from typing import Any
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "supabase_proxy"))
os.environ.setdefault("JWT_SECRET", "recorded-response-transcription-harness-secret")

import httpx  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from starlette.requests import Request  # noqa: E402
import server_fastapi as server  # noqa: E402


class NoDatabasePool:
    """Raises on access: transcription must not use the database after auth."""

    def acquire(self) -> Any:
        raise AssertionError("transcription endpoint must not acquire a database connection after authorization")


def make_request(content_length: int | None = None) -> Request:
    headers: list[tuple[bytes, bytes]] = []
    if content_length is not None:
        headers.append((b"content-length", str(content_length).encode("ascii")))
    return Request({
        "type": "http",
        "method": "POST",
        "scheme": "https",
        "path": "/api/stt/transcribe",
        "raw_path": b"/api/stt/transcribe",
        "query_string": b"conversation_id=77",
        "headers": headers,
        "client": ("127.0.0.1", 4567),
        "server": ("testserver", 443),
    })


def payload(*, audio: bytes = b"short sample", mime_type: str = "audio/webm", duration_ms: int = 1_000) -> Any:
    return server.RecordedResponseTranscriptionRequest(
        conversation_id=77,
        audio_base64=base64.b64encode(audio).decode("ascii"),
        mime_type=mime_type,
        duration_ms=duration_ms,
        language="en-US",
    )


class FakeResponse:
    status_code = 200

    @staticmethod
    def json() -> dict[str, str]:
        return {"text": "Editable participant response"}


class FakeAsyncClient:
    post_calls: list[dict[str, Any]] = []

    def __init__(self, *, timeout: Any) -> None:
        self.timeout = timeout

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, _exc_type: Any, _exc: Any, _tb: Any) -> None:
        return None

    async def post(self, url: str, **kwargs: Any) -> FakeResponse:
        self.post_calls.append({"url": url, **kwargs})
        return FakeResponse()


class TimeoutAsyncClient(FakeAsyncClient):
    async def post(self, url: str, **kwargs: Any) -> FakeResponse:
        self.post_calls.append({"url": url, **kwargs})
        raise httpx.TimeoutException("synthetic timeout")


async def authorized(_request: Request, conversation_id: int) -> None:
    assert conversation_id == 77


async def denied(_request: Request, _conversation_id: int) -> None:
    raise HTTPException(status_code=403, detail="Session access is required")


async def assert_http_exception(coro: Any, status_code: int, code: str | None = None) -> None:
    try:
        await coro
    except HTTPException as exc:
        assert exc.status_code == status_code
        if code is not None:
            assert isinstance(exc.detail, dict)
            assert exc.detail["code"] == code
    else:
        expected = f" with code {code}" if code else ""
        raise AssertionError(f"expected HTTP {status_code}{expected}")


async def main() -> None:
    original_pool = server._pool
    original_stt_key = os.environ.get("PHASE3_STT_API_KEY")
    original_tts_key = os.environ.get("PHASE3_TTS_API_KEY")
    server._pool = NoDatabasePool()
    os.environ["PHASE3_STT_API_KEY"] = "harness-only-key"
    os.environ.pop("PHASE3_TTS_API_KEY", None)
    try:
        # Unauthorized callers never reach validation or provider transport.
        FakeAsyncClient.post_calls = []
        with patch.object(server, "_require_conversation_access", denied), patch("httpx.AsyncClient", FakeAsyncClient):
            await assert_http_exception(
                server.api_transcribe_recorded_response(make_request(), payload()),
                403,
            )
        assert not FakeAsyncClient.post_calls

        # Invalid input is rejected before any remote call and cannot become data-at-rest.
        FakeAsyncClient.post_calls = []
        invalid_base64 = server.RecordedResponseTranscriptionRequest(
            conversation_id=77,
            audio_base64="not base64!",
            mime_type="audio/webm",
            duration_ms=1_000,
        )
        with patch.object(server, "_require_conversation_access", authorized), patch("httpx.AsyncClient", FakeAsyncClient):
            await assert_http_exception(
                server.api_transcribe_recorded_response(make_request(), invalid_base64),
                400,
                "invalid_recording_data",
            )
            await assert_http_exception(
                server.api_transcribe_recorded_response(make_request(), payload(mime_type="video/mp4")),
                415,
                "unsupported_recording_format",
            )
            await assert_http_exception(
                server.api_transcribe_recorded_response(make_request(), payload(duration_ms=999)),
                400,
                "invalid_recording_duration",
            )
            oversized = payload(audio=b"x" * (server._STT_MAX_AUDIO_BYTES + 1))
            await assert_http_exception(
                server.api_transcribe_recorded_response(make_request(), oversized),
                413,
                "recording_too_large",
            )
        assert not FakeAsyncClient.post_calls

        # Success only returns editable text. It posts one in-memory multipart part
        # to the configured endpoint and does not use the database pool.
        FakeAsyncClient.post_calls = []
        with patch.object(server, "_require_conversation_access", authorized), patch("httpx.AsyncClient", FakeAsyncClient):
            result = await server.api_transcribe_recorded_response(make_request(), payload())
        assert result == {"text": "Editable participant response"}
        assert len(FakeAsyncClient.post_calls) == 1
        provider_call = FakeAsyncClient.post_calls[0]
        assert provider_call["url"] == "https://api.elevenlabs.io/v1/speech-to-text"
        assert provider_call["data"]["model_id"] == "scribe_v2"
        assert provider_call["data"]["language_code"] == "en"
        filename, audio_bytes, mime_type = provider_call["files"]["file"]
        assert filename == "response.webm"
        assert audio_bytes == b"short sample"
        assert mime_type == "audio/webm"

        # Remote transport timeouts expose a provider-neutral, typed retry result.
        TimeoutAsyncClient.post_calls = []
        with patch.object(server, "_require_conversation_access", authorized), patch("httpx.AsyncClient", TimeoutAsyncClient):
            await assert_http_exception(
                server.api_transcribe_recorded_response(make_request(), payload()),
                504,
                "transcription_timed_out",
            )
        assert len(TimeoutAsyncClient.post_calls) == 1
    finally:
        server._pool = original_pool
        if original_stt_key is None:
            os.environ.pop("PHASE3_STT_API_KEY", None)
        else:
            os.environ["PHASE3_STT_API_KEY"] = original_stt_key
        if original_tts_key is None:
            os.environ.pop("PHASE3_TTS_API_KEY", None)
        else:
            os.environ["PHASE3_TTS_API_KEY"] = original_tts_key

    print("RECORDED_RESPONSE_TRANSCRIPTION_BACKEND_PASS")
    print("auth=required validation=pre_provider success=editable_text persistence=none timeout=normalized")


if __name__ == "__main__":
    asyncio.run(main())
