#!/usr/bin/env python3
"""Apply and verify the facilitator persona config migration against a PostgreSQL database.

Connection settings are read from environment variables so credentials are not committed.
Required:
  PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
Optional:
  APPLY_MIGRATION=1 to execute the migration file. Without it, the script only verifies connectivity/table state.
"""
from __future__ import annotations

import os
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

MIGRATION = Path(__file__).resolve().parents[1] / "supabase" / "migrations" / "20260527120000_create_facilitator_persona_configs.sql"


def connect():
    required = ["PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD"]
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise SystemExit(f"Missing required environment variables: {', '.join(missing)}")
    return psycopg2.connect(
        host=os.environ["PGHOST"],
        port=int(os.environ["PGPORT"]),
        dbname=os.environ["PGDATABASE"],
        user=os.environ["PGUSER"],
        password=os.environ["PGPASSWORD"],
        connect_timeout=20,
        sslmode=os.environ.get("PGSSLMODE", "prefer"),
    )


def fetch_one(cur, sql: str, params: tuple = ()):
    cur.execute(sql, params)
    return cur.fetchone()


def main() -> None:
    if not MIGRATION.exists():
        raise SystemExit(f"Migration file not found: {MIGRATION}")

    apply_migration = os.environ.get("APPLY_MIGRATION") == "1"

    with connect() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("select current_database() as database_name, current_user as user_name, version() as version")
            identity = cur.fetchone()
            print(f"Connected to database={identity['database_name']} as user={identity['user_name']}")

            before = fetch_one(
                cur,
                """
                select exists (
                  select 1
                  from information_schema.tables
                  where table_schema = 'public'
                    and table_name = 'facilitator_persona_configs'
                ) as table_exists
                """,
            )
            print(f"Table existed before migration: {before['table_exists']}")

            if apply_migration:
                sql = MIGRATION.read_text(encoding="utf-8")
                cur.execute(sql)
                conn.commit()
                print("Migration executed successfully.")
            else:
                print("Dry verification only; migration was not executed.")

            after = fetch_one(
                cur,
                """
                select exists (
                  select 1
                  from information_schema.tables
                  where table_schema = 'public'
                    and table_name = 'facilitator_persona_configs'
                ) as table_exists
                """,
            )
            print(f"Table exists after check: {after['table_exists']}")

            if after["table_exists"]:
                cur.execute(
                    """
                    select column_name, data_type, is_nullable
                    from information_schema.columns
                    where table_schema = 'public'
                      and table_name = 'facilitator_persona_configs'
                    order by ordinal_position
                    """
                )
                columns = cur.fetchall()
                print("Columns:")
                for col in columns:
                    print(f"- {col['column_name']} | {col['data_type']} | nullable={col['is_nullable']}")

                cur.execute(
                    """
                    select indexname
                    from pg_indexes
                    where schemaname = 'public'
                      and tablename = 'facilitator_persona_configs'
                    order by indexname
                    """
                )
                indexes = [row["indexname"] for row in cur.fetchall()]
                print("Indexes:")
                for idx in indexes:
                    print(f"- {idx}")

                cur.execute(
                    """
                    select policyname, cmd
                    from pg_policies
                    where schemaname = 'public'
                      and tablename = 'facilitator_persona_configs'
                    order by policyname
                    """
                )
                policies = cur.fetchall()
                print("Policies:")
                for policy in policies:
                    print(f"- {policy['policyname']} | {policy['cmd']}")


if __name__ == "__main__":
    main()
