"""
PostgreSQL Plan Tier Audit — runs via: railway run python audit_db.py
"""
import os
import psycopg2
import psycopg2.extras

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    host = os.environ.get("PGHOST", "localhost")
    port = os.environ.get("PGPORT", "5432")
    dbname = os.environ.get("PGDATABASE", "railway")
    user = os.environ.get("PGUSER", "postgres")
    password = os.environ.get("PGPASSWORD", "")
    DB_URL = f"postgresql://{user}:{password}@{host}:{port}/{dbname}"

print(f"Connecting to DB...")
conn = psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor, connect_timeout=15)
cur = conn.cursor()

SEP = "=" * 70

# ── 1. List all tables ─────────────────────────────────────────────────────
print(f"\n{SEP}\n[0] ALL TABLES IN DATABASE\n{SEP}")
cur.execute("""
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name;
""")
tables = [r["table_name"] for r in cur.fetchall()]
for t in tables:
    print(f"  {t}")

# ── 2. Plans ───────────────────────────────────────────────────────────────
print(f"\n{SEP}\n[1] PLANS TABLE\n{SEP}")
try:
    cur.execute("SELECT * FROM plans ORDER BY id;")
    plans = cur.fetchall()
    plan_map = {}
    for p in plans:
        plan_map[p["id"]] = p
        print(dict(p))
except Exception as e:
    print(f"  ERROR: {e}")
    plans = []
    plan_map = {}

# ── 3. Plan restrictions ───────────────────────────────────────────────────
print(f"\n{SEP}\n[2] PLAN_RESTRICTIONS TABLE\n{SEP}")
try:
    cur.execute("SELECT * FROM plan_restrictions ORDER BY plan_id;")
    restrictions = cur.fetchall()
    pr_map = {}
    for r in restrictions:
        pr_map[r["plan_id"]] = r
        print(dict(r))
except Exception as e:
    print(f"  ERROR: {e}")
    restrictions = []
    pr_map = {}

# ── 4. Facilitators ────────────────────────────────────────────────────────
print(f"\n{SEP}\n[3] FACILITATORS TABLE\n{SEP}")
try:
    cur.execute("SELECT * FROM facilitators ORDER BY id;")
    facilitators = cur.fetchall()
    print(f"  Total: {len(facilitators)}")
    for f in facilitators:
        plan_name = plan_map.get(f.get("plan_id"), {}).get("name", "N/A") if plan_map else "N/A"
        uid = str(f.get("user_id", "None"))
        uid_short = uid[:8] + "..." if uid and uid != "None" else "None (system)"
        print(f"  id={f['id']:3d}  name={str(f.get('name','?'))[:40]:<40}  user={uid_short:<18}  "
              f"is_public={str(f.get('is_public')):<5}  is_default={str(f.get('is_default')):<5}  "
              f"plan_id={str(f.get('plan_id')):<4} ({plan_name})")
except Exception as e:
    print(f"  ERROR: {e}")
    facilitators = []

# ── 5. Profiles with plans ─────────────────────────────────────────────────
print(f"\n{SEP}\n[4] PROFILES & PLANS\n{SEP}")
try:
    cur.execute("SELECT id, email, full_name, current_plan_id, subscription_status, banned FROM profiles ORDER BY created_at;")
    profiles = cur.fetchall()
    print(f"  Total users: {len(profiles)}")
    for p in profiles:
        plan_name = plan_map.get(p.get("current_plan_id"), {}).get("name", "N/A") if plan_map else "N/A"
        print(f"  email={str(p.get('email','?')):<40}  plan_id={str(p.get('current_plan_id')):<4} ({plan_name:<12})  "
              f"sub={str(p.get('subscription_status','?')):<10}  banned={p.get('banned')}")
except Exception as e:
    print(f"  ERROR: {e}")

# ── 6. Facilitator columns ─────────────────────────────────────────────────
print(f"\n{SEP}\n[5] FACILITATORS TABLE COLUMNS\n{SEP}")
cur.execute("""
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'facilitators' AND table_schema = 'public'
    ORDER BY ordinal_position;
""")
for col in cur.fetchall():
    print(f"  {col['column_name']:<30} {col['data_type']:<20} nullable={col['is_nullable']}")

# ── 7. Conversations columns ───────────────────────────────────────────────
print(f"\n{SEP}\n[6] CONVERSATIONS TABLE COLUMNS\n{SEP}")
cur.execute("""
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'conversations' AND table_schema = 'public'
    ORDER BY ordinal_position;
""")
for col in cur.fetchall():
    print(f"  {col['column_name']:<35} {col['data_type']:<20} nullable={col['is_nullable']}")

# ── 8. Conversations with facilitator info ─────────────────────────────────
print(f"\n{SEP}\n[7] CONVERSATIONS + FACILITATOR LINK\n{SEP}")
try:
    cur.execute("""
        SELECT c.id, c.user_id, c.status, c.session_started, c.is_session_ended,
               c.facilitator_id, f.name as facilitator_name, f.plan_id as facilitator_plan_id,
               f.is_public as facilitator_is_public, f.user_id as facilitator_owner_id
        FROM conversations c
        LEFT JOIN facilitators f ON c.facilitator_id = f.id
        ORDER BY c.id;
    """)
    convs = cur.fetchall()
    for c in convs:
        plan_name = plan_map.get(c.get("facilitator_plan_id"), {}).get("name", "N/A") if plan_map else "N/A"
        print(f"  conv_id={c['id']:3d}  status={str(c.get('status','?')):<10}  "
              f"facilitator_id={str(c.get('facilitator_id')):<4}  "
              f"facilitator={str(c.get('facilitator_name','?'))[:30]:<30}  "
              f"fac_plan_id={str(c.get('facilitator_plan_id')):<4} ({plan_name})")
except Exception as e:
    print(f"  ERROR: {e}")

conn.close()
print(f"\n{SEP}\nAUDIT COMPLETE\n{SEP}")
