# M1.7C — Enterprise Formulary Wave 4 ED/Hospital

**Date:** 2026-06-03  
**Wave:** M1.7C / Wave 4 / ED-Hospital Formulary  
**Marker:** `ENTERPRISE_M17C_WAVE4_ED_HOSPITAL`

## Summary

Wave 4 expands Medora enterprise medication coverage for Emergency Department, hospitalist, ICU, and observation workflows. All entries are **inactive**, **`REVIEW_REQUIRED`**, with **`orderSearchEnabled = false`**, **`billingEnabled = false`**, and **`requiresManualReview = true`** at seed time.

## Counts

| Metric | Value |
|--------|------:|
| Wave 4 medications added | 219 |
| CREATE (new catalog + product) | 191 |
| ENRICH (prior-wave overlap) | 28 |
| Enterprise total (W1+W2+W3+W4) | 469 |
| Billing manifest rows | 219 |

## Coverage by ED domain

| Domain | Count |
|--------|------:|
| RSI | 18 |
| Procedural sedation / analgesia | 21 |
| ACLS / cardiac emergency | 18 |
| Vasopressors / critical care | 16 |
| Sepsis / emergency antibiotics | 28 |
| Stroke / neuro emergency | 16 |
| ACS / hypertensive emergency | 18 |
| Respiratory emergency | 16 |
| Toxicology / antidotes | 17 |
| Electrolyte replacement / fluids | 21 |
| OB emergency | 14 |
| Pediatric emergency | 16 |

## Governance classifications (manifest)

| Classification | Count |
|----------------|------:|
| High-alert | 148 |
| Controlled (Schedule II+) | 22 |
| Double RN required | 10 |
| RSI paralytic | 8 |
| Thrombolytic | 2 |
| Vasopressor | 19 |
| Antidote | 17 |
| Insulin (IV) | 2 |

Double RN applies only to: insulin IV, heparin **infusion**, blood products, PCA/continuous opioid infusion. Hydromorphone IV push remains **warning-only** (no double RN, no pharmacy block).

## Source files

| File | Role |
|------|------|
| `packages/shared/scripts/generate-wave4-ed-hospital-manifest.mjs` | Authoritative ROWS + generator |
| `packages/shared/src/medication/enterpriseWave4EdHospitalFormularyManifest.ts` | Generated formulary |
| `packages/shared/src/medication/enterpriseWave4EdHospitalBillingManifest.ts` | Generated billing |
| `packages/shared/src/medication/enterpriseWave4EdHospitalFormularyValidation.ts` | Manifest + governance validation |
| `packages/shared/src/medication/enterpriseWave4EdHospitalBillingValidation.ts` | Billing validation |
| `packages/shared/src/medication/enterpriseWave4EdHospitalSearchValidation.ts` | Alias / search validation |
| `apps/api/prisma/helpers/seed-enterprise-wave4-ed-hospital-formulary.ts` | Idempotent seed |
| `apps/api/src/medication-master/enterprise-wave4-ed-hospital.constants.ts` | Governance marker |

## Seed

```bash
DATABASE_URL="<RAILWAY_STAGING_DATABASE_URL>" \
MEDORA_ENABLE_ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY=1 \
pnpm --filter @medora/api run prisma:seed-catalogs
```

## Activation status

**Not activated.** No provider order search cutover. No pilot activation. Pharmacy verification remains informational only.
