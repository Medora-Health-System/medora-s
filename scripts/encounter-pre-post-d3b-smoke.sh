#!/usr/bin/env bash
# Prove shared Encounter query contracts work against:
#   A) DB migrated through pre-D3B only
#   B) DB after D3B additive migration (D3C still excluded)
# Does not push. Does not touch production.
#
# IMPORTANT: D3C depends on HospitalEpisode. While proving pre-D3B, both
# D3B and D3C migration folders must be temporarily excluded.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIG_DIR="$ROOT/apps/api/prisma/migrations"
D3B_NAME="20261024120000_hospital_episode_foundation_d3b"
D3C_NAME="20261025120000_internal_placement_request_d3c"
D3B_PATH="$MIG_DIR/$D3B_NAME"
D3C_PATH="$MIG_DIR/$D3C_NAME"
HOLD_DIR="${TMPDIR:-/tmp}/medora-encounter-d3-hold.$$"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

cleanup() {
  mkdir -p "$MIG_DIR"
  if [[ -d "$HOLD_DIR/$D3B_NAME" && ! -d "$D3B_PATH" ]]; then
    mv "$HOLD_DIR/$D3B_NAME" "$D3B_PATH"
  fi
  if [[ -d "$HOLD_DIR/$D3C_NAME" && ! -d "$D3C_PATH" ]]; then
    mv "$HOLD_DIR/$D3C_NAME" "$D3C_PATH"
  fi
  rm -rf "$HOLD_DIR"
}
trap cleanup EXIT

cd "$ROOT"
mkdir -p "$HOLD_DIR"

echo "==> Prisma generate"
pnpm --filter @medora/api exec prisma generate

echo "==> Phase A: pre-D3B database (D3B + D3C migration folders temporarily excluded)"
if [[ -d "$D3B_PATH" ]]; then
  mv "$D3B_PATH" "$HOLD_DIR/$D3B_NAME"
fi
if [[ -d "$D3C_PATH" ]]; then
  mv "$D3C_PATH" "$HOLD_DIR/$D3C_NAME"
fi
pnpm --filter @medora/api exec prisma migrate deploy
ENCOUNTER_SMOKE_LABEL=pre-d3b pnpm --filter @medora/api exec ts-node --transpile-only prisma/run-encounter-schema-smoke-cli.ts
pnpm db:compatibility:check

echo "==> Phase B: apply D3B additive migration only (keep D3C excluded)"
if [[ -d "$HOLD_DIR/$D3B_NAME" ]]; then
  mv "$HOLD_DIR/$D3B_NAME" "$D3B_PATH"
fi
pnpm --filter @medora/api exec prisma migrate deploy
ENCOUNTER_SMOKE_LABEL=post-d3b pnpm --filter @medora/api exec ts-node --transpile-only prisma/run-encounter-schema-smoke-cli.ts
pnpm db:compatibility:check

echo "==> Pre- and post-D3B Encounter contract smoke OK"
