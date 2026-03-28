#!/bin/bash
# ================================================================
# scripts/deploy.sh
# Zero-downtime deploy script for a Linux VPS or EC2 instance.
# Run as: bash scripts/deploy.sh [--branch main] [--skip-backup]
# ================================================================
set -euo pipefail

# ── Config ────────────────────────────────────────────────────
BRANCH="${DEPLOY_BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/infosys-erp}"
COMPOSE="docker compose"
LOG_FILE="/var/log/erp-deploy.log"

SKIP_BACKUP=false
for arg in "$@"; do
  [[ "$arg" == "--skip-backup" ]] && SKIP_BACKUP=true
  [[ "$arg" == "--branch" ]]      && shift && BRANCH="$1"
done

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "========================================"
log "ERP Deploy starting (branch: $BRANCH)"
log "========================================"

# ── 1. Pre-deploy backup ──────────────────────────────────────
if [[ "$SKIP_BACKUP" != "true" ]]; then
  log "Running pre-deploy database backup..."
  $COMPOSE exec -T backup /backup.sh || log "WARNING: backup failed, continuing..."
fi

# ── 2. Pull latest code ───────────────────────────────────────
log "Pulling latest code..."
cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# ── 3. Build new image ────────────────────────────────────────
log "Building Docker image..."
$COMPOSE build api

# ── 4. Run migrations ─────────────────────────────────────────
log "Running database migrations..."
$COMPOSE run --rm api node migrate.js
log "Migrations complete."

# ── 5. Rolling restart (zero downtime) ────────────────────────
log "Rolling restart of API service..."
$COMPOSE up -d --no-deps --build api

# ── 6. Health check ───────────────────────────────────────────
log "Waiting for API to become healthy..."
MAX_RETRIES=30
for i in $(seq 1 $MAX_RETRIES); do
  STATUS=$(curl -sf http://localhost:4000/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'])" 2>/dev/null || echo "down")
  if [[ "$STATUS" == "healthy" ]]; then
    log "API is healthy after ${i} attempt(s)."
    break
  fi
  if [[ $i -eq $MAX_RETRIES ]]; then
    log "ERROR: API did not become healthy after $MAX_RETRIES attempts!"
    log "Rolling back..."
    git checkout HEAD~1
    $COMPOSE up -d --no-deps api
    exit 1
  fi
  sleep 2
done

# ── 7. Reload nginx ───────────────────────────────────────────
log "Reloading nginx..."
$COMPOSE exec -T nginx nginx -s reload

# ── 8. Cleanup old Docker images ─────────────────────────────
log "Pruning old Docker images..."
docker image prune -f --filter "until=24h" || true

log "Deploy complete ✓"
log "========================================"
