#!/usr/bin/env bash
# Minimal stability check: shared build + web/api TypeScript (no e2e, no DB).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

"$SCRIPT_DIR/check-workspace-root.sh" >/dev/null

echo "→ @medora/shared build"
pnpm --filter @medora/shared build

echo "→ @medora/web tsc --noEmit"
pnpm --filter @medora/web exec tsc --noEmit

echo "→ @medora/web vitest"
pnpm --filter @medora/web exec vitest run

echo "→ prisma generate (@medora/api) — ensures client types for API typecheck"
pnpm --filter @medora/api exec prisma generate

echo "→ @medora/api tsc --noEmit (tsconfig.build.json)"
pnpm --filter @medora/api exec tsc --noEmit -p tsconfig.build.json

echo ""
echo "OK — verify-stability passed (shared build + web/api typecheck)."
