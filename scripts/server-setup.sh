#!/usr/bin/env bash
# =============================================================================
# Wordmaster — One-time Server Setup Script
#
# Run this once after provisioning a new server, or to repair the current one.
# It is safe to re-run — all steps are idempotent.
#
# Usage (from your local machine):
#   ssh -i wordmaster-key.pem ubuntu@3.211.219.221 'bash -s' < scripts/server-setup.sh
# =============================================================================

set -euo pipefail

REMOTE_DIR="/home/ubuntu/Wordmaster"
BRANCH="main"

echo ""
echo "========================================="
echo "  WORDMASTER SERVER SETUP"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# ---------------------------------------------------------------------------
# 1. Ensure the repo is on main and tracking origin/main
# ---------------------------------------------------------------------------
echo ""
echo "[1/6] Aligning server repo to origin/$BRANCH..."
cd "$REMOTE_DIR"
git fetch origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
echo "  HEAD: $(git rev-parse --short HEAD) — $(git log -1 --format='%s')"

# ---------------------------------------------------------------------------
# 2. Remove macOS resource-fork junk files (._*) — these appear when a Mac
#    copies files to a case-insensitive FS and should never be on the server
# ---------------------------------------------------------------------------
echo ""
echo "[2/6] Cleaning macOS resource-fork artifacts (._* files)..."
find "$REMOTE_DIR" -name "._*" -not -path "*/.git/*" -delete
echo "  Done."

# ---------------------------------------------------------------------------
# 3. Install backend dependencies
# ---------------------------------------------------------------------------
echo ""
echo "[3/6] Installing backend production dependencies..."
cd "$REMOTE_DIR/backend"
npm install --omit=dev --silent
echo "  Done."

# ---------------------------------------------------------------------------
# 4. Wire PM2 ecosystem file and (re)start the process
# ---------------------------------------------------------------------------
echo ""
echo "[4/6] Starting API via PM2 ecosystem file..."
cd "$REMOTE_DIR/backend"

# Stop any orphaned process first (ignore error if it doesn't exist)
pm2 stop wordmaster-api 2>/dev/null || true
pm2 delete wordmaster-api 2>/dev/null || true

pm2 start ecosystem.config.js --env production
pm2 save   # persist the process list so it survives reboots
echo "  Done."

# ---------------------------------------------------------------------------
# 5. Ensure PM2 restarts on system reboot via systemd
# ---------------------------------------------------------------------------
echo ""
echo "[5/6] Registering PM2 with systemd for auto-restart on reboot..."
# The output of `pm2 startup` tells you the exact command to run;
# we capture and execute it directly here.
STARTUP_CMD=$(pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>&1 | grep "sudo env" || true)
if [ -n "$STARTUP_CMD" ]; then
  eval "$STARTUP_CMD"
  echo "  systemd unit installed."
else
  echo "  systemd unit already installed or pm2 startup returned no command."
fi
pm2 save
echo "  Done."

# ---------------------------------------------------------------------------
# 6. Set up PM2 log rotation (keeps logs from filling the disk)
# ---------------------------------------------------------------------------
echo ""
echo "[6/6] Configuring log rotation..."
if ! pm2 list | grep -q "pm2-logrotate"; then
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 20M
  pm2 set pm2-logrotate:retain 7
  pm2 set pm2-logrotate:compress true
  echo "  pm2-logrotate installed and configured."
else
  echo "  pm2-logrotate already installed."
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "========================================="
echo "  SERVER SETUP COMPLETE"
echo "  Status:"
pm2 show wordmaster-api 2>&1 | grep -E "status|uptime|restarts"
echo "========================================="
