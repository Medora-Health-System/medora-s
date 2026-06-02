# Enterprise Wave 1 — Validation (M1.6B)

## Automated checks

| Layer | Command / file |
|-------|----------------|
| Shared manifest | `packages/shared/src/medication/enterpriseWave1BillingValidation.test.ts` |
| API billing gate | `apps/api/src/medication-master/enterprise-wave1-billing-gate.util.spec.ts` |
| API readiness | `apps/api/src/billing/enterprise-wave1-billing-readiness.spec.ts` |
| Prisma schema | `pnpm --filter @medora/api exec prisma validate` |

## Recommended verification sequence

```bash
pnpm --filter @medora/shared build
pnpm --filter @medora/shared test -- enterpriseWave1
pnpm --filter @medora/api test -- enterprise-wave1
pnpm --filter @medora/api exec prisma validate
pnpm build
pnpm verify:web
```

## Seed validation (with DB)

```bash
MEDORA_ENABLE_ENTERPRISE_WAVE1_FORMULARY=1 pnpm --filter @medora/api prisma:seed-catalogs
```

Inspect log line: `wave1ReadinessPct` should be **100** after successful seed.

## Search validation

Shared: `enterpriseWave1SearchValidation.ts`  
Required brand/generic pairs include Coumadin↔Warfarin, Lovenox↔Enoxaparin, Eliquis↔Apixaban, etc.

## Safe / not safe

| Verdict | Condition |
|---------|-----------|
| **SAFE FOR WAVE 1 ACTIVATION** | `wave1ReadinessPct === 100`, all per-medication `pass`, staging seed completed, billing gate tests green |
| **NOT SAFE** | Any blocking billing failure, missing ENRICH catalog on target DB, or manifest/DB drift |

Post-seed activation remains a **separate explicit step** (products inactive by design).

## Git

Do not commit until approved. See implementation handoff for `git add` / `commit` / `push` commands after local validation passes.
