# Enterprise Formulary Wave 4 — M1.7C.2 Remediation

**Phase:** M1.7C.2 — Remediation & staging readiness  
**Date:** 2026-06-03  
**Status:** Remediated in manifest; **not seeded**, **not activated**

---

## Summary

All M1.7C.1 remediation items addressed in the Wave 4 generator and validation layer. Manifest grew from **219 → 227** entries (193 CREATE, 34 ENRICH).

| Remediation item | Result |
|------------------|--------|
| Pediatric ED gaps | **7 formulations added** (5 ENRICH + 2 CREATE) |
| Whole blood | **Added** `WHOLE_BLOOD_500_ML_PERFUSION_INTRAVEINEUSE` |
| Regular insulin metadata | **Fixed** — Option A (SQ ENRICH aligned to catalog code) |
| Metoprolol deduplication | **Converted to ENRICH** on Wave 1 catalog code |
| High-alert density | **Review report generated** (no auto-downgrade) |
| Search hardening | **Validation implemented + tests** |

---

## Part 1 — Pediatric ED

Added to `PEDIATRIC_ED` bucket (now 23 entries):

| Medication | Catalog code | Mode | Notes |
|------------|--------------|------|-------|
| Amoxicillin suspension 250 mg/5 mL | `AMOXICILLIN_250_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL` | ENRICH | Haiti catalog SKU |
| Ibuprofen suspension 100 mg/5 mL | `IBUPROFEN_100_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL` | ENRICH | Haiti catalog SKU |
| Prednisolone solution 15 mg/5 mL | `PREDNISOLONE_15_MG_PER_5_ML_SIROP_ORAL` | ENRICH | Haiti catalog SKU |
| Ondansetron ODT 4 mg | `ONDANSETRON_4_MG_ODT_COMPRIME_ORODISPERSIBLE_ORALE` | CREATE | New pediatric SKU |
| Ondansetron oral solution 4 mg/5 mL | `ONDANSETRON_4_MG_5_ML_SOLUTION_BUVABLE_ORALE` | CREATE | New pediatric SKU |
| Acetaminophen liquid 120 mg/5 mL | `PARACETAMOL_120_MG_PER_5_ML_SIROP_ORAL` | ENRICH | Haiti catalog SKU |
| Acetaminophen suppository 250 mg | `PARACETAMOL_250_MG_SUPPOSITOIRE_SUPPOSITOIRE_RECTAL` | ENRICH | Haiti catalog SKU |

All pass M1.7A.2 localization contract (EN/FR aliases, search terms, billing profile).

---

## Part 2 — Whole Blood

| Field | Value |
|-------|-------|
| Catalog code | `WHOLE_BLOOD_500_ML_PERFUSION_INTRAVEINEUSE` |
| Mode | CREATE |
| `isBloodProduct` | `true` |
| `requiresDoubleSign` | `true` |
| `isHighAlert` | `true` |
| Seed flags | `isActive: false`, `governanceStatus: REVIEW_REQUIRED`, `requiresManualReview: true`, `orderSearchEnabled: false`, `billingEnabled: false` |

Consistent with PRBC, FFP, platelets, cryoprecipitate governance pattern.

---

## Part 3 — Insulin Metadata Correction

**Finding:** `REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS` had IV/INFUSION metadata while catalog code indicates subcutaneous.

**Correction applied — Option A (SQ product):**

| Field | Before | After |
|-------|--------|-------|
| Route | `intraveineuse` | `sous-cutanée` |
| Therapeutic class | Insuline IV | Antidiabétique |
| `administrationType` | INFUSION | SUBCUTANEOUS |
| Aliases | Humulin R IV / insulin drip | Actrapid, Humulin R, insulin regular SQ |

**Separate IV infusion SKU retained:** `REGULAR_INSULIN_100_UI_ML_DRIP_KIT_PERFUSION_INTRAVEINEUSE` (CREATE, double RN, insulin infusion).

No route/code mismatch remains.

---

## Part 4 — Metoprolol Deduplication

**Finding:** Wave 4 had CREATE `METOPROLOLOL_25_MG_COMPRIME_ORALE` (generator slug) duplicating Wave 1 `METOPROLOL_25_MG_COMPRIME_ORAL`.

**Disposition:** Converted to **ENRICH** on Wave 1 canonical code `METOPROLOL_25_MG_COMPRIME_ORAL`. Aliases, billing, localization, and ACS bucket metadata preserved.

---

## Part 5 — High-Alert Review

See [enterprise-formulary-wave4-governance-reconciliation.md](./enterprise-formulary-wave4-governance-reconciliation.md).

- **149 / 227** high-alert (66%) — down 1 from insulin SQ reclassification path
- **137 APPROPRIATE**, **12 QUESTIONABLE**, **0 REMOVE**
- No automatic downgrades applied

---

## Part 6 — Search Hardening

Implemented in `enterpriseWave4EdHospitalSearchValidation.ts`:

- Rejects dangerous aliases: `MS`, `U`, bare `NTG`
- Preserves safe aliases: Dilaudid, Versed, Roc, Zosyn, Vanc, Levophed
- Levofloxacin / Levophed collision guard
- Scoped abbreviations: tPA, MgSO4, KCl
- Required norepinephrine search pair updated: brand `levophed` (was ambiguous `levo`)

Tests: `enterpriseWave4EdHospitalSearchValidation.test.ts`

---

## Validation (Part 7)

All passed at remediation time:

```
pnpm --filter @medora/shared test          → 1144 passed
pnpm --filter @medora/api test -- enterprise-wave4 → 6 passed
pnpm --filter @medora/api exec prisma validate     → valid
pnpm --filter @medora/api run build                → success
pnpm verify:web                                    → success
```

---

## Files Changed

- `packages/shared/scripts/generate-wave4-ed-hospital-manifest.mjs`
- `packages/shared/src/medication/enterpriseWave4EdHospitalFormularyManifest.ts` (generated)
- `packages/shared/src/medication/enterpriseWave4EdHospitalBillingManifest.ts` (generated)
- `packages/shared/src/medication/enterpriseWave4EdHospitalSearchValidation.ts`
- `packages/shared/src/medication/enterpriseWave4EdHospitalSearchValidation.test.ts`
- `packages/shared/src/medication/enterpriseWave4EdHospitalFormularyValidation.ts`
- `packages/shared/src/medication/enterpriseWave4EdHospitalHighAlertReview.ts`
- `packages/shared/src/index.ts`
