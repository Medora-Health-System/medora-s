# Stabilisation démo (intégration API / Web)

## Erreur Next.js « Cannot find module './NNNN.js' » (cache obsolète)

Après mise à jour de branches ou changements de bundles, supprimer le cache de build :

```bash
cd apps/web && rm -rf .next
```

Puis redémarrer le serveur de dev.

## Redémarrage propre (API + Web)

Terminal 1 — API (port par défaut `3001` selon `apps/api/src/main.ts`) :

```bash
pnpm --filter @medora/api dev
```

Terminal 2 — Web (`3002` conseillé) :

```bash
rm -rf apps/web/.next
PORT=3002 pnpm --filter @medora/web dev
```

Variables utiles côté Web : `API_URL` ou `MEDORA_API_URL` pointant vers l’API Nest si besoin.

## Migrations Prisma requises (sprints cliniques)

Les champs suivants supposent la migration `20260321120000_clinical_hardening_sprint` (et migrations précédentes) appliquées sur la base utilisée par la démo :

- `Encounter.roomLabel`, `physicianAssignedUserId`, `dischargeSummaryJson`
- `OrderItem.medicationFulfillmentIntent`, `completedAt`, `completedByUserId`
- `MedicationDispense.orderItemId`, etc.

Commandes :

```bash
pnpm --filter @medora/api prisma:migrate
pnpm --filter @medora/api prisma:generate
```

(Remplacer par `prisma migrate deploy` en production.)

## Route signes vitaux patient

Le endpoint **`GET /patients/:id/triage?latest=true`** est **implémenté** côté Nest (`PatientsController`).  
En cas d’échec réseau ou d’indisponibilité, l’UI du dossier patient peut **reconstruire** une timeline partielle à partir du **`GET /patients/:id/chart-summary`** (triage par consultation + `latestVitalsJson`).
