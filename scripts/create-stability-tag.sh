#!/usr/bin/env bash
# Create an annotated tag: medora-stable-YYYYMMDD-<slug>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

if [[ ! -d "$ROOT/.git" ]]; then
  echo "Erreur: pas un dépôt Git à la racine : $ROOT" >&2
  exit 1
fi

read -r -p "Slug court (kebab-case, ex. lab-routing, pharmacy) : " slug_raw
slug_clean=$(echo "${slug_raw:-}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9.-')
if [[ -z "$slug_clean" ]] || [[ "$slug_clean" == -* ]] || [[ "$slug_clean" == *- ]]; then
  echo "Erreur: slug invalide (utilisez des lettres, chiffres, tirets)." >&2
  exit 1
fi

DATE=$(date +%Y%m%d)
TAG="medora-stable-${DATE}-${slug_clean}"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Erreur: le tag existe déjà : $TAG" >&2
  exit 1
fi

git tag -a "$TAG" -m "Stability tag: $TAG"

echo ""
echo "Tag créé : $TAG"
echo ""
echo "Pousser vers origin :"
echo "  git push origin \"$TAG\""
echo ""
echo "Ou tous les tags (attention) :"
echo "  git push origin --tags"
echo ""
