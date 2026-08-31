#!/usr/bin/env bash
#
# Medora S — Cloud Agent start (per-boot runtime init).
#
# Runs on every environment boot. It is intentionally lightweight: it only makes
# sure the DISPOSABLE local PostgreSQL cluster is running and accepting
# connections. It does NOT install dependencies, build, run migrations, or seed —
# that expensive, one-time work lives in .cursor/scripts/cloud-agent-install.sh.
#
# The API (:3001) and Web (:3002) dev servers are launched as environment
# `terminals` (see .cursor/environment.json) so their logs are visible and they
# can be restarted independently.
set -euo pipefail

log() { printf '\n\033[1;36m[medora-start]\033[0m %s\n' "$*"; }

PG_MAJOR="${MEDORA_PG_MAJOR:-16}"

log "Ensuring PostgreSQL ${PG_MAJOR} cluster is running…"
if command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo pg_ctlcluster "${PG_MAJOR}" main start 2>/dev/null || true
else
  log "WARNING: pg_ctlcluster not found — run .cursor/scripts/cloud-agent-install.sh first."
fi

# Wait until the server accepts connections so dependent terminals start cleanly.
ready=0
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q 2>/dev/null; then ready=1; break; fi
  sleep 1
done

if [ "$ready" -eq 1 ]; then
  log "PostgreSQL is ready. API (:3001) and Web (:3002) start as environment terminals."
else
  log "WARNING: PostgreSQL did not become ready in time; dev servers may fail to connect."
fi
