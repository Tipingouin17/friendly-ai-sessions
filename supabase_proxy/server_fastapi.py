"""
FastAPI-based Supabase-compatible proxy server.
Replaces the Flask server with full async support and native WebSocket realtime.
Emulates PostgREST, GoTrue Auth, Edge Functions, Storage, and Realtime WebSocket.
"""
from __future__ import annotations

import os
import re
import json
import uuid
import time
import hashlib
import traceback
import asyncio
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

import jwt
import psycopg2
import psycopg2.extras
import stripe as stripe_lib
from fastapi import (
    FastAPI, Request, Response, WebSocket, WebSocketDisconnect,
    HTTPException, Depends, Header, Path, Query
)
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ============================================================
# OpenAI client
# ============================================================
openai_client = OpenAI()

# ============================================================
# App & rate limiter
# ============================================================
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="MyFacilitator Proxy", version="3.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ============================================================
# CORS
# ============================================================
_cors_env = os.environ.get("ALLOWED_ORIGINS", "")
ALLOWED_CORS_ORIGINS = (
    [o.strip() for o in _cors_env.split(",") if o.strip()]
    if _cors_env
    else [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "https://friendly-ai-sessions.vercel.app",
        "https://aifacilitator.vercel.app",
    ]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=[
        "authorization", "x-client-info", "apikey", "content-type", "prefer",
        "range", "x-supabase-api-version", "x-upsert", "x-profile-id",
        "cache-control", "pragma", "content-profile", "accept-profile",
        "accept", "origin", "x-forwarded-for", "x-request-id", "x-real-ip",
        "baggage", "sentry-trace",
        # Participant session token — used instead of JWT for unauthenticated participants
        "x-join-token", "x-migration-secret",
    ],
    expose_headers=["Content-Range", "X-Total-Count", "X-Request-Id"],
)

# ============================================================
# Database configuration
# ============================================================
DB_URL = os.environ.get("DATABASE_URL")
DB_NAME = os.environ.get("PGDATABASE") or os.environ.get("DB_NAME", "ai_facilitator")
DB_USER = os.environ.get("PGUSER") or os.environ.get("DB_USER", "postgres")
DB_HOST = os.environ.get("PGHOST") or os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("PGPORT") or os.environ.get("DB_PORT", "5432"))
DB_PASSWORD = os.environ.get("PGPASSWORD") or os.environ.get("DB_PASSWORD", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-jwt-token-for-local-dev")
STORAGE_DIR = os.environ.get("STORAGE_DIR", "/app/storage")

# ============================================================
# Stripe configuration
# ============================================================
_stripe_env = os.environ.get("STRIPE_ENV", "test").lower()
if _stripe_env == "live":
    stripe_lib.api_key = os.environ.get("STRIPE_SECRET_KEY_LIVE", "")
    STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET_LIVE", "")
else:
    stripe_lib.api_key = os.environ.get("STRIPE_SECRET_KEY_TEST", "")
    STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET_TEST", "")
STRIPE_CONFIGURED = bool(stripe_lib.api_key)

# ============================================================
# AI model mapping
# ============================================================
GPT_MODEL_MAP = {
    "gpt-4": "gpt-4.1-mini",
    "gpt-4o": "gpt-4.1-mini",
    "gpt-4-turbo": "gpt-4.1-mini",
    "gpt-3.5-turbo": "gpt-4.1-nano",
    "gpt-3.5": "gpt-4.1-nano",
}
DEFAULT_AI_MODEL = "gpt-4.1-mini"

# ============================================================
# In-memory user store (pre-registered users)
# ============================================================
USERS: Dict[str, Dict] = {}
SESSIONS_AUTH: Dict[str, Dict] = {}

USERS["admin@myfacilitator.com"] = {
    "id": "4c34d445-307a-4bf6-810e-1e06325cd2fc",
    "email": "admin@myfacilitator.com",
    "password": hashlib.sha256("admin123".encode()).hexdigest(),
    "created_at": "2025-02-28T03:15:56Z",
    "email_confirmed_at": "2025-02-28T03:15:56Z",
}
USERS["test@myfacilitator.com"] = {
    "id": "5efc6527-0252-4494-97ba-4649e6dc1059",
    "email": "test@myfacilitator.com",
    "password": hashlib.sha256("test123".encode()).hexdigest(),
    "created_at": "2025-02-28T03:15:56Z",
    "email_confirmed_at": "2025-02-28T03:15:56Z",
}

# ============================================================
# Idempotency lock for AI responses (prevents duplicate inserts)
# ============================================================
_ai_response_locks: Dict[str, float] = {}

# ============================================================
# Allowed RPC functions (security whitelist)
# ============================================================
ALLOWED_RPC_FUNCTIONS = {
    "is_session_host", "is_system_admin", "get_user_plan_limits",
    "get_session_stats", "increment_session_count",
}

# ============================================================
# Database helpers
# ============================================================
def get_db() -> psycopg2.extensions.connection:
    """Open a synchronous psycopg2 connection."""
    if DB_URL:
        conn = psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    else:
        conn = psycopg2.connect(
            dbname=DB_NAME, user=DB_USER, host=DB_HOST,
            port=DB_PORT, password=DB_PASSWORD,
            cursor_factory=psycopg2.extras.RealDictCursor,
        )
    conn.autocommit = False
    return conn


def run_startup_migrations() -> None:
    """Apply idempotent schema migrations on every server start."""
    migrations = [
        # 2026-04-02: Add join_token to conversations for secure participant URLs
        """
        ALTER TABLE conversations
            ADD COLUMN IF NOT EXISTS join_token UUID NOT NULL DEFAULT gen_random_uuid();
        """,
        # 2026-04-03: Add user_id to sessions so custom workshops are user-specific
        """
        ALTER TABLE sessions
            ADD COLUMN IF NOT EXISTS user_id UUID;
        """,
        # 2026-04-03: Persist credentials to DB so logins survive container restarts.
        # password_hash stores SHA-256 of the user's password.
        # email_verified tracks whether the user has confirmed their email address.
        """
        ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS password_hash TEXT,
            ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
        """,
        # 2026-04-04: Add email column to profiles so credentials can be looked up
        # by email on container restart (load_users_from_db relies on this).
        """
        ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS email TEXT;
        """,
        # 2026-04-04: Add full_name column to profiles if missing from older DBs.
        """
        ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS full_name TEXT;
        """,
        # 2026-04-04: Add language column to conversations so the host's chosen
        # language (ISO 639-1 code, e.g. 'fr', 'es', 'de') is persisted and used
        # by the AI facilitator to respond in the correct language.
        # Also add participant_description in case it was missing from older DBs.
        """
        ALTER TABLE conversations
            ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
            ADD COLUMN IF NOT EXISTS participant_description TEXT;
        """,
    ]
    try:
        conn = get_db()
        conn.autocommit = True
        cur = conn.cursor()
        for sql in migrations:
            try:
                cur.execute(sql)
                print(f"[migration] OK: {sql.strip()[:80]}")
            except Exception as mig_err:
                print(f"[migration] WARN: {mig_err}")
        conn.close()
        print("[migration] Startup migrations complete.")
    except Exception as e:
        print(f"[migration] ERROR running startup migrations: {e}")


def load_users_from_db() -> None:
    """Populate the in-memory USERS dict from the profiles table on startup.

    This ensures that users who registered before the current process started
    (e.g., after a container restart) can still log in.  Only rows that have
    a password_hash stored are loaded; legacy rows without a hash are skipped.
    """
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, email, password_hash, created_at FROM profiles "
            "WHERE password_hash IS NOT NULL"
        )
        rows = cur.fetchall()
        conn.close()
        for row in rows:
            email = row["email"]
            if email not in USERS:
                USERS[email] = {
                    "id": str(row["id"]),
                    "email": email,
                    "password": row["password_hash"],
                    "created_at": (
                        row["created_at"].isoformat()
                        if isinstance(row["created_at"], datetime)
                        else str(row["created_at"])
                    ),
                    "email_confirmed_at": datetime.utcnow().isoformat(),
                }
        print(f"[auth] Loaded {len(rows)} user(s) from DB into memory.")
    except Exception as e:
        print(f"[auth] WARNING: Could not load users from DB: {e}")


# Run migrations immediately on import (before any request is served)
try:
    run_startup_migrations()
except Exception:
    pass

# Populate in-memory user store from DB (so logins survive container restarts)
try:
    load_users_from_db()
except Exception:
    pass


def serialize_row(row: dict) -> dict:
    """Convert psycopg2 row to JSON-serialisable dict."""
    result = {}
    for k, v in row.items():
        if isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, Decimal):
            result[k] = float(v)
        elif isinstance(v, (bytes, bytearray)):
            result[k] = v.decode("utf-8", errors="replace")
        else:
            result[k] = v
    return result


# ============================================================
# Auth helpers
# ============================================================
def _make_token(user_id: str, email: str, role: str = "authenticated") -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iss": "supabase",
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400 * 30,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def _make_user_response(user: dict, token: str) -> dict:
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 86400 * 30,
        "refresh_token": str(uuid.uuid4()),
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": "authenticated",
            "email_confirmed_at": user.get("email_confirmed_at", datetime.utcnow().isoformat()),
            "created_at": user.get("created_at", datetime.utcnow().isoformat()),
            "updated_at": datetime.utcnow().isoformat(),
            "app_metadata": {"provider": "email"},
            "user_metadata": {},
            "aud": "authenticated",
        },
    }


def get_current_user(request: Request) -> Optional[dict]:
    """Decode JWT from Authorization header. Returns None if missing/invalid."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None


# ============================================================
# PostgREST query helpers
# ============================================================
FK_MAP: Dict[str, tuple] = {
    # constraint_name: (table, fk_col, foreign_table, foreign_col)
    "conversations_sessions_id_fkey": ("conversations", "sessions_id", "sessions", "id"),
    "conversations_user_id_fkey": ("conversations", "user_id", "profiles", "id"),
    "sessions_facilitator_fkey": ("sessions", "facilitator", "facilitators", "id"),
    "sessions_user_id_fkey": ("sessions", "user_id", "profiles", "id"),
    "messages_conversation_id_fkey": ("messages", "conversation_id", "conversations", "id"),
    "session_participants_conversation_id_fkey": ("session_participants", "conversation_id", "conversations", "id"),
    "session_events_conversation_id_fkey": ("session_events", "conversation_id", "conversations", "id"),
    "session_reports_conversation_id_fkey": ("session_reports", "conversation_id", "conversations", "id"),
    "profiles_current_plan_id_fkey": ("profiles", "current_plan_id", "plans", "id"),
    "facilitators_user_id_fkey": ("facilitators", "user_id", "profiles", "id"),
    "plan_restrictions_plan_id_fkey": ("plan_restrictions", "plan_id", "plans", "id"),
}

TABLE_PK: Dict[str, str] = {
    "conversations": "id", "sessions": "id", "messages": "id",
    "profiles": "id", "facilitators": "id", "plans": "id",
    "session_participants": "id", "session_events": "id",
    "session_reports": "id", "faqs": "id",
    "plan_restrictions": "id",
}


def _split_top_level(s: str, sep: str = ",") -> List[str]:
    """Split string on sep only at depth 0 (not inside parentheses)."""
    parts, depth, current = [], 0, []
    for ch in s:
        if ch == '(':
            depth += 1
            current.append(ch)
        elif ch == ')':
            depth -= 1
            current.append(ch)
        elif ch == sep and depth == 0:
            parts.append(''.join(current).strip())
            current = []
        else:
            current.append(ch)
    if current:
        parts.append(''.join(current).strip())
    return [p for p in parts if p]


def _parse_select(select_str: str):
    """Parse PostgREST select param into (columns, joins).
    Handles: simple cols, alias:col, table(cols), table!fkey(cols), alias:table!fkey(cols).
    """
    if not select_str or select_str == "*":
        return ["*"], []
    # Normalize whitespace (template literals may have newlines/spaces)
    select_str = re.sub(r'\s+', ' ', select_str).strip()
    # Remove spaces around parentheses (e.g. 'table ( col )' -> 'table(col)')
    select_str = re.sub(r'\s*\(\s*', '(', select_str)
    select_str = re.sub(r'\s*\)\s*', ')', select_str)
    cols, joins = [], []
    for part in _split_top_level(select_str):
        if "(" in part:
            joins.append(part)
        else:
            cols.append(part.split(":")[0].strip())
    return cols or ["*"], joins


def _parse_join(join_str: str):
    """Parse a single join expression.
    Handles:
      - sessions(col1,col2)
      - sessions!fkey(col1,col2)
      - alias:sessions!fkey(col1,col2)
      - facilitator_details:facilitators!sessions_facilitator_fkey(col1,col2)
    """
    join_str = join_str.strip()
    # Pattern: [alias:]table[!constraint](cols)
    m = re.match(r'^(?:(\w+):)?([\w]+)(?:![\w]+)?\((.+)\)$', join_str, re.DOTALL)
    if not m:
        return None
    alias, table, cols_str = m.group(1), m.group(2), m.group(3)
    sub_cols, sub_joins = [], []
    for part in _split_top_level(cols_str):
        if "(" in part:
            sub_joins.append(part)
        else:
            sub_cols.append(part.split(":")[0].strip())
    return {
        "table": table,
        "alias": alias or table,
        "columns": sub_cols,
        "sub_joins": sub_joins,
        "constraint": None,
    }


def resolve_join(parent_table: str, join_spec, parent_rows: list, conn):
    """Resolve a single foreign-key join and attach results to parent_rows."""
    if isinstance(join_spec, str):
        join_spec = _parse_join(join_spec)
    if not join_spec:
        return
    join_table = join_spec["table"]
    key_name = join_spec.get("alias") or join_table
    base_cols = join_spec.get("columns") or ["*"]
    sub_joins = join_spec.get("sub_joins") or []

    # Determine join direction from FK_MAP
    direction = None
    fk_col = parent_col = None
    for constraint, (tbl, fc, ftbl, fpc) in FK_MAP.items():
        if tbl == parent_table and ftbl == join_table:
            direction, fk_col, parent_col = "child_to_parent", fc, fpc
            break
        if tbl == join_table and ftbl == parent_table:
            direction, fk_col, parent_col = "parent_to_child", fc, fpc
            break

    if not direction:
        for row in parent_rows:
            row[key_name] = None
        return

    extra_join_cols: list = []
    for sj in sub_joins:
        sj_parsed = _parse_join(sj) if isinstance(sj, str) else sj
        if sj_parsed:
            sjt = sj_parsed["table"]
            sjc = sj_parsed.get("constraint")
            if sjc and sjc in FK_MAP:
                sj_tbl, sj_col, sj_ftbl, sj_fcol = FK_MAP[sjc]
                if sj_tbl == join_table and sj_ftbl == sjt and sj_col not in base_cols and sj_col not in extra_join_cols:
                    extra_join_cols.append(sj_col)
                elif sj_tbl == sjt and sj_ftbl == join_table and sj_fcol not in base_cols and sj_fcol not in extra_join_cols:
                    extra_join_cols.append(sj_fcol)

    all_sub_cols = base_cols + extra_join_cols
    col_str = ", ".join([f'"{{c}}"' if c != "*" else c for c in all_sub_cols]) if all_sub_cols else "*"
    cur = conn.cursor()

    if direction == "child_to_parent":
        fk_values = list(set(r.get(fk_col) for r in parent_rows if r.get(fk_col) is not None))
        if not fk_values:
            for r in parent_rows:
                r[key_name] = None
            return
        ph = ",".join(["%s"] * len(fk_values))
        # Always include parent_col (the PK of the joined table) so we can build jmap.
        # If base_cols is ['*'] it is already included; otherwise add it explicitly.
        needs_pk = base_cols != ["*"] and parent_col not in base_cols and parent_col not in extra_join_cols
        select_str = col_str if not needs_pk else f'"{parent_col}", {col_str}'
        cur.execute(f'SELECT {select_str} FROM public."{join_table}" WHERE "{parent_col}" IN ({ph})', fk_values)
        jrows = [serialize_row(dict(r)) for r in cur.fetchall()]
        for sj in sub_joins:
            resolve_join(join_table, sj, jrows, conn)
        jmap = {jr.get(parent_col): jr for jr in jrows}
        for row in parent_rows:
            matched = jmap.get(row.get(fk_col))
            if matched:
                # Strip the injected PK col if it wasn't originally requested
                strip_cols = extra_join_cols + ([parent_col] if needs_pk else [])
                if strip_cols:
                    matched = {k: v for k, v in matched.items() if k not in strip_cols}
            row[key_name] = matched

    elif direction == "parent_to_child":
        pids = list(set(r.get(parent_col) for r in parent_rows if r.get(parent_col) is not None))
        if not pids:
            for r in parent_rows:
                r[key_name] = []
            return
        ph = ",".join(["%s"] * len(pids))
        cur.execute(f'SELECT {col_str} FROM public."{join_table}" WHERE "{fk_col}" IN ({ph})', pids)
        jrows = [serialize_row(dict(r)) for r in cur.fetchall()]
        for sj in sub_joins:
            resolve_join(join_table, sj, jrows, conn)
        groups: Dict[Any, list] = {}
        for jr in jrows:
            groups.setdefault(jr.get(fk_col), []).append(jr)
        for row in parent_rows:
            items = groups.get(row.get(parent_col), [])
            if extra_join_cols:
                items = [{k: v for k, v in it.items() if k not in extra_join_cols} for it in items]
            row[key_name] = items


def build_where(params: dict):
    wc, wv = [], []
    for key, value in params.items():
        if key in ("select", "order", "limit", "offset", "on_conflict", "columns", "count"):
            continue
        if value.startswith("eq."):
            wc.append(f'"{key}" = %s'); wv.append(value[3:])
        elif value.startswith("neq."):
            wc.append(f'"{key}" != %s'); wv.append(value[4:])
        elif value.startswith("gt."):
            wc.append(f'"{key}" > %s'); wv.append(value[3:])
        elif value.startswith("gte."):
            wc.append(f'"{key}" >= %s'); wv.append(value[4:])
        elif value.startswith("lt."):
            wc.append(f'"{key}" < %s'); wv.append(value[3:])
        elif value.startswith("lte."):
            wc.append(f'"{key}" <= %s'); wv.append(value[4:])
        elif value.startswith("like."):
            wc.append(f'"{key}" LIKE %s'); wv.append(value[5:])
        elif value.startswith("ilike."):
            wc.append(f'"{key}" ILIKE %s'); wv.append(value[6:])
        elif value.startswith("is."):
            v = value[3:]
            if v == "null":
                wc.append(f'"{key}" IS NULL')
            elif v == "true":
                wc.append(f'"{key}" = true')
            elif v == "false":
                wc.append(f'"{key}" = false')
        elif value.startswith("in."):
            items = [i.strip().strip('"').strip("'") for i in value[3:].strip("()").split(",")]
            wc.append(f'"{key}" IN ({",".join(["%s"] * len(items))})')
            wv.extend(items)
        elif value.startswith("not."):
            rest = value[4:]
            if rest.startswith("eq."):
                wc.append(f'"{key}" != %s'); wv.append(rest[3:])
            elif rest.startswith("is.null"):
                wc.append(f'"{key}" IS NOT NULL')
        else:
            wc.append(f'"{key}" = %s'); wv.append(value)
    return wc, wv


def build_order(order_str: str) -> str:
    if not order_str:
        return ""
    parts = []
    for o in order_str.split(","):
        o = o.strip()
        if ".desc" in o:
            col = o.replace(".desc", "").replace(".nullslast", "").replace(".nullsfirst", "")
            parts.append(f'"{col}" DESC')
        elif ".asc" in o:
            col = o.replace(".asc", "").replace(".nullslast", "").replace(".nullsfirst", "")
            parts.append(f'"{col}" ASC')
        else:
            parts.append(f'"{o}" ASC')
    return "ORDER BY " + ", ".join(parts)


# ============================================================
# WebSocket connection manager (realtime)
# ============================================================
class ConnectionManager:
    """Manages active WebSocket connections grouped by conversation_id.

    Each entry in _rooms maps a conversation_id to a list of (WebSocket, topic)
    tuples.  Storing the topic allows broadcast() to include the correct topic
    field in every outgoing message so the frontend's channel map lookup
    (channels.get(topic)) succeeds.
    """

    def __init__(self):
        # conversation_id -> list of (WebSocket, topic)
        self._rooms: Dict[str, List[tuple]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket, conversation_id: str, topic: str = ""):
        """Register a WebSocket in the room for conversation_id.

        The WebSocket is accepted here only if it has not already been accepted
        by the endpoint handler (double-accept raises an error).
        """
        try:
            await ws.accept()
        except Exception:
            pass  # Already accepted by the endpoint handler
        async with self._lock:
            self._rooms.setdefault(conversation_id, []).append((ws, topic))

    async def disconnect(self, ws: WebSocket, conversation_id: str):
        async with self._lock:
            room = self._rooms.get(conversation_id, [])
            self._rooms[conversation_id] = [(w, t) for w, t in room if w is not ws]
            if not self._rooms[conversation_id]:
                self._rooms.pop(conversation_id, None)

    async def broadcast(self, conversation_id: str, payload: dict):
        """Send a message to all connections in a room.

        Each message is augmented with the subscriber's topic so the frontend
        Supabase shim can route it to the correct RealtimeChannelImpl.
        """
        room = list(self._rooms.get(conversation_id, []))
        dead = []
        for ws, topic in room:
            try:
                msg = dict(payload)
                if topic:
                    msg["topic"] = topic
                await ws.send_json(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws, conversation_id)

    async def broadcast_all(self, payload: dict):
        """Broadcast to every connected client."""
        for conv_id in list(self._rooms.keys()):
            await self.broadcast(conv_id, payload)


manager = ConnectionManager()


# ============================================================
# Health
# ============================================================
@app.get("/")
@app.get("/health")
async def health():
    return {"status": "ok", "service": "myfacilitator-proxy", "version": "3.0.0"}


@app.get("/rest/v1/")
async def rest_root():
    return {"swagger": "2.0", "info": {"title": "PostgREST API", "version": "11.0.0"}}


# ============================================================
# Auth endpoints
# ============================================================
@app.post("/auth/v1/signup")
async def auth_signup(request: Request):
    """Register a new user account.

    Persists credentials to the DB so that logins survive container restarts.
    The frontend sends the display name as options.data.name or options.data.full_name;
    both are accepted.  The api.ts client also sends it as a top-level 'data' key.

    Bug-fixes applied:
    - DB write failure is now a hard error (not silently swallowed), so the caller
      knows immediately if persistence failed instead of losing the account on restart.
    - Duplicate check is done in the DB first (single source of truth), then memory.
    - Name extraction handles all three payload shapes the frontend may send.
    - Password length is validated server-side (min 8 chars) as a defence-in-depth.
    - The in-memory USERS cache is only populated AFTER a successful DB write.
    """
    data = await request.json()
    email = (data.get("email") or "").lower().strip()
    password = data.get("password", "")

    if not email or not password:
        raise HTTPException(400, detail={"code": "validation_failed", "message": "Email and password are required"})

    if len(password) < 8:
        raise HTTPException(400, detail={"code": "weak_password", "message": "Password must be at least 8 characters"})

    # Extract display name — frontend may send it in three different shapes:
    #   1. options.data.name  (AuthContext sends this)
    #   2. options.data.full_name
    #   3. top-level data.name / data.full_name  (api.ts maps options.data -> body.data)
    options_meta = (data.get("options") or {}).get("data") or {}
    top_meta = data.get("data") or {}
    full_name = (
        options_meta.get("full_name") or options_meta.get("name")
        or top_meta.get("full_name") or top_meta.get("name")
        or ""
    )

    user_id = str(uuid.uuid4())
    pw_hash = hashlib.sha256(password.encode()).hexdigest()
    created_at = datetime.utcnow().isoformat()

    # --- DB persistence (primary store) ---
    # We write to the DB first.  If this fails we return an error immediately
    # rather than silently falling back to memory-only storage (which would lose
    # the account on the next container restart).
    try:
        conn = get_db()
        cur = conn.cursor()

        # Authoritative duplicate check against the DB
        cur.execute("SELECT id FROM profiles WHERE email = %s", (email,))
        if cur.fetchone():
            conn.close()
            raise HTTPException(400, detail={"code": "user_already_exists", "message": "An account with this email already exists"})

        cur.execute(
            "INSERT INTO profiles "
            "(id, email, full_name, role, password_hash, email_verified, created_at, updated_at) "
            "VALUES (%s, %s, %s, 'free', %s, TRUE, NOW(), NOW())",
            (user_id, email, full_name or None, pw_hash),
        )
        conn.commit()
        conn.close()
    except HTTPException:
        raise
    except Exception as e:
        err_msg = str(e)
        print(f"[signup] DB error: {err_msg}")
        # Surface DB errors to the caller so they know the account was NOT saved.
        raise HTTPException(
            500,
            detail={"code": "db_error", "message": f"Account could not be created: {err_msg}"},
        )

    # --- Memory cache (fast path for subsequent requests in the same process) ---
    USERS[email] = {
        "id": user_id,
        "email": email,
        "password": pw_hash,
        "created_at": created_at,
        "email_confirmed_at": created_at,
    }
    token = _make_token(user_id, email)
    return _make_user_response(USERS[email], token)


@app.post("/auth/v1/token")
async def auth_token(request: Request, grant_type: str = Query(default="password")):
    """Authenticate a user with email and password.

    Checks the in-memory USERS dict first (fast path).  If the user is not
    found in memory (e.g., after a container restart), falls back to the DB
    and loads the stored password_hash for comparison.  Accepts any password
    ONLY for the legacy hardcoded seed accounts that have no DB row.
    """
    data = await request.json()
    email = (data.get("email") or "").lower().strip()
    password = data.get("password", "")
    pw_hash = hashlib.sha256(password.encode()).hexdigest()

    # Fast path: check in-memory store
    user = USERS.get(email)
    if not user:
        # Slow path: look up credentials in the DB
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute(
                "SELECT id, email, password_hash, created_at FROM profiles "
                "WHERE email = %s",
                (email,),
            )
            row = cur.fetchone()
            conn.close()
            if row and row["password_hash"]:
                # Populate memory cache for subsequent requests
                user = {
                    "id": str(row["id"]),
                    "email": row["email"],
                    "password": row["password_hash"],
                    "created_at": (
                        row["created_at"].isoformat()
                        if isinstance(row["created_at"], datetime)
                        else str(row["created_at"])
                    ),
                    "email_confirmed_at": datetime.utcnow().isoformat(),
                }
                USERS[email] = user
        except Exception as e:
            print(f"[login] DB lookup error: {e}")

    # Reject if user not found OR password does not match.
    # Legacy seed accounts that have no password_hash (password=None) are also rejected
    # — they must be updated with a real password before they can log in.
    if not user or not user.get("password") or user.get("password") != pw_hash:
        raise HTTPException(400, detail={"code": "invalid_credentials", "message": "Invalid email or password"})

    # Look up the user's profile role so admins get the correct JWT claim
    # Also backfill email if it's null (for users created before email column was added)
    profile_role = "free"
    try:
        conn_role = get_db()
        cur_role = conn_role.cursor()
        cur_role.execute("SELECT id, role, email FROM profiles WHERE id = %s::uuid", (user["id"],))
        role_row = cur_role.fetchone()
        if role_row:
            profile_role = role_row["role"] or "free"
            # Backfill email if missing
            if not role_row["email"] and email:
                cur_role.execute(
                    "UPDATE profiles SET email = %s, updated_at = NOW() WHERE id = %s::uuid",
                    (email, user["id"])
                )
                conn_role.commit()
        conn_role.close()
    except Exception as e:
        print(f"[login] Role lookup error: {e}")

    token = _make_token(user["id"], user["email"], profile_role)
    return _make_user_response(user, token)


@app.get("/auth/v1/user")
@app.put("/auth/v1/user")
async def auth_user(request: Request):
    """Get or update the currently authenticated user's profile.

    PUT supports updating full_name, avatar_url, and password.
    Password changes are persisted to the DB so they survive restarts.
    """
    user = get_current_user(request)
    if not user:
        raise HTTPException(401, "Unauthorized")
    if request.method == "PUT":
        data = await request.json()
        user_id = user.get("sub") or user.get("id")
        email = user.get("email", "")
        try:
            conn = get_db()
            cur = conn.cursor()
            updates: dict = {}
            # Profile metadata updates
            if "data" in data:
                meta = data["data"]
                if "full_name" in meta:
                    updates["full_name"] = meta["full_name"]
                if "avatar_url" in meta:
                    updates["avatar_url"] = meta["avatar_url"]
            # Password update — persist new hash to DB and refresh memory cache
            if "password" in data and data["password"]:
                new_pw_hash = hashlib.sha256(data["password"].encode()).hexdigest()
                updates["password_hash"] = new_pw_hash
                # Refresh in-memory entry so subsequent logins work immediately
                if email in USERS:
                    USERS[email]["password"] = new_pw_hash
            if updates:
                set_clause = ", ".join([f'"{k}" = %s' for k in updates.keys()])
                cur.execute(
                    f'UPDATE profiles SET {set_clause}, updated_at = NOW() WHERE id = %s',
                    list(updates.values()) + [user_id],
                )
                conn.commit()
            conn.close()
        except Exception as e:
            print(f"[update_user] error: {e}")
    return {
        "id": user.get("sub") or user.get("id"),
        "email": user.get("email", ""),
        "role": "authenticated",
        "email_confirmed_at": datetime.utcnow().isoformat(),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "app_metadata": {"provider": "email"},
        "user_metadata": {},
        "aud": "authenticated",
    }


@app.post("/auth/v1/logout")
async def auth_logout():
    return Response(status_code=204)


# Stub endpoints for Supabase auth compatibility
@app.post("/auth/v1/recover")
@app.get("/auth/v1/callback")
@app.post("/auth/v1/callback")
@app.post("/auth/v1/resend")
@app.post("/auth/v1/verify")
@app.post("/auth/v1/otp")
@app.get("/auth/v1/authorize")
@app.post("/auth/v1/sso")
async def auth_stub():
    return {}


@app.get("/auth/v1/mfa/factors")
async def auth_mfa_factors():
    return {"totp": [], "phone": []}


@app.post("/auth/v1/mfa/enroll")
async def auth_mfa_enroll():
    return {"id": str(uuid.uuid4()), "type": "totp", "totp": {"qr_code": "", "secret": "", "uri": ""}}


@app.post("/auth/v1/mfa/challenge")
async def auth_mfa_challenge():
    return {"id": str(uuid.uuid4())}


@app.post("/auth/v1/mfa/verify")
async def auth_mfa_verify():
    return {"success": True}


# ============================================================
# PostgREST RPC
# ============================================================
@app.post("/rest/v1/rpc/{func_name}")
async def rpc_call(func_name: str, request: Request):
    if func_name not in ALLOWED_RPC_FUNCTIONS:
        raise HTTPException(403, f"RPC function '{func_name}' is not allowed")
    data = await request.json()
    user = get_current_user(request)
    user_id = (user.get("sub") or user.get("id")) if user else None
    try:
        conn = get_db()
        cur = conn.cursor()
        if func_name == "is_session_host":
            conversation_id = data.get("conversation_id")
            if not user_id or not conversation_id:
                conn.close()
                return False
            cur.execute(
                "SELECT EXISTS(SELECT 1 FROM public.conversations WHERE id = %s AND user_id = %s::uuid)",
                (conversation_id, user_id),
            )
            result = cur.fetchone()
            conn.close()
            val = list(result.values())[0] if isinstance(result, dict) else result[0]
            return bool(val)
        if func_name == "is_system_admin":
            if not user_id:
                conn.close()
                return False
            cur.execute(
                "SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = %s::uuid AND role = 'admin')",
                (user_id,),
            )
            result = cur.fetchone()
            conn.close()
            val = list(result.values())[0] if isinstance(result, dict) else result[0]
            return bool(val)
        # Generic RPC
        if data:
            param_names = ", ".join([f"{k} := %s" for k in data.keys()])
            cur.execute(f"SELECT * FROM public.{func_name}({param_names})", list(data.values()))
        else:
            cur.execute(f"SELECT * FROM public.{func_name}()")
        result = cur.fetchone()
        conn.close()
        if result and len(result) == 1:
            val = list(result.values())[0] if isinstance(result, dict) else result[0]
            if isinstance(val, Decimal):
                val = float(val)
            return val
        elif result:
            return serialize_row(dict(result))
        return None
    except Exception as e:
        print(f"RPC error {func_name}: {e}")
        traceback.print_exc()
        raise HTTPException(400, str(e))


# ============================================================
# Tables that require authentication for read access.
#
# SECURE_CONV_TABLES: linked to conversations via conversation_id.
#   - Authenticated hosts see only their own data (ownership filter).
#   - Participants may access messages/session_participants for their
#     own session by presenting a valid X-Join-Token header.
#
# SECURE_REPORT_TABLES: only authenticated hosts may read these.
#   No participant bypass is allowed.
#
# SECURE_DIRECT_TABLES: have a direct user_id column.
#   - Authenticated users see only their own rows.
#   - Participants may read conversations for their session via
#     X-Join-Token (needed to display session info during the session).
# ============================================================
SECURE_CONV_TABLES = {"messages", "session_participants"}
SECURE_REPORT_TABLES = {"session_reports"}
SECURE_DIRECT_TABLES = {"conversations", "sessions", "facilitators"}
# Tables participants may read with a valid join token (no auth required)
PARTICIPANT_READABLE_TABLES = {"messages", "session_participants", "conversations"}


def _validate_join_token(token: str, conversation_id: str | int | None, conn) -> bool:
    """Return True if `token` is the correct join_token for `conversation_id`."""
    if not token or not conversation_id:
        return False
    try:
        cur = conn.cursor()
        cur.execute(
            'SELECT 1 FROM public."conversations" '
            'WHERE id = %s AND join_token = %s::uuid',
            (conversation_id, token),
        )
        return cur.fetchone() is not None
    except Exception:
        return False

# ============================================================
# Public endpoint to re-run safe startup migrations (all idempotent)
# ============================================================
@app.post("/admin/apply-migrations")
async def apply_migrations_endpoint():
    """Re-run all idempotent startup migrations. Safe to call multiple times."""
    try:
        run_startup_migrations()
        return {"success": True, "message": "Migrations applied"}
    except Exception as e:
        raise HTTPException(500, str(e))


# ============================================================
# Admin migration endpoint (protected by MIGRATION_SECRET env var)
# ============================================================
@app.post("/admin/run-migration")
async def run_migration(request: Request):
    """Execute a raw SQL migration. Protected by MIGRATION_SECRET."""
    migration_secret = os.environ.get("MIGRATION_SECRET", "")
    if not migration_secret:
        raise HTTPException(403, "Migration endpoint disabled")
    auth = request.headers.get("x-migration-secret", "")
    if auth != migration_secret:
        raise HTTPException(403, "Invalid migration secret")
    body = await request.json()
    sql = body.get("sql", "")
    if not sql:
        raise HTTPException(400, "No SQL provided")
    try:
        conn = get_db()
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)
        conn.close()
        return {"success": True}
    except Exception as e:
        raise HTTPException(500, str(e))


# ============================================================
# Background AI welcome-message helper
# ============================================================
async def _maybe_generate_welcome_message(conv_id: int) -> None:
    """Fire-and-forget: generate the AI welcome message for a session.

    Called as an asyncio background task the moment a participant joins.
    Checks whether a message already exists to avoid double-generation,
    then calls the handle-facilitator-response edge function with
    sessionStart=True so the AI produces a personalised welcome message.
    """
    try:
        # Check if a welcome message already exists for this conversation
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*) FROM messages WHERE conversation_id = %s",
            (conv_id,)
        )
        row = cur.fetchone()
        msg_count = (row["count"] if isinstance(row, dict) else row[0]) if row else 0
        conn.close()

        if msg_count > 0:
            # Message already exists — nothing to do
            return

        # Idempotency guard: skip if AI generation is already in progress
        # NOTE: Do NOT set the lock here — handle-facilitator-response will set it.
        # Setting it here would cause handle-facilitator-response to see the lock
        # and skip the generation (double-lock bug).
        _now = time.time()
        _lock_key = f"ai_lock_{conv_id}"
        _last = _ai_response_locks.get(_lock_key, 0)
        if _now - _last < 10:
            return
        # Do NOT set _ai_response_locks[_lock_key] here — let handle-facilitator-response do it

        # Fetch conversation + session + facilitator details needed by the AI
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "SELECT c.id, c.user_id, c.language, "
            "s.title, s.objective, s.welcome_message, s.scope, "
            "s.gpt_version, s.max_tokens, s.randomness, "
            "f.title as facilitator_name, f.details as facilitator_details, "
            "f.profile_picture, f.languages as facilitator_language "
            "FROM conversations c "
            "LEFT JOIN sessions s ON s.id = c.sessions_id "
            "LEFT JOIN facilitators f ON f.id = s.facilitator "
            "WHERE c.id = %s",
            (conv_id,)
        )
        row = cur.fetchone()
        conn.close()

        if not row:
            print(f"[welcome-bg] Conversation {conv_id} not found, skipping.")
            return

        row = dict(row)
        print(f"[welcome-bg] Triggering AI welcome message for conv={conv_id}")

        # Use stdlib urllib to make an internal HTTP call to the edge function.
        # This avoids adding httpx/aiohttp as a dependency.  The call is made
        # in a thread executor so it doesn't block the event loop.
        import urllib.request as _urllib_req
        base_url = os.environ.get("INTERNAL_BASE_URL", "http://localhost:3333")
        payload = json.dumps({
            "conversationId": conv_id,
            "sessionStart": True,
            "generateReport": False,
            "messages": [],
        }).encode()
        def _do_post():
            req = _urllib_req.Request(
                f"{base_url}/functions/v1/handle-facilitator-response",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                with _urllib_req.urlopen(req, timeout=90) as resp:
                    resp.read()
            except Exception as e:
                print(f"[welcome-bg] HTTP call failed for conv={conv_id}: {e}")
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _do_post)
        except Exception as http_err:
            print(f"[welcome-bg] Executor error for conv={conv_id}: {http_err}")
    except Exception as e:
        print(f"[welcome-bg] Error generating welcome message for conv={conv_id}: {e}")


# ============================================================
# PostgREST REST table CRUD
# ============================================================
@app.api_route("/rest/v1/{table}", methods=["GET", "POST", "PATCH", "DELETE", "HEAD"])
async def rest_table(table: str, request: Request):
    params = dict(request.query_params)

    # ── Row-level security ────────────────────────────────────
    # Authenticated hosts see only their own data (ownership filter).
    # Participants may access session data by presenting a valid
    # X-Join-Token header that matches the conversation they are
    # querying.  Session reports are never accessible to participants.
    requesting_user = get_current_user(request)
    requesting_user_id = (
        requesting_user.get("sub") or requesting_user.get("id")
    ) if requesting_user else None
    # Admin bypass: users with role='admin' in their JWT skip all ownership filters
    requesting_user_role = requesting_user.get("role", "") if requesting_user else ""
    is_admin_user = requesting_user_role == "admin"
    join_token_header = request.headers.get("x-join-token", "").strip()

    if request.method in ("GET", "HEAD"):
        # session_reports: authenticated hosts only, no participant bypass
        if table in SECURE_REPORT_TABLES:
            if not requesting_user_id:
                return JSONResponse(
                    content={
                        "error": "Authentication required",
                        "message": "You must be logged in to access session reports",
                        "code": "PGRST301",
                    },
                    status_code=401,
                )
        # messages, session_participants, conversations: require auth OR valid join token
        elif table in SECURE_CONV_TABLES or table in SECURE_DIRECT_TABLES:
            if not requesting_user_id and not join_token_header:
                # Special case: anonymous participants may read a single conversation
                # by its id (e.g. the join-session page before they have a token).
                # We allow this only when the request filters by a specific id and
                # the conversation is active and not ended.  All other anonymous
                # reads on secure tables are rejected.
                if table == "conversations":
                    raw_id = dict(request.query_params).get("id", "")
                    if raw_id.startswith("eq."):
                        raw_id = raw_id[3:]
                    if not raw_id:
                        return JSONResponse(
                            content={
                                "error": "Authentication required",
                                "message": "You must be logged in or provide a valid session token",
                                "code": "PGRST301",
                            },
                            status_code=401,
                        )
                    # raw_id is set — allow the request to proceed; the filter
                    # injection below will add the active/not-ended guard.
                else:
                    return JSONResponse(
                        content={
                            "error": "Authentication required",
                            "message": "You must be logged in or provide a valid session token",
                            "code": "PGRST301",
                        },
                        status_code=401,
                    )

    try:
        conn = get_db()
        cur = conn.cursor()

        if request.method in ("GET", "HEAD"):
            select_str = params.get("select", "*")
            base_cols, joins = _parse_select(select_str)
            # Detect extra FK cols needed for joins
            extra_fk_cols: list = []
            for j in joins:
                jp = _parse_join(j) if isinstance(j, str) else j
                if not jp:
                    continue
                jt = jp["table"]
                for constraint, (tbl, fc, ftbl, fpc) in FK_MAP.items():
                    needed_col = None
                    if tbl == table and ftbl == jt:
                        needed_col = fc
                    elif tbl == jt and ftbl == table:
                        needed_col = fpc
                    if needed_col and needed_col not in base_cols and needed_col not in extra_fk_cols:
                        extra_fk_cols.append(needed_col)
            all_cols = base_cols + extra_fk_cols
            col_str = ", ".join([f'"{c}"' if c != "*" else c for c in all_cols]) if all_cols else "*"
            wc, wv = build_where(params)
            oc = build_order(params.get("order", ""))
            lim = params.get("limit", "")
            off = params.get("offset", "")

            # ── Ownership / token filter injection ────────────────
            # Priority order:
            # 1. Join token present → participant path (even if authenticated).
            #    An authenticated user joining someone else's session must be
            #    allowed through via the join token, not blocked by ownership.
            # 2. Authenticated host with no join token → ownership filter.
            # 3. Anonymous with no token → public guard (active sessions only).
            if join_token_header and table in ("conversations", *SECURE_CONV_TABLES, *SECURE_REPORT_TABLES):
                # Participant path: only use join-token auth when the request is
                # NOT an authenticated host listing their own conversations.
                # If the user is authenticated AND the query is a list (no specific
                # conversation_id / id filter), treat it as a host dashboard request
                # and ignore the stale join token — apply ownership filter instead.
                _is_list_query = not (params.get('id', '') or params.get('conversation_id', ''))
                if requesting_user_id and _is_list_query and table in ("conversations", *SECURE_CONV_TABLES):
                    # Host dashboard path: ignore join token, apply ownership filter below.
                    # Admin users bypass ownership filter entirely — they see all data.
                    if not is_admin_user:
                        join_token_header = ""
            elif requesting_user_id and not is_admin_user and table in SECURE_REPORT_TABLES:
                # session_reports: ownership via conversation's user_id
                wc.append(
                    '"conversation_id" IN ('
                    'SELECT id FROM public."conversations" '
                    'WHERE "user_id" = %s::uuid)'
                )
                wv.append(requesting_user_id)
            elif requesting_user_id and not is_admin_user and table in SECURE_CONV_TABLES:
                # messages / session_participants: ownership filter
                wc.append(
                    '"conversation_id" IN ('
                    'SELECT id FROM public."conversations" '
                    'WHERE "user_id" = %s::uuid)'
                )
                wv.append(requesting_user_id)
            elif requesting_user_id and not is_admin_user and table in SECURE_DIRECT_TABLES:
                if table == 'facilitators':
                    # Return system facilitators (user_id IS NULL) + user's own custom facilitators
                    wc.append('("user_id" IS NULL OR "user_id" = %s::uuid)')
                    wv.append(requesting_user_id)
                elif table == 'sessions':
                    # Return system workshops (user_id IS NULL) + user's own custom workshops
                    wc.append('("user_id" IS NULL OR "user_id" = %s::uuid)')
                    wv.append(requesting_user_id)
                else:
                    # conversations: direct user_id filter
                    wc.append('"user_id" = %s::uuid')
                    wv.append(requesting_user_id)
            if join_token_header and (not requesting_user_id or table in ("conversations", *SECURE_CONV_TABLES, *SECURE_REPORT_TABLES)):
                # Participant path: validate join token against the
                # conversation_id present in the query parameters.
                # Extract conversation_id from the WHERE params.
                conv_id_param = (
                    params.get("conversation_id") or
                    params.get("conversation_id=eq.") or
                    params.get("id")
                )
                # Also check for eq. filter pattern
                for pk, pv in params.items():
                    if pk in ("conversation_id", "id") and not conv_id_param:
                        conv_id_param = pv
                    elif "conversation_id" in pk and "eq." in pk:
                        conv_id_param = pk.split("eq.")[-1] or pv
                # Extract from build_where style params like conversation_id=eq.5
                raw_conv_id = params.get("conversation_id", "")
                if raw_conv_id.startswith("eq."):
                    raw_conv_id = raw_conv_id[3:]
                if not raw_conv_id:
                    raw_conv_id = params.get("id", "")
                    if raw_conv_id.startswith("eq."):
                        raw_conv_id = raw_conv_id[3:]
                token_valid = _validate_join_token(join_token_header, raw_conv_id or None, conn)
                if not token_valid:
                    conn.close()
                    return JSONResponse(
                        content={
                            "error": "Invalid or missing session token",
                            "message": "The join token is invalid or does not match this session",
                            "code": "PGRST403",
                        },
                        status_code=403,
                    )
                # Token is valid: restrict query to this specific conversation
                if table in SECURE_CONV_TABLES and raw_conv_id:
                    # Already filtered by conversation_id in params; no extra filter needed
                    pass
                elif table == "conversations" and raw_conv_id:
                    # Already filtered by id in params; no extra filter needed
                    pass
            elif not requesting_user_id and not join_token_header and table == "conversations":
                # Anonymous public read of a specific conversation (join-session page).
                # Guard: only expose conversations that are active and not ended.
                wc.append('"is_session_ended" IS NOT TRUE')

            sql = f'SELECT {col_str} FROM public."{table}"'
            if wc:
                sql += " WHERE " + " AND ".join(wc)
            if oc:
                sql += " " + oc
            if lim:
                sql += f" LIMIT {int(lim)}"
            if off:
                sql += f" OFFSET {int(off)}"
            cur.execute(sql, wv)
            rows = [serialize_row(dict(r)) for r in cur.fetchall()]
            for j in joins:
                resolve_join(table, j, rows, conn)
            # Only strip extra FK cols that were not already covered by SELECT *.
            # When base_cols is ['*'], all columns are already in the result, so
            # stripping extra_fk_cols would remove columns the client expects.
            cols_to_strip = extra_fk_cols if "*" not in base_cols else []
            if cols_to_strip:
                for row in rows:
                    for ec in cols_to_strip:
                        row.pop(ec, None)
            prefer = request.headers.get("prefer", "")
            accept = request.headers.get("accept", "")
            content_range = f"0-{len(rows)-1}/{len(rows)}" if rows else "*/0"
            if "vnd.pgrst.object" in accept and rows:
                body = rows[0]
            elif "return=representation" in prefer and len(rows) == 1:
                body = rows[0]
            else:
                body = rows
            conn.close()
            return JSONResponse(content=body, headers={"Content-Range": content_range})

        if request.method == "POST":
            data = await request.json()
            if not data:
                conn.close()
                raise HTTPException(400, "No data")

            def _adapt(d):
                return [json.dumps(v) if isinstance(v, (dict, list)) else v for v in d.values()]

            if isinstance(data, list):
                results = []
                for item in data:
                    cols = ", ".join([f'"{k}"' for k in item.keys()])
                    vals = ", ".join(["%s"] * len(item))
                    cur.execute(f'INSERT INTO public."{table}" ({cols}) VALUES ({vals}) RETURNING *', _adapt(item))
                    row = cur.fetchone()
                    if row:
                        results.append(serialize_row(dict(row)))
                conn.commit()
                conn.close()
                # Broadcast INSERT events for messages and session_participants
                if table in ("messages", "session_participants") and results:
                    conv_id = str(results[0].get("conversation_id", ""))
                    asyncio.create_task(manager.broadcast(conv_id, {
                        "event": "INSERT", "table": table, "new": results[0]
                    }))
                return JSONResponse(content=results, status_code=201)
            else:
                cols = ", ".join([f'"{k}"' for k in data.keys()])
                vals = ", ".join(["%s"] * len(data))
                oc = params.get("on_conflict", "")
                sql = f'INSERT INTO public."{table}" ({cols}) VALUES ({vals})'
                if oc:
                    uc = ", ".join([f'"{k}" = EXCLUDED."{k}"' for k in data.keys() if k != oc])
                    sql += (
                        f' ON CONFLICT ("{oc}") DO UPDATE SET {uc}'
                        if uc
                        else f' ON CONFLICT ("{oc}") DO NOTHING'
                    )
                sql += " RETURNING *"
                cur.execute(sql, _adapt(data))
                row = cur.fetchone()
                conn.commit()
                conn.close()
                result = serialize_row(dict(row)) if row else {}
                # Broadcast INSERT events for messages and session_participants.
                # The payload must match the RealtimePayload shape expected by the
                # frontend Supabase shim (api.ts onmessage handler).
                if table in ("messages", "session_participants") and result:
                    conv_id = str(result.get("conversation_id", ""))
                    asyncio.create_task(manager.broadcast(conv_id, {
                        "event": "INSERT",
                        "payload": {
                            "eventType": "INSERT",
                            "new": result,
                            "old": {},
                            "table": table,
                            "schema": "public",
                        },
                    }))
                    # ── Auto-trigger AI welcome message on first participant join ──────
                    # When a participant joins a session we immediately kick off AI
                    # welcome message generation as a background task.  The frontend
                    # polls for the message while showing a 'Preparing your session'
                    # spinner, so the message is ready by the time they land on the
                    # session page.  The helper checks whether a message already
                    # exists to avoid double-generation.
                    if table == "session_participants" and conv_id:
                        asyncio.create_task(_maybe_generate_welcome_message(int(conv_id)))
                return JSONResponse(content=result, status_code=201)

        if request.method == "PATCH":
            data = await request.json()
            if not data:
                conn.close()
                raise HTTPException(400, "No data")
            wc, wv = build_where(params)
            sc = ", ".join([f'"{k}" = %s' for k in data.keys()])
            values = list(data.values()) + wv
            sql = f'UPDATE public."{table}" SET {sc}'
            if wc:
                sql += " WHERE " + " AND ".join(wc)
            sql += " RETURNING *"
            cur.execute(sql, values)
            rows = cur.fetchall()
            conn.commit()
            conn.close()
            result = [serialize_row(dict(r)) for r in rows]
            # Broadcast updates for conversations/session_participants.
            if table in ("conversations", "session_participants") and result:
                conv_id = str(result[0].get("id") or result[0].get("conversation_id", ""))
                asyncio.create_task(manager.broadcast(conv_id, {
                    "event": "UPDATE",
                    "payload": {
                        "eventType": "UPDATE",
                        "new": result[0],
                        "old": {},
                        "table": table,
                        "schema": "public",
                    },
                }))
            return result[0] if len(result) == 1 else result

        if request.method == "DELETE":
            wc, wv = build_where(params)
            sql = f'DELETE FROM public."{table}"'
            if wc:
                sql += " WHERE " + " AND ".join(wc)
            sql += " RETURNING *"
            cur.execute(sql, wv)
            rows = cur.fetchall()
            conn.commit()
            conn.close()
            return [serialize_row(dict(r)) for r in rows]

        conn.close()
        raise HTTPException(405, "Method not allowed")

    except HTTPException:
        raise
    except Exception as e:
        print(f"REST error on {table}: {e}")
        traceback.print_exc()
        raise HTTPException(400, detail={"error": str(e), "message": str(e), "code": "PGRST000"})


# ============================================================
# Edge Functions
# ============================================================
@app.options("/functions/v1/{func_name}")
async def edge_function_options(func_name: str):
    return Response(status_code=204)


@app.post("/functions/v1/{func_name}")
async def edge_function(func_name: str, request: Request):
    data = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}

    # ── get-stripe-prices ──────────────────────────────────────
    if func_name == "get-stripe-prices":
        if not STRIPE_CONFIGURED:
            raise HTTPException(500, "Stripe not configured")
        try:
            stripe_prices = stripe_lib.Price.list(active=True, limit=50, expand=["data.product"])
            plan_meta: dict = {}
            try:
                conn = get_db()
                cur = conn.cursor()
                cur.execute(
                    "SELECT id, title, price, currency, stripe_plan_id, plan_type "
                    "FROM plans WHERE stripe_plan_id IS NOT NULL ORDER BY price ASC"
                )
                for row in cur.fetchall():
                    plan_meta[row["stripe_plan_id"]] = row
                conn.close()
            except Exception as db_err:
                print(f"get-stripe-prices DB lookup warning: {db_err}")

            prices = []
            for p in stripe_prices.data:
                if p.id not in plan_meta:
                    continue
                meta = plan_meta[p.id]
                stripe_amount_cents = p.unit_amount or 0
                stripe_amount_major = stripe_amount_cents / 100
                if float(meta["price"]) != stripe_amount_major:
                    try:
                        sync_conn = get_db()
                        sync_cur = sync_conn.cursor()
                        sync_cur.execute("UPDATE plans SET price = %s WHERE stripe_plan_id = %s", (stripe_amount_major, p.id))
                        sync_conn.commit()
                        sync_conn.close()
                    except Exception:
                        pass
                prices.append({
                    "id": p.id,
                    "plan_db_id": meta["id"],
                    "unit_amount": stripe_amount_major,
                    "unit_amount_cents": stripe_amount_cents,
                    "currency": p.currency.lower(),
                    "recurring": {"interval": p.recurring.interval} if p.recurring else None,
                    "title": meta["title"],
                    "plan_type": meta["plan_type"],
                })
            prices.sort(key=lambda x: x["unit_amount"])
            return {"prices": prices, "success": True}
        except stripe_lib.error.StripeError as se:
            try:
                conn = get_db()
                cur = conn.cursor()
                cur.execute("SELECT id, title, price, currency, stripe_plan_id, plan_type FROM plans WHERE stripe_plan_id IS NOT NULL ORDER BY price ASC")
                rows = cur.fetchall()
                conn.close()
                prices = [{"id": r["stripe_plan_id"], "plan_db_id": r["id"], "unit_amount": float(r["price"]), "unit_amount_cents": int(float(r["price"]) * 100), "currency": (r["currency"] or "eur").lower(), "recurring": {"interval": "month"}, "title": r["title"], "plan_type": r["plan_type"]} for r in rows]
                return {"prices": prices, "success": True, "source": "db_fallback"}
            except Exception:
                raise HTTPException(500, str(se))

    # ── handle-facilitator-response ────────────────────────────
    elif func_name == "handle-facilitator-response":
        conv_id = data.get("conversationId")
        is_session_start = data.get("sessionStart", False)
        generate_report = data.get("generateReport", False)
        host_instruction = (data.get("hostInstruction") or "").strip()

        # Idempotency guard: prevent duplicate AI responses within 10 seconds
        if conv_id and not generate_report:
            _now = time.time()
            _lock_key = f"ai_lock_{conv_id}"
            _last = _ai_response_locks.get(_lock_key, 0)
            if _now - _last < 10:
                return {"success": True, "skipped": True, "reason": "duplicate_prevention"}
            _ai_response_locks[_lock_key] = _now

        session_title = "this workshop"
        facilitator_name = "Facilitator"
        facilitator_details = ""
        objective = "facilitate a productive discussion"
        session_prompt = ""
        welcome_message_template = ""
        session_scope = ""
        gpt_version = None
        max_tokens_cfg = None
        randomness_cfg = None
        avatar_url = ""
        facilitator_language = None

        # Map ISO 639-1 language codes to full names for the AI instruction
        LANGUAGE_CODE_MAP = {
            "en": "English", "fr": "French", "es": "Spanish", "de": "German",
            "it": "Italian", "pt": "Portuguese", "nl": "Dutch", "pl": "Polish",
            "ru": "Russian", "ja": "Japanese", "ko": "Korean", "zh": "Chinese",
            "ar": "Arabic", "hi": "Hindi", "tr": "Turkish", "sv": "Swedish",
            "da": "Danish", "fi": "Finnish", "nb": "Norwegian", "cs": "Czech",
        }

        if conv_id:
            try:
                conn = get_db()
                cur = conn.cursor()
                cur.execute(
                    "SELECT c.id, c.language as conversation_language, "
                    "s.title, s.facilitator, s.objective, s.prompt, "
                    "s.welcome_message, s.scope, s.gpt_version, s.max_tokens, s.randomness, "
                    "f.title as facilitator_name, f.details as facilitator_details, "
                    "f.profile_picture, f.languages as facilitator_languages "
                    "FROM conversations c "
                    "LEFT JOIN sessions s ON c.sessions_id = s.id "
                    "LEFT JOIN facilitators f ON s.facilitator = f.id "
                    "WHERE c.id = %s",
                    (conv_id,),
                )
                row = cur.fetchone()
                if row:
                    session_title = row.get("title") or session_title
                    facilitator_name = row.get("facilitator_name") or facilitator_name
                    facilitator_details = row.get("facilitator_details") or ""
                    objective = row.get("objective") or objective
                    session_prompt = row.get("prompt") or ""
                    welcome_message_template = row.get("welcome_message") or ""
                    session_scope = row.get("scope") or ""
                    gpt_version = row.get("gpt_version")
                    max_tokens_cfg = row.get("max_tokens")
                    randomness_cfg = row.get("randomness")
                    pp = row.get("profile_picture") or ""
                    if pp:
                        avatar_url = f"/storage/v1/object/public/facilitator-avatars/{pp}"
                    # Priority 1: use the conversation's chosen language (ISO code → full name)
                    conv_lang_code = (row.get("conversation_language") or "").strip().lower()
                    if conv_lang_code and conv_lang_code != "en":
                        facilitator_language = LANGUAGE_CODE_MAP.get(conv_lang_code, conv_lang_code.capitalize())
                    elif conv_lang_code == "en":
                        facilitator_language = "English"  # explicit English — still set so instruction is clear
                    else:
                        # Fallback: use first language from facilitator's supported languages
                        langs = row.get("facilitator_languages")
                        if langs and isinstance(langs, list) and len(langs) > 0:
                            facilitator_language = langs[0]
                        elif langs and isinstance(langs, str) and langs.strip():
                            facilitator_language = langs.strip()
                conn.close()
            except Exception as e:
                print(f"Error fetching session context: {e}")
                traceback.print_exc()

        model = GPT_MODEL_MAP.get(str(gpt_version).lower().strip(), DEFAULT_AI_MODEL) if gpt_version else DEFAULT_AI_MODEL
        try:
            max_tokens = int(max_tokens_cfg) if max_tokens_cfg and str(max_tokens_cfg) != "None" else 600
        except (ValueError, TypeError):
            max_tokens = 600
        try:
            temperature = float(randomness_cfg) if randomness_cfg and str(randomness_cfg) != "None" else 0.7
        except (ValueError, TypeError):
            temperature = 0.7
        temperature = max(0.0, min(2.0, temperature))

        system_parts = []
        if session_prompt:
            system_parts.append(session_prompt)
        else:
            system_parts.append(
                f"You are {facilitator_name}, an AI workshop facilitator. "
                f'You are facilitating a session titled "{session_title}".'
            )
        if facilitator_details:
            system_parts.append(f"Background: {facilitator_details}")
        system_parts.append(f"Session objective: {objective}")
        if session_scope:
            system_parts.append(f"Session scope: {session_scope}")

        language_instruction = ""
        if facilitator_language:
            language_instruction = (
                f"\n\nLANGUAGE REQUIREMENT (MANDATORY):\n"
                f"You MUST respond exclusively in {facilitator_language}. "
                f"Every single message you send — including greetings, questions, summaries, and reports — "
                f"must be written entirely in {facilitator_language}. "
                f"Do NOT use any other language, even if participants write in a different language. "
                f"If a participant writes in another language, still respond in {facilitator_language}."
            )

        system_parts.append(
            f"Your name is {facilitator_name}. Always introduce yourself using this exact name.\n\n"
            "IMPORTANT RULES:\n"
            "- Keep responses concise (2-4 paragraphs max).\n"
            "- Always end with a clear, engaging question to keep the discussion going.\n"
            "- Address participants warmly and reference their specific contributions when responding to answers.\n"
            "- Use a professional yet approachable tone.\n"
            "- Do NOT use markdown headers (##) in chat messages.\n"
            "- Do NOT use placeholder text like [Your Name] - always use your actual name."
            + language_instruction
        )

        if host_instruction:
            system_parts.append(
                "HOST INSTRUCTION (HIGH PRIORITY):\n"
                f'The session host has given you the following directive: "{host_instruction}"\n'
                "You MUST follow this instruction in your next response. Adapt your message "
                "accordingly while maintaining your facilitator persona."
            )

        system_message = "\n\n".join(system_parts)

        if is_session_start:
            user_prompt = (
                f'Generate a warm, engaging welcome message for the workshop "{session_title}".\n'
                f"The objective is: {objective}\n"
            )
            if welcome_message_template:
                user_prompt += f"Use this as inspiration (but make it your own): {welcome_message_template}\n"
            user_prompt += (
                "Include:\n"
                "1. A warm greeting introducing yourself by name\n"
                "2. Brief mention of the session topic and what participants will gain\n"
                "3. An opening question to get participants engaged and sharing\n\n"
                "Keep it to 2-3 short paragraphs. Be enthusiastic but professional."
            )
        elif generate_report:
            all_messages = []
            try:
                conn = get_db()
                cur = conn.cursor()
                cur.execute("SELECT m.content, m.role, m.name, m.created_at FROM messages m WHERE m.conversation_id = %s ORDER BY m.created_at", (conv_id,))
                all_messages = cur.fetchall()
                conn.close()
            except Exception as e:
                print(f"Error fetching messages for report: {e}")
            conversation_text = ""
            for msg in all_messages:
                content = msg.get("content", {})
                if isinstance(content, str):
                    try:
                        content = json.loads(content)
                    except Exception:
                        content = {"text": content}
                # Skip private participant-to-host notes — they must never appear in AI context
                if isinstance(content, dict) and content.get("private_to_host"):
                    continue
                text = content.get("text", str(content)) if isinstance(content, dict) else str(content)
                role = msg.get("role", "unknown")
                name = msg.get("name", role)
                # Label host broadcasts clearly so the AI understands who is speaking
                if role == "admin" and name == "Host":
                    label = "HOST"
                elif role == "admin":
                    label = "ADMIN"
                else:
                    label = role.upper()
                conversation_text += f"[{label} - {name}]: {text}\n\n"
            user_prompt = (
                f'Generate a comprehensive session report for the workshop "{session_title}".\n'
                f"Objective: {objective}\n\n"
                f"Here is the full conversation:\n\n{conversation_text}\n\n"
                "Please create a structured report with:\n"
                "1. Executive Summary\n2. Key Discussion Points\n"
                "3. Participant Insights\n4. Key Takeaways\n5. Recommended Next Steps\n\n"
                "Use markdown formatting with ## headers for sections."
            )
            max_tokens = min(max_tokens * 2, 1500)
        else:
            recent_messages = []
            try:
                conn = get_db()
                cur = conn.cursor()
                cur.execute("SELECT m.content, m.role, m.name, m.created_at FROM messages m WHERE m.conversation_id = %s ORDER BY m.created_at DESC LIMIT 20", (conv_id,))
                recent_messages = list(reversed(cur.fetchall()))
                conn.close()
            except Exception as e:
                print(f"Error fetching recent messages: {e}")
            conversation_context = ""
            for msg in recent_messages:
                content = msg.get("content", {})
                if isinstance(content, str):
                    try:
                        content = json.loads(content)
                    except Exception:
                        content = {"text": content}
                # Skip private participant-to-host notes — they must never appear in AI context
                if isinstance(content, dict) and content.get("private_to_host"):
                    continue
                text = content.get("text", str(content)) if isinstance(content, dict) else str(content)
                role = msg.get("role", "unknown")
                name = msg.get("name", role)
                # Label host broadcasts clearly so the AI understands who is speaking
                if role == "admin" and name == "Host":
                    label = "HOST"
                elif role == "admin":
                    label = "ADMIN"
                else:
                    label = role.upper()
                conversation_context += f"[{label} - {name}]: {text}\n\n"
            if host_instruction:
                user_prompt = (
                    f'Here is the recent conversation in our workshop "{session_title}":\n\n'
                    f"{conversation_context}\n"
                    f"The host has instructed you to: {host_instruction}\n\n"
                    "Follow the host's instruction. Reference participants' contributions where relevant. "
                    "Keep your response to 2-3 short paragraphs."
                )
            else:
                user_prompt = (
                    f'Here is the recent conversation in our workshop "{session_title}":\n\n'
                    f"{conversation_context}\n"
                    "Based on the participants' responses above:\n"
                    "1. Briefly acknowledge and synthesize the key themes from their answers\n"
                    "2. Highlight any interesting connections or contrasts between different participants' views\n"
                    "3. Ask a thoughtful follow-up question that builds on what they shared\n\n"
                    "Keep your response to 2-3 short paragraphs. Be specific about what participants said."
                )

        print(f"[AI] Calling {model} for conv={conv_id} (start={is_session_start}, report={generate_report})")
        try:
            response = openai_client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": system_message}, {"role": "user", "content": user_prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            txt = response.choices[0].message.content.strip()
            print(f"[AI] Response received ({len(txt)} chars)")
        except Exception as e:
            print(f"[AI] OpenAI API error: {e}")
            traceback.print_exc()
            if is_session_start:
                txt = (f'Welcome to "{session_title}"! I\'m {facilitator_name}, and I\'m excited to facilitate our session today.\n\n'
                       f"Our objective is: {objective}\n\n"
                       "To get us started, I'd love to hear from each of you. What brings you here today, and what do you hope to take away from this session?")
            elif generate_report:
                txt = f"## Session Report: {session_title}\n\nThank you all for participating in this workshop."
            else:
                txt = ("Thank you for sharing your thoughts! I've noted some interesting perspectives.\n\n"
                       "Let me ask a follow-up question: What challenges or obstacles do you see in applying these ideas in practice?")

        msg_id = None
        if conv_id:
            try:
                conn = get_db()
                cur = conn.cursor()
                content_json = json.dumps({"text": txt, **({"avatar": avatar_url} if avatar_url else {})})
                cur.execute(
                    "INSERT INTO messages (conversation_id, content, role, name) VALUES (%s, %s, 'assistant', %s) RETURNING id",
                    (conv_id, content_json, facilitator_name),
                )
                msg_id = cur.fetchone()["id"]
                if is_session_start:
                    cur.execute("UPDATE conversations SET welcome_message_status = 'ai_ready' WHERE id = %s", (conv_id,))
                conn.commit()
                conn.close()
                # Broadcast new AI message to all WebSocket clients in this room.
                asyncio.create_task(manager.broadcast(str(conv_id), {
                    "event": "INSERT",
                    "payload": {
                        "eventType": "INSERT",
                        "new": {
                            "id": str(msg_id),
                            "conversation_id": str(conv_id),
                            "content": content_json,
                            "role": "assistant",
                            "name": facilitator_name,
                            "created_at": datetime.utcnow().isoformat(),
                        },
                        "old": {},
                        "table": "messages",
                        "schema": "public",
                    },
                }))
            except Exception as e:
                print(f"Error saving AI message: {e}")
                traceback.print_exc()

        return {"content": txt, "id": str(msg_id) if msg_id else str(uuid.uuid4()), "success": True}

    # ── generate-ai-welcome (stub) ─────────────────────────────
    elif func_name == "generate-ai-welcome":
        return {"message": "Welcome to the session! I'm excited to facilitate our discussion today.", "success": True}

    # ── close-session-and-generate-report ─────────────────────
    elif func_name == "close-session-and-generate-report":
        # ── Security: extract user from JWT, not from untrusted request body ──
        _jwt_user = get_current_user(request)
        _jwt_user_id = (_jwt_user.get("sub") or _jwt_user.get("id")) if _jwt_user else None
        if not _jwt_user_id:
            raise HTTPException(401, "Authentication required to close a session")
        # Override any user_id sent in the body with the verified JWT identity
        user_id = _jwt_user_id
        conv_id = data.get("conversationId")
        report_content = ""
        report_id = str(uuid.uuid4())
        participant_count = 0
        message_count = 0
        session_title = "Workshop Session"
        objective = ""
        duration_minutes = 0

        # ── Security: verify the requesting user owns this conversation ──
        if conv_id:
            try:
                _chk_conn = get_db()
                _chk_cur = _chk_conn.cursor()
                _chk_cur.execute(
                    "SELECT user_id FROM conversations WHERE id = %s",
                    (conv_id,),
                )
                _chk_row = _chk_cur.fetchone()
                _chk_conn.close()
                _conv_owner = str(_chk_row["user_id"] if isinstance(_chk_row, dict) else _chk_row[0]) if _chk_row else None
                if not _chk_row or _conv_owner != str(user_id):
                    raise HTTPException(403, "You do not have permission to close this session")
            except HTTPException:
                raise
            except Exception as _e:
                print(f"Ownership check error: {_e}")
                raise HTTPException(500, "Failed to verify session ownership")

        # ── Security: verify the user's plan allows session reports ──
        try:
            _plan_conn = get_db()
            _plan_cur = _plan_conn.cursor()
            _plan_cur.execute(
                "SELECT pr.session_reports FROM profiles p "
                "LEFT JOIN plans pl ON p.current_plan_id = pl.id "
                "LEFT JOIN plan_restrictions pr ON pr.plan_id = pl.id "
                "WHERE p.id = %s::uuid",
                (user_id,),
            )
            _plan_row = _plan_cur.fetchone()
            _plan_conn.close()
            _can_generate = bool((_plan_row["session_reports"] if isinstance(_plan_row, dict) else _plan_row[0]) if _plan_row else False)
            if not _can_generate:
                raise HTTPException(403, "Your current plan does not include session reports. Please upgrade to access this feature.")
        except HTTPException:
            raise
        except Exception as _e:
            print(f"Plan check error: {_e}")
            # Fail open on plan check errors to avoid blocking legitimate users

        if conv_id:
            conn = None
            try:
                conn = get_db()
                conn.autocommit = True
                cur = conn.cursor()
                cur.execute(
                    "SELECT s.title, s.objective FROM conversations c "
                    "LEFT JOIN sessions s ON c.sessions_id = s.id WHERE c.id = %s",
                    (conv_id,),
                )
                srow = cur.fetchone()
                if srow:
                    session_title = srow.get("title") or session_title
                    objective = srow.get("objective") or ""
                cur.execute("SELECT COUNT(*) FROM session_participants WHERE conversation_id = %s", (conv_id,))
                row = cur.fetchone()
                participant_count = row["count"] if isinstance(row, dict) else row[0]
                cur.execute("SELECT name FROM session_participants WHERE conversation_id = %s", (conv_id,))
                participant_names = [r["name"] for r in cur.fetchall() if r.get("name")]
                cur.execute("SELECT COUNT(*) FROM messages WHERE conversation_id = %s", (conv_id,))
                row = cur.fetchone()
                message_count = row["count"] if isinstance(row, dict) else row[0]
                cur.execute("SELECT content, role, name, created_at FROM messages WHERE conversation_id = %s ORDER BY created_at", (conv_id,))
                all_msgs = cur.fetchall()
                transcript = ""
                for msg in all_msgs:
                    content = msg.get("content", {})
                    if isinstance(content, str):
                        try:
                            content = json.loads(content)
                        except Exception:
                            content = {"text": content}
                    text = content.get("text", str(content))
                    transcript += f"[{msg.get('name', msg.get('role', 'unknown'))} ({msg.get('role', 'unknown')})]: {text}\n\n"
                try:
                    resp = openai_client.chat.completions.create(
                        model=DEFAULT_AI_MODEL,
                        messages=[
                            {"role": "system", "content": "You are an expert at summarizing workshop sessions into clear, actionable reports."},
                            {"role": "user", "content": (
                                f'Generate a comprehensive session report for the workshop "{session_title}".\n'
                                f"Objective: {objective}\n"
                                f"Participants ({participant_count}): {', '.join(participant_names) if participant_names else 'Anonymous participants'}\n"
                                f"Total messages: {message_count}\n\nFull conversation transcript:\n{transcript}\n\n"
                                "Create a well-structured report with sections: ## Executive Summary, ## Key Discussion Points, ## Participant Contributions, ## Key Takeaways & Insights, ## Recommended Next Steps\n\n"
                                "Use markdown formatting. Be specific and reference actual content from the discussion."
                            )},
                        ],
                        max_tokens=1500,
                        temperature=0.5,
                    )
                    report_content = resp.choices[0].message.content.strip()
                except Exception as e:
                    print(f"[AI] Report generation error: {e}")
                    report_content = f"## Session Report: {session_title}\n\n**Objective:** {objective}\n\n**Participants:** {participant_count}\n**Messages exchanged:** {message_count}\n\nThis session has been completed successfully."

                cur.execute(
                    "INSERT INTO session_reports (id, conversation_id, report_content, report_type, generated_by, metadata) VALUES (%s, %s, %s, 'comprehensive', %s, %s) RETURNING id",
                    (report_id, conv_id, report_content, user_id, json.dumps({"participant_count": participant_count, "message_count": message_count})),
                )
                row = cur.fetchone()
                report_id = str(row["id"] if isinstance(row, dict) else row[0])
                cur.execute(
                    "UPDATE conversations SET is_session_ended = true, ended_at = NOW(), status = 'completed', final_report_id = %s, total_messages = %s WHERE id = %s",
                    (report_id, message_count, conv_id),
                )
                cur.execute(
                    "INSERT INTO session_events (conversation_id, event_type, data) VALUES (%s, 'session_ended', %s)",
                    (conv_id, json.dumps({"ended_by": user_id, "report_id": report_id})),
                )
                # Broadcast session ended to all WebSocket clients.
                asyncio.create_task(manager.broadcast(str(conv_id), {
                    "event": "UPDATE",
                    "payload": {
                        "eventType": "UPDATE",
                        "new": {"id": str(conv_id), "is_session_ended": True, "status": "completed"},
                        "old": {},
                        "table": "conversations",
                        "schema": "public",
                    },
                }))
            except Exception as e:
                print(f"Error closing session: {e}")
                traceback.print_exc()
                if not report_content:
                    report_content = f"## Session Report\n\nSession completed. Participants: {participant_count}, Messages: {message_count}"
            finally:
                if conn:
                    try:
                        conn.close()
                    except Exception:
                        pass

        return {
            "success": True,
            "reportId": report_id,
            "reportContent": report_content,
            "sessionData": {
                "participantCount": participant_count,
                "messageCount": message_count,
                "duration": duration_minutes,
                "engagementScore": min(100, int((message_count / max(participant_count, 1)) * 20)),
            },
        }

    # ── validate-coupon ────────────────────────────────────────
    # Validates a Stripe coupon/promotion code and returns the discount details.
    # The frontend uses this to show a live discounted price before checkout.
    elif func_name == "validate-coupon":
        if not STRIPE_CONFIGURED:
            raise HTTPException(500, "Stripe is not configured on this server")
        coupon_code = (data.get("couponCode") or "").strip().upper()
        if not coupon_code:
            raise HTTPException(400, "Missing couponCode")
        try:
            # First try to find a promotion code (customer-facing code)
            promo_codes = stripe_lib.PromotionCode.list(code=coupon_code, active=True, limit=1)
            if promo_codes.data:
                promo = promo_codes.data[0]
                coupon = promo.coupon
                return {
                    "valid": True,
                    "couponId": coupon.id,
                    "promoCodeId": promo.id,
                    "percentOff": coupon.percent_off,
                    "amountOff": coupon.amount_off,
                    "currency": coupon.currency,
                    "duration": coupon.duration,
                    "durationInMonths": coupon.duration_in_months,
                    "name": coupon.name or coupon_code,
                }
            # Fall back to looking up the coupon directly by ID
            try:
                coupon = stripe_lib.Coupon.retrieve(coupon_code)
                if coupon and coupon.valid:
                    return {
                        "valid": True,
                        "couponId": coupon.id,
                        "promoCodeId": None,
                        "percentOff": coupon.percent_off,
                        "amountOff": coupon.amount_off,
                        "currency": coupon.currency,
                        "duration": coupon.duration,
                        "durationInMonths": coupon.duration_in_months,
                        "name": coupon.name or coupon_code,
                    }
            except stripe_lib.error.InvalidRequestError:
                pass
            return {"valid": False, "error": "Invalid or expired promo code"}
        except stripe_lib.error.StripeError as se:
            raise HTTPException(400, str(se))

    # ── create-subscription ────────────────────────────────────
    elif func_name == "create-subscription":
        if not STRIPE_CONFIGURED:
            raise HTTPException(500, "Stripe is not configured on this server")
        plan_id = data.get("planId")
        stripe_plan_id = data.get("stripePlanId")
        user_id = data.get("userId")
        billing = data.get("billingDetails", {})
        if not stripe_plan_id or not user_id:
            raise HTTPException(400, "Missing planId, stripePlanId, or userId")
        # Optional coupon/promo code — validated by validate-coupon before reaching here
        coupon_id = data.get("couponId")  # Stripe coupon ID (not the human-readable code)
        try:
            price_obj = stripe_lib.Price.retrieve(stripe_plan_id)
            amount = price_obj.unit_amount
            currency = price_obj.currency

            # Apply percentage or fixed discount to the PaymentIntent amount
            if coupon_id:
                try:
                    coupon = stripe_lib.Coupon.retrieve(coupon_id)
                    if coupon.valid:
                        if coupon.percent_off:
                            discount = int(amount * coupon.percent_off / 100)
                            amount = max(50, amount - discount)  # Stripe minimum is 50 cents
                        elif coupon.amount_off:
                            amount = max(50, amount - coupon.amount_off)
                except stripe_lib.error.InvalidRequestError:
                    coupon_id = None  # Ignore invalid coupon silently

            conn = get_db()
            cur = conn.cursor()
            cur.execute("SELECT stripe_customer_id FROM profiles WHERE id = %s", (user_id,))
            profile = cur.fetchone()
            customer_id = profile["stripe_customer_id"] if profile else None
            if not customer_id:
                customer = stripe_lib.Customer.create(
                    email=billing.get("email", ""),
                    name=billing.get("name", ""),
                    address={"line1": billing.get("address", {}).get("line1", ""), "city": billing.get("address", {}).get("city", ""), "state": billing.get("address", {}).get("state", ""), "postal_code": billing.get("address", {}).get("postal_code", ""), "country": billing.get("address", {}).get("country", "")},
                    metadata={"user_id": user_id},
                )
                customer_id = customer.id
                cur.execute("UPDATE profiles SET stripe_customer_id = %s WHERE id = %s", (customer_id, user_id))
            conn.commit()
            cur.close()
            conn.close()
            intent_meta = {"user_id": user_id, "plan_id": str(plan_id), "stripe_plan_id": stripe_plan_id}
            if coupon_id:
                intent_meta["coupon_id"] = coupon_id
            intent = stripe_lib.PaymentIntent.create(
                amount=amount,
                currency=currency,
                customer=customer_id,
                metadata=intent_meta,
                automatic_payment_methods={"enabled": True},
            )
            return {"clientSecret": intent.client_secret, "subscriptionId": intent.id, "customerId": customer_id, "discountedAmount": amount, "success": True}
        except stripe_lib.error.StripeError as se:
            raise HTTPException(400, str(se))

    # ── confirm-subscription ───────────────────────────────────
    elif func_name == "confirm-subscription":
        payment_intent_id = data.get("paymentIntentId")
        user_id = data.get("userId")
        plan_id = data.get("planId")
        customer_id = data.get("customerId")
        if not payment_intent_id or not user_id:
            raise HTTPException(400, "Missing paymentIntentId or userId")
        try:
            intent = stripe_lib.PaymentIntent.retrieve(payment_intent_id)
            if intent.status not in ("succeeded", "processing"):
                raise HTTPException(400, f"Payment not completed. Status: {intent.status}")
            conn = get_db()
            cur = conn.cursor()
            cur.execute(
                "UPDATE profiles SET current_plan_id = %s, subscription_status = 'active', stripe_customer_id = COALESCE(%s, stripe_customer_id), stripe_subscription_id = %s, updated_at = NOW() WHERE id = %s",
                (plan_id, customer_id, payment_intent_id, user_id),
            )
            conn.commit()
            conn.close()
            return {"success": True, "status": "active", "planId": plan_id}
        except stripe_lib.error.StripeError as se:
            raise HTTPException(400, str(se))

    # ── create-portal-session ──────────────────────────────────
    elif func_name == "create-portal-session":
        user_id = data.get("userId")
        return_url = data.get("returnUrl", "https://aifacilitator.vercel.app/settings")
        if not user_id:
            raise HTTPException(400, "Missing userId")
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute("SELECT stripe_customer_id FROM profiles WHERE id = %s", (user_id,))
            profile = cur.fetchone()
            conn.close()
            customer_id = profile["stripe_customer_id"] if profile else None
            if not customer_id:
                raise HTTPException(400, "No Stripe customer found for this user")
            session = stripe_lib.billing_portal.Session.create(customer=customer_id, return_url=return_url)
            return {"url": session.url, "success": True}
        except stripe_lib.error.StripeError as se:
            raise HTTPException(400, str(se))

    # ── create-template-welcome-message ───────────────────────
    elif func_name == "create_template_welcome_message":
        conv_id = data.get("conversationId")
        if not conv_id:
            raise HTTPException(400, "Missing conversationId")
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute(
                "SELECT s.welcome_message, f.title as facilitator_name, c.language as conv_lang "
                "FROM conversations c LEFT JOIN sessions s ON c.sessions_id = s.id "
                "LEFT JOIN facilitators f ON s.facilitator = f.id WHERE c.id = %s",
                (conv_id,),
            )
            row = cur.fetchone()
            template = (row.get("welcome_message") or "") if row else ""
            fname = (row.get("facilitator_name") or "Facilitator") if row else "Facilitator"
            conv_lang_code = (row.get("conv_lang") or "en").strip().lower() if row else "en"
            # Map ISO code to full language name for the AI instruction
            lang_map = {
                "en": "English", "fr": "French", "es": "Spanish", "de": "German",
                "it": "Italian", "pt": "Portuguese", "nl": "Dutch", "pl": "Polish",
                "ru": "Russian", "ja": "Japanese", "ko": "Korean", "zh": "Chinese",
                "ar": "Arabic", "hi": "Hindi", "tr": "Turkish",
            }
            lang_name = lang_map.get(conv_lang_code, conv_lang_code.capitalize())
            if not template:
                template = f"Welcome! I'm {fname}. I'm excited to facilitate today's session."
            # If a non-English language is selected, generate the welcome message via AI
            # so it is in the correct language rather than using the English template.
            if conv_lang_code != "en":
                try:
                    from openai import OpenAI as _OAI
                    _client = _OAI()
                    _resp = _client.chat.completions.create(
                        model=DEFAULT_AI_MODEL,
                        messages=[
                            {"role": "system", "content": (
                                f"You are {fname}, an AI workshop facilitator. "
                                f"You MUST respond exclusively in {lang_name}. "
                                f"Every word must be in {lang_name}."
                            )},
                            {"role": "user", "content": (
                                f"Generate a warm welcome message based on this template: {template}. "
                                f"Write it entirely in {lang_name}."
                            )},
                        ],
                        max_tokens=300,
                        temperature=0.7,
                    )
                    template = _resp.choices[0].message.content.strip()
                except Exception as ai_err:
                    print(f"[template-welcome] AI translation failed, using original: {ai_err}")
            cur.execute(
                "INSERT INTO messages (conversation_id, content, role, name) VALUES (%s, %s, 'assistant', %s) RETURNING id",
                (conv_id, json.dumps({"text": template}), fname),
            )
            msg_id = cur.fetchone()["id"]
            cur.execute("UPDATE conversations SET welcome_message_status = 'template_ready' WHERE id = %s", (conv_id,))
            conn.commit()
            conn.close()
            return {"success": True, "messageId": str(msg_id), "content": template}
        except Exception as e:
            raise HTTPException(500, str(e))

    # ── Unknown function ───────────────────────────────────────
    raise HTTPException(404, f"Function '{func_name}' not found")


# ============================================================
# Stripe Webhook
# ============================================================
@app.post("/stripe-webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        event = stripe_lib.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except stripe_lib.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")
    except Exception as e:
        raise HTTPException(400, str(e))

    event_type = event["type"]
    event_data = event["data"]["object"]
    print(f"Stripe webhook: {event_type}")

    try:
        conn = get_db()
        cur = conn.cursor()
        if event_type == "payment_intent.succeeded":
            pi = event_data
            user_id = pi.get("metadata", {}).get("user_id")
            plan_id = pi.get("metadata", {}).get("plan_id")
            customer_id = pi.get("customer")
            if user_id and plan_id:
                cur.execute(
                    "UPDATE profiles SET current_plan_id = %s, subscription_status = 'active', stripe_customer_id = COALESCE(%s, stripe_customer_id), stripe_subscription_id = COALESCE(%s, stripe_subscription_id), updated_at = NOW() WHERE id = %s",
                    (plan_id, customer_id, pi.get("id"), user_id),
                )
        elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
            sub = event_data
            customer_id = sub.get("customer")
            status = sub.get("status")
            db_status = "active" if status == "active" else ("past_due" if status == "past_due" else ("canceled" if status in ("canceled", "unpaid") else status))
            if customer_id:
                cur.execute("UPDATE profiles SET subscription_status = %s, stripe_subscription_id = %s, updated_at = NOW() WHERE stripe_customer_id = %s", (db_status, sub.get("id"), customer_id))
        elif event_type == "customer.subscription.deleted":
            sub = event_data
            customer_id = sub.get("customer")
            if customer_id:
                cur.execute("UPDATE profiles SET subscription_status = 'canceled', stripe_subscription_id = NULL, current_plan_id = (SELECT id FROM plans WHERE plan_type = 'free' LIMIT 1), updated_at = NOW() WHERE stripe_customer_id = %s", (customer_id,))
        elif event_type == "invoice.payment_failed":
            inv = event_data
            customer_id = inv.get("customer")
            if customer_id:
                cur.execute("UPDATE profiles SET subscription_status = 'past_due', updated_at = NOW() WHERE stripe_customer_id = %s", (customer_id,))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Stripe webhook DB error for event {event_type}: {e}")
        traceback.print_exc()
        return {"received": True, "warning": "DB update failed"}

    return {"received": True}


# ============================================================
# Storage
# ============================================================
@app.get("/storage/v1/object/public/{filepath:path}")
async def storage_public(filepath: str):
    full_path = os.path.join(STORAGE_DIR, filepath)
    if os.path.exists(full_path):
        return FileResponse(full_path)
    raise HTTPException(404, "File not found")


@app.post("/storage/v1/object/{bucket}/{filepath:path}")
@app.put("/storage/v1/object/{bucket}/{filepath:path}")
async def storage_upload(bucket: str, filepath: str, request: Request):
    os.makedirs(os.path.join(STORAGE_DIR, bucket), exist_ok=True)
    body = await request.body()
    if body:
        fp = os.path.join(STORAGE_DIR, bucket, filepath)
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        with open(fp, "wb") as f:
            f.write(body)
    return {"Key": f"{bucket}/{filepath}", "Id": str(uuid.uuid4())}


@app.head("/storage/v1/object/public/{bucket}/{filepath:path}")
async def storage_head(bucket: str, filepath: str):
    exists = os.path.exists(os.path.join(STORAGE_DIR, bucket, filepath))
    return Response(status_code=200 if exists else 404)


# ============================================================
# WebSocket Realtime endpoint
# ============================================================
@app.websocket("/realtime/v1/websocket")
async def realtime_websocket(websocket: WebSocket):
    """
    Supabase Realtime-compatible WebSocket endpoint.
    Clients subscribe to channels (e.g. 'realtime:public:messages:conversation_id=eq.<id>')
    and receive INSERT/UPDATE/DELETE events for that conversation.
    """
    # Extract conversation_id from query params (apikey is the JWT)
    query_params = dict(websocket.query_params)
    apikey = query_params.get("apikey", "")

    # Validate JWT
    try:
        jwt.decode(apikey, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        await websocket.close(code=4001)
        return

    # We track which conversation_id this socket is subscribed to
    subscribed_conv_id: Optional[str] = None

    await websocket.accept()
    print(f"[WS] Client connected")

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except Exception:
                continue

            event = msg.get("event")
            topic = msg.get("topic", "")
            ref = msg.get("ref")

            # Heartbeat
            if event == "heartbeat":
                await websocket.send_json({"event": "heartbeat", "topic": topic, "ref": ref, "payload": {}})
                continue

            # Subscribe to a channel
            if event == "phx_join":
                # Strategy: extract the numeric conversation_id from the topic string.
                # The frontend uses channel names like:
                #   - 'conversation-{id}', 'messages-{id}', 'participants-{id}'
                #   - 'enhanced-host-{id}-{timestamp}', 'admin-session-participants-{id}'
                #   - 'realtime:public:messages:conversation_id=eq.{id}' (legacy)
                # We try patterns in order of specificity.
                conv_id: Optional[str] = None
                # 1. Explicit filter: conversation_id=eq.{id}
                m = re.search(r"conversation_id=eq\.([^&:]+)", topic)
                if m:
                    conv_id = m.group(1)
                # 2. Explicit filter: id=eq.{id}
                if not conv_id:
                    m = re.search(r"(?:^|[^a-z])id=eq\.([^&:]+)", topic)
                    if m:
                        conv_id = m.group(1)
                # 3. Named channel patterns: {prefix}-{numeric_id} or {prefix}-{numeric_id}-{suffix}
                if not conv_id:
                    m = re.search(r"-([0-9]+)(?:-|$)", topic)
                    if m:
                        conv_id = m.group(1)
                # 4. Trailing numeric id: {prefix}-{numeric_id} (no suffix)
                if not conv_id:
                    m = re.search(r"-([0-9]+)$", topic)
                    if m:
                        conv_id = m.group(1)
                if conv_id:
                    subscribed_conv_id = conv_id
                    await manager.connect(websocket, conv_id, topic)
                    print(f"[WS] Subscribed topic={topic!r} → conv={conv_id}")
                else:
                    print(f"[WS] phx_join: could not extract conv_id from topic={topic!r}")
                await websocket.send_json({
                    "event": "phx_reply",
                    "topic": topic,
                    "ref": ref,
                    "payload": {"status": "ok", "response": {}},
                })
                continue

            # Unsubscribe
            if event == "phx_leave":
                if subscribed_conv_id:
                    await manager.disconnect(websocket, subscribed_conv_id)
                    subscribed_conv_id = None
                await websocket.send_json({
                    "event": "phx_reply",
                    "topic": topic,
                    "ref": ref,
                    "payload": {"status": "ok", "response": {}},
                })
                continue

    except WebSocketDisconnect:
        if subscribed_conv_id:
            await manager.disconnect(websocket, subscribed_conv_id)
        print("[WS] Client disconnected")
    except Exception as e:
        print(f"[WS] Error: {e}")
        if subscribed_conv_id:
            await manager.disconnect(websocket, subscribed_conv_id)


# ============================================================
# Entry point
# ============================================================
if __name__ == "__main__":
    import sys
    import uvicorn
    os.makedirs(STORAGE_DIR, exist_ok=True)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3333
    print(f"Starting MyFacilitator FastAPI proxy v3 on port {port}...")
    uvicorn.run("server_fastapi:app", host="0.0.0.0", port=port, reload=False, workers=1)
