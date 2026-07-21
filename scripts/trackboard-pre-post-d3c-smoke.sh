#!/usr/bin/env bash
# Prove Trackboard + compatibility against:
#   A) pre-D3B
#   B) post-D3B / pre-D3C
#   C) post-D3C
# Disposable DATABASE_URL only. Does not push. Does not touch production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIG_DIR="$ROOT/apps/api/prisma/migrations"
D3B_NAME="20261024120000_hospital_episode_foundation_d3b"
D3C_NAME="20261025120000_internal_placement_request_d3c"
D3B_PATH="$MIG_DIR/$D3B_NAME"
D3C_PATH="$MIG_DIR/$D3C_NAME"
HOLD_B="${TMPDIR:-/tmp}/$D3B_NAME.hold.$$"
HOLD_C="${TMPDIR:-/tmp}/$D3C_NAME.hold.$$"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required (use a disposable database)" >&2
  exit 1
fi

cleanup() {
  if [[ -d "$HOLD_B" && ! -d "$D3B_PATH" ]]; then mv "$HOLD_B" "$D3B_PATH"; fi
  if [[ -d "$HOLD_C" && ! -d "$D3C_PATH" ]]; then mv "$HOLD_C" "$D3C_PATH"; fi
}
trap cleanup EXIT

cd "$ROOT"
pnpm --filter @medora/api exec prisma generate

echo "==> Phase A: pre-D3B"
[[ -d "$D3B_PATH" ]] && mv "$D3B_PATH" "$HOLD_B"
[[ -d "$D3C_PATH" ]] && mv "$D3C_PATH" "$HOLD_C"
pnpm --filter @medora/api exec prisma migrate deploy
TRACKBOARD_SMOKE_LABEL=pre-d3b pnpm trackboard:smoke:schema
pnpm db:compatibility:check

echo "==> Phase B: post-D3B / pre-D3C"
[[ -d "$HOLD_B" ]] && mv "$HOLD_B" "$D3B_PATH"
pnpm --filter @medora/api exec prisma migrate deploy
TRACKBOARD_SMOKE_LABEL=post-d3b-pre-d3c pnpm trackboard:smoke:schema
pnpm db:compatibility:check

echo "==> Phase C: post-D3C"
[[ -d "$HOLD_C" ]] && mv "$HOLD_C" "$D3C_PATH"
pnpm --filter @medora/api exec prisma migrate deploy
TRACKBOARD_SMOKE_LABEL=post-d3c pnpm trackboard:smoke:schema
pnpm db:compatibility:check

echo "==> Pre-D3B / post-D3B / post-D3C Trackboard smoke OK"
