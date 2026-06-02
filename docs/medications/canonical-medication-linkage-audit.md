# Canonical Medication Linkage Audit (M1.5B)

**Program:** Canonical Medication Activation & Linkage Audit  
**Phase:** M1.5B (audit only)  
**Date:** 2026-06-02  
**Prerequisite:** [enterprise-medication-catalog-completion-audit.md](./enterprise-medication-catalog-completion-audit.md) (M1.5A)

**Data source:** Local dev DB — **production NOT VERIFIED**  
**Validation:** `prisma validate` PASS · read-only SQL only

---

## Executive summary

| Finding | Value |
|---------|-------|
| Active `CatalogMedication` | **316** |
| Legacy ↔ canonical **exact code match** | **0** |
| Legacy ↔ canonical **legacy FK link** | **60** (all **LINKED_INACTIVE**) |
| **UNLINKED** legacy rows | **256** (**81.0%**) |
| Canonical products (total) | **993** — **945** are baseline/test acetaminophen noise |
| Clinically distinct canonical concepts (excl. noise) | **48** (insulin import clones only) |

**Linkage verdict:** **FAIL** — canonical inventory does not represent Haiti formulary; linkage must precede bulk activation.

---

## Part 1 — Canonical inventory (reference)

See [canonical-medication-activation-audit.md](./canonical-medication-activation-audit.md) Part 1 for full distribution tables.

| Entity | Total | Active | Inactive | Retired (`retiredAt`) |
|--------|-------|--------|----------|------------------------|
| `MedicationConcept` | 1003 | 5 | 998 | 0 |
| `MedicationProduct` | 993 | 0 | 993 | — |
| `MedicationPackage` | 993 | 5 | 988 | — |

**Governance status (products):** `ACTIVATION_APPROVED` **786** · `REVIEW_REQUIRED` **157** · `BLOCKED` **50**  
**Staging (not canonical table):** `MedicationFormularyImportStaging` **1056** rows (`promoted` **952**, `draft` **104**)

**Concept composition (noise analysis):**

| Concept `genericName` pattern | Count |
|------------------------------|-------|
| Acetaminophen* (baseline/ER imports) | **904** |
| Regular Insulin* (hash-suffixed clones) | **48** |
| Blocked Med (governance tests) | **51** |
| **Total** | **1003** |

---

## Part 2 — Relationship integrity

| Check | Result | Count |
|-------|--------|-------|
| Product → missing concept | **PASS** | 0 |
| Package → missing product | **PASS** | 0 |
| Orphan concepts (no products) | **PASS** | 10 |
| Products without packages | **PASS** | 0 |
| Duplicate `legacyCatalogMedicationId` | **PASS** | 0 |
| Inactive parent chain (product or concept inactive) | **FAIL** | **993** / 993 products |
| Unreachable packages | **PASS** | 0 |

**Structural FK integrity:** **PASS**  
**Operational chain integrity:** **FAIL** (100% inactive runtime chain)

**Overall Part 2:** **PARTIAL**

---

## Part 3 — Legacy linkage audit

### 3.1 Classification (active `CatalogMedication` only)

| Classification | Count | % of 316 |
|----------------|-------|----------|
| **UNLINKED** | **256** | **81.0%** |
| **LINKED_INACTIVE** | **60** | **19.0%** |
| **LINKED_ACTIVE** | **0** | **0%** |
| **MULTIPLE_MATCHES** | **0** | **0%** |

`MULTIPLE_MATCHES` is **0** because `MedicationProduct.legacyCatalogMedicationId` is **unique** when set.

### 3.2 LINKED_INACTIVE detail

All **60** links attach to **`19G1-ACET-*`** baseline catalog rows (global baseline import), **not** Haiti INN `CatalogMedication.code` values.

| Catalog side | Product side | Issue |
|--------------|--------------|-------|
| `19G1-ACET-*` (often **missing `genericName`**) | `PRI_ER_ACETAMINOPHEN_*` or `19G2-PRODUCT-*` | Product **inactive**, concept **inactive** → **hidden** from provider search gate |
| Haiti-style codes (**247** rows) | **No** `legacyCatalogMedicationId` | **UNLINKED** |

### 3.3 NO_MATCH_FOUND (canonical → legacy)

| Metric | Count |
|--------|-------|
| Products without legacy link | **933** |
| Products with legacy link | **60** |
| Exact `MedicationProduct.code` = `CatalogMedication.code` | **0** |
| Case-insensitive generic match (catalog ↔ concept) | **0** |

**Interpretation:** Canonical products were created by **ER/baseline import pipelines**, not by Haiti seed upsert. **Linkage is a backfill problem**, not a flip-active problem.

### 3.4 Top duplicate / missing groups

| Group | Severity | Detail |
|-------|----------|--------|
| **Acetaminophen concepts** | **CRITICAL** | **904** concepts — import duplication |
| **Regular Insulin* concepts** | **HIGH** | **48** parallel concepts (test clones) |
| **Haiti catalog UNLINKED** | **CRITICAL** | **256** orderable meds with **no** canonical anchor |
| **Baseline catalog `19G1-ACET-*`** | **HIGH** | **69** rows; **69** missing `route`; linked products inactive |

**Part 3 verdict:** **FAIL**

---

## Part 4 — Linkage readiness (activation prerequisite)

| Prerequisite | Status |
|--------------|--------|
| Stable Haiti `CatalogMedication.code` | **PASS** (247 Haiti-style + 15 inventory codes) |
| Canonical product per Haiti code | **FAIL** (0 code alignment) |
| Legacy FK for provider search gate | **FAIL** (81% unlinked) |
| 1:1 catalog ↔ product intent | **FAIL** (60 links point to baseline noise) |

**Recommended linkage order (strategy only — not executed):**

1. Map **247** Haiti-style catalog rows → derive or match `MedicationProduct` (create only where missing).  
2. Set `legacyCatalogMedicationId` on **one** product per catalog code.  
3. **Do not** link **904** acetaminophen baseline products to Haiti paracetamol rows without deduplication.  
4. Retire or quarantine `19G1-ACET-*` baseline catalog rows from provider search.

---

## Part 5 — Provider search interaction

| Path | Behavior (code + local DB) |
|------|----------------------------|
| Catalog row **without** legacy product | **256** rows — **pass** activation filter (gate not applied) |
| Catalog row **with** legacy product | **60** rows — **excluded** (inactive product/concept) |
| Runtime `orderSearchEnabled` in `governanceNotes` | **1** product locally |

**Risk:** Bulk activation of **786** `ACTIVATION_APPROVED` baseline products without linkage discipline would **not** increase safe orderability; it would amplify duplicate acetaminophen search noise (**CRITICAL**).

---

## Part 6 — Linkage audit verdict

| Question | Answer |
|----------|--------|
| Does canonical content exist? | **Yes** numerically (**993** products) |
| Does it match Haiti catalog? | **No** (0 code / 0 generic alignment) |
| Is linkage sufficient for activation? | **No** |
| Expansion or activation first? | **Activation + linkage first** (curated), **not** expansion |

**Overall linkage:** **FAIL**

---

## Validation

- Read-only SQL on local dev DB (2026-06-02)  
- Schema review: `legacyCatalogMedicationId` unique optional on `MedicationProduct`  
- Code reference: `filterProviderSearchCatalogIds` in `medication-product-activation-governance.service.ts`
