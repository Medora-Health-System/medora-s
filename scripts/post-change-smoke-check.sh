#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
=== Post-change smoke check (manuel) ===

1) Documentation
   - docs/STABILITY_WORKFLOW.md
   - docs/SMOKE_TEST_CHECKLIST.md

2) Commandes rapides
   - API :  pnpm --filter @medora/api dev
   - Web :  PORT=3002 pnpm --filter @medora/web dev
   - Santé API : curl -s http://localhost:3000/health  (adapter le port si besoin)

3) Pages web à ouvrir (session connectée)
   - /login
   - /app (redirection vers l’accueil du rôle)
   - /app/encounters  (liste)
   - /app/encounters/<id>  (détail : onglets Résumé, Ordres, Évaluation infirmière, Notes Inf.)
   - /app/lab-worklist  puis clic « Voir » → /app/lab-worklist/commande/<orderId>
   - /app/rad-worklist  puis « Voir » → /app/rad-worklist/commande/<orderId>
   - /app/pharmacy-worklist  puis « Voir le détail » → /app/pharmacy-worklist/commande/<orderId>

4) Rôles à tester (un utilisateur ou compte par rôle)
   - FRONT_DESK, RN, PROVIDER, PHARMACY, LAB, RADIOLOGY, BILLING, ADMIN
   - Vérifier : landing, navigation autorisée, route interdite = pas d’accès ou redirect attendu

5) Workflow prescripteur (PROVIDER ou ADMIN avec prescription)
   - Consultation ouverte → Créer un ordre → onglet ordonnance
   - Vérifier les deux destinations : « À administrer au patient » / « À envoyer à la pharmacie »

6) Libellés d’ordres
   - Onglet Ordres de la consultation : noms d’analyses / examens / médicaments visibles (pas seulement le type)

Après exécution : cocher docs/SMOKE_TEST_CHECKLIST.md selon les rôles disponibles.
EOF
