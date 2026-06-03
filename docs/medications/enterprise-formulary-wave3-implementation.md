# M1.7B — Enterprise Formulary Wave 3 Implementation

**Phase:** M1.7B (implementation)  
**Status:** Seeded catalog only — **no activation**, **no pilot**, **no production enablement**

## Summary

Wave 3 adds **116** enterprise medications (strict M1.7A.2 localization + M1.7A.4 label integrity) across seven specialty buckets. Combined with Wave 1 (45) and Wave 2 (89), the enterprise manifest totals **250** catalog codes.

## Specialty coverage

| Bucket | Count |
|--------|------:|
| Nephrology | 16 |
| Dermatology | 20 |
| Rheumatology | 13 |
| Neurology | 16 |
| Psychiatry | 20 |
| Pulmonology | 14 |
| Endocrinology | 17 |

## Governance (manifest flags)

| Marker | Count |
|--------|------:|
| High-alert | 25 |
| Controlled | 4 |
| DMARD | 7 |
| Biologic (review-only) | 2 |
| Insulin | 4 |

## Architecture

- **Manifest:** `packages/shared/src/medication/enterpriseWave3FormularyManifest.ts` (generated)
- **Billing:** `enterpriseWave3BillingManifest.ts` (NDC series `600000+`, HCPCS `J3490`, `requiresManualReview=true` at seed)
- **Generator:** `packages/shared/scripts/generate-wave3-manifest.mjs` — tagged EN/FR aliases + `buildMedicationSearchTokens().terms`
- **Validation:** `enterpriseWave3FormularyValidation.ts` (strict localization, label integrity, W1/W2 CREATE overlap guard)
- **Seed:** `apps/api/prisma/helpers/seed-enterprise-wave3-formulary.ts`
- **Marker:** `ENTERPRISE_M17B_WAVE3_FORMULARY` in `enterprise-wave3.constants.ts`

## Seed defaults (non-negotiable)

| Field | Value |
|-------|--------|
| `CatalogMedication.isActive` | `false` |
| `MedicationProduct.isActive` | `false` |
| `governanceStatus` | `REVIEW_REQUIRED` |
| `orderSearchEnabled` | `false` (runtime) |
| `MedicationBillingProfile.requiresManualReview` | `true` |

## Enable seed (staging/dev only)

```bash
MEDORA_ENABLE_ENTERPRISE_WAVE3_FORMULARY=1 pnpm --filter @medora/api exec prisma db seed
```

Or full catalogs seed path via `seed-catalogs.ts` with the same env flag.

## Regenerate manifest

```bash
pnpm --filter @medora/shared build
node packages/shared/scripts/generate-wave3-manifest.mjs
pnpm --filter @medora/shared build
```

## Validation commands

```bash
pnpm --filter @medora/shared test
pnpm --filter @medora/api test -- medication
pnpm --filter @medora/api test -- medication-catalog
pnpm --filter @medora/api run build
pnpm verify:web
```
