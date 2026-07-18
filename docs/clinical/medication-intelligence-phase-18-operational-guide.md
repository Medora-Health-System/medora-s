# Phase 18 — Operational Guide

## Safe sequence

1. Confirm Phase 17 certification remains valid.
2. `medication:phase18:seal` — seal approved/shadow versions as immutable.
3. `medication:phase18:replay-all` — deterministic replay; failures block certification.
4. `medication:phase18:drift` — governance-admin drift scan.
5. `medication:phase18:quality` — quality snapshot.
6. `medication:phase18:regulatory` — evidence artifacts only (no approval claim).
7. `medication:phase18:readiness` then `medication:phase18:certify`.

## Admin UI

`/app/admin/medication-governance/operations-center`

## Non-goals

No enterprise activation, CDS, order-from-recommendation, or provider-interruptive alerts.
