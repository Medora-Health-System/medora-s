#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -d "$ROOT/.git" ]]; then
  echo "Erreur: dépôt Git introuvable." >&2
  exit 1
fi

echo "=== git status ==="
git status

if [[ -z "$(git status --porcelain)" ]]; then
  echo ""
  echo "Aucun changement à enregistrer."
  exit 0
fi

echo ""
read -r -p "Message du checkpoint (Entrée = WIP): " msg
CHECKPOINT_MSG="${msg:-WIP}"

git add -A
git commit -m "checkpoint: ${CHECKPOINT_MSG}"

echo ""
echo "Checkpoint créé : checkpoint: ${CHECKPOINT_MSG}"
