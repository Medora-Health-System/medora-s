#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/pnpm-workspace.yaml" ]] || [[ ! -d "$ROOT/apps/web" ]]; then
  echo "Erreur: exécuter ce script depuis la racine du monorepo Medora-S (pnpm-workspace.yaml + apps/web attendus)." >&2
  exit 1
fi

echo "→ Suppression du cache Next.js : apps/web/.next"
rm -rf "$ROOT/apps/web/.next"
echo "   Fait."

echo ""
echo "Commandes pour redémarrer (deux terminaux) :"
echo ""
echo "  # API"
echo "  pnpm --filter @medora/api dev"
echo ""
echo "  # Web (exemple de port — voir README)"
echo "  PORT=3002 pnpm --filter @medora/web dev"
echo ""
echo "Rappel : après modification de packages/shared, reconstruire si besoin :"
echo "  pnpm --filter @medora/shared build"
echo "  # ou : pnpm build"
echo ""
