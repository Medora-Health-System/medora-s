# Enterprise Formulary Wave 4 — Seed Integrity Audit (M1.7C.2A)

**Phase:** Audit only — **no seed, no activation, no commit**  
**Date:** 2026-06-03  
**Manifest:** M1.7C post-remediation (`ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST`)  
**Audit method:** Manifest validation (`assertEnterpriseWave4EdHospitalFormularyManifest`), automated integrity script (`packages/shared/scripts/wave4-seed-integrity-audit.mjs`), shared/API Wave 4 test suites, seed helper static review

---

## Part 1 — Unique Entry Audit

| Metric | Count |
|--------|------:|
| **Total medications (manifest entries)** | **227** |
| **CREATE entries** | **193** |
| **ENRICH entries** | **34** |
| **Total products (1:1 with manifest)** | **227** |
| **Total default packages (`*_PKG_DEFAULT`)** | **227** |
| **Total billing profiles (manifest billing rows)** | **227** |
| **Total aliases (EN + FR across manifest)** | **902** |

**Validation:** `validateEnterpriseWave4EdHospitalFormularyManifest()` → **0 errors**

---

## Part 2 — Duplicate Product Audit

| Conflict type | Critical duplicates | Notes |
|---------------|--------------------:|-------|
| `catalogCode` | **0** | All 227 codes unique |
| `productCode` | **0** | Product code = catalog code (1:1) |
| `packageCode` | **0** | Default package codes unique |
| `conceptCode` | **0 critical** | 70+ generic families share `ENT_W4_*` concept (expected multi-SKU) |
| `genericName` | **0 critical** | Multiple strength/route variants per generic (expected) |

**No blocking duplicate products identified.**

Representative shared-concept families (INFO — expected): Ketamine (3), Fentanyl (3), Morphine (3), Ondansetron (3), Ceftriaxone (3), Metoprolol (2), etc.

---

## Part 3 — Ondansetron Audit (Critical)

**Expected:** injection + ODT + oral solution only. **Result: PASS (3 products)**

| Catalog code | Mode | Form / route | Zofran alias | Ondansetron alias |
|--------------|------|--------------|:------------:|:-----------------:|
| `ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION` | ENRICH | injectable / IV | Yes | Yes |
| `ONDANSETRON_4_MG_ODT_COMPRIME_ORODISPERSIBLE_ORALE` | CREATE | ODT / oral | Yes | Yes |
| `ONDANSETRON_4_MG_5_ML_SOLUTION_BUVABLE_ORALE` | CREATE | oral solution / oral | Yes | Yes |

No accidental fourth ondansetron product. Pediatric ODT and oral solution are new inactive CREATE SKUs (no prior Haiti catalog row).

---

## Part 4 — Insulin Audit (Critical)

**Expected:** separate SQ and IV infusion products. **Result: PASS**

| SKU | Mode | Route | Admin type | `isInsulin` | `requiresDoubleSign` |
|-----|------|-------|------------|:-----------:|:--------------------:|
| `REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS` | ENRICH | sous-cutanée | SUBCUTANEOUS | true | **true** |
| `REGULAR_INSULIN_100_UI_ML_DRIP_KIT_PERFUSION_INTRAVEINEUSE` | CREATE | intraveineuse | INFUSION | true | **true** |

- **Route mismatch:** None — SQ vs IV infusion correctly separated (M1.7C.2 Option A remediation).
- **Duplicate package:** None — distinct catalog codes and product codes.
- **IV infusion double RN:** **TRUE** (manifest + shared `marAdministrationGovernancePolicy` lock).

---

## Part 5 — Metoprolol Audit

**Expected:** duplicate CREATE remediated to ENRICH; single enterprise oral SKU. **Result: PASS**

| Catalog code | Mode | Strength | Route |
|--------------|------|----------|-------|
| `METOPROLOL_5MG_5ML_IV` | ENRICH | 5 mg/5 mL | intraveineuse |
| `METOPROLOL_25_MG_COMPRIME_ORAL` | ENRICH | 25 mg | orale |

Both entries are **ENRICH** (no duplicate Wave 4 CREATE for oral metoprolol). Shared concept `ENT_W4_METOPROLOL` — expected for two route variants.

---

## Part 6 — Blood Product Audit

**Expected:** PRBC, Whole Blood, Platelets, FFP, Cryoprecipitate — all `isBloodProduct = true`, `requiresDoubleSign = true`. **Result: PASS (5/5)**

| Product | Catalog code | `isBloodProduct` | `requiresDoubleSign` |
|---------|--------------|:----------------:|:--------------------:|
| PRBC | `PACKED_RED_BLOOD_CELLS_250_ML_PERFUSION_INTRAVEINEUSE` | true | true |
| FFP | `FRESH_FROZEN_PLASMA_250_ML_PERFUSION_INTRAVEINEUSE` | true | true |
| Platelets | `PLATELETS_APHERESIS_UNIT_PERFUSION_INTRAVEINEUSE` | true | true |
| Cryoprecipitate | `CRYOPRECIPITATE_10_UNITS_PERFUSION_INTRAVEINEUSE` | true | true |
| Whole blood | `WHOLE_BLOOD_500_ML_PERFUSION_INTRAVEINEUSE` | true | true |

Rh immune globulin: **not** flagged as blood product (M1.7C governance fix retained).

---

## Part 7 — Billing Integrity Audit

| Check | Coverage |
|-------|----------|
| Formulary entries with billing manifest row | **227 / 227 (100%)** |
| Billing manifest length matches formulary | **Yes** |
| `assertEnterpriseWave4EdHospitalBillingManifest()` | **Pass** |
| Missing HCPCS / NDC mappings | **0** |

Each manifest entry includes package linkage design (`{catalogCode}_PKG_DEFAULT`) and billing profile spec consumed by seed helper.

---

## Part 8 — Localization Integrity Audit

| Field | Coverage |
|-------|----------|
| `displayNameEn` | **227 / 227 (100%)** |
| `displayNameFr` | **227 / 227 (100%)** |
| `genericName` | **227 / 227 (100%)** |
| EN aliases (≥1 per entry) | **227 / 227 (100%)** |
| FR aliases (≥1 per entry) | **227 / 227 (100%)** |
| Builder-generated `searchTerms` | **227 / 227 (100%)** |
| Label integrity (`validateWave4LabelIntegrity`) | **0 failures** |
| Localization blocking issues | **0** |

---

## Part 9 — Search Collision Audit

| Collision pair / rule | Result |
|-----------------------|--------|
| Levofloxacin vs Levophed | **SAFE** — no levofloxacin match on `levophed` query; no bare `levo` alias |
| tPA aliases | **SAFE** — scoped to alteplase/tenecteplase generics only |
| MgSO4 aliases | **SAFE** — scoped to magnesium generics only |
| KCl aliases | **SAFE** — scoped to potassium generics only |
| NTG aliases | **SAFE** — bare `ntg` banned (`WAVE4_DANGEROUS_ALIAS_EXACT`) |

`validateWave4SearchHardening()` → **0 errors**. Required search pairs (Dilaudid, Versed, Levophed, Roc, Zosyn, Vanc, tPA, etc.) validated in shared tests.

---

## Part 10 — Governance Integrity Audit

| Policy dimension | Conflicts |
|------------------|----------:|
| `requiresDoubleSign` (approved categories only) | **0** |
| Hydromorphone IV push double RN | **0** (must not require) |
| `isBloodProduct` vs double RN | **0** |
| Controlled without schedule | **0** |
| Insulin without high-alert | **0** |
| RSI paralytic without high-alert | **0** |
| Thrombolytic without high-alert | **0** |

**Governance conflict count: 0**

Double-RN manifest count: **11** (insulin ×2, heparin infusion ×1, blood ×5, continuous opioid infusion ×3).

---

## Part 11 — Seed Dry-Run Audit

**Helper:** `apps/api/prisma/helpers/seed-enterprise-wave4-ed-hospital-formulary.ts`

| Behavior | Finding |
|----------|---------|
| **CREATE** | Upserts catalog; creates `MedicationProduct` with `isActive: false`, `governanceStatus: REVIEW_REQUIRED`, Wave 4 governance marker; creates default package + billing profile with `requiresManualReview: true` |
| **ENRICH** | Upserts catalog; skips create if catalog missing (conflict); updates existing product `governanceNotes` with idempotent marker merge |
| **Idempotency** | Alias create guarded by `findUnique`; billing catalog guarded by `findFirst`; governance notes merged idempotently |
| **Duplicate protection** | Product lookup by `code` before create; throws `EnterpriseWave4EdHospitalFormularySeedError` on conflicts |
| **Activation** | **None** — comment + readiness checks enforce `orderSearchEnabled: false`; products created inactive |
| **Dry-run** | Supported via `{ dryRun: true }`; validated in `enterprise-wave4-ed-hospital-seed-runtime.spec.ts` |

**Caveat (post-seed SQL):** Product rows bearing Wave 4 marker may be **≤ 227** on first seed: **193 CREATE** new products + up to **34 ENRICH** markers on pre-existing products. Catalog medication count should reach **227**; product marker count validates linkage, not necessarily 227 new product rows.

**Verdict:** Safe to run repeatedly on staging (idempotent guards present).

---

## Part 12 — SQL Validation Package (DO NOT EXECUTE)

See `enterprise-formulary-wave4-final-preseed-review.md` for full query set.

---

## Automated Test Evidence

| Suite | Result |
|-------|--------|
| `enterpriseWave4EdHospitalFormularyValidation.test.ts` | Pass |
| `enterpriseWave4EdHospitalSearchValidation.test.ts` | Pass |
| `enterprise-wave4-ed-hospital-formulary-manifest.spec.ts` (API) | Pass |
| `enterprise-wave4-ed-hospital-seed-runtime.spec.ts` (API) | Pass |
| `wave4-seed-integrity-audit.mjs` (manifest audit script) | **SAFE** |

---

## Verdict

**SAFE for first Railway staging seed** (inactive, review-required, non-orderable).

**NOT SAFE** for provider ordering, search cutover, pilot activation, or production enablement.

| Action | Required? |
|--------|-----------|
| Migration | **NO** |
| Seed | **YES** (when explicitly approved for Railway staging) |
| Post-seed SQL | **YES** (read-only validation after seed) |
