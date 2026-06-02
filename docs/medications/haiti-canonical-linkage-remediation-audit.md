# Haiti Canonical Linkage Remediation Audit (M1.5C)

**Program:** Haiti Canonical Linkage Remediation — Audit & Design  
**Phase:** M1.5C (audit + design only)  
**Date:** 2026-06-02  
**Prerequisites:** [enterprise-medication-catalog-completion-audit.md](./enterprise-medication-catalog-completion-audit.md) (M1.5A) · [canonical-medication-linkage-audit.md](./canonical-medication-linkage-audit.md) (M1.5B)

**Constraints:** No code, seeds, migrations, writes, linkage, activation, or search/billing/MAR changes.

**Data source:** Local dev DB (read-only SQL) — **production NOT VERIFIED**  
**Validation:** `pnpm --filter @medora/api exec prisma validate` — PASS

---

## Executive summary

The **Haiti legacy formulary** (**247** active `CatalogMedication` rows, code not `19G%`) is **complete**, **provider-search visible**, and **100% unlinked** from canonical. Existing **993** canonical products are **not** valid linkage targets (**993/993** match quarantine noise rules).

Remediation path: **quarantine canonical noise → create new canonical chains from manifest (not attach to clones) → validate → seed/backfill → later activation**.

| Decision | Result |
|----------|--------|
| **HAITI CANONICAL LINKAGE DESIGN READY** | **Yes** |
| **HAITI CANONICAL LINKAGE DESIGN BLOCKED** | **No** |
| **SAFE / NOT SAFE** | **SAFE (conditional)** for documented design; **NOT SAFE** to execute linkage without quarantine + M1.5D validation |

---

## Part 1 — Haiti legacy formulary inventory

### 1.1 Scope definition

| Scope | Count | Notes |
|-------|-------|-------|
| **Haiti legacy** (`code` NOT `19G%`) | **247** active | Haiti seed–aligned formulary (M1.5A seed **269** rows; local DB **247** Haiti-style — **22** seed rows not present or merged) |
| Baseline import (`19G%`) | **69** active | **Excluded** from Haiti linkage manifest |
| Total active `CatalogMedication` | **316** | |

### 1.2 Row classification (Haiti legacy only)

| Attribute | Count | % of 247 |
|-----------|-------|----------|
| **Active** | **247** | 100% |
| **Inactive** | **0** | 0% |
| **Provider-search visible** | **247** | 100% — no legacy FK → activation gate bypass |
| **Provider-search hidden** | **0** | 0% — Haiti rows are not in the **60** baseline-linked set |
| **Has ≥1 `MedicationAlias`** | **247** | 100% |
| **No aliases** | **0** | 0% |
| **`billingCodeDefault` populated** | **0** | 0% — M1.4B seed not applied locally |
| **`ndc11` populated** | **0** | 0% |
| **`isControlled = true`** | **9** | 3.6% |
| **High-alert / LASA on `MedicationSafetyProfile`** | **0** | manifests exist in repo; not persisted locally |
| **Route + strength + form + generic complete** | **247** | 100% |
| **Incomplete rows** | **0** | 0% |
| **Billable injectable/IV (route/form heuristic)** | **82** | 33.2% — aligns with M1.4B billable set |

### 1.3 Provider-orderable summary

| Metric | Count |
|--------|-------|
| **Provider-orderable** (active + visible in search) | **247** |
| **Hidden** | **0** (Haiti subset) |
| **Complete rows** | **247** |
| **Incomplete rows** | **0** |

### 1.4 Formulary composition (top `therapeuticClass`)

| Class | Rows |
|-------|------|
| Antibiotique | 48 |
| AINS | 11 |
| Antifongique | 11 |
| Antiparasitaire | 10 |
| Antihypertenseur | 10 |
| Corticoïde | 8 |
| Antidiabétique | 8 |
| Analgésique / antipyrétique | 8 |
| (+ 20 other classes) | remainder |

| Tier | Rows |
|------|------|
| `isEssential = true` | **188** |
| Non-essential | **59** |

### 1.5 Alias collision watchlist (pre-linkage)

Shared aliases across multiple Haiti rows (search disambiguation risk):

| Alias | Meds |
|-------|------|
| sédation | 5 |
| intubation | 5 |
| rsi | 5 |
| acetaminophen | 4 |
| antibiotique urgence | 3 |
| glucophage | 3 |

---

## Part 2 — Canonical noise quarantine design

**Principle:** No deletes. Classify, exclude from auto-link targets, and guarantee provider search never surfaces quarantined canonical products.

### 2.1 Quarantine classes

| Class ID | Rule | Local count (approx.) |
|----------|------|------------------------|
| `Q_ACETAMINOPHEN_CLONE` | `MedicationConcept.genericName` ILIKE `acetaminophen%` | **904** concepts |
| `Q_INSULIN_CLONE` | `genericName` ILIKE `regular insulin%` | **48** concepts |
| `Q_BLOCKED_MED_TEST` | `genericName` = `Blocked Med` | **51** concepts |
| `Q_BASELINE_PRODUCT` | `MedicationProduct.baselineAvailable = true` | **780** products |
| `Q_BASELINE_CATALOG` | `CatalogMedication.code` LIKE `19G%` | **69** catalog rows |
| `Q_DUPLICATE_NDC_CLUSTER` | `MedicationPackage.ndc11` in duplicate groups | **77** NDC groups |
| `Q_LEGACY_WRONG_LINK` | `legacyCatalogMedicationId` → `19G1-ACET-*` | **60** products |

**Union rule for linkage target deny-list:** any product matching **Q_ACETAMINOPHEN_CLONE** OR **Q_INSULIN_CLONE** OR **Q_BLOCKED_MED_TEST** OR **Q_BASELINE_PRODUCT** → **993/993** products denied.

### 2.2 Audit labels (stored in future `governanceNotes` or manifest flag)

```text
<!--MEDORA_LINKAGE_QUARANTINE:v1-->
{"class":"Q_ACETAMINOPHEN_CLONE","sourcePhase":"M1.5C","reviewerRequired":false}
<!--/MEDORA_LINKAGE_QUARANTINE-->
```

### 2.3 Exclusion rules (auto-link engine)

1. Deny if product/concept matches any quarantine class above.  
2. Deny if `governanceStatus` = `BLOCKED`.  
3. Deny if `legacyCatalogMedicationId` already set to a **different** catalog code (unless explicit override with reviewer).  
4. Deny if product `code` starts with `PRI_ER_`, `19G2`, `19G1` (import artifacts).

### 2.4 Provider-search exclusion guarantee

| Mechanism | Guarantee |
|-----------|-----------|
| Do **not** set `isActive` on quarantined products | No activation path |
| Do **not** set `orderSearchEnabled` in runtime block | Gate remains closed |
| Keep Haiti search on **legacy** `CatalogMedication` until M1.5F cutover audit | No duplicate row from canonical |
| Unlink **60** wrong baseline links before Haiti backfill | Removes hidden-link edge case |

### 2.5 Future cleanup phase (post-stabilization)

| Phase | Action |
|-------|--------|
| **M1.5H** | Archive/report quarantined rows; optional `governanceStatus` → `RETIRED` |
| **Never in M1.5D–G** | Hard-delete concepts/products |

### 2.6 Quarantine strategy verdict

| | |
|--|--|
| **SAFE** | **Yes** — classify-only, no data mutation in M1.5C |
| **NOT SAFE** | Bulk-linking without deny-list (**993** wrong targets) |

---

## Part 3 — Haiti → canonical matching rules

### 3.1 Matching priority (deterministic)

| Priority | Rule | Expected yield (local) |
|----------|------|------------------------|
| **1** | `CatalogMedication.code` = `MedicationProduct.code` | **0** matches today |
| **2** | Exact: normalized generic + strength + route + form → `deriveMedicationCatalogCode()` | **247** unique codes (create target) |
| **3** | Exact generic + strength + route (form variant) | Manual review if >1 product candidate |
| **4** | Generic + route + form (strength family) | **MANUAL_REVIEW** only |
| **5** | `ndc11` exact (catalog ↔ package) | **0** today on catalog |
| **6** | `billingCodeDefault` / M1.4B manifest `catalogCode` | **82** billable manifest keys (after seed) |
| **7** | Clinical pharmacist / governance reviewer | Required for ambiguous rows |

**Implementation note:** For M1.5E, **default path = CREATE** new `MedicationConcept` / `MedicationProduct` / `MedicationPackage` per manifest row using derived codes aligned to `CatalogMedication.code` — **not** link to existing product rows.

### 3.2 Manual-review rules (mandatory)

| Condition | Action |
|-----------|--------|
| >1 canonical candidate after rules 2–4 | `MANUAL_REVIEW` |
| Controlled (`isControlled` or opioid/benzo manifest) | `reviewerRequired: true` even if `LINK_READY` |
| High-alert manifest match | `reviewerRequired: true` |
| LASA manifest match | `reviewerRequired: true` |
| Anticoagulant / insulin flags | `reviewerRequired: true` |
| Alias collision group (rsi, sédation, etc.) | `MANUAL_REVIEW` |
| Governance manifest `catalogCode` ≠ derived Haiti code | `MANUAL_REVIEW` (known drift: e.g. `HYDROMORPHONE_2MG_ML_INJECTABLE` vs derived `_PER_` form) |

### 3.3 Rejected auto-link rules (forbidden)

| Forbidden | Reason |
|-----------|--------|
| Display-name / brand-only match | LASA / wrong product |
| Generic-only match | Strength/route collision |
| Link to quarantine class | **CRITICAL** safety |
| Auto-link controlled without reviewer | Policy (M1.3C) |
| Auto-link high-alert without reviewer | Policy (M1.3D) |
| Auto-link to inactive product chain | No clinical value |
| Second product for same `catalogMedicationCode` | Unique legacy FK |

---

## Part 4–9 summaries

Detailed designs:

- [haiti-canonical-linkage-manifest-design.md](./haiti-canonical-linkage-manifest-design.md) — Part 4  
- [haiti-canonical-linkage-validation-design.md](./haiti-canonical-linkage-validation-design.md) — Part 5  
- Parts 6–9 below (clinical, billing, safety, search)

---

## Part 6 — Clinical prioritization (linkage tranches)

| Tranche | Scope | Est. rows | Risk |
|---------|-------|-----------|------|
| **T1** | ER / injectable / IV / hydration perfusions | **82** | **MEDIUM** — billing/MAR paths |
| **T2** | Antibiotics, analgesics, antiemetics, steroids, non-IV fluids | **~65** | **LOW–MEDIUM** — overlap with T1 excluded |
| **T3** | Controlled + high-alert (post safety review) | **9** catalog controlled + HA manifest overlap | **HIGH** |
| **T4** | Primary chronic essentials (non-IV) | **122** | **LOW** |
| **T5** | Pediatric / OB / specialty / non-essential | **43** | **MEDIUM** |

**Total manifest rows:** **247** (one entry per Haiti legacy code).

---

## Part 7 — Billing preservation (design rules)

| Rule | Detail |
|------|--------|
| B1 | `catalogMedicationCode` remains billing key for `BillingCatalog.externalCode` |
| B2 | On create: copy M1.4B manifest HCPCS → `MedicationBillingProfile.hcpcsCodeSuggested` + `CatalogMedication.billingCodeDefault` (idempotent seed) |
| B3 | NDC manifest keys → package `ndc11` only when manifest entry exists |
| B4 | Do not change `mapMedicationToBillingCode` behavior in M1.5D–E |
| B5 | MAR capture continues via legacy catalog until M1.5F audit |

**Revenue leakage risks:** Linking without M1.4B seed (**0** `billingCodeDefault` locally); HCPCS manifest/catalog code drift; duplicate NDC clusters on wrong package.

---

## Part 8 — Safety preservation (design rules)

| Rule | Detail |
|------|--------|
| S1 | Copy `CatalogMedication` controlled flags → `MedicationSafetyProfile` on concept create |
| S2 | Apply M1.3C–E manifests **after** code alignment review |
| S3 | `reviewerRequired` on manifest for opioids, benzos, HA, LASA, insulin |
| S4 | Witness/double-sign/waste flow unchanged (M1.3F MAR) |
| S5 | Pharmacy verification classifiers attach at concept level |

**Clinical risk:** Activating T3 before safety seed = false negative governance badges.

---

## Part 9 — Provider search impact (design rules)

| Rule | Detail |
|------|--------|
| P1 | **Linkage alone** (`legacyCatalogMedicationId` only) must **not** change visible search set if product inactive |
| P2 | **One** searchable row per `catalogMedicationCode` (legacy row) |
| P3 | Canonical activation (M1.5G) must not insert a second catalog row |
| P4 | Pre-flight alias collision report for T1/T3 |
| P5 | `displayNameFr` / `displayNameEn` remain on catalog; concept `displayName` = EN clinical, FR via catalog UI |

**Duplicate display prevention:** Defer `orderSearchEnabled` until M1.5G; keep **247** legacy-visible until cutover audit (M1.5F).

---

## Part 10 — Remediation roadmap

See [haiti-canonical-linkage-roadmap.md](./haiti-canonical-linkage-roadmap.md).

---

## Part 11 — Final decision

| Verdict | Selection |
|---------|-----------|
| **HAITI CANONICAL LINKAGE DESIGN READY** | **Yes** |
| **HAITI CANONICAL LINKAGE DESIGN BLOCKED** | **No** |
| **SAFE / NOT SAFE** | **SAFE (conditional)** — design approved for M1.5D; execution requires quarantine + validation + no bulk attach to **993** noise products |

### Activation vs expansion

**Medora needs linkage + canonical creation (M1.5D–E) before expansion.** Existing canonical volume does not reduce work — it increases quarantine discipline.

---

## Validation log

| Check | Result |
|-------|--------|
| Read-only SQL | Local dev 2026-06-02 |
| `prisma validate` | PASS |
| Production | NOT VERIFIED |
