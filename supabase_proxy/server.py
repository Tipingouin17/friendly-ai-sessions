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
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from openai import OpenAI
import stripe as stripe_lib

# OpenAI client – uses OPENAI_API_KEY and OPENAI_BASE_URL env vars automatically
openai_client = OpenAI()


# ============================================================
# Adaptive facilitation technique selector helpers (legacy Flask)
# ============================================================
def _flask_safe_json_value(value, default):
    """Return a JSON-like value from psycopg/text with a safe fallback."""
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return default
    return value


def _flask_extract_message_text(content):
    """Extract display text from a message content payload."""
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except Exception:
            return content
    if isinstance(content, dict):
        text = content.get("text")
        if isinstance(text, str):
            return text
        return json.dumps(content, ensure_ascii=False)
    return str(content or "")


def _flask_clip_text(value, max_chars=900):
    """Serialize and clip a value for compact selector prompt inclusion."""
    if isinstance(value, str):
        rendered = value
    else:
        rendered = json.dumps(value, ensure_ascii=False)
    rendered = rendered.strip()
    if len(rendered) <= max_chars:
        return rendered
    return rendered[: max_chars - 3].rstrip() + "..."


def _flask_fallback_facilitation_selection(available_modes=None, reason="Selector unavailable"):
    available_modes = available_modes or []
    selected_mode = None
    for mode in available_modes:
        if mode.get("mode_key") == "open_discussion":
            selected_mode = mode
            break
    if selected_mode is None and available_modes:
        selected_mode = available_modes[0]
    if selected_mode is None:
        selected_mode = {
            "id": None,
            "mode_key": "open_discussion",
            "display_name": "Open Discussion",
            "purpose": "Maintain a natural, inclusive workshop discussion.",
            "floor_rules": {},
            "ai_responsibilities": ["Synthesize participant contributions and ask an objective-aligned follow-up."],
        }
    return {
        "selected_technique": selected_mode.get("mode_key") or "open_discussion",
        "selected_mode": selected_mode,
        "rationale": reason,
        "divergence_intent": False,
        "steering_instruction": "Use open discussion to synthesize what participants shared, then ask a constructive follow-up aligned with the session objective.",
        "selector_model": None,
        "selector_fallback": True,
    }


def _flask_parse_selector_json(raw_text):
    text_value = (raw_text or "").strip()
    if text_value.startswith("```"):
        text_value = re.sub(r"^```(?:json)?\s*", "", text_value, flags=re.IGNORECASE)
        text_value = re.sub(r"\s*```$", "", text_value)
    try:
        return json.loads(text_value)
    except Exception:
        start = text_value.find("{")
        end = text_value.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text_value[start:end + 1])
        raise


def _flask_compute_engagement_signals(participant_messages, expected_participants, response_count, ai_turn_count):
    texts = [_flask_extract_message_text(m.get("content")) for m in participant_messages]
    word_counts = [len(re.findall(r"\b\w+\b", item)) for item in texts]
    total_words = sum(word_counts)
    avg_words = round(total_words / len(word_counts), 1) if word_counts else 0.0
    response_rate = round(response_count / max(expected_participants, 1), 2)
    question_marks = sum(item.count("?") for item in texts)
    exclamation_marks = sum(item.count("!") for item in texts)
    short_answers = sum(1 for count in word_counts if count <= 8)
    long_answers = sum(1 for count in word_counts if count >= 35)

    if response_rate < 0.6 or avg_words < 10 or (texts and short_answers / max(len(texts), 1) >= 0.6):
        energy_level = "low"
    elif avg_words >= 35 or exclamation_marks >= max(2, len(texts)) or question_marks >= max(2, len(texts)):
        energy_level = "high"
    else:
        energy_level = "medium"

    stop_words = {
        "the", "and", "for", "that", "with", "this", "from", "are", "was", "were", "you", "your", "our", "their", "have",
        "has", "had", "but", "not", "all", "can", "could", "would", "should", "about", "into", "than", "then", "them",
        "they", "what", "when", "where", "how", "why", "who", "there", "here", "will", "just", "like", "also", "because",
        "dans", "pour", "avec", "que", "qui", "une", "des", "les", "nous", "vous", "sur", "est", "sont", "pas", "plus",
    }
    term_frequency = {}
    for item in texts:
        seen = set()
        for token in re.findall(r"\b[\wÀ-ÿ]{4,}\b", item.lower()):
            if token not in stop_words:
                seen.add(token)
        for token in seen:
            term_frequency[token] = term_frequency.get(token, 0) + 1
    repeated_terms = [term for term, count in term_frequency.items() if count >= 2]
    if len(texts) <= 1:
        convergence_state = "insufficient data"
    elif len(repeated_terms) >= max(2, len(texts) // 2):
        convergence_state = "converging on shared themes"
    elif len(term_frequency) >= max(12, len(texts) * 5):
        convergence_state = "diverging across varied perspectives"
    else:
        convergence_state = "mixed"

    return {
        "average_answer_words": avg_words,
        "response_rate": response_rate,
        "answered_participants": response_count,
        "expected_participants": expected_participants,
        "energy_level": energy_level,
        "question_marks": question_marks,
        "exclamation_marks": exclamation_marks,
        "short_answer_count": short_answers,
        "long_answer_count": long_answers,
        "ai_turn_count": ai_turn_count,
        "convergence_state": convergence_state,
        "repeated_terms": repeated_terms[:8],
        "answer_count": len(texts),
    }


def _select_facilitation_technique_sync(conv_id, facilitator_id, session_context):
    """Legacy synchronous selector. It never raises to avoid blocking facilitator output."""
    if not facilitator_id:
        return _flask_fallback_facilitation_selection(reason="No facilitator id available for technique access lookup")

    available_modes = []
    try:
        conn = get_db(); cur = conn.cursor()
        cur.execute(
            """
            SELECT fm.id, fm.mode_key, fm.display_name, fm.purpose, fm.primary_input,
                   fm.floor_rules, fm.ai_responsibilities, fm.entry_conditions,
                   fm.exit_conditions, fm.candidate_transitions, fm.success_metrics,
                   fm.default_timer_seconds, fm.requires_host_confirmation,
                   fma.policy_override
            FROM facilitator_mode_access fma
            JOIN facilitation_modes fm ON fm.id = fma.mode_id
            WHERE fma.facilitator_id = %s AND fma.enabled IS TRUE AND fm.is_active IS TRUE
            ORDER BY fm.mode_key
            """,
            (int(facilitator_id),),
        )
        available_modes = list(cur.fetchall())
        if not available_modes:
            cur.execute(
                """
                SELECT id, mode_key, display_name, purpose, primary_input, floor_rules,
                       ai_responsibilities, entry_conditions, exit_conditions,
                       candidate_transitions, success_metrics, default_timer_seconds,
                       requires_host_confirmation, '{}'::jsonb AS policy_override
                FROM facilitation_modes
                WHERE mode_key = 'open_discussion' AND is_active IS TRUE
                LIMIT 1
                """
            )
            row = cur.fetchone()
            if row:
                available_modes = [row]
        cur.execute(
            """
            SELECT sam.id, sam.mode_id, sam.status, sam.started_at, sam.timer_seconds,
                   sam.floor_rules, sam.prompt, sam.state, sam.metrics,
                   fm.mode_key, fm.display_name
            FROM session_active_modes sam
            JOIN facilitation_modes fm ON fm.id = sam.mode_id
            WHERE sam.conversation_id = %s
              AND sam.status IN ('recommended', 'pending_host_confirmation', 'active', 'ending')
            ORDER BY sam.updated_at DESC
            LIMIT 1
            """,
            (conv_id,),
        )
        active_mode = cur.fetchone()
        cur.execute(
            """
            SELECT sme.event_type, sme.reason, sme.confidence, sme.payload, sme.trigger_signals,
                   sme.created_at, fm.mode_key, fm.display_name
            FROM session_mode_events sme
            LEFT JOIN facilitation_modes fm ON fm.id = sme.mode_id
            WHERE sme.conversation_id = %s
            ORDER BY sme.created_at DESC
            LIMIT 5
            """,
            (conv_id,),
        )
        recent_history = list(cur.fetchall())
        cur.execute(
            "SELECT id, participant_id, name FROM session_participants WHERE conversation_id = %s ORDER BY id ASC",
            (conv_id,),
        )
        participants = list(cur.fetchall())
        cur.execute(
            """
            SELECT id, content, role, name, participant_id, created_at
            FROM messages
            WHERE conversation_id = %s AND role = 'user'
            ORDER BY created_at DESC LIMIT 20
            """,
            (conv_id,),
        )
        participant_messages = list(reversed(cur.fetchall()))
        cur.execute("SELECT COUNT(*) AS cnt FROM messages WHERE conversation_id = %s AND role = 'assistant'", (conv_id,))
        ai_turn_row = cur.fetchone()
        cur.close(); conn.close()
    except Exception as exc:
        print(f"[AI selector] DB lookup failed for conv={conv_id}: {exc}")
        traceback.print_exc()
        return _flask_fallback_facilitation_selection(available_modes, "Technique selector database lookup failed; using safe open discussion fallback")

    if not available_modes:
        return _flask_fallback_facilitation_selection(reason="No enabled facilitation modes found")

    for mode in available_modes:
        for key, default in (
            ("floor_rules", {}), ("ai_responsibilities", []), ("entry_conditions", []),
            ("exit_conditions", []), ("candidate_transitions", []), ("success_metrics", []),
            ("policy_override", {}),
        ):
            mode[key] = _flask_safe_json_value(mode.get(key), default)

    expected_participants = int(session_context.get("expected_participants") or len(participants) or 1)
    participant_ids = {str(m.get("participant_id") or f"anon_{m.get('id')}") for m in participant_messages}
    response_count = int(session_context.get("response_count") or len(participant_ids))
    engagement = _flask_compute_engagement_signals(
        participant_messages,
        expected_participants,
        response_count,
        int((ai_turn_row or {}).get("cnt") or 0),
    )

    answer_lines = []
    for msg in participant_messages[-12:]:
        answer_lines.append(f"- {msg.get('name') or 'Participant'}: {_flask_extract_message_text(msg.get('content'))}")
    answer_summary = _flask_clip_text("\n".join(answer_lines) or "No participant answers available.", 4500)

    participant_lines = []
    for p in participants:
        display_name = p.get("name") or f"Participant {p.get('participant_id') or p.get('id')}"
        participant_lines.append(f"- {display_name} (session participant id: {p.get('id')})")
    participant_profile_text = "\n".join(participant_lines) or "No named participant records available; infer profiles from the recent answers only."

    if active_mode:
        active_mode["floor_rules"] = _flask_safe_json_value(active_mode.get("floor_rules"), {})
        active_mode["state"] = _flask_safe_json_value(active_mode.get("state"), {})
        active_mode["metrics"] = _flask_safe_json_value(active_mode.get("metrics"), {})
    for item in recent_history:
        item["payload"] = _flask_safe_json_value(item.get("payload"), {})
        item["trigger_signals"] = _flask_safe_json_value(item.get("trigger_signals"), [])
        if item.get("created_at"):
            item["created_at"] = str(item["created_at"])
        if item.get("confidence") is not None:
            item["confidence"] = float(item["confidence"])

    available_modes_text = "\n\n".join(
        "\n".join([
            f"Technique: {mode.get('mode_key')} ({mode.get('display_name')})",
            f"Purpose: {mode.get('purpose')}",
            f"Primary input: {mode.get('primary_input')}",
            f"Floor rules: {_flask_clip_text(mode.get('floor_rules'), 700)}",
            f"AI responsibilities: {_flask_clip_text(mode.get('ai_responsibilities'), 900)}",
            f"Entry conditions: {_flask_clip_text(mode.get('entry_conditions'), 700)}",
            f"Exit conditions: {_flask_clip_text(mode.get('exit_conditions'), 700)}",
            f"Candidate transitions: {_flask_clip_text(mode.get('candidate_transitions'), 700)}",
        ])
        for mode in available_modes
    )

    selector_system = (
        "You are an expert session facilitator advisor. Select the single best facilitation technique "
        "for the facilitator's next intervention. Be pragmatic, objective-oriented, and context-sensitive. "
        "Purposeful divergence is allowed in creative or exploratory moments, but the choice should still help "
        "the session later converge constructively toward its objective. Respond only with valid JSON."
    )
    selector_user = f"""
SESSION: {session_context.get('title') or 'Untitled workshop'}
OBJECTIVE: {session_context.get('objective') or 'Facilitate a productive discussion'}
SCOPE: {session_context.get('scope') or 'No explicit scope provided'}
FACILITATOR: {session_context.get('facilitator_name') or 'Facilitator'}

PARTICIPANTS ({len(participants) or expected_participants or 'unknown'}):
{participant_profile_text}

SESSION PROGRESS:
- AI facilitator turns so far: {engagement['ai_turn_count']}
- Current active mode: {_flask_clip_text(active_mode, 900) if active_mode else 'None'}
- Recent mode history: {_flask_clip_text(recent_history, 1200)}

ENGAGEMENT AND ANSWER-QUALITY SIGNALS:
- Average answer length: {engagement['average_answer_words']} words
- Response rate: {engagement['answered_participants']}/{engagement['expected_participants']} participants answered ({engagement['response_rate']})
- Energy level: {engagement['energy_level']}
- Convergence/divergence: {engagement['convergence_state']}
- Repeated terms/themes proxy: {', '.join(engagement['repeated_terms']) if engagement['repeated_terms'] else 'none detected'}
- Short answers: {engagement['short_answer_count']}; long answers: {engagement['long_answer_count']}

RECENT PARTICIPANT ANSWERS:
{answer_summary}

AVAILABLE ENABLED TECHNIQUES:
{available_modes_text}

SELECTION CRITERIA TO WEIGH:
1. Alignment with the session objective and scope.
2. Current engagement level; low engagement usually needs a more structured or safer technique.
3. Session phase; early sessions can open up, mid sessions can structure exploration, and late sessions should converge or reflect.
4. Recent technique history; avoid repeating the same technique consecutively unless it is clearly still best.
5. Creative sessions may benefit from purposeful divergence before convergence.
6. Participant diversity inferred from names and answers; mixed or uneven participation may need more scaffolded floor rules.

Respond with this exact JSON shape:
{{
  "selected_technique": "<one mode_key from AVAILABLE ENABLED TECHNIQUES>",
  "rationale": "<1-2 sentence explanation>",
  "divergence_intent": true,
  "steering_instruction": "<specific instruction for how the facilitator should apply this technique in the next message>"
}}
""".strip()

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4.1-nano",
            messages=[
                {"role": "system", "content": selector_system},
                {"role": "user", "content": selector_user},
            ],
            max_tokens=350,
            temperature=0.2,
            response_format={"type": "json_object"},
            timeout=8,
        )
        parsed = _flask_parse_selector_json(response.choices[0].message.content.strip())
        selected_key = str(parsed.get("selected_technique") or "").strip()
        enabled_keys = {str(mode.get("mode_key")) for mode in available_modes}
        if selected_key not in enabled_keys:
            print(f"[AI selector] invalid technique '{selected_key}' for conv={conv_id}; enabled={sorted(enabled_keys)}")
            return _flask_fallback_facilitation_selection(available_modes, "Selector returned a technique that is not enabled; using safe fallback")
        selected_mode = next(mode for mode in available_modes if str(mode.get("mode_key")) == selected_key)
        return {
            "selected_technique": selected_key,
            "selected_mode": selected_mode,
            "rationale": str(parsed.get("rationale") or "Selected based on current engagement and objective alignment.").strip(),
            "divergence_intent": bool(parsed.get("divergence_intent")),
            "steering_instruction": str(parsed.get("steering_instruction") or "Apply the selected technique while steering constructively toward the session objective.").strip(),
            "selector_model": getattr(response, "model", "gpt-4.1-nano"),
            "selector_fallback": False,
            "engagement_signals": engagement,
        }
    except Exception as exc:
        print(f"[AI selector] AI selection failed for conv={conv_id}: {exc}")
        fallback = _flask_fallback_facilitation_selection(available_modes, "Technique selector failed or timed out; using safe open discussion fallback")
        fallback["engagement_signals"] = engagement
        return fallback

app = Flask(__name__)

# Rate limiting: protects AI endpoints and auth routes from abuse
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per minute"],
    storage_uri="memory://",
)
# CORS: restrict to known origins. Set ALLOWED_ORIGINS env var (comma-separated) in production.
# Defaults to localhost for local development.
_cors_env = os.environ.get("ALLOWED_ORIGINS", "")
ALLOWED_CORS_ORIGINS = [
    o.strip() for o in _cors_env.split(",") if o.strip()
] if _cors_env else [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
    "https://friendly-ai-sessions.vercel.app",
]
CORS(app,
     resources={r"/*": {"origins": ALLOWED_CORS_ORIGINS}},
     supports_credentials=True,
     allow_headers=["authorization", "x-client-info", "apikey", "content-type", "prefer", "range",
                    "x-supabase-api-version", "x-upsert", "x-profile-id", "cache-control", "pragma",
                    "content-profile", "accept-profile", "accept", "origin", "x-forwarded-for",
                    "x-request-id", "x-real-ip", "baggage", "sentry-trace"],
     expose_headers=["Content-Range", "X-Total-Count", "X-Request-Id"])

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

# ============================================================
# Stripe configuration
# STRIPE_ENV: 'live' uses live keys, anything else uses test keys.
# Set STRIPE_SECRET_KEY_TEST / STRIPE_SECRET_KEY_LIVE in Railway env vars.
# STRIPE_WEBHOOK_SECRET_TEST / STRIPE_WEBHOOK_SECRET_LIVE for webhook verification.
# ============================================================
_stripe_env = os.environ.get("STRIPE_ENV", "test").lower()
if _stripe_env == "live":
    stripe_lib.api_key = os.environ.get("STRIPE_SECRET_KEY_LIVE", "")
    STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET_LIVE", "")
else:
    stripe_lib.api_key = os.environ.get("STRIPE_SECRET_KEY_TEST", "")
    STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET_TEST", "")
STRIPE_CONFIGURED = bool(stripe_lib.api_key)

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

# ============================================================
# Security: Allowlists for table and RPC access
# Only tables and functions explicitly listed here can be accessed
# via the REST API. This prevents enumeration and access to
# internal PostgreSQL system tables.
# ============================================================
ALLOWED_TABLES = {
    "profiles", "facilitators", "sessions", "conversations",
    "messages", "session_participants", "session_reports",
    "session_events", "plans", "plan_restrictions",
    "configurations", "contact_form", "faqs",
    "admin_notifications", "security_audit_log",
    "conversations_config", "feedback", "referrals",
    "login_activity", "user_sessions", "sessions_history",
    "facilitator_persona_configs",
}

ALLOWED_RPC_FUNCTIONS = {
    "is_session_host", "is_system_admin",
    "calculate_session_analytics", "get_plan_restrictions",
    "increment_conversation_participants",
    "create_template_welcome_message",
}

# FK map: constraint_name -> (table, column, foreign_table, foreign_column)
FK_MAP = {
    "conversations_sessions_id_fkey": ("conversations", "sessions_id", "sessions", "id"),
    "fk_conversations_sessions": ("conversations", "sessions_id", "sessions", "id"),
    "sessions_id": ("conversations", "sessions_id", "sessions", "id"),
    "conversations_final_report_id_fkey": ("conversations", "final_report_id", "session_reports", "id"),
    "sessions_facilitator_fkey": ("sessions", "facilitator", "facilitators", "id"),
    "facilitators_plan_id_fkey": ("facilitators", "plan_id", "plans", "id"),
    "plan_restrictions_plan_id_fkey": ("plan_restrictions", "plan_id", "plans", "id"),
    "messages_conversation_id_fkey": ("messages", "conversation_id", "conversations", "id"),
    "fk_messages_conversations": ("messages", "conversation_id", "conversations", "id"),
    "messages_facilitator_id_fkey": ("messages", "facilitator_id", "facilitators", "id"),
    "facilitator_persona_configs_facilitator_id_fkey": ("facilitator_persona_configs", "facilitator_id", "facilitators", "id"),
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


def _parse_or_filter(or_value):
    """Parse PostgREST-style or filter: 'col.op.val,col2.op2.val2' into SQL.
    Supports: is.null, is.true, is.false, eq.val, neq.val, gt.val, gte.val, lt.val, lte.val
    Returns (sql_fragment, values_list)
    """
    parts = [p.strip() for p in or_value.split(",")]
    clauses, vals = [], []
    for part in parts:
        # Split on first two dots: col.op[.val]
        tokens = part.split(".", 2)
        if len(tokens) < 2:
            continue
        col, op = tokens[0], tokens[1]
        val = tokens[2] if len(tokens) > 2 else None
        if op == "is":
            if val == "null":
                clauses.append(f'"{col}" IS NULL')
            elif val == "true":
                clauses.append(f'"{col}" = true')
            elif val == "false":
                clauses.append(f'"{col}" = false')
        elif op == "eq" and val is not None:
            clauses.append(f'"{col}" = %s'); vals.append(val)
        elif op == "neq" and val is not None:
            clauses.append(f'"{col}" != %s'); vals.append(val)
        elif op == "gt" and val is not None:
            clauses.append(f'"{col}" > %s'); vals.append(val)
        elif op == "gte" and val is not None:
            clauses.append(f'"{col}" >= %s'); vals.append(val)
        elif op == "lt" and val is not None:
            clauses.append(f'"{col}" < %s'); vals.append(val)
        elif op == "lte" and val is not None:
            clauses.append(f'"{col}" <= %s'); vals.append(val)
    if not clauses:
        return None, []
    return "(" + " OR ".join(clauses) + ")", vals


def build_where(args):
    wc, wv = [], []
    for key, value in args.items():
        if key in ("select", "order", "limit", "offset", "on_conflict", "columns", "count"):
            continue
        # Handle PostgREST 'or' filter: ?or=col.op.val,col2.op2.val2
        if key == "or":
            sql_frag, or_vals = _parse_or_filter(value)
            if sql_frag:
                wc.append(sql_frag); wv.extend(or_vals)
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
@limiter.limit("5 per minute; 20 per hour")
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
@limiter.limit("10 per minute; 50 per hour")
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
    # Security: only allow explicitly whitelisted RPC functions
    if func_name not in ALLOWED_RPC_FUNCTIONS:
        return jsonify({"error": f"RPC function '{func_name}' is not allowed"}), 403
    data = request.json or {}
    try:
        conn = get_db(); cur = conn.cursor()
        # Set auth.uid() to the current authenticated user using SET LOCAL
        # This is the standard PostgREST approach for passing JWT claims to PostgreSQL functions
        user = get_current_user()
        user_id = None
        if user:
            user_id = user.get('sub', user.get('id'))

        # Handle special RPC functions that need auth.uid() by implementing them directly
        # to avoid dependency on auth._current_user table which may not exist
        if func_name == 'is_session_host':
            conversation_id = data.get('conversation_id')
            if not user_id or not conversation_id:
                return jsonify(False)
            cur.execute(
                "SELECT EXISTS(SELECT 1 FROM public.conversations WHERE id = %s AND user_id = %s::uuid)",
                (conversation_id, user_id)
            )
            result = cur.fetchone()
            conn.close()
            val = list(result.values())[0] if isinstance(result, dict) else result[0]
            return jsonify(bool(val))

        if func_name == 'is_system_admin':
            if not user_id:
                return jsonify(False)
            cur.execute(
                "SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = %s::uuid AND role = 'admin')",
                (user_id,)
            )
            result = cur.fetchone()
            conn.close()
            val = list(result.values())[0] if isinstance(result, dict) else result[0]
            return jsonify(bool(val))

        # For other RPC functions, try using SET LOCAL to set auth context
        try:
            if user_id:
                import json as _json
                claims = _json.dumps({'sub': user_id, 'role': 'authenticated'})
                cur.execute("SET LOCAL request.jwt.claims = %s", (claims,))
                cur.execute("SET LOCAL role = 'authenticated'")
        except Exception:
            pass  # Ignore if SET LOCAL fails

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
    # Security: only allow explicitly whitelisted tables
    if table not in ALLOWED_TABLES:
        return jsonify({"error": f"Table '{table}' is not accessible"}), 403
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
@limiter.limit("30 per minute", exempt_when=lambda: request.method == "OPTIONS")
def edge_function(func_name):
    if request.method == "OPTIONS":
        return "", 204
    data = request.json or {}

    if func_name == "get-stripe-prices":
        # Fetch prices LIVE from Stripe API so any price change in the Stripe Dashboard
        # is immediately reflected in the app without any DB or code changes.
        # We join with the local plans table to enrich each price with plan metadata.
        if not STRIPE_CONFIGURED:
            return jsonify({"error": "Stripe not configured"}), 500
        try:
            # 1. Fetch all active prices with their products expanded from Stripe
            stripe_prices = stripe_lib.Price.list(active=True, limit=50, expand=["data.product"])

            # 2. Load the plans table to map stripe_plan_id -> plan metadata
            plan_meta = {}  # stripe_plan_id -> {id, title, plan_type, currency}
            try:
                conn = get_db()
                cur = conn.cursor()
                cur.execute(
                    "SELECT id, title, price, currency, stripe_plan_id, plan_type "
                    "FROM plans WHERE stripe_plan_id IS NOT NULL ORDER BY price ASC"
                )
                for row in cur.fetchall():
                    plan_meta[row["stripe_plan_id"]] = row
                cur.close()
                conn.close()
            except Exception as db_err:
                print(f"get-stripe-prices DB lookup warning: {db_err}")

            prices = []
            for p in stripe_prices.data:
                # Only include prices that are linked to a plan in our DB
                if p.id not in plan_meta:
                    continue
                meta = plan_meta[p.id]
                # Convert Stripe unit_amount (cents) to major currency units for display
                stripe_amount_cents = p.unit_amount or 0
                stripe_amount_major = stripe_amount_cents / 100

                # Sync the DB price if Stripe has a different value
                if float(meta["price"]) != stripe_amount_major:
                    try:
                        sync_conn = get_db()
                        sync_cur = sync_conn.cursor()
                        sync_cur.execute(
                            "UPDATE plans SET price = %s WHERE stripe_plan_id = %s",
                            (stripe_amount_major, p.id)
                        )
                        sync_conn.commit()
                        sync_cur.close()
                        sync_conn.close()
                        print(f"Price sync: {p.id} updated to {stripe_amount_major} {p.currency}")
                    except Exception as sync_err:
                        print(f"Price sync DB write warning: {sync_err}")

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

            # Sort by unit_amount ascending (Free first)
            prices.sort(key=lambda x: x["unit_amount"])
            return jsonify({"prices": prices, "success": True})

        except stripe_lib.error.StripeError as se:
            print(f"get-stripe-prices Stripe error: {se}")
            # Graceful fallback: return DB prices if Stripe API is unreachable
            try:
                conn = get_db()
                cur = conn.cursor()
                cur.execute(
                    "SELECT id, title, price, currency, stripe_plan_id, plan_type "
                    "FROM plans WHERE stripe_plan_id IS NOT NULL ORDER BY price ASC"
                )
                rows = cur.fetchall()
                cur.close()
                conn.close()
                prices = [
                    {
                        "id": row["stripe_plan_id"],
                        "plan_db_id": row["id"],
                        "unit_amount": float(row["price"]),
                        "unit_amount_cents": int(float(row["price"]) * 100),
                        "currency": (row["currency"] or "eur").lower(),
                        "recurring": {"interval": "month"},
                        "title": row["title"],
                        "plan_type": row["plan_type"],
                    }
                    for row in rows
                ]
                return jsonify({"prices": prices, "success": True, "source": "db_fallback"})
            except Exception as db_err:
                return jsonify({"error": str(se)}), 500

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
        facilitator_language = None  # primary language for AI responses
        facilitator_persona_config = None
        facilitator_id = None

        if conv_id:
            try:
                conn = get_db(); cur = conn.cursor()
                cur.execute(
                    "SELECT c.id, s.title, s.facilitator, s.objective, s.prompt, "
                    "s.welcome_message, s.scope, s.gpt_version, s.max_tokens, s.randomness, "
                    "f.title as facilitator_name, f.details as facilitator_details, "
                    "f.profile_picture, f.languages as facilitator_languages, "
                    "fpc.display_name as persona_display_name, fpc.pronouns as persona_pronouns, "
                    "fpc.gender_presentation as persona_gender_presentation, fpc.voice_id as persona_voice_id, "
                    "fpc.voice_provider as persona_voice_provider, fpc.voice_style as persona_voice_style, "
                    "fpc.avatar_style as persona_avatar_style, fpc.avatar_asset_url as persona_avatar_asset_url, "
                    "fpc.locale as persona_locale, fpc.tone as persona_tone, fpc.animation_preset as persona_animation_preset, "
                    "fpc.nonverbal_behavior as persona_nonverbal_behavior, fpc.speaking_behavior as persona_speaking_behavior "
                    "FROM conversations c "
                    "LEFT JOIN sessions s ON c.sessions_id = s.id "
                    "LEFT JOIN facilitators f ON s.facilitator = f.id "
                    "LEFT JOIN facilitator_persona_configs fpc ON fpc.facilitator_id = f.id "
                    "WHERE c.id = %s", (conv_id,)
                )
                row = cur.fetchone()
                if row:
                    facilitator_id = row.get('facilitator')
                    session_title = row.get('title') or session_title
                    facilitator_name = row.get('persona_display_name') or row.get('facilitator_name') or facilitator_name
                    facilitator_details = row.get('facilitator_details') or ""
                    facilitator_persona_config = {
                        "display_name": row.get('persona_display_name'),
                        "pronouns": row.get('persona_pronouns'),
                        "gender_presentation": row.get('persona_gender_presentation'),
                        "voice_id": row.get('persona_voice_id'),
                        "voice_provider": row.get('persona_voice_provider'),
                        "voice_style": row.get('persona_voice_style'),
                        "avatar_style": row.get('persona_avatar_style'),
                        "avatar_asset_url": row.get('persona_avatar_asset_url'),
                        "locale": row.get('persona_locale'),
                        "tone": row.get('persona_tone'),
                        "animation_preset": row.get('persona_animation_preset'),
                        "nonverbal_behavior": row.get('persona_nonverbal_behavior'),
                        "speaking_behavior": row.get('persona_speaking_behavior'),
                    } if row.get('persona_display_name') or row.get('persona_tone') or row.get('persona_voice_style') else None
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
                    # Extract primary language from languages array
                    langs = row.get('facilitator_languages')
                    if langs and isinstance(langs, list) and len(langs) > 0:
                        facilitator_language = langs[0]  # use first language as primary
                    elif langs and isinstance(langs, str) and langs.strip():
                        facilitator_language = langs.strip()
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
        if facilitator_persona_config:
            def _persona_json(value):
                if value is None:
                    return ""
                if isinstance(value, str):
                    return value
                try:
                    return json.dumps(value, ensure_ascii=False)
                except Exception:
                    return str(value)

            persona_instruction_lines = [
                "FACILITATOR PERSONA CONFIGURATION:",
                "Use these settings as presentation and facilitation style guidance for your generated messages. They are not participant-visible configuration details and must never be quoted as internal settings.",
            ]
            if facilitator_persona_config.get("display_name"):
                persona_instruction_lines.append(f"- Display name: {facilitator_persona_config['display_name']}")
            if facilitator_persona_config.get("pronouns"):
                persona_instruction_lines.append(f"- Pronouns: {_persona_json(facilitator_persona_config['pronouns'])}")
            if facilitator_persona_config.get("gender_presentation"):
                persona_instruction_lines.append(f"- Avatar presentation: {facilitator_persona_config['gender_presentation']}")
            if facilitator_persona_config.get("tone"):
                persona_instruction_lines.append(f"- Tone: {facilitator_persona_config['tone']}")
            if facilitator_persona_config.get("voice_style"):
                persona_instruction_lines.append(f"- Spoken voice style: {facilitator_persona_config['voice_style']}")
            if facilitator_persona_config.get("speaking_behavior"):
                persona_instruction_lines.append(f"- Speaking behavior: {_persona_json(facilitator_persona_config['speaking_behavior'])}")
            if facilitator_persona_config.get("nonverbal_behavior"):
                persona_instruction_lines.append(f"- Nonverbal/avatar cues to imply in concise language when useful: {_persona_json(facilitator_persona_config['nonverbal_behavior'])}")
            persona_instruction_lines.append("Apply this persona naturally: adapt word choice, pacing, warmth, energy, and questioning style, while still prioritizing the workshop objective, host instructions, safety, and confidentiality rules.")
            system_parts.append("\n".join(persona_instruction_lines))
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
                f"If a participant writes in another language, still respond in {facilitator_language}.")
        system_parts.append(
            f"Your name is {facilitator_name}. Always introduce yourself using this exact name.\n\n"
            "IMPORTANT RULES:\n"
            "- Keep responses concise (2-4 paragraphs max).\n"
            "- Always end with a clear, engaging question to keep the discussion going.\n"
            "- Address participants warmly and reference their specific contributions when responding to answers.\n"
            "- Use a professional yet approachable tone.\n"
            "- Do NOT use markdown headers (##) in chat messages.\n"
            "- Do NOT use placeholder text like [Your Name] - always use your actual name."
            + language_instruction)

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

            technique_selection = _select_facilitation_technique_sync(conv_id, facilitator_id, {
                "facilitator_name": facilitator_name,
                "title": session_title,
                "objective": objective,
                "scope": session_scope,
            })
            selected_mode = technique_selection.get("selected_mode") or {}
            mode_floor_rules = _flask_safe_json_value(selected_mode.get("floor_rules"), {})
            mode_ai_responsibilities = _flask_safe_json_value(selected_mode.get("ai_responsibilities"), [])
            system_message += (
                "\n\nADAPTIVE FACILITATION TECHNIQUE FOR THIS TURN:\n"
                f"Technique: {technique_selection.get('selected_technique')} ({selected_mode.get('display_name') or 'selected technique'})\n"
                f"Purpose: {selected_mode.get('purpose') or 'Guide the next facilitator intervention.'}\n"
                f"Floor rules to respect: {_flask_clip_text(mode_floor_rules, 900)}\n"
                f"AI responsibilities: {_flask_clip_text(mode_ai_responsibilities, 1000)}\n"
                f"Selection rationale: {technique_selection.get('rationale')}\n"
                "Apply these technique-specific rules naturally. Do not mention the internal technique selection unless it is helpful to participants."
            )
            divergence_note = (
                "The selector intentionally chose purposeful divergence for this turn. Encourage exploration, broaden the idea space, and still leave a constructive path back toward the objective."
                if technique_selection.get("divergence_intent")
                else "The selector did not choose purposeful divergence for this turn. Keep the discussion constructively oriented toward the objective."
            )
            host_guidance = f"The host has instructed you to: {host_instruction}\n\nFollow the host's instruction above while applying the selected technique where compatible.\n" if host_instruction else ""
            user_prompt = (
                f"Here is the recent conversation in our workshop \"{session_title}\":\n\n"
                f"{conversation_context}\n"
                f"{host_guidance}"
                "Adaptive facilitation guidance for your next intervention:\n"
                f"- Selected technique: {technique_selection.get('selected_technique')} ({selected_mode.get('display_name') or 'selected technique'})\n"
                f"- Rationale: {technique_selection.get('rationale')}\n"
                f"- Technique responsibilities: {_flask_clip_text(mode_ai_responsibilities, 900)}\n"
                f"- Steering instruction: {technique_selection.get('steering_instruction')}\n"
                f"- Divergence guidance: {divergence_note}\n\n"
                "Based on the participants' responses above and the selected technique:\n"
                "1. Briefly acknowledge and synthesize the key themes from their answers.\n"
                "2. Highlight any interesting connections or contrasts between different participants' views when useful.\n"
                "3. Ask the next question or give the next instruction in a way that follows the selected facilitation technique.\n\n"
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
        if 'technique_selection' not in locals():
            technique_selection = None
        if 'selected_mode' not in locals():
            selected_mode = {}
        if conv_id:
            try:
                conn = get_db(); cur = conn.cursor()
                persona_message_metadata = {}
                if facilitator_persona_config:
                    persona_message_metadata = {
                        "facilitator_persona": {
                            "voice_id": facilitator_persona_config.get("voice_id"),
                            "voice_provider": facilitator_persona_config.get("voice_provider"),
                            "voice_style": facilitator_persona_config.get("voice_style"),
                            "locale": facilitator_persona_config.get("locale"),
                            "tone": facilitator_persona_config.get("tone"),
                            "animation_preset": facilitator_persona_config.get("animation_preset"),
                        }
                    }
                technique_message_metadata = {}
                if technique_selection:
                    technique_message_metadata = {
                        "facilitation_technique": {
                            "selected_technique": technique_selection.get("selected_technique"),
                            "display_name": selected_mode.get("display_name"),
                            "mode_id": selected_mode.get("id"),
                            "rationale": technique_selection.get("rationale"),
                            "divergence_intent": bool(technique_selection.get("divergence_intent")),
                            "steering_instruction": technique_selection.get("steering_instruction"),
                            "selector_model": technique_selection.get("selector_model"),
                            "selector_fallback": bool(technique_selection.get("selector_fallback")),
                            "engagement_signals": technique_selection.get("engagement_signals"),
                        }
                    }
                content_json = json.dumps({"text": txt, **({"avatar": avatar_url} if avatar_url else {}), **persona_message_metadata, **technique_message_metadata})
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
                    "UPDATE conversations SET is_session_ended = true, ended_at = NOW(), status = 'completed', final_report_id = %s, total_messages = %s WHERE id = %s",
                    (report_id, message_count, conv_id)
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
        # Create a real Stripe PaymentIntent for subscription payment
        if not STRIPE_CONFIGURED:
            return jsonify({"error": "Stripe is not configured on this server"}), 500
        plan_id = data.get("planId")
        stripe_plan_id = data.get("stripePlanId")
        user_id = data.get("userId")
        billing = data.get("billingDetails", {})
        if not stripe_plan_id or not user_id:
            return jsonify({"error": "Missing planId, stripePlanId, or userId"}), 400
        try:
            # Resolve the price amount from Stripe to avoid client-side tampering
            price_obj = stripe_lib.Price.retrieve(stripe_plan_id)
            amount = price_obj.unit_amount  # in smallest currency unit (cents)
            currency = price_obj.currency
            # Look up or create a Stripe customer for this user
            conn = get_db()
            cur = conn.cursor()
            cur.execute(
                "SELECT stripe_customer_id FROM profiles WHERE id = %s",
                (user_id,)
            )
            profile = cur.fetchone()
            customer_id = profile["stripe_customer_id"] if profile else None
            if not customer_id:
                # Create a new Stripe customer
                customer = stripe_lib.Customer.create(
                    email=billing.get("email", ""),
                    name=billing.get("name", ""),
                    address={
                        "line1": billing.get("address", {}).get("line1", ""),
                        "city": billing.get("address", {}).get("city", ""),
                        "state": billing.get("address", {}).get("state", ""),
                        "postal_code": billing.get("address", {}).get("postal_code", ""),
                        "country": billing.get("address", {}).get("country", ""),
                    },
                    metadata={"user_id": user_id},
                )
                customer_id = customer.id
                # Persist the new customer ID immediately
                cur.execute(
                    "UPDATE profiles SET stripe_customer_id = %s WHERE id = %s",
                    (customer_id, user_id)
                )
            cur.close()
            conn.close()
            # Create a PaymentIntent for the subscription amount
            intent = stripe_lib.PaymentIntent.create(
                amount=amount,
                currency=currency,
                customer=customer_id,
                payment_method_types=["card"],
                metadata={
                    "user_id": user_id,
                    "plan_id": str(plan_id),
                    "stripe_plan_id": stripe_plan_id,
                },
                description=f"MyFacilitator subscription - plan {plan_id}",
            )
            return jsonify({
                "clientSecret": intent.client_secret,
                "subscriptionId": intent.id,  # use PaymentIntent ID as subscription reference
                "customerId": customer_id,
                "success": True,
            })
        except stripe_lib.error.StripeError as e:
            print(f"Stripe create-subscription error: {e}")
            return jsonify({"error": str(e.user_message if hasattr(e, 'user_message') else e)}), 400
        except Exception as e:
            print(f"create-subscription error: {e}")
            traceback.print_exc()
            return jsonify({"error": "Internal server error"}), 500

    elif func_name == "create-portal-session":
        # Create a real Stripe Billing Portal session for subscription management
        if not STRIPE_CONFIGURED:
            return jsonify({"error": "Stripe is not configured on this server"}), 500
        user_id = data.get("userId")
        return_url = data.get("returnUrl", "https://friendly-ai-sessions.vercel.app/profile")
        if not user_id:
            return jsonify({"error": "Missing userId"}), 400
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute(
                "SELECT stripe_customer_id FROM profiles WHERE id = %s",
                (user_id,)
            )
            profile = cur.fetchone()
            cur.close()
            conn.close()
            customer_id = profile["stripe_customer_id"] if profile else None
            if not customer_id:
                return jsonify({"error": "No Stripe customer found for this user"}), 404
            portal_session = stripe_lib.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url,
            )
            return jsonify({"url": portal_session.url, "success": True})
        except stripe_lib.error.StripeError as e:
            print(f"Stripe create-portal-session error: {e}")
            return jsonify({"error": str(e.user_message if hasattr(e, 'user_message') else e)}), 400
        except Exception as e:
            print(f"create-portal-session error: {e}")
            traceback.print_exc()
            return jsonify({"error": "Internal server error"}), 500

    elif func_name == "confirm-subscription":
        # Verify payment and update the user's subscription in the database
        subscription_id = data.get("subscriptionId")  # PaymentIntent ID
        customer_id = data.get("customerId")
        user_id = data.get("userId")
        plan_id = data.get("planId")
        payment_intent_id = data.get("paymentIntentId") or subscription_id
        if not user_id or not plan_id:
            return jsonify({"error": "Missing userId or planId"}), 400
        # If Stripe is configured, verify the PaymentIntent status
        if STRIPE_CONFIGURED and payment_intent_id:
            try:
                pi = stripe_lib.PaymentIntent.retrieve(payment_intent_id)
                if pi.status not in ("succeeded", "processing"):
                    return jsonify({
                        "error": f"Payment not completed. Status: {pi.status}"
                    }), 402
            except stripe_lib.error.StripeError as e:
                print(f"Stripe confirm-subscription verify error: {e}")
                return jsonify({"error": str(e.user_message if hasattr(e, 'user_message') else e)}), 400
        # Update the profiles table with the new subscription details
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute(
                "UPDATE profiles SET "
                "current_plan_id = %s, "
                "subscription_status = 'active', "
                "stripe_customer_id = COALESCE(%s, stripe_customer_id), "
                "stripe_subscription_id = COALESCE(%s, stripe_subscription_id), "
                "updated_at = NOW() "
                "WHERE id = %s",
                (plan_id, customer_id, subscription_id, user_id)
            )
            cur.close()
            conn.close()
            return jsonify({"success": True})
        except Exception as e:
            print(f"confirm-subscription DB error: {e}")
            traceback.print_exc()
            return jsonify({"error": "Failed to update subscription in database"}), 500

    elif func_name == "recover-stuck-welcome-messages":
        return jsonify({"recovered": 0, "success": True})

    return jsonify({"error": f"Unknown function: {func_name}"}), 404


# ============================================================
# Stripe Webhook
# Handles subscription lifecycle events from Stripe.
# Set STRIPE_WEBHOOK_SECRET_TEST / STRIPE_WEBHOOK_SECRET_LIVE in Railway env vars.
# Register this endpoint in the Stripe Dashboard:
#   https://dashboard.stripe.com/webhooks
#   URL: https://<railway-domain>/stripe-webhook
# ============================================================
@app.route("/stripe-webhook", methods=["POST"])
def stripe_webhook():
    payload = request.get_data(as_text=False)
    sig_header = request.headers.get("Stripe-Signature", "")

    if not STRIPE_CONFIGURED:
        return jsonify({"error": "Stripe not configured"}), 500

    # Verify webhook signature when a secret is configured
    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe_lib.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except stripe_lib.error.SignatureVerificationError as e:
            print(f"Stripe webhook signature verification failed: {e}")
            return jsonify({"error": "Invalid signature"}), 400
        except Exception as e:
            print(f"Stripe webhook parse error: {e}")
            return jsonify({"error": "Invalid payload"}), 400
    else:
        # No webhook secret configured – parse without verification (dev only)
        try:
            event = stripe_lib.Event.construct_from(
                json.loads(payload), stripe_lib.api_key
            )
        except Exception as e:
            print(f"Stripe webhook parse error (no secret): {e}")
            return jsonify({"error": "Invalid payload"}), 400

    event_type = event["type"]
    event_data = event["data"]["object"]
    print(f"Stripe webhook received: {event_type}")

    try:
        conn = get_db()
        cur = conn.cursor()

        if event_type == "payment_intent.succeeded":
            # PaymentIntent succeeded: mark subscription active
            pi = event_data
            user_id = pi.get("metadata", {}).get("user_id")
            plan_id = pi.get("metadata", {}).get("plan_id")
            customer_id = pi.get("customer")
            if user_id and plan_id:
                cur.execute(
                    "UPDATE profiles SET "
                    "current_plan_id = %s, "
                    "subscription_status = 'active', "
                    "stripe_customer_id = COALESCE(%s, stripe_customer_id), "
                    "stripe_subscription_id = COALESCE(%s, stripe_subscription_id), "
                    "updated_at = NOW() "
                    "WHERE id = %s",
                    (plan_id, customer_id, pi.get("id"), user_id)
                )
                print(f"Webhook: activated plan {plan_id} for user {user_id}")

        elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
            sub = event_data
            customer_id = sub.get("customer")
            status = sub.get("status")  # active, past_due, canceled, etc.
            # Map Stripe status to our subscription_status values
            db_status = "active" if status == "active" else (
                "past_due" if status == "past_due" else (
                    "canceled" if status in ("canceled", "unpaid") else status
                )
            )
            # Identify user by stripe_customer_id
            if customer_id:
                cur.execute(
                    "UPDATE profiles SET "
                    "subscription_status = %s, "
                    "stripe_subscription_id = %s, "
                    "updated_at = NOW() "
                    "WHERE stripe_customer_id = %s",
                    (db_status, sub.get("id"), customer_id)
                )
                print(f"Webhook: updated subscription status to '{db_status}' for customer {customer_id}")

        elif event_type == "customer.subscription.deleted":
            sub = event_data
            customer_id = sub.get("customer")
            if customer_id:
                # Revert to free plan (plan_id 1 assumed to be Free)
                cur.execute(
                    "UPDATE profiles SET "
                    "subscription_status = 'canceled', "
                    "stripe_subscription_id = NULL, "
                    "current_plan_id = (SELECT id FROM plans WHERE plan_type = 'free' LIMIT 1), "
                    "updated_at = NOW() "
                    "WHERE stripe_customer_id = %s",
                    (customer_id,)
                )
                print(f"Webhook: canceled subscription for customer {customer_id}")

        elif event_type == "invoice.payment_failed":
            inv = event_data
            customer_id = inv.get("customer")
            if customer_id:
                cur.execute(
                    "UPDATE profiles SET "
                    "subscription_status = 'past_due', "
                    "updated_at = NOW() "
                    "WHERE stripe_customer_id = %s",
                    (customer_id,)
                )
                print(f"Webhook: marked past_due for customer {customer_id}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Stripe webhook DB error for event {event_type}: {e}")
        traceback.print_exc()
        # Return 200 to prevent Stripe from retrying on DB errors
        return jsonify({"received": True, "warning": "DB update failed"}), 200

    return jsonify({"received": True}), 200


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
