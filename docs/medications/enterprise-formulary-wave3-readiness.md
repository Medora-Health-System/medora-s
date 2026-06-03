# M1.7B — Enterprise Formulary Wave 3 Readiness

**Date:** 2026-06-02  
**Verdict:** **SAFE for staging seed** — **NOT SAFE** for production activation or pilot cutover

## Counts

| Metric | Value |
|--------|------:|
| Wave 3 medications added | 116 |
| Enterprise total (W1+W2+W3) | 250 |
| Billing manifest rows | 116 |
| Localization contract pass (manifest) | 100% |
| Label integrity pass (manifest) | 100% |

## Specialty distribution

See `enterprise-formulary-wave3-implementation.md` for per-bucket counts.

## Coverage gates

| Gate | Target | Manifest |
|------|--------|----------|
| Billing profile spec | 100% | 100% |
| Bilingual display (`displayNameEn` / `displayNameFr`) | 100% | 100% |
| Tagged EN + FR aliases | 100% | 100% |
| Builder-aligned `searchTerms` | 100% | 100% |
| Inactive + `REVIEW_REQUIRED` | 100% | 100% (seed contract) |

## Wave 3 readiness %

Manifest-level readiness (pre-DB): **100%** when `assertEnterpriseWave3FormularyManifest()` passes.

Post-seed readiness uses `readinessReport.wave3ReadinessPct` from `seedEnterpriseWave3Formulary` (per-medication billing + search checks).

## Staging SQL (post-seed audit)

```sql
-- Wave 3 marker products
SELECT COUNT(*) AS wave3_products
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M17B_WAVE3_FORMULARY%';

-- Inactive + review required
SELECT COUNT(*) AS inactive_review
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M17B_WAVE3_FORMULARY%'
  AND "isActive" = false
  AND "governanceStatus" = 'REVIEW_REQUIRED';

-- Billing profiles with manual review
SELECT COUNT(*) AS billing_manual_review
FROM "MedicationBillingProfile" bp
JOIN "MedicationPackage" pkg ON pkg.id = bp."packageId"
JOIN "MedicationProduct" p ON p.id = pkg."productId"
WHERE p."governanceNotes" LIKE '%ENTERPRISE_M17B_WAVE3_FORMULARY%'
  AND bp."requiresManualReview" = true;
```

## Migration / seed

| Action | Required |
|--------|----------|
| Prisma migration | **NO** |
| Seed (`MEDORA_ENABLE_ENTERPRISE_WAVE3_FORMULARY=1`) | **YES** (to materialize DB rows) |

## Activation

**Do not** enable order search, pilot activation, or Haiti canonical pilot for Wave 3 rows until a dedicated activation tranche is approved (future M1.7C+).
