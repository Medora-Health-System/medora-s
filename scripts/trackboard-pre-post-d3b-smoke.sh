#!/usr/bin/env bash
# Prove Trackboard explicit select works against:
#   A) DB migrated through pre-D3B only
#   B) DB after D3B additive migration
# Does not push. Does not touch production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIG_DIR="$ROOT/apps/api/prisma/migrations"
D3B_NAME="20261024120000_hospital_episode_foundation_d3b"
D3B_PATH="$MIG_DIR/$D3B_NAME"
HOLD_PATH="${TMPDIR:-/tmp}/$D3B_NAME.hold.$$"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

cleanup() {
  if [[ -d "$HOLD_PATH" && ! -d "$D3B_PATH" ]]; then
    mv "$HOLD_PATH" "$D3B_PATH"
  fi
}
trap cleanup EXIT

cd "$ROOT"

echo "==> Prisma generate"
pnpm --filter @medora/api exec prisma generate

echo "==> Phase A: pre-D3B database (D3B migration folder temporarily excluded)"
if [[ -d "$D3B_PATH" ]]; then
  mv "$D3B_PATH" "$HOLD_PATH"
fi
pnpm --filter @medora/api exec prisma migrate deploy
TRACKBOARD_SMOKE_LABEL=pre-d3b pnpm --filter @medora/api exec ts-node --transpile-only prisma/run-trackboard-schema-smoke-cli.ts
pnpm db:compatibility:check

echo "==> Phase B: apply D3B additive migration"
if [[ -d "$HOLD_PATH" ]]; then
  mv "$HOLD_PATH" "$D3B_PATH"
fi
pnpm --filter @medora/api exec prisma migrate deploy
TRACKBOARD_SMOKE_LABEL=post-d3b pnpm --filter @medora/api exec ts-node --transpile-only prisma/run-trackboard-schema-smoke-cli.ts
pnpm db:compatibility:check

echo "==> Pre- and post-D3B Trackboard smoke OK"
