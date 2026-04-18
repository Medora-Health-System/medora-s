#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-apps/web/src}"

echo "Scanning for likely French leakage in: $ROOT"

rg -n --hidden --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/dist/**' --glob '!**/coverage/**' \
  --glob '!**/*.fr.ts' \
  --glob '!**/messages/fr.ts' \
  --glob '!**/messages/erTriage.fr.ts' \
  --glob '!**/mspp/**' \
  --glob '!**/*.json' \
  -e 'Impossible' \
  -e 'Chargement' \
  -e 'Enregistrer' \
  -e 'Urgences' \
  -e 'Médecin' \
  -e 'Infirm' \
  -e 'Résumé' \
  -e 'Sortie' \
  -e 'Admission' \
  -e 'Aucun' \
  -e 'Retour' \
  -e 'Dossier' \
  -e 'Consultation' \
  -e 'Créer' \
  -e 'Soins' \
  -e 'Procéd' \
  -e 'Résultat' \
  -e 'Examens' \
  -e 'Médicament' \
  -e 'Signes vitaux' \
  -e 'Tableau de bord' \
  -e 'Recherche' \
  -e 'Ajouter un diagnostic' \
  -e 'Réévaluation infirmière' \
  -e 'Disposition' \
  -e 'format.*Fr' \
  -e 'LabelFr' \
  -e 'TitleFr' \
  -e 'uiLabels' \
  "$ROOT" || true

echo
echo "Done. Review matches above."
