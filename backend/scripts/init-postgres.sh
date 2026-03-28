#!/bin/sh
# ================================================================
# scripts/init-postgres.sh
# Runs ONCE when the postgres container is first created.
# Creates required extensions, a read-only reporting role,
# and hardens default settings.
# ================================================================
set -e

echo ">>> Infosys ERP: Initialising PostgreSQL..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'EOSQL'

  -- ── Extensions ─────────────────────────────────────────────
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";          -- gen_random_uuid()
  CREATE EXTENSION IF NOT EXISTS "pg_trgm";           -- trigram search
  CREATE EXTENSION IF NOT EXISTS "btree_gin";         -- GIN on btree types
  CREATE EXTENSION IF NOT EXISTS "unaccent";          -- accent-insensitive search

  -- ── Read-only reporting role ───────────────────────────────
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'erp_readonly') THEN
      CREATE ROLE erp_readonly WITH LOGIN PASSWORD 'readonly_change_me';
    END IF;
  END $$;

  GRANT CONNECT ON DATABASE infosys_pak TO erp_readonly;
  GRANT USAGE ON SCHEMA public TO erp_readonly;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO erp_readonly;

  -- ── Performance settings ────────────────────────────────────
  ALTER SYSTEM SET log_min_duration_statement = '500';   -- log slow queries
  ALTER SYSTEM SET auto_vacuum = 'on';
  ALTER SYSTEM SET track_counts = 'on';

  -- ── Revoke public schema creation from PUBLIC role ─────────
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;
  GRANT CREATE ON SCHEMA public TO erp_app;

  SELECT pg_reload_conf();

EOSQL

echo ">>> PostgreSQL initialisation complete."
