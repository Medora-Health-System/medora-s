# M1.7C — Enterprise Formulary Wave 4 ED/Hospital Readiness

**Date:** 2026-06-03  
**Verdict:** **SAFE for staging seed** — **NOT SAFE** for production activation or order-search cutover

## Readiness gates

| Gate | Target | Manifest |
|------|--------|----------|
| Billing profile spec | 100% | 100% (219/219) |
| Bilingual display (`displayNameEn` / `displayNameFr`) | 100% | 100% |
| Tagged EN + FR aliases | 100% | 100% |
| Builder-aligned `searchTerms` | 100% | 100% |
| Inactive + `REVIEW_REQUIRED` | 100% | 100% (seed contract) |
| Hydromorphone IV — no double RN | Pass | Pass |
| Double RN policy unchanged | Pass | Pass |
| Pharmacy MAR non-blocking | Pass | Pass (existing policy) |

## Localization readiness

All Wave 4 entries pass `assertEnterpriseWave4EdHospitalFormularyManifest()` including M1.7A.2 localization contract and M1.7A.4 label integrity. English UI will not surface raw French route/form tokens when locale is English.

## Billing readiness

Every Wave 4 entry has a matching `EnterpriseWave4EdHospitalBillingEntry` with NDC11 and HCPCS/J-code. Seed creates `MedicationBillingProfile` with `requiresManualReview = true`. Billing is **not** auto-enabled on products.

## Post-seed SQL validation

```sql
-- 1. Count Wave 4 products
SELECT COUNT(*) AS wave4_ed_hospital_products
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%';

-- 2. Confirm inactive/review-required
SELECT COUNT(*) AS inactive_review_required
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%'
  AND "isActive" = false
  AND "governanceStatus" = 'REVIEW_REQUIRED';

-- 3. Billing profile coverage
SELECT COUNT(*) AS wave4_billing_profiles
FROM "MedicationBillingProfile" mbp
JOIN "MedicationPackage" mpkg ON mpkg.id = mbp."packageId"
JOIN "MedicationProduct" mp ON mp.id = mpkg."productId"
WHERE mp."governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%';

-- 4. Search alias coverage
SELECT COUNT(DISTINCT cm.id) AS wave4_with_aliases
FROM "CatalogMedication" cm
JOIN "MedicationProduct" mp ON mp."legacyCatalogMedicationId" = cm.id
JOIN "MedicationAlias" ma ON ma."catalogMedicationId" = cm.id
WHERE mp."governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%';

-- 5. Active check (expect 0)
SELECT COUNT(*) AS active_wave4_products
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%'
  AND "isActive" = true;
```

Expected after seed: `active_wave4_products = 0`, `wave4_ed_hospital_products = 219`.

## Migration / seed / SQL

| Action | Required |
|--------|----------|
| Prisma migration | **NO** |
| Seed (`MEDORA_ENABLE_ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY=1`) | **YES** |
| SQL | Validation only (read-only queries above) |

## Test evidence

```bash
pnpm --filter @medora/shared test -- enterpriseWave4EdHospital
pnpm --filter @medora/api test -- enterprise-wave4
pnpm --filter @medora/api test -- medication-administration
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api run build
pnpm verify:web
```

All passed at implementation time (2026-06-03).
