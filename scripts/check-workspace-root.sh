#!/usr/bin/env bash
# Verify Medora-S monorepo root. Safe to run from any cwd if invoked by path from repo.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

check_file() {
  local f="$1"
  if [[ ! -f "$ROOT/$f" ]]; then
    echo "Erreur: fichier attendu introuvable : $ROOT/$f" >&2
    return 1
  fi
}

check_dir() {
  local d="$1"
  if [[ ! -d "$ROOT/$d" ]]; then
    echo "Erreur: répertoire attendu introuvable : $ROOT/$d" >&2
    return 1
  fi
}

if ! check_file "pnpm-workspace.yaml"; then exit 1; fi
if ! check_file "package.json"; then exit 1; fi
if ! check_file "pnpm-lock.yaml"; then
  echo "Avertissement: pnpm-lock.yaml absent à la racine — exécutez pnpm install depuis la racine." >&2
fi

if ! grep -q '"name"[[:space:]]*:[[:space:]]*"medora-s"' "$ROOT/package.json" 2>/dev/null; then
  echo "Erreur: package.json racine doit déclarer \"name\": \"medora-s\"." >&2
  exit 1
fi

for need in apps/api apps/web packages/shared; do
  if ! check_dir "$need"; then exit 1; fi
done

if [[ ! -f "$ROOT/apps/api/package.json" ]] || [[ ! -f "$ROOT/apps/web/package.json" ]] || [[ ! -f "$ROOT/packages/shared/package.json" ]]; then
  echo "Erreur: package.json manquant sous apps/api, apps/web ou packages/shared." >&2
  exit 1
fi

echo "OK — racine workspace Medora-S : $ROOT"
echo "   Exécuter pnpm / les scripts depuis ce répertoire : cd $ROOT"
exit 0
