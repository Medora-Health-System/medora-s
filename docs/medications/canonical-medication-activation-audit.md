# Canonical Medication Activation Audit (M1.5B)

**Program:** Canonical Medication Activation & Linkage Audit  
**Phase:** M1.5B (audit only)  
**Date:** 2026-06-02  
**Companion:** [canonical-medication-linkage-audit.md](./canonical-medication-linkage-audit.md) · [canonical-medication-risk-register.md](./canonical-medication-risk-register.md) · [canonical-medication-activation-strategy.md](./canonical-medication-activation-strategy.md)

**Production DB:** NOT VERIFIED

---

## Executive summary

Medora holds **993** canonical packages, but **~95%** are **baseline/ER import test artifacts** (904 acetaminophen + 51 blocked-med concepts). Only **48** non-noise concepts exist (insulin hash clones). **Zero** canonical products align to Haiti `CatalogMedication.code`.

**786** products are `ACTIVATION_APPROVED` at governance status, yet **0** are `isActive`, **0** have runtime order search enabled (except **1** local row), and **provider search gate** blocks all **60** legacy-linked catalog rows.

| Activation bucket (Haiti-clinical lens) | Count |
|---------------------------------------|-------|
| **SAFE_TO_ACTIVATE** (Haiti-aligned, ready now) | **0** |
| **MANUAL_REVIEW** | **316** catalog + linkage workflow |
| **DO_NOT_ACTIVATE** (bulk canonical) | **945** test/baseline products |

**Decision:** **CANONICAL LAYER NOT READY FOR ACTIVATION** (bulk) · **SAFE (conditional)** for phased linkage of Haiti catalog only

---

## Part 1 — Canonical inventory audit

### 1.1 Status counts

#### MedicationConcept

| Metric | Count |
|--------|-------|
| Total | **1003** |
| Active (`isActive`) | **5** |
| Inactive | **998** |
| Retired (`retiredAt` set) | **0** |
| Draft/staging | **0** in concept table — staging lives in `MedicationFormularyImportStaging` (**1056** rows) |
| Unknown / other | **0** retired; inactive dominates |

#### MedicationProduct

| Metric | Count |
|--------|-------|
| Total | **993** |
| Active | **0** |
| Inactive | **993** |
| `governanceStatus = ACTIVATION_APPROVED` | **786** |
| `REVIEW_REQUIRED` | **157** |
| `BLOCKED` | **50** |
| `baselineAvailable = true` | **780** |

#### MedicationPackage

| Metric | Count |
|--------|-------|
| Total | **993** |
| Active | **5** |
| Inactive | **988** |
| `isDefaultForProduct` | **942** |

### 1.2 Distribution report

| Relationship | Distribution |
|--------------|--------------|
| Products per concept | **993** concepts × **1** product (**1:1**); **10** orphan concepts (0 products) |
| Packages per product | **993** products × **1** package (**1:1**) |
| Concepts per product | Always **1** |

**Outliers:** No multi-product concepts in local DB. “Largest groups” are **duplicate concepts** sharing generic label:

| Pattern | Concept count |
|---------|---------------|
| Acetaminophen* | **904** |
| Regular Insulin* | **48** |
| Blocked Med | **51** |

### 1.3 Product code buckets

| Bucket | Products | `ACTIVATION_APPROVED` |
|--------|----------|------------------------|
| `baseline_19G` | **582** | **424** |
| `priority_er` | **369** | **321** |
| `other` | **42** | **41** |

---

## Part 2 — Relationship integrity

| Audit | Verdict |
|-------|---------|
| Concept → Product FK | **PASS** (0 broken) |
| Product → Package FK | **PASS** (0 broken) |
| Catalog → Product (legacy FK) | **PARTIAL** (60 links, all inactive chain) |
| Catalog → Concept (no direct FK) | N/A — indirect via product only |
| Orphan packages | **PASS** (0) |
| Orphan products | **PASS** (0) |
| Orphan concepts | **PASS** (10 without products — low volume) |
| Inactive parent chains | **FAIL** (993/993) |
| Duplicate legacy chains | **PASS** (0 duplicate FK) |
| Unreachable products | **PASS** (all have package) |

**Overall:** **PARTIAL**

---

## Part 3 — Legacy linkage (summary)

| Class | Count | % |
|-------|-------|---|
| UNLINKED | **256** | **81.0%** |
| LINKED_INACTIVE | **60** | **19.0%** |
| LINKED_ACTIVE | **0** | **0%** |

Detail: [canonical-medication-linkage-audit.md](./canonical-medication-linkage-audit.md)

---

## Part 4 — Canonical activation readiness

Criteria aligned with `medication-product-activation-gates.util.ts` and `evaluateProviderOrderSearchGate` (read-only simulation).

### 4.1 Field completeness (all products)

| Requirement | Pass rate |
|-------------|-----------|
| Valid `genericName` (concept) | **100%** (non-empty) |
| Valid `strengthDisplay` | **100%** |
| Valid `dosageForm` | **100%** |
| Valid package exists | **100%** (993/993) |
| Default package | **942** / 993 |
| Structured route (`MedicationRoute` FK) | **Sparse** — `administrationType` only **ORAL** (**657**) / **OTHER** (**336**) — **no** `INFUSION`/`PUSH` tags locally |
| Not retired | **100%** (`retiredAt` null) |

### 4.2 Activation buckets

| Bucket | Count | Notes |
|--------|-------|-------|
| **SAFE_TO_ACTIVATE** (Haiti clinical, link + activate ready **now**) | **0** | No Haiti code/generic alignment |
| **SAFE_TO_ACTIVATE** (governance-approved, technical fields only) | **786** | **Misleading** — mostly baseline acetaminophen duplicates |
| **MANUAL_REVIEW** | **157** + **256** unlinked catalog + **60** linked | Linkage + formulary + runtime flags |
| **DO_NOT_ACTIVATE** | **50** BLOCKED + **945** baseline/test noise | Includes **904** acetaminophen + **48** insulin clones |

### 4.3 Provider-orderable gate requirements (runtime)

To appear in provider search when legacy-linked, product needs:

- `productIsActive` + `conceptIsActive`  
- `runtime.orderSearchEnabled` (in `governanceNotes`)  
- `formularyOnFormulary` on facility package  
- Not blocked by duplicate staging governance  

**Local satisfy count:** **0** products · **1** has `orderSearchEnabled` in notes (insufficient alone)

---

## Part 5 — Duplicate analysis

| Type | Groups / count | Severity |
|------|----------------|----------|
| Duplicate concepts (same generic, case-insensitive) | **2** groups (**904** + **51**) | **CRITICAL** |
| Duplicate products (concept+strength+form+admin) | **0** | **LOW** |
| Duplicate packages (NDC11) | **77** NDC values shared | **HIGH** |
| Clinical duplicates (acetaminophen 500mg tablet) | **900+** concepts | **CRITICAL** |
| Technical duplicates (insulin hash clones) | **48** | **HIGH** |

---

## Part 6 — Clinical completeness (canonical layer)

Canonical generic names **do not** reflect Haiti INN catalog (paracetamol, ceftriaxone, etc.). Coverage below is **canonical row counts** by keyword — not Haiti seed coverage.

| Specialty / category | Canonical products (keyword) | Safe activation count | Missing vs Haiti |
|--------------------|-------------------------------|----------------------|------------------|
| Emergency | **0** | **0** | Haiti ER meds exist only on **legacy** catalog |
| Hospital / ICU | **0** | **0** | Pressors/paralytics not in canonical generics |
| Observation | **0** | **0** | — |
| Primary / urgent care | **0** | **0** | — |
| Cardiology | **0** | **0** | — |
| Endocrinology | **48** (insulin clones) | **0** | Legacy catalog has insulin; canonical is duplicate test data |
| Pulmonology | **0** | **0** | — |
| Psychiatry | **0** | **0** | Haloperidol on **legacy** only |
| Neurology | **0** | **0** | — |
| OB/GYN | **0** | **0** | — |
| Pediatrics | **0** | **0** | — |
| Anticoagulation | **0** | **0** | Heparin on **legacy** only |
| Antibiotics | **0** | **0** | Haiti §3–4 legacy only |
| Controlled substances | **0** on canonical | **0** | Legacy flags only |
| High alert | **0** profiles flagged | **0** | — |
| Infusions | **0** (`administrationType`) | **0** | IV types not classified on products |

**Conclusion:** Canonical layer **does not substitute** for Haiti catalog clinically. **Activation-first** means **build/link** canonical from Haiti, not enable existing **993** rows.

---

## Part 7 — Billing readiness cross-check

| Metric | Count |
|--------|-------|
| Products with any `MedicationBillingProfile` | **426** |
| Products with `hcpcsCodeSuggested` on profile | **12** |
| Packages with `ndc11` | **426** |
| Duplicate NDC across packages | **77** groups |
| Profiles `requiresManualReview` | **12** |
| Profiles without HCPCS | **414** |
| Linked catalog `billingCodeDefault` | **0** |
| `BillingCatalog` MEDICATION (local) | **4** keys |

| Bucket | Count |
|--------|-------|
| Billing-ready (HCPCS + NDC + Haiti link) | **~0** |
| Billing-incomplete | **993** (canonical) + **256** unlinked legacy billable risk |
| Revenue-risk (activate without map) | **282** approved baseline products with profiles but no catalog HCPCS path |

---

## Part 8 — Safety governance cross-check

| Domain | Canonical (`MedicationSafetyProfile`) | Legacy catalog |
|--------|--------------------------------------|----------------|
| Controlled | **0** flagged profiles | **9** `isControlled` |
| High-alert | **0** `isHighAlert` | soft rules only |
| LASA | **0** `lasaGroupId` | — |
| Witness / double-sign | **0** on profiles | catalog columns |
| Waste (MAR) | workflow docs | — |
| Pharmacy verification | classifier manifest | not catalog-wide |

| Bucket | Count |
|--------|-------|
| Governance-ready (canonical) | **0** |
| Governance-gap | **993** products + **256** unlinked orderable legacy |

Manifests (M1.3C–E) exist in repo; **not applied** to local safety profiles for HA/LASA/controlled.

---

## Part 9 — Provider orderability projection

| Metric | Count | Notes |
|--------|-------|-------|
| **Current** provider-search visible (legacy) | **256** | Unlinked; bypass gate |
| **Current** gated hidden | **60** | Linked + inactive product |
| **Current** true orderable (legacy active catalog) | **316** | All active; search subset **256** |
| **Potential** if all **786** approved products activated (unsafe) | **+786** noise | **Do not** — acetaminophen flood |
| **Potential** if **247** Haiti rows linked + activated (target) | **~247–316** | Requires backfill + governance |
| **Projected increase** (realistic curated) | **0%** until linkage | Enabling **60** linked inactive → **+60** search visible (**+23%** on 256) only if `isActive` + runtime + formulary |

| Scenario | Visible search rows | Δ vs 256 |
|----------|---------------------|----------|
| Status quo | **256** | — |
| Activate **60** linked (fix inactive + runtime) | **316** max | **+23%** |
| Wrong: activate all **786** baseline | **256 + pollution** | Unbounded duplicate risk |
| Target: Haiti link **247** | **~247–316** | **+0–23%** quality improvement |

---

## Part 10 — Activation strategy (recommendation)

**Recommended:** **Option D — Hybrid** (detail in [canonical-medication-activation-strategy.md](./canonical-medication-activation-strategy.md))

**Not** Option A (activate all safe-approved **786**) — would activate **904** acetaminophen duplicates.

---

## Part 11 — Risk register

See [canonical-medication-risk-register.md](./canonical-medication-risk-register.md) (**14** risks).

---

## Part 12 — Final decision

| Verdict | Result |
|---------|--------|
| **CANONICAL LAYER READY FOR ACTIVATION** | **No** (bulk) |
| **CANONICAL LAYER NOT READY FOR ACTIVATION** | **Yes** |
| **SAFE / NOT SAFE** | **NOT SAFE** to bulk-activate existing canonical rows; **SAFE (conditional)** for a **curated Haiti linkage + activation** program |

### Answers to M1.5B expected outcomes

| Question | Answer |
|----------|--------|
| How many canonical medications exist? | **993** products / **1003** concepts ( **~48** clinically distinct non-noise) |
| How many can safely be activated now? | **0** Haiti-aligned · **786** technically “approved” but **unsafe** bulk |
| How many require manual review? | **316** catalog linkage + **157** `REVIEW_REQUIRED` products |
| How many remain unusable? | **945** test/baseline canonical rows |
| Projected provider-orderable after **proper** activation? | **~316** ceiling (current catalog size), not **993** |
| Activation or expansion next? | **Activation + linkage first** (Haiti backfill), **not** formulary expansion |

---

## Validation log

| Check | Result |
|-------|--------|
| `pnpm --filter @medora/api exec prisma validate` | PASS |
| Read-only SQL | Local dev 2026-06-02 |
| Production | NOT VERIFIED |
