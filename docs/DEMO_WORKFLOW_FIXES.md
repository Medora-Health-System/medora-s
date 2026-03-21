# Démo locale — correctifs workflows cliniques et stabilité

Ce document résume les corrections appliquées pour les blocs **évaluation infirmière**, **affichage des ordres**, **labo / imagerie / pharmacie**, **hydratation React**, et **CORS / ports** en environnement de démonstration.

## Ce qui a été corrigé (résumé)

1. **Évaluation infirmière** — Gabarit structuré par systèmes (puces + texte libre), section **Notes infirmières libres**, libellé **Risques / sécurité**, persistance `nursingEvalV1` + synthèse `summaryLinesFr`. Onglet visible pour **RN**, **PROVIDER** et **ADMIN** sur `/app/encounters/[id]`.
2. **Libellés d’ordres** — Utilisation systématique de `displayLabelFr` (API) et repli français sûr ; onglet **Ordres** de la consultation : type (Laboratoire / Imagerie / Médicaments) + sous-titre + liste d’articles catalogués.
3. **Laboratoire & imagerie** — Listes avec noms réels ; **Voir** ouvre `/app/lab-worklist/commande/[orderId]` ou `/app/rad-worklist/commande/[orderId]` (détail + accuser / démarrer / terminer + saisie résultat / pièces jointes).
4. **Pharmacie** — **Voir le détail** vers `/app/pharmacy-worklist/commande/[orderId]`.
5. **Hydratation** — La bannière hors-ligne / file d’attente (`OfflineRuntime`) ne s’affiche qu’**après montage** client ; l’état réseau initial dans `useConnectivityStatus` est aligné serveur/client (**en ligne** par défaut, puis lecture réelle de `navigator.onLine` au montage).
6. **CORS** — L’API autorise `http://localhost:3002` **et** `http://localhost:3003`, plus la variable optionnelle `CORS_ORIGINS` (liste séparée par des virgules).

## Commandes de redémarrage

À la racine du dépôt :

```bash
pnpm install
```

**API** (depuis la racine) :

```bash
pnpm --filter @medora/api dev
```

Par défaut l’API écoute le port défini dans `apps/api/.env` (souvent **3001**). Vérifier `PORT` si besoin.

**Web** — port **3002** (recommandé dans le README) :

```bash
PORT=3002 pnpm --filter @medora/web dev
```

**Web** — port **3003** (si vous préférez éviter un conflit local) :

```bash
PORT=3003 pnpm --filter @medora/web dev
```

Après un changement de dépendances ou de versions Next, en cas de chunks incohérents :

```bash
rm -rf apps/web/.next && PORT=3003 pnpm --filter @medora/web dev
```

## Comptes de démo (mot de passe documenté)

Selon `docs/LOGIN_AND_AUTH.md` et la graine habituelle, le mot de passe est en général **`Admin123!`** pour les comptes seed. Comptes types :

| Rôle       | E-mail (exemple)           |
|------------|----------------------------|
| ADMIN      | `admin@medora.local`       |
| PROVIDER   | `provider@medora.local`    |
| RN         | `rn@medora.local`          |
| LAB        | `lab@medora.local`         |
| RADIOLOGY  | `radiology@medora.local`   |
| PHARMACY   | `pharmacy@medora.local`    |
| FRONT_DESK | `frontdesk@medora.local`   |

Si un rôle manque après seed : assignation dans l’administration ou `docs/RBAC_E2E_TEST_MATRIX.md`.

## Routes à tester par rôle

- **RN** — `/app/nursing` ou `/app/encounters` → ouvrir une consultation → onglet **Évaluation infirmière** (sauvegarde) ; onglet **Ordres** (libellés) ; dossier patient **Résumé** (fil chronologique).
- **PROVIDER** — Même consultation : onglet **Évaluation infirmière** (lecture/édition selon usages) ; **Ordres** ; prescription d’examens si prévu.
- **LAB** — `/app/lab-worklist` → **Voir** → détail commande → flux accuser → démarrer → terminer → **Ajouter un résultat**.
- **RADIOLOGY** — `/app/rad-worklist` → idem avec compte rendu.
- **PHARMACY** — `/app/pharmacy-worklist` → **Voir le détail** → dispensation / impression.
- **ADMIN** — Parcours complets + vérification utilisateurs/établissement.

## Fichiers clés modifiés récemment (référence)

- Web : `app/app/layout.tsx` (navigation), `app/layout.tsx` + `OfflineRuntime.tsx` + `useConnectivityStatus.ts`, `encounters/[id]/page.tsx`, `NursingAssessmentTab.tsx`, `patientChartHelpers.ts`, worklists (`lab-worklist`, `rad-worklist`, `pharmacy-worklist`, pages `commande/[orderId]`), `DepartmentOrderDetail.tsx`.
- API : `main.ts` (CORS), `orders.service.ts` (`displayLabelFr`, `GET /orders/:id`), `results.service.ts`, `chart-summary.service.ts`.

Pour toute origine front supplémentaire : définir `CORS_ORIGINS` dans `apps/api/.env`.
