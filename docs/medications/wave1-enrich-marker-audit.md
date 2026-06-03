# M1.6B.2 — Wave 1 ENRICH product marker audit

**Phase:** M1.6B.2 (audit only)  
**Environment:** Railway staging (`switchyard.proxy.rlwy.net`)  
**Date:** 2026-06-02  
**Marker:** `ENTERPRISE_M16B_WAVE1_FORMULARY`

## Executive summary

| Metric | Value |
|--------|------:|
| Wave 1 manifest medications | **45** |
| Products with Wave 1 marker | **36** |
| Products with billing profile but **no** Wave 1 marker | **9** |
| Root cause | **Seed logic** — `alreadyLinked` ENRICH branch does not append marker |
| Pilot on full 45-row cohort | **NOT SAFE** |
| Pilot on 36 marker-only cohort | **SAFE (scoped)** |

---

## Part 1 — Missing marker rows

All **9** are `mode: ENRICH` chronic-care rows with **existing M1.5E** canonical products (`HAITI_*` concepts, `HAITI_M15E_CANONICAL_LINKAGE_ONLY` in `governanceNotes`).

| Catalog code | Generic | Product ID | Package ID | Concept | Chain |
|--------------|---------|------------|------------|---------|-------|
| `AMLODIPINE_5_MG_COMPRIME_ORAL` | Amlodipine | `204b833a-1c1a-4a25-be87-6b5fc308df7f` | `75d1f716-ed64-4a1e-a000-7b929c1282cb` | `HAITI_AMLODIPINE` | Catalog → Product → Package → BillingProfile |
| `CARVEDILOL_6.25_MG_COMPRIME_ORAL` | Carvedilol | `1088009f-6b23-4a7f-bcf6-b02a5b5d1dbb` | `424a5001-32de-475f-b01c-674efa285364` | `HAITI_CARVEDILOL` | Complete |
| `HYDROCHLOROTHIAZIDE_25` | Hydrochlorothiazide | `4bbe6476-e213-438c-8ec3-99d3bd9ad63e` | `1237a28c-afe5-4965-8041-aebe6e30af95` | `HAITI_HYDROCHLOROTHIAZIDE` | Complete |
| `LEVOTHYROXINE_50_MCG_COMPRIME_ORAL` | Levothyroxine | `0816f857-876c-49e0-82f4-4f925533d118` | `f3e2afb8-199f-4180-b253-cacbeece7cda` | `HAITI_LEVOTHYROXINE` | Complete |
| `LISINOPRIL_10` | Lisinopril | `41f288b7-36ba-4a10-a4f2-8bcb26cdbabe` | `56fbc656-19af-4f94-8a52-1207f6306d23` | `HAITI_LISINOPRIL` | Complete |
| `LOSARTAN_50` | Losartan | `afdc769c-9c03-41b4-941f-e10087e72ece` | `43ff616f-f98b-409f-bac5-f65746ceed1f` | `HAITI_LOSARTAN` | Complete |
| `OMEPRAZOLE_20` | Omeprazole | `64efb0df-ca9c-439e-9bbf-29156090ce35` | `4b52addc-9250-42a1-9191-0f9584bde2f3` | `HAITI_OMEPRAZOLE` | Complete |
| `PANTOPRAZOLE_40_MG_COMPRIME_ORAL` | Pantoprazole | `219d65fa-8306-48d3-8904-bcc1f7db1082` | `66b0d2b3-ad5c-4829-b749-0cfdc19a6aa0` | `HAITI_PANTOPRAZOLE` | Complete |
| `SIMVASTATIN_20_MG_COMPRIME_ORAL` | Simvastatin | `108d8b68-14a1-49d2-8bd0-5888db04f09d` | `946ff27e-fbd6-4384-baad-c9e5b9a9f122` | `HAITI_SIMVASTATIN` | Complete |

**Not in the 9** (other ENRICH manifest rows):

| Code | Notes |
|------|--------|
| `HEPARIN_5000UI_ML_INJECTABLE` | New Wave 1 product (`ENT_W1_*` path); **has** marker |
| `METFORMIN_500` | New Wave 1 product; **has** marker (replaced / new product row vs M15E code match) |

---

## Part 2 — Why marker is missing

| Row class | Path | Reason |
|-----------|------|--------|
| **9 chronic ENRICH** | **B. Existing M1.5E Haiti-linked product** | `legacyCatalogMedicationId` already set before seed; seed hit `alreadyLinked += 1` and **did not** update `governanceNotes` |
| 34 CREATE | A. Newly created Wave 1 product | CREATE branch sets `ENTERPRISE_M16B_WAVE1_FORMULARY` in notes |
| Heparin / Metformin ENRICH | A or relink | No pre-existing product at `product.code === catalogCode`, or relink branch applied marker |

**Seed logic (root):** `apps/api/prisma/helpers/seed-enterprise-wave1-formulary.ts` — ENRICH branch when `product.legacyCatalogMedicationId === catalogId` only increments `alreadyLinked`; marker is applied only on **new** link (`!legacyCatalogMedicationId`).

---

## Part 3 — Billing validation (staging)

| Catalog code | Billing profile | HCPCS/J | NDC (catalog + package) | Package link | Billing gate (if marker were present) |
|--------------|-----------------|---------|-------------------------|--------------|--------------------------------------|
| All 9 | **PASS** | **PASS** (`J3490`) | **PASS** (11-digit) | **PASS** | **PASS** |

Data is billing-ready; gate is **not invoked** without marker (see Part 6).

---

## Part 4 — Governance validation (staging)

| Catalog code | Safety profile | Controlled | High-alert | LASA | Status | Active | Readiness |
|--------------|----------------|------------|------------|------|--------|--------|-----------|
| All 9 except levothyroxine | **PASS** | Catalog/safety aligned | Not high-alert | null | `REVIEW_REQUIRED` | **inactive** | **PASS** (data) |
| `LEVOTHYROXINE_50_MCG_COMPRIME_ORAL` | **PASS** | — | **PASS** (`isHighAlert=true`) | null | `REVIEW_REQUIRED` | inactive | **PASS** |

**Note:** Catalog witness/double-sign flags were updated by Wave 1 seed upsert; safety profile on M15E concepts was not fully re-written for all Wave 1 governance intents (pre-existing M15E safety rows).

---

## Part 5 — Search validation (staging)

| Catalog code | Generic search | Primary brand alias | Wave 1 alias seed |
|--------------|----------------|---------------------|-------------------|
| All 9 | **PASS** | **PASS** (norvasc, zestril, cozaar, etc.) | **PASS** (aliases present post-seed) |

Minor gap: `LISINOPRIL_10` has `zestril` but manifest also lists `prinivil` — only one of two brand aliases confirmed on staging (non-blocking for pilot search on generic + primary brand).

---

## Part 6 — Activation impact (if pilot started today)

| Control | 36 marker products | 9 missing-marker products |
|---------|-------------------|-------------------------|
| **Enterprise Wave 1 billing gate** | **Enforced** (`evaluateEnterpriseWave1ActivationBillingGate`) | **Bypassed** — `productHasEnterpriseWave1LinkageMarker` → false → `allowed: true` without Wave 1 billing check |
| **Standard activation gates** | Applies (inactive, `REVIEW_REQUIRED`, formulary, NDC review flags, etc.) | Same |
| **M1.5E provider search exception** | Depends on notes | **Still has** `HAITI_M15E_CANONICAL_LINKAGE_ONLY` → `linkageOnlyHaitiM15e` may allow legacy search behavior on **inactive** product until M1.5F cutover |
| **Search gating after activation** | Wave 1 cohort consistent | Inconsistent lineage (M15E notes + Wave 1 billing data, no Wave 1 marker) |

**Risk:** A pilot operator activating by catalog code across all 45 rows could **activate 9 medications without ever passing the Wave 1 billing gate**, while 36 pass it — **split enforcement**.

---

## Part 7 — Root cause

| Category | Assessment |
|----------|------------|
| Data issue | **No** — billing/NDC/HCPCS written correctly |
| Seed logic issue | **Yes** — primary cause |
| Expected design | **No** — M1.6B intent is marker on all Wave 1 linkage |
| Legacy linkage behavior | **Contributing** — M1.5E pre-link triggers `alreadyLinked` |
| Intentional exception | **No** |

---

## Part 8 — Remediation design (do not implement here)

**Smallest safe fix:** In `seed-enterprise-wave1-formulary.ts`, when ENRICH `alreadyLinked`, **append** Wave 1 marker (and prefix) to `governanceNotes` if absent — idempotent.

| Item | Answer |
|------|--------|
| Files | `apps/api/prisma/helpers/seed-enterprise-wave1-formulary.ts` (only) |
| Migration required? | **NO** |
| Seed required? | **YES** (re-run Wave 1 seed) **or** one-time governed SQL/note patch on staging |
| Risk level | **Low** (notes-only; no billing/schema change) |

Alternative phase label: **M1.6B.3 — Wave 1 Marker Remediation**.

---

## Part 9 — Pilot readiness

| Question | Answer |
|----------|--------|
| Marker products | **36** |
| Missing-marker products | **9** |
| Pilot on **all 45** without remediation? | **NO** |
| Pilot on **36 marker-only** cohort? | **YES** (scoped; document exclusion list) |
| **SAFE / NOT SAFE** | **NOT SAFE** for full Wave 1 manifest pilot |

---

## Staging reference counts (user validation)

| Metric | Staging value |
|--------|---------------|
| `MedicationBillingProfile` (total) | 125 |
| Wave 1 marker products | 36 |
| Billing profiles on marker products | 36 |
| Missing-marker with billing | 9 |

---

## Next phase

- **NOT SAFE (45-row pilot):** → **M1.6B.3 — Wave 1 Marker Remediation**, then re-audit  
- **SAFE (36-row scoped pilot):** → may proceed with explicit exclusion of 9 ENRICH codes; **M1.6C** search expansion after marker fix recommended
