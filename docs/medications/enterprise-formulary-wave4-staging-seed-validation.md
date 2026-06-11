# M1.7C.7 — Enterprise Wave 4 ED/Hospital Staging Seed Validation

**Phase:** Staging validation only — **no activation, no production seed**  
**Date:** 2026-06-03  
**Environment:** Railway staging (`switchyard.proxy.rlwy.net`)  
**Commit tested:** `73adb7f6` (M1.7C.6 administration-type remediation) + local uncommitted seed wiring (see blockers)

---

## Executive verdict

**NOT SAFE**

Wave 4 staging seed **partially applied** (226/227 products) then **failed** on a catalog-code mismatch. Product-level administration types on ENRICH overlap rows were **not remediated** (4 products still show `INJECTION` / `SUBCUTANEOUS` / `OTHER`). Re-run is **not idempotent** (throws on the same conflict). Several seed wiring files remain **uncommitted on `main`**.

---

## Pre-flight

| Check | Result |
|-------|--------|
| Branch | `main`, up to date with `origin/main` |
| M1.7B.7D Ondansetron NDC | `0e430bcd` ✓ |
| M1.7B.7E administered quantity | `cd973d17` ✓ |
| M1.7B.8 ED header | `b47b2165` ✓ |
| M1.7C.6 admin-type remediation | `73adb7f6` ✓ |
| `pnpm --filter @medora/shared test` | 1168/1168 pass |
| `pnpm --filter @medora/shared build` | pass |
| `pnpm --filter @medora/api test -- enterprise-wave4` | 6/6 pass |
| `pnpm verify:web` | pass (prior session) |

### Pre-flight blockers (repo)

These files are **required to run the seed** but are **not fully on `main`** at validation time:

| File | Status |
|------|--------|
| `apps/api/prisma/seed-catalogs.ts` (Wave 4 env hook) | Modified, **not committed** |
| `apps/api/src/medication-master/enterprise-wave4-ed-hospital.constants.ts` | **Untracked** |
| `apps/api/prisma/helpers/enterprise-wave4-ed-hospital-formulary-seed-modules.ts` | **Untracked** |

Validation used the local working tree (not a clean `main` checkout alone).

---

## Seed command used

```bash
DATABASE_URL="<RAILWAY_STAGING_DATABASE_URL>" \
MEDORA_ENABLE_ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY=1 \
pnpm --filter @medora/api run prisma:seed-catalogs
```

No activation env flags were set. Production was not touched.

---

## Seed output (first run)

```
✅ Medication safety classifiers seeded (TermClassifier reference vocabulary only)
✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Wave 2 imaging catalog (61 studies, 0 aliases, 15 US tuple mappings, 0 tuple aliases, 0 tuple protocol updates)
✅ Wave 3 imaging catalog (41 studies, 0 aliases)
✅ Wave 4 imaging catalog (31 studies, 0 aliases)
✅ Medication billing mapping remediation (manifest=82, billingCatalogCreated=0, billingDefaultCreated=0, duplicateProtected=97)
✅ Controlled substance governance applied (matched=9, updated=3, already=6, notFound=0, manualReviewSkipped=2)
✅ High-alert medication governance applied (matched=23, catalogWitnessUpdated=14, profileUpdated=1, profileSkippedNoProfile=0, manualReviewSkipped=2, safetyReqCodes=5)
✅ LASA medication governance applied (groups=4, members=8, matched=8, profileUpdated=0, manualReviewSkipped=5, missingSkipped=4)
EnterpriseWave4EdHospitalFormularySeedError: [enterprise-wave4-ed-hospital-formulary] 1 conflict(s)
  catalogCode: BUDESONIDE_0.5_MG_PER_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE
  reason: ENRICH target catalog missing
Exit status 1 (~25.6 min elapsed)
```

**Root cause:** Wave 4 manifest ENRICH code uses `BUDESONIDE_0.5_MG_PER_2_ML_...` but Wave 3 staging catalog is `BUDESONIDE_0_5_MG_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE` (different tokenization).

---

## First-run counts

| Metric | Expected | Actual |
|--------|----------|--------|
| Wave 4 product markers | 227 | **226** |
| CREATE (proxy) | 193 | **198** |
| ENRICH (proxy) | 34 | **28** |
| Billing profiles | 227 | **226** |
| Packages | 227 | **226** |
| `isActive = true` | 0 | **0** ✓ |
| `governanceStatus` | REVIEW_REQUIRED only | **REVIEW_REQUIRED only** ✓ |
| Seed exit code | 0 | **1** ✗ |

---

## Second-run idempotency

Re-ran Wave 4 helper only (same staging DB):

```
SEED_ERROR [enterprise-wave4-ed-hospital-formulary] 1 conflict(s)
  BUDESONIDE_0.5_MG_PER_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE — ENRICH target catalog missing
```

| Metric | After run 2 |
|--------|-------------|
| Wave 4 product count | **226** (unchanged) |
| Duplicate product codes | **0** ✓ |
| Duplicate catalog linkage | **0** ✓ |
| New products/packages/billing on re-run | **0** (no growth before error) |
| Exit code | **1** ✗ — **not idempotent** |

---

## SQL validation results

### 1. Wave 4 marker count

```sql
SELECT COUNT(*) FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%';
```

**226** (expected 227)

### 2. Active check

**0** ✓

### 3. Governance status

| governanceStatus | count |
|------------------|------:|
| REVIEW_REQUIRED | 226 |

✓

### 4. Order search check

`orderSearchEnabled` is **not a DB column** on `MedicationProduct`. Checked governance notes for activation JSON:

```sql
SELECT COUNT(*) FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%'
  AND "governanceNotes" LIKE '%orderSearchEnabled%true%';
```

**0** ✓

### 5. Billing enabled check

Same pattern (no `billingEnabled` column):

**0** ✓

All 226 Wave 4 billing profiles have `requiresManualReview = true` ✓

### 6. Administration type distribution

**Product-level (`MedicationProduct.administrationType`):**

| administrationType | count | expected |
|--------------------|------:|---------:|
| PUSH | 67 | 67 ✓ |
| INFUSION | 114 | 114 ✓ |
| ORAL | 20 | 20 ✓ |
| IM | 8 | 8 ✓ |
| SQ | 4 | 7 ✗ |
| INHALATION | 9 | 11 ✗ |
| INJECTION | 2 | 0 ✗ |
| SUBCUTANEOUS | 1 | 0 ✗ |
| OTHER | 1 | 0 ✗ |

**Catalog-level (`CatalogMedication.administrationType` for Wave 4 products):**

| administrationType | count |
|--------------------|------:|
| PUSH | 67 |
| INFUSION | 114 |
| ORAL | 20 |
| IM | 8 |
| SQ | 7 |
| INHALATION | 10 |

Catalog remediation (M1.7C.6) applied on upsert; **product rows on ENRICH overlap were not updated**.

**ENRICH product/catalog drift (4 rows):**

| code | product | catalog |
|------|---------|---------|
| ENOXAPARIN_40_MG_PER_0.4_ML_INJECTABLE_INJECTION | INJECTION | SQ |
| ENOXAPARIN_60_MG_PER_0.6_ML_INJECTABLE_INJECTION | INJECTION | SQ |
| REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS | SUBCUTANEOUS | SQ |
| SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION | OTHER | INHALATION |

### 7. Ondansetron protection

```sql
SELECT p.code, p."administrationType", c.code, c."administrationType"
FROM "MedicationProduct" p
JOIN "CatalogMedication" c ON c.id = p."legacyCatalogMedicationId"
WHERE c.code = 'ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION';
```

| product | catalog |
|---------|---------|
| PUSH | PUSH |

✓ **PASS**

### 8. Respiratory blocked list (INHALATION)

9 Wave 4 products at **product** level with `administrationType = INHALATION` (expected 11).

All 9: `isActive = false`. Order search not enabled in notes.

Missing from Wave 4 marker set: **Budésonide nébulisation** (seed conflict). **Salbutamol** present but product typed `OTHER`.

### 9. Billing profile coverage

| wave4_products | wave4_billing_profiles |
|----------------|------------------------:|
| 226 | 226 |

✓ 1:1 for seeded products (226 not 227)

### 10. Duplicate product codes

**0 rows** ✓

### 11. Duplicate catalog linkage

**0 rows** ✓

---

## MAR smoke test results

**Staging UI smoke: NOT VERIFIED** (no automated staging UI session in this validation).

Read-only SQL on staging catalog state:

| Medication | Staging active catalog | Notes |
|------------|------------------------|-------|
| Ondansetron IV (`ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION`) | **inactive** (`isActive=false`) | Active Ondansetron on staging is **oral tablet** codes only |
| Hydromorphone | `HYDROMORPHONE_2MG_ML_INJECTABLE` **active** (no linked product) | Wave 4 IV concentrations inactive; PUSH typing correct on products |
| Ceftriaxone | No **active** ceftriaxone catalog | `CEFTRIAXONE_1_G_INJECTABLE_INJECTION` inactive, INFUSION typed |

**Automated regression (local, not staging DB):**

| Suite | Result |
|-------|--------|
| `medication-administration-ondansetron.spec.ts` | 8/8 pass (NDC enrichment, quantity default, billing non-blocking) |

Operator should run manual MAR smoke on staging when injectable Ondansetron / ceftriaxone are active for the pilot facility.

---

## Fail conditions triggered

| Condition | Status |
|-----------|--------|
| Any Wave 4 `isActive = true` | ✓ not triggered |
| Any Wave 4 order search enabled | ✓ not triggered |
| Any Wave 4 billing enabled | ✓ not triggered |
| Ondansetron `administrationType != PUSH` | ✓ not triggered |
| INJECTION count > 0 (product level) | ✗ **2** |
| SUBCUTANEOUS count > 0 (product level) | ✗ **1** |
| Product count 227 | ✗ **226** |
| Seed idempotent | ✗ throws on Budesonide |
| Existing Ondansetron MAR fails | not tested on staging UI |
| Existing Hydromorphone MAR fails | not tested on staging UI |

---

## Remaining risks

1. **Budésonide catalog code mismatch** blocks complete seed and idempotent re-run.
2. **ENRICH product admin types** not synced from remediated catalog — MAR gate reads **product** `administrationType`.
3. **Seed wiring not on `main`** — constants, seed-modules, `seed-catalogs.ts` hook must land before ops can seed from CI/clean checkout.
4. **Injectable Ondansetron inactive** on staging limits MAR smoke for M1.7B.7 fixes.
5. **11 INHALATION SKUs** intended blocked from MAR — product-level count/drift needs ENRICH update path.

---

## Next recommended phase

**M1.7C.8 — Seed completion & ENRICH remediation (before any activation review)**

1. Commit missing seed wiring (`seed-catalogs.ts`, constants, seed-modules).
2. Fix Budesonide ENRICH catalog code alias → `BUDESONIDE_0_5_MG_2_ML_...` (align Wave 3/Wave 4).
3. Update ENRICH seed path to sync `MedicationProduct.administrationType` from remediated catalog when Wave 4 marker applied.
4. Re-run staging seed to 227/227; confirm product-level admin distribution matches manifest.
5. Manual MAR smoke on staging with active injectable pilot meds.

**Do not:** activate Wave 4, enable order search, enable billing, or production seed until M1.7C.8 closes.

---

## Migration required?

**NO**

## Seed required?

**YES — staging only** (re-run after M1.7C.8 fixes)

## SQL required?

**YES — read-only validation** (completed above)
