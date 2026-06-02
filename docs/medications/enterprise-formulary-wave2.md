# M1.6D — Enterprise Formulary Wave 2

## Scope

**Medication program only.** Expands enterprise formulary breadth (89 medications) without billing engine redesign, governance redesign, search architecture redesign, provider search cutover, claim changes, or pharmacy workflow changes.

Wave 1 (45 meds) remains unchanged. Wave 2 adds **89 net-new manifest rows** (no catalog code overlap with Wave 1).

## Domains

| Bucket | Count | Mode mix |
|--------|------:|----------|
| Cardiology | 18 | ENRICH + CREATE |
| ER critical care | 13 | ENRICH |
| Chronic / primary care | 10 | CREATE + ENRICH |
| Diabetes | 10 | ENRICH + CREATE |
| Pulmonology | 10 | ENRICH + CREATE |
| Infectious disease | 10 | ENRICH + CREATE |
| Psychiatry | 6 | ENRICH + CREATE |
| GI | 5 | ENRICH + CREATE |
| Women's health | 5 | ENRICH + CREATE |
| Anticoagulation adjuncts | 2 | CREATE |

**Total:** 89 (44 CREATE, 45 ENRICH) — within 75–125 target.

## Architecture (mirrors Wave 1)

| Layer | Path |
|-------|------|
| Formulary manifest | `packages/shared/src/medication/enterpriseWave2FormularyManifest.ts` |
| Billing manifest | `packages/shared/src/medication/enterpriseWave2BillingManifest.ts` |
| Validation | `enterpriseWave2*Validation.ts` |
| Seed | `apps/api/prisma/helpers/seed-enterprise-wave2-formulary.ts` |
| Marker | `ENTERPRISE_M16D_WAVE2_FORMULARY` |
| Activation billing gate | `enterprise-wave2-billing-gate.util.ts` |
| Search aliases | M1.6C manifest extended with Wave 2 rows |

## Seed

```bash
MEDORA_ENABLE_ENTERPRISE_WAVE2_FORMULARY=1 \
pnpm --filter @medora/api run prisma:seed-catalogs
```

Optional (aliases): `MEDORA_ENABLE_ENTERPRISE_MEDICATION_SEARCH_ALIASES=1`

**Migration:** NO  
**Seed:** YES

## Generator

Edit `packages/shared/scripts/generate-wave2-manifest.mjs` ROWS array, then:

```bash
node packages/shared/scripts/generate-wave2-manifest.mjs
pnpm --filter @medora/shared build
```
