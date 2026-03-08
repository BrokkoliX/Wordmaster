# Wordmaster Deployment Runbook

This document is the single source of truth for deploying, rolling back, and operating the Wordmaster backend on AWS.

## Architecture

| Component | Detail |
|---|---|
| Server | AWS EC2, Ubuntu 22.04, `3.211.219.221` |
| Domain | `word-master.org` (HTTPS via Certbot/Let's Encrypt) |
| Reverse proxy | Nginx — forwards `/*` to `localhost:3000`, serves `/admin` as static files |
| Process manager | PM2 (`wordmaster-api`, fork mode, wired to systemd) |
| Runtime | Node.js 18 LTS |
| Database | PostgreSQL (on the same EC2 instance) |
| Source | `github.com/BrokkoliX/Wordmaster`, branch `main` |
| SSH key | `wordmaster-key.pem` (600 permissions, never commit this) |

## Prerequisites

Your local machine needs:

- `wordmaster-key.pem` in the project root with permissions `400`
- SSH access: `ssh -i wordmaster-key.pem ubuntu@3.211.219.221`
- `curl` available in your terminal

Run `chmod 400 wordmaster-key.pem` if you see a permission warning.

---

## Normal Deploy

Every deploy follows this sequence automatically:

1. Tag the current server commit as a rollback point
2. Pull `origin/main` with a hard reset (no merge ambiguity)
3. Install backend dependencies (`npm install --omit=dev`)
4. Reload the API with PM2 (zero-downtime — PM2 keeps the old process alive until the new one is ready)
5. Health check — if it fails, the script rolls back automatically

```bash
./scripts/deploy.sh
```

The script prints the rollback tag name on success, for example:

```
DEPLOY SUCCESSFUL
Rollback point: deploy/rollback-20240315-143022
To roll back:   ./scripts/deploy.sh --rollback
```

---

## Rollback

**Roll back to the previous deploy:**

```bash
./scripts/deploy.sh --rollback
```

**Roll back to a specific commit or tag:**

```bash
./scripts/deploy.sh --rollback deploy/rollback-20240315-143022
./scripts/deploy.sh --rollback abc1234
```

The rollback procedure checks out the target, reinstalls deps, reloads PM2, and runs the same health check. If the health check fails after rollback, it exits with a non-zero status — do not re-deploy until the issue is diagnosed.

**List available rollback tags:**

```bash
ssh -i wordmaster-key.pem ubuntu@3.211.219.221 \
  "cd /home/ubuntu/Wordmaster && git tag --sort=-creatordate | grep '^deploy/'"
```

---

## One-time Server Setup

Run this once when provisioning a new server, or to repair an existing one (branch alignment, systemd wiring, log rotation). It is idempotent.

```bash
ssh -i wordmaster-key.pem ubuntu@3.211.219.221 'bash -s' < scripts/server-setup.sh
```

This script:
- Checks out `main` and hard-resets to `origin/main` (fixes any branch drift)
- Removes macOS `._*` resource-fork junk files from the server
- Installs production dependencies
- Starts the API via the PM2 ecosystem file
- Wires PM2 to systemd so the API restarts automatically after a server reboot
- Installs `pm2-logrotate` with a 20 MB cap and 7-day retention

---

## Git Tagging Convention

Every deploy creates a tag in the format:

```
deploy/rollback-YYYYMMDD-HHMMSS
```

Release tags follow semver:

```
v1.0.0
v1.1.0
```

Create a release tag locally and push it:

```bash
git tag v1.1.0 -m "Release v1.1.0 — level filtering and word rotation fixes"
git push origin v1.1.0
```

---

## Checking Server Status

```bash
# PM2 process list
ssh -i wordmaster-key.pem ubuntu@3.211.219.221 "pm2 list"

# Live logs (Ctrl-C to exit)
ssh -i wordmaster-key.pem ubuntu@3.211.219.221 "pm2 logs wordmaster-api"

# Last 50 error lines
ssh -i wordmaster-key.pem ubuntu@3.211.219.221 "pm2 logs wordmaster-api --err --lines 50"

# Which commit is running
ssh -i wordmaster-key.pem ubuntu@3.211.219.221 \
  "cd /home/ubuntu/Wordmaster && git log -1 --oneline"

# Health check
curl -s "https://word-master.org/api/words/count?source_lang=en&target_lang=es"
```

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production. Only merge here when code is tested and ready to deploy. |
| `dev/v*` | Feature development. PRs go into `main` via GitHub. |

The production server always tracks `origin/main`. Never commit directly on the server.

---

## PM2 Ecosystem File

`backend/ecosystem.config.js` is the authoritative PM2 config. Key settings:

- `max_memory_restart: '400M'` — restarts the process if it leaks past 400 MB
- `max_restarts: 10` — stops restart loops after 10 failures in `min_uptime`
- `min_uptime: '10s'` — a restart within 10 s of launch counts as unstable

If PM2 keeps restarting, check the error log before deploying anything:

```bash
ssh -i wordmaster-key.pem ubuntu@3.211.219.221 \
  "tail -100 ~/.pm2/logs/wordmaster-api-error.log"
```

---

## Secrets Management

Secrets live in `/home/ubuntu/Wordmaster/backend/.env` on the server only. They are never committed to git. When adding a new secret:

1. Add it to `.env.example` with a placeholder value and a comment.
2. SSH into the server and add the real value to `.env`.
3. Reload PM2: `pm2 reload wordmaster-api`.

---

## Troubleshooting

**API returns 502 Bad Gateway**
Nginx is running but Node is not. Check: `pm2 list` and `pm2 logs wordmaster-api --err`.

**PM2 restarts in a loop**
Likely a startup crash. Run `pm2 logs wordmaster-api --err --lines 50` to read the error, then fix it and redeploy.

**Server out of disk space**
Run `df -h /` to confirm. PM2 logs are the usual culprit — `pm2 flush` clears them. If log rotation was set up via `server-setup.sh` this should not recur.

**Certbot certificate expired**
Let's Encrypt auto-renews via a systemd timer. If it failed: `sudo certbot renew --nginx`.

**After a server reboot the API does not come back**
PM2 startup is not wired to systemd. Run `server-setup.sh` steps 4-5 again.
