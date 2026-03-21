#!/usr/bin/env bash
# Print transparent commands to start local dev (API + Web). Does not start servers unless you copy-paste.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

"$SCRIPT_DIR/check-workspace-root.sh" || exit 1

CLEAN_NEXT=0
if [[ "${1:-}" == "--clean-next" ]]; then
  CLEAN_NEXT=1
fi

echo ""
echo "=== Medora-S — démarrage local (instructions) ==="
echo "Racine : $ROOT"
echo ""

if [[ "$CLEAN_NEXT" -eq 1 ]]; then
  echo "→ Nettoyage cache Next : apps/web/.next"
  rm -rf "$ROOT/apps/web/.next"
  echo "   Fait."
  echo ""
fi

echo "1) (Si vous avez modifié packages/shared) rebuild :"
echo "   cd $ROOT"
echo "   pnpm --filter @medora/shared build"
echo ""
echo "2) API (terminal 1) :"
echo "   cd $ROOT"
echo "   pnpm --filter @medora/api dev"
echo ""
echo "3) Web (terminal 2) :"
echo "   cd $ROOT"
echo "   PORT=3002 pnpm --filter @medora/web dev"
echo ""
echo "Options :"
echo "  $0 --clean-next    # supprime apps/web/.next avant d'afficher les commandes"
echo ""
echo "Vérification racine : $SCRIPT_DIR/check-workspace-root.sh"
echo ""
