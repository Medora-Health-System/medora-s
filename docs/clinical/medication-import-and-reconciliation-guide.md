# Medication Import and Reconciliation Guide

## Wave 2 importer modes

| Mode | Mutations | Purpose |
|------|-----------|---------|
| `AUDIT` | No | Live baseline counts |
| `DRY_RUN` | No | Classify candidates |
| `APPLY` | Yes | CatalogMedication-first CREATE + dual-layer link |
| `VERIFY` | No | Post-apply identity check |
| `REPORT` | No | Summary artifact |
| `reconcile` | Yes | Merge duplicate `EM_W2C_*` generics |

## Idempotency

Second successful `APPLY` must create **zero** new catalog rows / concepts / products.

## Commands

```bash
pnpm --filter @medora/shared build
pnpm --filter @medora/api medication:wave2:catalog:audit
pnpm --filter @medora/api medication:wave2:catalog:dry-run
pnpm --filter @medora/api medication:wave2:catalog:apply
pnpm --filter @medora/api medication:wave2:catalog:reconcile
pnpm --filter @medora/api medication:wave2:catalog:verify
pnpm --filter @medora/api medication:wave2:catalog:certify
```

Artifacts land in `apps/api/prisma/medications/audit-summaries/`.
