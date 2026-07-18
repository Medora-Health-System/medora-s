# Medication Import Operations Guide

```bash
pnpm --filter @medora/shared build
pnpm --filter @medora/api medication:wave3:audit
pnpm --filter @medora/api medication:wave3:validate -- --source MEDORA_CURATED
pnpm --filter @medora/api medication:wave3:dry-run
pnpm --filter @medora/api medication:wave3:apply
pnpm --filter @medora/api medication:wave3:reconcile
pnpm --filter @medora/api medication:wave3:verify
pnpm --filter @medora/api medication:wave3:certify
```

APPLY is explicit. Dry-run/validate/audit make zero canonical mutations. Second APPLY is idempotent.
