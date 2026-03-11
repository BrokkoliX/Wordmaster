#!/usr/bin/env bash
# =============================================================================
# Wordmaster — Production Deploy Script
#
# Usage:
#   ./scripts/deploy.sh [--rollback [<commit-sha>]]
#
# What it does (normal deploy):
#   1. Tags the current server commit as a rollback point
#   2. Pulls the latest main branch
#   3. Installs backend dependencies
#   4. Reloads the API with zero-downtime via PM2
#   5. Runs a health check — rolls back automatically on failure
#
# What it does (rollback):
#   ./scripts/deploy.sh --rollback              # rolls back to the previous tag
#   ./scripts/deploy.sh --rollback abc1234      # rolls back to a specific SHA
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SERVER_USER="ubuntu"
SERVER_IP="3.211.219.221"
PEM_KEY="$(dirname "$0")/../wordmaster-key.pem"
REMOTE_DIR="/home/ubuntu/Wordmaster"
BRANCH="main"
HEALTH_URL="https://word-master.org/api/words/count?source_lang=en&target_lang=es"
HEALTH_RETRIES=6
HEALTH_DELAY=5   # seconds between retries

# Resolve the key path to absolute
PEM_KEY="$(cd "$(dirname "$PEM_KEY")" && pwd)/$(basename "$PEM_KEY")"

ssh_exec() {
  ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_IP}" "$@"
}

# ---------------------------------------------------------------------------
# Health check — retries until the API responds with a valid JSON total
# ---------------------------------------------------------------------------
health_check() {
  echo "  Running health check against $HEALTH_URL ..."
  for i in $(seq 1 $HEALTH_RETRIES); do
    response=$(curl -sf --max-time 8 "$HEALTH_URL" 2>/dev/null || true)
    if echo "$response" | grep -q '"total"'; then
      echo "  Health check passed (attempt $i): $response"
      return 0
    fi
    echo "  Attempt $i/$HEALTH_RETRIES failed, retrying in ${HEALTH_DELAY}s..."
    sleep $HEALTH_DELAY
  done
  echo "  Health check FAILED after $HEALTH_RETRIES attempts."
  return 1
}

# ---------------------------------------------------------------------------
# Rollback
# ---------------------------------------------------------------------------
rollback() {
  local target="${1:-}"
  echo ""
  echo "========================================="
  echo "  ROLLING BACK"
  echo "========================================="

  if [ -z "$target" ]; then
    # Find the most recent rollback tag on the server
    target=$(ssh_exec "cd $REMOTE_DIR && git tag --sort=-creatordate | grep '^deploy/' | head -1")
    if [ -z "$target" ]; then
      echo "No rollback tag found. Cannot roll back automatically."
      exit 1
    fi
    echo "  Rolling back to tag: $target"
  else
    echo "  Rolling back to: $target"
  fi

  ssh_exec "
    set -e
    cd $REMOTE_DIR
    git checkout $target
    cd backend && npm install --omit=dev --silent
    pm2 reload ecosystem.config.js --env production
    echo 'Rollback checkout done.'
  "

  echo "  Waiting for process to stabilise..."
  sleep 5

  if health_check; then
    echo ""
    echo "  Rollback successful. Server is healthy at $target."
  else
    echo ""
    echo "  ERROR: Server is still unhealthy after rollback."
    echo "  Check logs: ssh -i $PEM_KEY ${SERVER_USER}@${SERVER_IP} 'pm2 logs wordmaster-api --lines 50'"
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
if [ "${1:-}" = "--rollback" ]; then
  rollback "${2:-}"
  exit 0
fi

# ---------------------------------------------------------------------------
# Normal deploy
# ---------------------------------------------------------------------------
echo ""
echo "========================================="
echo "  WORDMASTER DEPLOY — $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# 1. Tag the current server state as a rollback point
echo ""
echo "[1/5] Tagging current server commit as rollback point..."
ROLLBACK_TAG="deploy/rollback-$(date '+%Y%m%d-%H%M%S')"
ssh_exec "
  cd $REMOTE_DIR
  CURRENT=\$(git rev-parse --short HEAD)
  git tag $ROLLBACK_TAG
  echo '  Tagged \$CURRENT as $ROLLBACK_TAG'
"

# 2. Pull latest code
echo ""
echo "[2/5] Pulling latest $BRANCH from origin..."
ssh_exec "
  cd $REMOTE_DIR
  # Make sure we are on main and tracking origin/main
  git fetch origin
  git checkout $BRANCH
  git reset --hard origin/$BRANCH
"

# 3. Install backend dependencies
echo ""
echo "[3/6] Installing backend dependencies..."
ssh_exec "
  cd $REMOTE_DIR/backend
  npm install --omit=dev --silent
"

# 4. Build admin UI
echo ""
echo "[4/6] Building admin UI..."
ssh_exec "
  cd $REMOTE_DIR/admin
  npm install --silent
  npm run build
"

# 5. Reload with PM2 (zero-downtime)
echo ""
echo "[5/6] Reloading API via PM2..."
ssh_exec "
  cd $REMOTE_DIR/backend
  # Use ecosystem file if present, otherwise fall back to named reload
  if [ -f ecosystem.config.js ]; then
    pm2 reload ecosystem.config.js --env production
  else
    pm2 reload wordmaster-api
  fi
"

echo "  Waiting for process to stabilise..."
sleep 5

# 6. Health check — auto-rollback on failure
echo ""
echo "[6/6] Health check..."
if health_check; then
  echo ""
  echo "========================================="
  echo "  DEPLOY SUCCESSFUL"
  echo "  Rollback point: $ROLLBACK_TAG"
  echo "  To roll back:   ./scripts/deploy.sh --rollback"
  echo "========================================="
else
  echo ""
  echo "  Health check failed — triggering automatic rollback to $ROLLBACK_TAG..."
  rollback "$ROLLBACK_TAG"
  echo ""
  echo "  Auto-rollback completed. Investigate before re-deploying."
  exit 1
fi
