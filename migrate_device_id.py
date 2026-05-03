"""
Migration: Add device_id column to session_participants table.

Run via Railway:
  railway run --environment development python migrate_device_id.py
  railway run --environment production python migrate_device_id.py

The device_id is a UUID generated in the participant's browser (localStorage)
and sent at join time. It allows the system to:
  1. Identify returning participants even if their participantId slot was
     reassigned (e.g. after another participant was removed).
  2. Reject URL-spoofing: if a different browser sends the same participantId
     but a different device_id, the backend treats it as a new participant.
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

print("Connecting to database...")
conn = psycopg2.connect(DB_URL, connect_timeout=15)
conn.autocommit = False
cur = conn.cursor()

try:
    # 1. Add device_id column (nullable so existing rows are not broken)
    print("Adding device_id column to session_participants...")
    cur.execute("""
        ALTER TABLE session_participants
        ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT NULL;
    """)

    # 2. Add an index for fast lookup by (conversation_id, device_id)
    print("Creating index on (conversation_id, device_id)...")
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_session_participants_device_id
        ON session_participants (conversation_id, device_id)
        WHERE device_id IS NOT NULL;
    """)

    conn.commit()
    print("Migration completed successfully.")

except Exception as e:
    conn.rollback()
    print(f"Migration FAILED: {e}")
    raise
finally:
    cur.close()
    conn.close()
