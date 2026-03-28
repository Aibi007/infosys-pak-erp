#!/bin/sh
# ================================================================
# scripts/backup.sh
# Runs daily via cron inside the backup container.
# Dumps all tenant schemas + public schema individually.
# Keeps last N days (BACKUP_KEEP env var).
# ================================================================
set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y-%m-%d_%H%M)
KEEP=${BACKUP_KEEP:-14}

echo "=== ERP Backup starting: $DATE ==="

# ── Full dump (all schemas) ───────────────────────────────────
FULL_FILE="$BACKUP_DIR/full_${DATE}.sql.gz"
pg_dump \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-password \
  --format=plain \
  --verbose \
  2>/dev/null \
  | gzip > "$FULL_FILE"

echo "Full dump: $FULL_FILE ($(du -h "$FULL_FILE" | cut -f1))"

# ── Per-tenant schema dumps ────────────────────────────────────
TENANTS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT slug FROM tenants WHERE status='active';" 2>/dev/null | xargs)

for SLUG in $TENANTS; do
  SCHEMA_FILE="$BACKUP_DIR/tenant_${SLUG}_${DATE}.sql.gz"
  pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --schema="$SLUG" \
    --format=plain \
    2>/dev/null \
    | gzip > "$SCHEMA_FILE"
  echo "Tenant dump: $SCHEMA_FILE ($(du -h "$SCHEMA_FILE" | cut -f1))"
done

# ── Rotate old backups ────────────────────────────────────────
echo "Removing backups older than $KEEP days..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$KEEP" -delete
echo "Backup rotation done."

# ── Summary ───────────────────────────────────────────────────
TOTAL=$(du -sh "$BACKUP_DIR" | cut -f1)
COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l)
echo "=== Backup complete: $COUNT files, $TOTAL total ==="
