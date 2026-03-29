"""
Supabase-compatible local proxy server v2.
Emulates PostgREST, GoTrue Auth, Edge Functions, and Storage.
Supports nested foreign key joins in select queries.
"""
import os
import re
import json
import uuid
import time
import hashlib
import traceback
from datetime import datetime
from decimal import Decimal

import jwt
import psycopg2
import psycopg2.extras
from flask import Flask, request, jsonify, make_response, send_from_directory
from flask_cors import CORS
from openai import OpenAI

# OpenAI client – uses OPENAI_API_KEY and OPENAI_BASE_URL env vars automatically
openai_client = OpenAI()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True,
     allow_headers=["*"], expose_headers=["Content-Range", "X-Total-Count"])

# Database configuration – read from environment variables in production.
# Railway auto-injects PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD from the linked Postgres service.
# DATABASE_URL (full URL) takes priority if explicitly set.
DB_URL = os.environ.get("DATABASE_URL")  # Full URL takes priority if set
DB_NAME = os.environ.get("PGDATABASE") or os.environ.get("DB_NAME", "ai_facilitator")
DB_USER = os.environ.get("PGUSER") or os.environ.get("DB_USER", "postgres")
DB_HOST = os.environ.get("PGHOST") or os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("PGPORT") or os.environ.get("DB_PORT", "5432"))
DB_PASSWORD = os.environ.get("PGPASSWORD") or os.environ.get("DB_PASSWORD", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-jwt-token-for-local-dev")
STORAGE_DIR = os.environ.get("STORAGE_DIR", "/app/storage")

# Map session gpt_version values to available models
# The proxy supports: gpt-4.1-mini, gpt-4.1-nano, gemini-2.5-flash
GPT_MODEL_MAP = {
    "gpt-4": "gpt-4.1-mini",
    "gpt-4o": "gpt-4.1-mini",
    "gpt-4-turbo": "gpt-4.1-mini",
    "gpt-3.5-turbo": "gpt-4.1-nano",
    "gpt-3.5": "gpt-4.1-nano",
}
DEFAULT_AI_MODEL = "gpt-4.1-mini"

USERS = {}
SESSIONS_AUTH = {}

# Pre-register test users matching the profile IDs in the database
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
USERS["john.doe1764521269@gmail.com"] = {
    "id": "75c1329f-759f-4f66-9e0c-47c1efbbb275",
    "email": "john.doe1764521269@gmail.com",
    "password": hashlib.sha256("test123".encode()).hexdigest(),
    "created_at": "2025-11-28T03:15:56Z",
    "email_confirmed_at": "2025-11-28T03:15:56Z",
}
USERS["guest@myfacilitator.com"] = {
    "id": "e9a8a600-e690-460d-b59c-ec95154c8b2e",
    "email": "guest@myfacilitator.com",
    "password": hashlib.sha256("test123".encode()).hexdigest(),
    "created_at": "2025-02-28T03:15:56Z",
    "email_confirmed_at": "2025-02-28T03:15:56Z",
}

# FK map: constraint_name -> (table, column, foreign_table, foreign_column)
FK_MAP = {
    "conversations_sessions_id_fkey": ("conversations", "sessions_id", "sessions", "id"),
    "fk_conversations_sessions": ("conversations", "sessions_id", "sessions", "id"),
    "conversations_final_report_id_fkey": ("conversations", "final_report_id", "session_reports", "id"),
    "sessions_facilitator_fkey": ("sessions", "facilitator", "facilitators", "id"),
    "facilitators_plan_id_fkey": ("facilitators", "plan_id", "plans", "id"),
    "plan_restrictions_plan_id_fkey": ("plan_restrictions", "plan_id", "plans", "id"),
    "messages_conversation_id_fkey": ("messages", "conversation_id", "conversations", "id"),
    "fk_messages_conversations": ("messages", "conversation_id", "conversations", "id"),
    "messages_facilitator_id_fkey": ("messages", "facilitator_id", "facilitators", "id"),
    "feedback_conversation_id_fkey": ("feedback", "conversation_id", "conversations", "id"),
    "session_events_conversation_id_fkey": ("session_events", "conversation_id", "conversations", "id"),
    "session_participants_conversation_id_fkey": ("session_participants", "conversation_id", "conversations", "id"),
    "session_reports_conversation_id_fkey": ("session_reports", "conversation_id", "conversations", "id"),
    "admin_notifications_conversation_id_fkey": ("admin_notifications", "conversation_id", "conversations", "id"),
}

PARENT_FK = {}
for cname, (tbl, col, ftbl, fcol) in FK_MAP.items():
    PARENT_FK.setdefault(ftbl, []).append((tbl, col, fcol, cname))

CHILD_FK = {}
for cname, (tbl, col, ftbl, fcol) in FK_MAP.items():
    CHILD_FK.setdefault(tbl, []).append((col, ftbl, fcol, cname))


def get_db():
    if DB_URL:
        # Railway / production: use the full DATABASE_URL connection string
        conn = psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    else:
        # Local development: use individual parameters
        conn = psycopg2.connect(
            dbname=DB_NAME, user=DB_USER, host=DB_HOST, port=DB_PORT,
            password=DB_PASSWORD,
            cursor_factory=psycopg2.extras.RealDictCursor)
    conn.autocommit = True
    return conn


def serialize_value(val):
    if val is None:
        return None
    if isinstance(val, Decimal):
        return int(val) if val == val.to_integral_value() else float(val)
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, uuid.UUID):
        return str(val)
    if hasattr(val, 'isoformat'):
        return val.isoformat()
    if isinstance(val, bytes):
        return val.decode('utf-8', errors='replace')
    if isinstance(val, dict):
        return {k: serialize_value(v) for k, v in val.items()}
    if isinstance(val, list):
        return [serialize_value(v) for v in val]
    return val


def serialize_row(row):
    return {k: serialize_value(v) for k, v in row.items()}


def generate_jwt_token(user_id, email, role="authenticated"):
    now = int(time.time())
    return jwt.encode({
        "aud": "authenticated", "exp": now + 86400, "iat": now,
        "iss": "supabase-local", "sub": str(user_id), "email": email,
        "role": role,
        "app_metadata": {"provider": "email", "providers": ["email"]},
        "user_metadata": {},
    }, JWT_SECRET, algorithm="HS256")


def get_current_user():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            return jwt.decode(auth_header[7:], JWT_SECRET, algorithms=["HS256"],
                              options={"verify_exp": False, "verify_iat": False, "verify_aud": False})
        except jwt.InvalidTokenError:
            pass
    return None


# ============================================================
# PostgREST Select Parser
# ============================================================
def parse_select_tree(select_str):
    select_str = select_str.strip()
    if not select_str:
        return [{"col": "*"}]
    result = []
    depth = 0
    current = ""
    for ch in select_str:
        if ch == '(' and depth == 0:
            depth += 1
            result.append({"_raw": current.strip(), "_has_sub": True})
            current = ""
        elif ch == '(':
            depth += 1
            current += ch
        elif ch == ')' and depth == 1:
            depth -= 1
            result[-1]["_sub"] = current.strip()
            current = ""
        elif ch == ')':
            depth -= 1
            current += ch
        elif ch == ',' and depth == 0:
            tok = current.strip()
            if tok:
                result.append({"_raw": tok})
            current = ""
        else:
            current += ch
    tok = current.strip()
    if tok:
        result.append({"_raw": tok})

    parsed = []
    for item in result:
        raw = item.get("_raw", "")
        sub = item.get("_sub")
        if sub is not None:
            ji = _parse_join_target(raw)
            ji["is_join"] = True
            ji["sub"] = parse_select_tree(sub)
            parsed.append(ji)
        elif raw:
            if ":" in raw and "!" not in raw:
                alias, col = raw.split(":", 1)
                parsed.append({"col": col.strip(), "alias": alias.strip()})
            else:
                parsed.append({"col": raw})
    return parsed


def _parse_join_target(raw):
    alias = None
    constraint = None
    is_inner = False
    if ":" in raw:
        alias, raw = raw.split(":", 1)
        alias = alias.strip()
        raw = raw.strip()
    if "!inner" in raw:
        is_inner = True
        raw = raw.replace("!inner", "!")
    if "!" in raw:
        parts = raw.split("!", 1)
        table = parts[0].strip()
        constraint = parts[1].strip() or None
    else:
        table = raw
    return {"table": table, "alias": alias, "constraint": constraint, "is_inner": is_inner}


def resolve_join(parent_table, join_info, parent_rows, conn):
    if not parent_rows:
        return
    join_table = join_info["table"]
    constraint = join_info.get("constraint")
    alias = join_info.get("alias")
    sub_selects = join_info.get("sub", [{"col": "*"}])
    key_name = alias or join_table


    fk_col = None
    parent_col = None
    direction = None

    if constraint and constraint in FK_MAP:
        fk_tbl, fk_col_name, fk_ftbl, fk_fcol = FK_MAP[constraint]
        if fk_tbl == parent_table and fk_ftbl == join_table:
            fk_col, parent_col, direction = fk_col_name, fk_fcol, "child_to_parent"
        elif fk_tbl == join_table and fk_ftbl == parent_table:
            fk_col, parent_col, direction = fk_col_name, fk_fcol, "parent_to_child"
    else:
        for child_tbl, child_col, par_col, _ in PARENT_FK.get(parent_table, []):
            if child_tbl == join_table:
                fk_col, parent_col, direction = child_col, par_col, "parent_to_child"
                break
        if not direction:
            for col, ftbl, fcol, _ in CHILD_FK.get(parent_table, []):
                if ftbl == join_table:
                    fk_col, parent_col, direction = col, fcol, "child_to_parent"
                    break

    if not direction:

        for row in parent_rows:
            row[key_name] = None
        return


    base_cols = [s.get("col", "*") for s in sub_selects if not s.get("is_join")]
    sub_joins = [s for s in sub_selects if s.get("is_join")]

    # Auto-include the join key column if not already in the select
    extra_join_cols = []
    if "*" not in base_cols:
        if direction == "child_to_parent":
            if parent_col not in base_cols:
                extra_join_cols.append(parent_col)
        elif direction == "parent_to_child":
            if fk_col not in base_cols:
                extra_join_cols.append(fk_col)
        # Also include FK cols needed for sub-joins
        for sj in sub_joins:
            sjt = sj.get("table")
            sjc = sj.get("constraint")
            needed = None
            if sjc and sjc in FK_MAP:
                sj_tbl, sj_col, sj_ftbl, sj_fcol = FK_MAP[sjc]
                if sj_tbl == join_table and sj_ftbl == sjt:
                    needed = sj_col
                elif sj_tbl == sjt and sj_ftbl == join_table:
                    needed = sj_fcol
            if needed and needed not in base_cols and needed not in extra_join_cols:
                extra_join_cols.append(needed)

    all_sub_cols = base_cols + extra_join_cols
    col_str = ", ".join([f'"{c}"' if c != "*" else c for c in all_sub_cols]) if all_sub_cols else "*"

    cur = conn.cursor()

    if direction == "child_to_parent":
        fk_values = list(set(r.get(fk_col) for r in parent_rows if r.get(fk_col) is not None))
        if not fk_values:
            for r in parent_rows:
                r[key_name] = None
            return
        ph = ",".join(["%s"] * len(fk_values))
        cur.execute(f'SELECT {col_str} FROM public."{join_table}" WHERE "{parent_col}" IN ({ph})', fk_values)
        jrows = [serialize_row(dict(r)) for r in cur.fetchall()]
        for sj in sub_joins:
            resolve_join(join_table, sj, jrows, conn)
        jmap = {jr.get(parent_col): jr for jr in jrows}
        for row in parent_rows:
            matched = jmap.get(row.get(fk_col))
            if matched and extra_join_cols:
                matched = {k: v for k, v in matched.items() if k not in extra_join_cols}
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
        groups = {}
        for jr in jrows:
            groups.setdefault(jr.get(fk_col), []).append(jr)
        for row in parent_rows:
            items = groups.get(row.get(parent_col), [])
            if extra_join_cols:
                items = [{k: v for k, v in it.items() if k not in extra_join_cols} for it in items]
            row[key_name] = items


def build_where(args):
    wc, wv = [], []
    for key, value in args.items():
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
            if v == "null": wc.append(f'"{key}" IS NULL')
            elif v == "true": wc.append(f'"{key}" = true')
            elif v == "false": wc.append(f'"{key}" = false')
        elif value.startswith("in."):
            items = [i.strip().strip('"').strip("'") for i in value[3:].strip("()").split(",")]
            wc.append(f'"{key}" IN ({",".join(["%s"]*len(items))})')
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


def build_order(order_str):
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
# Auth Endpoints
# ============================================================
@app.route("/auth/v1/signup", methods=["POST"])
def auth_signup():
    data = request.json or {}
    email, password = data.get("email", ""), data.get("password", "")
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    if email in USERS:
        return jsonify({"error": "User already registered"}), 400
    user_id = str(uuid.uuid4())
    USERS[email] = {"id": user_id, "email": email,
                    "password": hashlib.sha256(password.encode()).hexdigest(),
                    "created_at": datetime.utcnow().isoformat(),
                    "email_confirmed_at": datetime.utcnow().isoformat()}
    try:
        conn = get_db(); cur = conn.cursor()
        cur.execute("INSERT INTO public.profiles (id, role, current_plan_id, subscription_status) VALUES (%s, 'free', 1, 'free') ON CONFLICT DO NOTHING", (user_id,))
        conn.close()
    except Exception as e:
        print(f"Error creating profile: {e}")
    token = generate_jwt_token(user_id, email)
    SESSIONS_AUTH[token] = user_id
    return jsonify({"access_token": token, "token_type": "bearer", "expires_in": 86400,
                    "refresh_token": str(uuid.uuid4()),
                    "user": {"id": user_id, "aud": "authenticated", "role": "authenticated",
                             "email": email, "email_confirmed_at": datetime.utcnow().isoformat(),
                             "app_metadata": {"provider": "email", "providers": ["email"]},
                             "user_metadata": {}, "created_at": datetime.utcnow().isoformat()}})


@app.route("/auth/v1/token", methods=["POST"])
def auth_token():
    gt = request.args.get("grant_type", "password")
    data = request.json or {}
    if gt == "password":
        email, password = data.get("email", ""), data.get("password", "")
        pw_hash = hashlib.sha256(password.encode()).hexdigest()
        user = USERS.get(email)
        if not user or user["password"] != pw_hash:
            return jsonify({"error": "Invalid login credentials", "error_description": "Invalid login credentials"}), 400
        token = generate_jwt_token(user["id"], email)
        SESSIONS_AUTH[token] = user["id"]
        return jsonify({"access_token": token, "token_type": "bearer", "expires_in": 86400,
                        "refresh_token": str(uuid.uuid4()),
                        "user": {"id": user["id"], "aud": "authenticated", "role": "authenticated",
                                 "email": email, "email_confirmed_at": user.get("email_confirmed_at"),
                                 "app_metadata": {"provider": "email", "providers": ["email"]},
                                 "user_metadata": {}, "created_at": user.get("created_at")}})
    elif gt == "refresh_token":
        if USERS:
            email = list(USERS.keys())[0]; user = USERS[email]
            token = generate_jwt_token(user["id"], email)
            return jsonify({"access_token": token, "token_type": "bearer", "expires_in": 86400,
                            "refresh_token": str(uuid.uuid4()),
                            "user": {"id": user["id"], "email": email, "role": "authenticated"}})
    return jsonify({"error": "Unsupported grant type"}), 400


@app.route("/auth/v1/user", methods=["GET", "PUT"])
def auth_user():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify({"id": user.get("sub"), "aud": "authenticated", "role": "authenticated",
                    "email": user.get("email"), "email_confirmed_at": datetime.utcnow().isoformat(),
                    "app_metadata": user.get("app_metadata", {}),
                    "user_metadata": user.get("user_metadata", {}),
                    "created_at": datetime.utcnow().isoformat()})


@app.route("/auth/v1/logout", methods=["POST"])
def auth_logout():
    return jsonify({}), 204

@app.route("/auth/v1/recover", methods=["POST"])
def auth_recover():
    return jsonify({}), 200

@app.route("/auth/v1/callback", methods=["GET", "POST"])
def auth_callback():
    return jsonify({}), 200

@app.route("/auth/v1/mfa/factors", methods=["GET"])
def auth_mfa_factors():
    return jsonify({"totp": [], "phone": []}), 200

@app.route("/auth/v1/mfa/enroll", methods=["POST"])
def auth_mfa_enroll():
    return jsonify({"id": str(uuid.uuid4()), "type": "totp", "totp": {"qr_code": "data:image/png;base64,iVBOR", "secret": "JBSWY3DPEHPK3PXP", "uri": "otpauth://totp/test"}}), 200

@app.route("/auth/v1/mfa/challenge", methods=["POST"])
def auth_mfa_challenge():
    return jsonify({"id": str(uuid.uuid4())}), 200

@app.route("/auth/v1/mfa/verify", methods=["POST"])
def auth_mfa_verify():
    return jsonify({"success": True}), 200

@app.route("/auth/v1/resend", methods=["POST"])
def auth_resend():
    return jsonify({}), 200

@app.route("/auth/v1/verify", methods=["POST"])
def auth_verify():
    return jsonify({}), 200

@app.route("/auth/v1/otp", methods=["POST"])
def auth_otp():
    return jsonify({}), 200

@app.route("/auth/v1/authorize", methods=["GET"])
def auth_authorize():
    return jsonify({}), 200

@app.route("/auth/v1/sso", methods=["POST"])
def auth_sso():
    return jsonify({}), 200


# ============================================================
# PostgREST REST API
# ============================================================
@app.route("/rest/v1/rpc/<func_name>", methods=["POST"])
def rpc_call(func_name):
    data = request.json or {}
    try:
        conn = get_db(); cur = conn.cursor()
        # Set auth.uid() to the current authenticated user
        user = get_current_user()
        if user:
            cur.execute("UPDATE auth._current_user SET uid = %s", (user.get('sub', user.get('id')),))
        else:
            cur.execute("UPDATE auth._current_user SET uid = NULL")
        conn.commit()
        if data:
            param_names = ", ".join([f"{k} := %s" for k in data.keys()])
            cur.execute(f"SELECT * FROM public.{func_name}({param_names})", list(data.values()))
        else:
            cur.execute(f"SELECT * FROM public.{func_name}()")
        result = cur.fetchone()
        conn.close()
        # RPC functions that return a scalar (boolean, int, etc.) should return the scalar directly
        if result and len(result) == 1:
            val = list(result.values())[0] if isinstance(result, dict) else result[0]
            if isinstance(val, Decimal):
                val = float(val)
            return jsonify(val)
        elif result:
            return jsonify(serialize_row(dict(result)))
        else:
            return jsonify(None)
    except Exception as e:
        print(f"RPC error {func_name}: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400


@app.route("/rest/v1/<table>", methods=["GET", "POST", "PATCH", "DELETE", "HEAD"])
def rest_table(table):
    try:
        conn = get_db(); cur = conn.cursor()

        if request.method == "HEAD":
            cur.execute(f'SELECT count(*) as cnt FROM public."{table}"')
            row = cur.fetchone()
            resp = make_response("")
            resp.headers["Content-Range"] = f"0-0/{row['cnt']}" if row else "*/0"
            conn.close(); return resp

        if request.method == "GET":
            select_str = request.args.get("select", "*")
            tree = parse_select_tree(select_str)
            base_cols = [s.get("col", "*") for s in tree if not s.get("is_join")]
            joins = [s for s in tree if s.get("is_join")]

            # Auto-include FK columns needed for joins if not already in select
            extra_fk_cols = []
            if "*" not in base_cols:
                for j in joins:
                    jt = j.get("table")
                    jc = j.get("constraint")
                    needed_col = None
                    if jc and jc in FK_MAP:
                        fk_tbl, fk_col_name, fk_ftbl, fk_fcol = FK_MAP[jc]
                        if fk_tbl == table and fk_ftbl == jt:
                            needed_col = fk_col_name  # child_to_parent: need the FK col
                        elif fk_tbl == jt and fk_ftbl == table:
                            needed_col = fk_fcol  # parent_to_child: need the PK col
                    else:
                        # Try CHILD_FK / PARENT_FK
                        for child_tbl, child_col, par_col, _ in PARENT_FK.get(table, []):
                            if child_tbl == jt:
                                needed_col = par_col
                                break
                        if not needed_col:
                            for col, ftbl, fcol, _ in CHILD_FK.get(table, []):
                                if ftbl == jt:
                                    needed_col = col
                                    break
                    if needed_col and needed_col not in base_cols and needed_col not in extra_fk_cols:
                        extra_fk_cols.append(needed_col)

            all_cols = base_cols + extra_fk_cols
            col_str = ", ".join([f'"{c}"' if c != "*" else c for c in all_cols]) if all_cols else "*"
            wc, wv = build_where(request.args)
            oc = build_order(request.args.get("order", ""))
            lim = request.args.get("limit", "")
            off = request.args.get("offset", "")

            sql = f'SELECT {col_str} FROM public."{table}"'
            if wc: sql += " WHERE " + " AND ".join(wc)
            if oc: sql += " " + oc
            if lim: sql += f" LIMIT {int(lim)}"
            if off: sql += f" OFFSET {int(off)}"

            cur.execute(sql, wv)
            rows = [serialize_row(dict(r)) for r in cur.fetchall()]

            for j in joins:
                resolve_join(table, j, rows, conn)

            # Remove extra FK columns that were auto-added for joins
            if extra_fk_cols:
                for row in rows:
                    for ec in extra_fk_cols:
                        row.pop(ec, None)

            prefer = request.headers.get("Prefer", "")
            accept = request.headers.get("Accept", "")
            if "vnd.pgrst.object" in accept and len(rows) >= 1:
                resp = make_response(jsonify(rows[0]))
            elif "return=representation" in prefer and len(rows) == 1:
                resp = make_response(jsonify(rows[0]))
            else:
                resp = make_response(jsonify(rows))
            resp.headers["Content-Range"] = f"0-{len(rows)-1}/{len(rows)}" if rows else "*/0"
            conn.close(); return resp

        if request.method == "POST":
            import json as _json
            data = request.json
            if not data:
                conn.close(); return jsonify({"error": "No data"}), 400
            def _adapt_vals(d):
                """Convert dict/list values to JSON strings for psycopg2"""
                return [_json.dumps(v) if isinstance(v, (dict, list)) else v for v in d.values()]
            if isinstance(data, list):
                results = []
                for item in data:
                    cols = ", ".join([f'"{ k}"' for k in item.keys()])
                    vals = ", ".join(["%s"] * len(item))
                    cur.execute(f'INSERT INTO public."{table}" ({cols}) VALUES ({vals}) RETURNING *', _adapt_vals(item))
                    row = cur.fetchone()
                    if row: results.append(serialize_row(dict(row)))
                conn.close(); return jsonify(results), 201
            else:
                cols = ", ".join([f'"{ k}"' for k in data.keys()])
                vals = ", ".join(["%s"] * len(data))
                oc = request.args.get("on_conflict", "")
                sql = f'INSERT INTO public."{table}" ({cols}) VALUES ({vals})'
                if oc:
                    uc = ", ".join([f'"{ k}" = EXCLUDED."{ k}"' for k in data.keys() if k != oc])
                    sql += f' ON CONFLICT ("{oc}") DO UPDATE SET {uc}' if uc else f' ON CONFLICT ("{oc}") DO NOTHING'
                sql += " RETURNING *"
                cur.execute(sql, _adapt_vals(data))
                row = cur.fetchone(); conn.close()
                return jsonify(serialize_row(dict(row)) if row else {}), 201

        elif request.method == "PATCH":
            data = request.json
            if not data:
                conn.close(); return jsonify({"error": "No data"}), 400
            wc, wv = build_where(request.args)
            sc = ", ".join([f'"{k}" = %s' for k in data.keys()])
            values = list(data.values()) + wv
            sql = f'UPDATE public."{table}" SET {sc}'
            if wc: sql += " WHERE " + " AND ".join(wc)
            sql += " RETURNING *"
            cur.execute(sql, values)
            rows = cur.fetchall(); conn.close()
            result = [serialize_row(dict(r)) for r in rows]
            return jsonify(result[0] if len(result) == 1 else result)

        elif request.method == "DELETE":
            wc, wv = build_where(request.args)
            sql = f'DELETE FROM public."{table}"'
            if wc: sql += " WHERE " + " AND ".join(wc)
            sql += " RETURNING *"
            cur.execute(sql, wv)
            rows = cur.fetchall(); conn.close()
            return jsonify([serialize_row(dict(r)) for r in rows])

        conn.close()
        return jsonify({"error": "Method not allowed"}), 405

    except Exception as e:
        print(f"REST error on {table}: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e), "message": str(e), "code": "PGRST000"}), 400


# ============================================================
# Edge Functions
# ============================================================
@app.route("/functions/v1/<func_name>", methods=["POST", "OPTIONS"])
def edge_function(func_name):
    if request.method == "OPTIONS":
        return "", 204
    data = request.json or {}

    if func_name == "get-stripe-prices":
        return jsonify({"prices": [
            {"id": "price_starter", "unit_amount": 2900, "currency": "eur", "recurring": {"interval": "month"}},
            {"id": "price_premium", "unit_amount": 4900, "currency": "eur", "recurring": {"interval": "month"}},
            {"id": "price_enterprise", "unit_amount": 9900, "currency": "eur", "recurring": {"interval": "month"}},
        ], "success": True})

    elif func_name == "handle-facilitator-response":
        conv_id = data.get("conversationId")
        is_session_start = data.get("sessionStart", False)
        generate_report = data.get("generateReport", False)
        host_instruction = data.get("hostInstruction", "").strip()

        # ── Fetch full session context from DB ──
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

        if conv_id:
            try:
                conn = get_db(); cur = conn.cursor()
                cur.execute(
                    "SELECT c.id, s.title, s.facilitator, s.objective, s.prompt, "
                    "s.welcome_message, s.scope, s.gpt_version, s.max_tokens, s.randomness, "
                    "f.title as facilitator_name, f.details as facilitator_details, "
                    "f.profile_picture "
                    "FROM conversations c "
                    "LEFT JOIN sessions s ON c.sessions_id = s.id "
                    "LEFT JOIN facilitators f ON s.facilitator = f.id "
                    "WHERE c.id = %s", (conv_id,)
                )
                row = cur.fetchone()
                if row:
                    session_title = row.get('title') or session_title
                    facilitator_name = row.get('facilitator_name') or facilitator_name
                    facilitator_details = row.get('facilitator_details') or ""
                    objective = row.get('objective') or objective
                    session_prompt = row.get('prompt') or ""
                    welcome_message_template = row.get('welcome_message') or ""
                    session_scope = row.get('scope') or ""
                    gpt_version = row.get('gpt_version')
                    max_tokens_cfg = row.get('max_tokens')
                    randomness_cfg = row.get('randomness')
                    pp = row.get('profile_picture') or ""
                    if pp:
                        avatar_url = f"/storage/v1/object/public/facilitator-avatars/{pp}"
                conn.close()
            except Exception as e:
                print(f"Error fetching session context: {e}")
                traceback.print_exc()

        # ── Resolve AI model parameters ──
        model = GPT_MODEL_MAP.get(str(gpt_version).lower().strip(), DEFAULT_AI_MODEL) if gpt_version else DEFAULT_AI_MODEL
        try:
            max_tokens = int(max_tokens_cfg) if max_tokens_cfg and str(max_tokens_cfg) != 'None' else 600
        except (ValueError, TypeError):
            max_tokens = 600
        try:
            temperature = float(randomness_cfg) if randomness_cfg and str(randomness_cfg) != 'None' else 0.7
        except (ValueError, TypeError):
            temperature = 0.7
        temperature = max(0.0, min(2.0, temperature))  # clamp

        # ── Build the system prompt ──
        system_parts = []
        if session_prompt:
            system_parts.append(session_prompt)
        else:
            system_parts.append(
                f"You are {facilitator_name}, an AI workshop facilitator. "
                f"You are facilitating a session titled \"{session_title}\".")
        if facilitator_details:
            system_parts.append(f"Background: {facilitator_details}")
        system_parts.append(f"Session objective: {objective}")
        if session_scope:
            system_parts.append(f"Session scope: {session_scope}")
        system_parts.append(
            f"Your name is {facilitator_name}. Always introduce yourself using this exact name.\n\n"
            "IMPORTANT RULES:\n"
            "- Keep responses concise (2-4 paragraphs max).\n"
            "- Always end with a clear, engaging question to keep the discussion going.\n"
            "- Address participants warmly and reference their specific contributions when responding to answers.\n"
            "- Use a professional yet approachable tone.\n"
            "- Do NOT use markdown headers (##) in chat messages.\n"
            "- Do NOT use placeholder text like [Your Name] - always use your actual name.")

        # ── Inject host instruction if provided ──
        if host_instruction:
            system_parts.append(
                "HOST INSTRUCTION (HIGH PRIORITY):\n"
                f"The session host has given you the following directive: \"{host_instruction}\"\n"
                "You MUST follow this instruction in your next response. Adapt your message "
                "accordingly while maintaining your facilitator persona. For example:\n"
                "- If asked to \"wrap up\", provide a concise summary and closing remarks instead of a new question.\n"
                "- If asked to \"change topic\", smoothly transition to the new direction.\n"
                "- If asked to \"focus on X\", steer the discussion toward that specific area.\n"
                "- If asked to \"ask about X\", pose a question about that specific topic.\n"
                "The host instruction takes priority over the default behavior of asking follow-up questions.")
            print(f"[AI] Host instruction injected: {host_instruction}")

        system_message = "\n\n".join(system_parts)

        # ── Build the user prompt based on message type ──
        if is_session_start:
            user_prompt = (
                f"Generate a warm, engaging welcome message for the workshop \"{session_title}\".\n"
                f"The objective is: {objective}\n")
            if welcome_message_template:
                user_prompt += f"Use this as inspiration (but make it your own): {welcome_message_template}\n"
            user_prompt += (
                "Include:\n"
                "1. A warm greeting introducing yourself by name\n"
                "2. Brief mention of the session topic and what participants will gain\n"
                "3. An opening question to get participants engaged and sharing\n\n"
                "Keep it to 2-3 short paragraphs. Be enthusiastic but professional.")

        elif generate_report:
            # Fetch all messages for the report
            all_messages = []
            try:
                conn = get_db(); cur = conn.cursor()
                cur.execute(
                    "SELECT m.content, m.role, m.name, m.created_at "
                    "FROM messages m WHERE m.conversation_id = %s ORDER BY m.created_at",
                    (conv_id,))
                all_messages = cur.fetchall()
                conn.close()
            except Exception as e:
                print(f"Error fetching messages for report: {e}")

            conversation_text = ""
            for msg in all_messages:
                content = msg.get('content', {})
                if isinstance(content, str):
                    try: content = json.loads(content)
                    except: content = {"text": content}
                text = content.get('text', str(content))
                role = msg.get('role', 'unknown')
                name = msg.get('name', role)
                conversation_text += f"[{role.upper()} - {name}]: {text}\n\n"

            user_prompt = (
                f"Generate a comprehensive session report for the workshop \"{session_title}\".\n"
                f"Objective: {objective}\n\n"
                f"Here is the full conversation:\n\n{conversation_text}\n\n"
                "Please create a structured report with:\n"
                "1. Executive Summary\n"
                "2. Key Discussion Points\n"
                "3. Participant Insights (summarize what participants shared)\n"
                "4. Key Takeaways\n"
                "5. Recommended Next Steps\n\n"
                "Use markdown formatting with ## headers for sections.")
            max_tokens = min(max_tokens * 2, 1500)  # Allow more tokens for reports

        else:
            # Follow-up: fetch recent messages to build context
            recent_messages = []
            try:
                conn = get_db(); cur = conn.cursor()
                cur.execute(
                    "SELECT m.content, m.role, m.name, m.created_at "
                    "FROM messages m WHERE m.conversation_id = %s "
                    "ORDER BY m.created_at DESC LIMIT 20",
                    (conv_id,))
                recent_messages = list(reversed(cur.fetchall()))
                conn.close()
            except Exception as e:
                print(f"Error fetching recent messages: {e}")

            # Build conversation context
            conversation_context = ""
            participant_answers = []
            for msg in recent_messages:
                content = msg.get('content', {})
                if isinstance(content, str):
                    try: content = json.loads(content)
                    except: content = {"text": content}
                text = content.get('text', str(content))
                role = msg.get('role', 'unknown')
                name = msg.get('name', role)
                conversation_context += f"[{role.upper()} - {name}]: {text}\n\n"
                if role == 'user':
                    participant_answers.append(f"{name}: {text}")

            if host_instruction:
                user_prompt = (
                    f"Here is the recent conversation in our workshop \"{session_title}\":\n\n"
                    f"{conversation_context}\n"
                    f"The host has instructed you to: {host_instruction}\n\n"
                    "Follow the host's instruction above. "
                    "Reference the participants' contributions where relevant. "
                    "Keep your response to 2-3 short paragraphs. Be specific about what participants said.")
            else:
                user_prompt = (
                    f"Here is the recent conversation in our workshop \"{session_title}\":\n\n"
                    f"{conversation_context}\n"
                    "Based on the participants' responses above:\n"
                    "1. Briefly acknowledge and synthesize the key themes from their answers\n"
                    "2. Highlight any interesting connections or contrasts between different participants' views\n"
                    "3. Ask a thoughtful follow-up question that builds on what they shared and deepens the discussion\n\n"
                    "Keep your response to 2-3 short paragraphs. Be specific about what participants said.")

        # ── Call OpenAI API ──
        print(f"[AI] Calling {model} for conv={conv_id} (start={is_session_start}, report={generate_report})")
        try:
            ai_messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_prompt}
            ]
            response = openai_client.chat.completions.create(
                model=model,
                messages=ai_messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            txt = response.choices[0].message.content.strip()
            print(f"[AI] Response received ({len(txt)} chars)")
        except Exception as e:
            print(f"[AI] OpenAI API error: {e}")
            traceback.print_exc()
            # Graceful fallback to hardcoded text
            if is_session_start:
                txt = (f"Welcome to \"{session_title}\"! I'm {facilitator_name}, and I'm excited to facilitate our session today.\n\n"
                       f"Our objective is: {objective}\n\n"
                       f"To get us started, I'd love to hear from each of you. What brings you here today, and what do you hope to take away from this session?")
            elif generate_report:
                txt = f"## Session Report: {session_title}\n\nThank you all for participating in this workshop. The discussion covered our objective of: {objective}."
            else:
                txt = ("Thank you for sharing your thoughts! I've noted some interesting perspectives.\n\n"
                       "Let me ask a follow-up question: What challenges or obstacles do you see "
                       "in applying these ideas in practice?")

        # ── Save the AI message to the database ──
        msg_id = None
        if conv_id:
            try:
                conn = get_db(); cur = conn.cursor()
                content_json = json.dumps({"text": txt})
                if avatar_url:
                    content_json = json.dumps({"text": txt, "avatar": avatar_url})
                cur.execute(
                    "INSERT INTO messages (conversation_id, content, role, name) VALUES (%s, %s, 'assistant', %s) RETURNING id",
                    (conv_id, content_json, facilitator_name)
                )
                msg_id = cur.fetchone()['id']
                # Update welcome_message_status so the frontend knows the message is ready
                if is_session_start:
                    cur.execute(
                        "UPDATE conversations SET welcome_message_status = 'ai_ready' WHERE id = %s",
                        (conv_id,)
                    )
                conn.close()
            except Exception as e:
                print(f"Error saving AI message: {e}")
                traceback.print_exc()

        # Return in the format the frontend expects: { content, id }
        return jsonify({"content": txt, "id": str(msg_id) if msg_id else str(uuid.uuid4()), "success": True})

    elif func_name == "generate-ai-welcome":
        return jsonify({"message": "Welcome to the session! I'm excited to facilitate our discussion today.", "success": True})

    elif func_name == "close-session-and-generate-report":
        conv_id = data.get("conversationId")
        user_id = data.get("userId")
        report_content = ""
        report_id = str(uuid.uuid4())
        participant_count = 0
        message_count = 0
        session_title = "Workshop Session"
        objective = ""
        duration_minutes = 0

        if conv_id:
            conn = None
            try:
                conn = get_db()
                conn.autocommit = True
                cur = conn.cursor()

                # Fetch session info
                cur.execute(
                    "SELECT s.title, s.objective, s.scope, s.prompt, f.title as facilitator_name "
                    "FROM conversations c "
                    "LEFT JOIN sessions s ON c.sessions_id = s.id "
                    "LEFT JOIN facilitators f ON s.facilitator = f.id "
                    "WHERE c.id = %s", (conv_id,))
                srow = cur.fetchone()
                if srow:
                    session_title = srow.get('title') or session_title
                    objective = srow.get('objective') or ""

                # Count participants
                cur.execute("SELECT COUNT(*) FROM session_participants WHERE conversation_id = %s", (conv_id,))
                row = cur.fetchone()
                participant_count = row['count'] if isinstance(row, dict) else row[0]

                # Fetch participant names
                cur.execute("SELECT name FROM session_participants WHERE conversation_id = %s", (conv_id,))
                participant_names = [r['name'] for r in cur.fetchall() if r.get('name')]

                # Count messages
                cur.execute("SELECT COUNT(*) FROM messages WHERE conversation_id = %s", (conv_id,))
                row = cur.fetchone()
                message_count = row['count'] if isinstance(row, dict) else row[0]

                # Fetch all messages for AI report generation
                cur.execute(
                    "SELECT content, role, name, created_at FROM messages "
                    "WHERE conversation_id = %s ORDER BY created_at", (conv_id,))
                all_msgs = cur.fetchall()

                # Build conversation transcript
                transcript = ""
                for msg in all_msgs:
                    content = msg.get('content', {})
                    if isinstance(content, str):
                        try: content = json.loads(content)
                        except: content = {"text": content}
                    text = content.get('text', str(content))
                    role = msg.get('role', 'unknown')
                    name = msg.get('name', role)
                    transcript += f"[{name} ({role})]: {text}\n\n"

                # Generate AI report
                try:
                    print(f"[AI] Generating session report for conv={conv_id}")
                    report_prompt = (
                        f"Generate a comprehensive session report for the workshop \"{session_title}\".\n"
                        f"Objective: {objective}\n"
                        f"Participants ({participant_count}): {', '.join(participant_names) if participant_names else 'Anonymous participants'}\n"
                        f"Total messages: {message_count}\n\n"
                        f"Full conversation transcript:\n{transcript}\n\n"
                        "Create a well-structured report with these sections:\n"
                        "## Executive Summary\n"
                        "## Key Discussion Points\n"
                        "## Participant Contributions\n"
                        "## Key Takeaways & Insights\n"
                        "## Recommended Next Steps\n\n"
                        "Use markdown formatting. Be specific and reference actual content from the discussion.")

                    resp = openai_client.chat.completions.create(
                        model=DEFAULT_AI_MODEL,
                        messages=[
                            {"role": "system", "content": "You are an expert at summarizing workshop sessions into clear, actionable reports."},
                            {"role": "user", "content": report_prompt}
                        ],
                        max_tokens=1500,
                        temperature=0.5,
                    )
                    report_content = resp.choices[0].message.content.strip()
                    print(f"[AI] Report generated ({len(report_content)} chars)")
                except Exception as e:
                    print(f"[AI] Report generation error: {e}")
                    report_content = (
                        f"## Session Report: {session_title}\n\n"
                        f"**Objective:** {objective}\n\n"
                        f"**Participants:** {participant_count}\n"
                        f"**Messages exchanged:** {message_count}\n\n"
                        f"This session has been completed successfully.")

                # Insert session report
                cur.execute(
                    "INSERT INTO session_reports (id, conversation_id, report_content, report_type, generated_by, metadata) VALUES (%s, %s, %s, 'comprehensive', %s, %s) RETURNING id",
                    (report_id, conv_id, report_content, user_id, json.dumps({"participant_count": participant_count, "message_count": message_count}))
                )
                row = cur.fetchone()
                report_id = str(row['id'] if isinstance(row, dict) else row[0])
                # Close the session
                cur.execute(
                    "UPDATE conversations SET is_session_ended = true, ended_at = NOW(), status = 'completed', final_report_id = %s WHERE id = %s",
                    (report_id, conv_id)
                )
                # Insert session ended event
                cur.execute(
                    "INSERT INTO session_events (conversation_id, event_type, data) VALUES (%s, 'session_ended', %s)",
                    (conv_id, json.dumps({"ended_by": user_id, "report_id": report_id}))
                )
                print(f"Session {conv_id} closed successfully. Report: {report_id}, Participants: {participant_count}, Messages: {message_count}")
            except Exception as e:
                print(f"Error closing session: {e}")
                traceback.print_exc()
                if not report_content:
                    report_content = f"## Session Report\n\nSession completed. Participants: {participant_count}, Messages: {message_count}"
            finally:
                if conn:
                    try: conn.close()
                    except: pass

        return jsonify({
            "success": True,
            "reportId": report_id,
            "reportContent": report_content,
            "sessionData": {
                "participantCount": participant_count,
                "messageCount": message_count,
                "duration": duration_minutes,
                "engagementScore": min(100, int((message_count / max(participant_count, 1)) * 20))
            }
        })

    elif func_name == "create-subscription":
        return jsonify({"url": "/mock-checkout", "sessionId": str(uuid.uuid4()), "success": True})

    elif func_name == "create-portal-session":
        return jsonify({"url": "/mock-portal", "success": True})

    elif func_name == "confirm-subscription":
        return jsonify({"success": True})

    elif func_name == "recover-stuck-welcome-messages":
        return jsonify({"recovered": 0, "success": True})

    return jsonify({"error": f"Unknown function: {func_name}"}), 404


# ============================================================
# Storage
# ============================================================
@app.route("/storage/v1/object/public/<path:filepath>", methods=["GET"])
def storage_public(filepath):
    full_path = os.path.join(STORAGE_DIR, filepath)
    if os.path.exists(full_path):
        return send_from_directory(os.path.dirname(full_path), os.path.basename(full_path))
    return jsonify({"error": "File not found"}), 404

@app.route("/storage/v1/object/<bucket>/<path:filepath>", methods=["POST", "PUT"])
def storage_upload(bucket, filepath):
    os.makedirs(os.path.join(STORAGE_DIR, bucket), exist_ok=True)
    if request.data:
        fp = os.path.join(STORAGE_DIR, bucket, filepath)
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        with open(fp, 'wb') as f: f.write(request.data)
    return jsonify({"Key": f"{bucket}/{filepath}", "Id": str(uuid.uuid4())})

@app.route("/storage/v1/object/public/<bucket>/<path:filepath>", methods=["HEAD"])
def storage_head(bucket, filepath):
    return ("", 200) if os.path.exists(os.path.join(STORAGE_DIR, bucket, filepath)) else ("", 404)

@app.route("/realtime/v1/websocket", methods=["GET"])
def realtime_ws():
    return jsonify({"error": "WebSocket not supported in local proxy. Using polling fallback."}), 400

@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "supabase-local-proxy", "version": "2.0.0"})

@app.route("/rest/v1/", methods=["GET"])
def rest_root():
    return jsonify({"swagger": "2.0", "info": {"title": "PostgREST API", "version": "11.0.0"}})


if __name__ == "__main__":
    import sys
    os.makedirs(STORAGE_DIR, exist_ok=True)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3333
    print(f"Starting Supabase-compatible local proxy v2 on port {port}...")
    if DB_URL:
        print(f"Database: DATABASE_URL set ({DB_URL[:40]}...) | Storage: {STORAGE_DIR}")
    else:
        print(f"Database: {DB_NAME}@{DB_HOST}:{DB_PORT} | Storage: {STORAGE_DIR}")
    print(f"Pre-registered users: {list(USERS.keys())}")
    app.run(host="0.0.0.0", port=port, debug=False)
