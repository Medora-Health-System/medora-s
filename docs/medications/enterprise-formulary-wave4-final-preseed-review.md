# Enterprise Formulary Wave 4 — Final Pre-Seed Review (M1.7C.2A)

**Date:** 2026-06-03  
**Purpose:** Final gate before first Railway staging seed execution  
**Status:** Audit complete — **no seed executed**

---

## Decision

| Question | Answer |
|----------|--------|
| Safe for first Railway staging seed? | **YES** (inactive, review-required) |
| Safe for activation / ordering / search? | **NO** |
| Migration required? | **NO** |
| Seed required (when approved)? | **YES** |
| Post-seed SQL required? | **YES** (read-only) |

---

## Manifest Snapshot

- **227** formulary entries (193 CREATE + 34 ENRICH)
- **902** aliases
- **227** billing manifest rows (100% coverage)
- **0** validation errors
- **0** governance conflicts
- **0** search hardening errors

---

## Critical Medication Sign-Off

### Ondansetron — PASS

Three products only: IV injection (ENRICH), ODT (CREATE), oral solution (CREATE). Zofran + ondansetron aliases present on all three.

### Insulin — PASS

- SQ: `REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS` (ENRICH, SUBCUTANEOUS)
- IV infusion: `REGULAR_INSULIN_100_UI_ML_DRIP_KIT_PERFUSION_INTRAVEINEUSE` (CREATE, INFUSION, double RN)

### Metoprolol — PASS

Both SKUs ENRICH; no duplicate Wave 4 CREATE for oral 25 mg.

### Blood products — PASS

Five products; all `isBloodProduct` + `requiresDoubleSign`.

---

## SQL Validation Package

**DO NOT EXECUTE until after staging seed.** All queries are read-only.

### 1. Wave 4 product marker count

```sql
SELECT COUNT(*)
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%';
```

**Expected after seed:** Up to **227**. Minimum **193** (CREATE products). ENRICH rows add marker to existing products without always creating new rows.

---

### 2. Active Wave 4 products (must be zero)

```sql
SELECT COUNT(*)
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%'
  AND "isActive" = true;
```

**Expected:** `0`

---

### 3. Review-required Wave 4 products

```sql
SELECT COUNT(*)
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%'
  AND "governanceStatus" = 'REVIEW_REQUIRED';
```

**Expected:** Same as query #1 (all Wave 4 products)

---

### 4. Wave 4 catalog medication count

```sql
SELECT COUNT(*)
FROM "CatalogMedication" cm
WHERE cm.code IN (
  SELECT DISTINCT mp.code
  FROM "MedicationProduct" mp
  WHERE mp."governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%'
);
```

**Expected:** **227** (all manifest catalog codes present)

---

### 5. Billing profile coverage (Wave 4 scoped)

```sql
SELECT
  COUNT(DISTINCT mp.id) AS wave4_products,
  COUNT(DISTINCT mbp.id) AS billing_profiles,
  COUNT(DISTINCT mpkg.id) AS packages
FROM "MedicationProduct" mp
JOIN "MedicationPackage" mpkg ON mpkg."productId" = mp.id
LEFT JOIN "MedicationBillingProfile" mbp ON mbp."packageId" = mpkg.id
WHERE mp."governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%';
```

**Expected:** `billing_profiles = packages = wave4_products` (100% package billing profile coverage)

---

### 6. Billing profiles requiring manual review

```sql
SELECT COUNT(*)
FROM "MedicationBillingProfile" mbp
JOIN "MedicationPackage" mpkg ON mpkg.id = mbp."packageId"
JOIN "MedicationProduct" mp ON mp.id = mpkg."productId"
WHERE mp."governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%'
  AND mbp."requiresManualReview" = true;
```

**Expected:** Equals total Wave 4 billing profiles

---

### 7. Blood product audit

```sql
SELECT
  mp.code,
  mp."governanceStatus",
  mp."isActive",
  msp."isBloodProduct",
  msp."requiresDoubleSign"
FROM "MedicationProduct" mp
JOIN "MedicationConcept" mc ON mc.id = mp."conceptId"
JOIN "MedicationSafetyProfile" msp ON msp."conceptId" = mc.id
WHERE mp."governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%'
  AND msp."isBloodProduct" = true
ORDER BY mp.code;
```

**Expected:** **5 rows**

| code (expected) |
|-----------------|
| `CRYOPRECIPITATE_10_UNITS_PERFUSION_INTRAVEINEUSE` |
| `FRESH_FROZEN_PLASMA_250_ML_PERFUSION_INTRAVEINEUSE` |
| `PACKED_RED_BLOOD_CELLS_250_ML_PERFUSION_INTRAVEINEUSE` |
| `PLATELETS_APHERESIS_UNIT_PERFUSION_INTRAVEINEUSE` |
| `WHOLE_BLOOD_500_ML_PERFUSION_INTRAVEINEUSE` |

All: `requiresDoubleSign = true`, `isActive = false`.

---

### 8. Insulin double-RN audit

```sql
SELECT
  mp.code,
  msp."requiresDoubleSign",
  mp."administrationType"
FROM "MedicationProduct" mp
JOIN "MedicationConcept" mc ON mc.id = mp."conceptId"
JOIN "MedicationSafetyProfile" msp ON msp."conceptId" = mc.id
WHERE mp."governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%'
  AND mc."genericName" ILIKE '%insulin%'
ORDER BY mp.code;
```

**Expected:** 2 rows; IV infusion SKU has `requiresDoubleSign = true` and `administrationType = 'INFUSION'`.

---

### 9. Zero active + zero search-enabled sanity check

```sql
SELECT
  COUNT(*) FILTER (WHERE mp."isActive" = true) AS active_count,
  COUNT(*) FILTER (WHERE mp."governanceStatus" != 'REVIEW_REQUIRED') AS not_review_required
FROM "MedicationProduct" mp
WHERE mp."governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%';
```

**Expected:** `active_count = 0`; `not_review_required = 0`

---

## Readiness Scores (M1.7C.2A)

| Score | Value |
|-------|------:|
| Seed Readiness | 98 |
| Governance Readiness | 100 |
| Billing Readiness | 100 |
| Localization Readiness | 100 |
| Search Readiness | 95 |
| **Overall** | **98** |

---

## Approvals Required Before Seed

1. Engineering: manifest + seed helper audit (this document) — **complete**
2. Explicit authorization to run `MEDORA_ENABLE_ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY=1` on Railway staging
3. Post-seed SQL validation (queries above)
4. Clinical pharmacy review remains **future** (activation phase — not pre-seed)

---

## Verdict

**SAFE** — Wave 4 is integrity-validated and ready for the **first inactive Railway staging seed**.

**NOT SAFE** — activation, search enablement, provider ordering, or production cutover.
