#!/usr/bin/env bash
# Restore Lovable Cloud pg_dump backup into YOUR Supabase project.
#
# Prerequisites:
#   - PostgreSQL 17 client tools (brew install postgresql@17)
#   - .env.migration with TARGET_DB_URL or TARGET_DB_PASSWORD
#
# Usage:
#   source .env.migration   # or export vars manually
#   ./scripts/restore-database.sh /path/to/chapter-harmony-hub.backup
#
# This restores SCHEMA + DATA from the backup. Use on a fresh Supabase project.
# Excludes transient auth/session tables that should not be copied.

set -euo pipefail

BACKUP="${1:-${BACKUP_PATH:-}}"
PG_RESTORE="${PG_RESTORE_PATH:-/opt/homebrew/opt/postgresql@17/bin/pg_restore}"
PSQL="${PSQL_PATH:-/opt/homebrew/opt/postgresql@17/bin/psql}"

PROJECT_REF="${TARGET_SUPABASE_PROJECT_ID:-fdgdkhnvalrwarcedzml}"
DB_HOST="${TARGET_DB_HOST:-db.${PROJECT_REF}.supabase.co}"
DB_USER="${TARGET_DB_USER:-postgres}"
DB_NAME="${TARGET_DB_NAME:-postgres}"
DB_PORT="${TARGET_DB_PORT:-5432}"

if [[ -z "$BACKUP" ]]; then
  echo "Usage: $0 /path/to/backup.backup"
  exit 1
fi

if [[ ! -f "$BACKUP" ]]; then
  echo "Backup file not found: $BACKUP"
  exit 1
fi

if [[ -z "${TARGET_DB_URL:-}" && -z "${TARGET_DB_PASSWORD:-}" ]]; then
  echo "Set TARGET_DB_URL or TARGET_DB_PASSWORD in .env.migration"
  echo "  Password: Supabase Dashboard → Project Settings → Database"
  exit 1
fi

if [[ -z "${TARGET_DB_URL:-}" ]]; then
  TARGET_DB_URL="postgresql://${DB_USER}:${TARGET_DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"
fi

echo "[restore-database] Target: ${DB_HOST}"
echo "[restore-database] Backup: ${BACKUP}"
echo "[restore-database] WARNING: This modifies the remote database. Ctrl+C to abort."
sleep 3

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

SCHEMA_FILE="$WORKDIR/schema.sql"
DATA_FILE="$WORKDIR/data.sql"

EXCLUDE=(
  --exclude-schema=graphql_public
  --exclude-schema=realtime
  --exclude-schema=supabase_functions
  --exclude-schema=supabase_migrations
  --exclude-schema=vault
  --exclude-schema=extensions
  --exclude-table=auth.schema_migrations
  --exclude-table=auth.audit_log_entries
  --exclude-table=auth.sessions
  --exclude-table=auth.refresh_tokens
  --exclude-table=auth.flow_state
  --exclude-table=auth.one_time_tokens
  --exclude-table=auth.mfa_amr_claims
  --exclude-table=auth.mfa_challenges
  --exclude-table=auth.mfa_factors
  --exclude-table=storage.migrations
  --exclude-table=storage.s3_multipart_uploads
  --exclude-table=storage.s3_multipart_uploads_parts
  --exclude-table=storage.buckets_analytics
  --exclude-table=storage.buckets_vectors
  --exclude-table=storage.vector_indexes
)

echo "[restore-database] Extracting filtered schema..."
"$PG_RESTORE" -f "$SCHEMA_FILE" --schema-only --no-owner --no-acl "${EXCLUDE[@]}" "$BACKUP"

# Fresh Supabase already defines public/auth/storage shells — drop conflicting DDL lines.
grep -v "^CREATE SCHEMA public;" "$SCHEMA_FILE" | grep -v "^COMMENT ON SCHEMA public IS" > "$SCHEMA_FILE.filtered" || true
mv "$SCHEMA_FILE.filtered" "$SCHEMA_FILE"

echo "[restore-database] Applying schema (may show benign errors on existing objects)..."
"$PSQL" "$TARGET_DB_URL" -v ON_ERROR_STOP=0 -f "$SCHEMA_FILE" 2>&1 | tail -20

echo "[restore-database] Extracting data..."
"$PG_RESTORE" -f "$DATA_FILE" --data-only --no-owner --no-acl "${EXCLUDE[@]}" "$BACKUP"

echo "[restore-database] Importing data with FK checks disabled..."
{
  echo "SET session_replication_role = replica;"
  cat "$DATA_FILE"
  echo "SET session_replication_role = DEFAULT;"
} | "$PSQL" "$TARGET_DB_URL" -v ON_ERROR_STOP=1

echo "[restore-database] Done. Verify with:"
echo "  SELECT count(*) FROM auth.users;"
echo "  SELECT count(*) FROM public.profiles;"
echo "  SELECT count(*) FROM storage.objects;"
