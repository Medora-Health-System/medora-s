# Medication Data Quality Audit — Phase M1.1B

**Program:** Enterprise Medication Governance  
**Phase:** M1.1B (audit only — no code, seeds, migrations, commits, DB writes, or fixes)  
**Date:** 2026-05-31  
**Prerequisite:** [medication-inventory-architecture-audit.md](./medication-inventory-architecture-audit.md) (M1.1A)

---

## Data source declaration

| Item | Value |
|------|-------|
| **Production DB** | **NOT VERIFIED** — `apps/api/.env` points to `localhost` only |
| **Local dev DB** | `postgresql://postgres:postgres@localhost:5432/medora` |
| **Query mode** | Read-only Prisma / SQL (2026-05-31) |
| **Haiti seed reference** | **263** rows in `HAITI_MEDICATION_CATALOG` (source file; not re-counted in SQL) |

All numeric findings below are **LOCAL DEV** unless labeled otherwise. Production readiness requires operator read-only replay on production `DATABASE_URL`.

---

## Part 1 — Inventory validation

### 1.1 Row counts

| Entity | Total | Active | Inactive | Notes |
|--------|-------|--------|----------|-------|
| **CatalogMedication** | 299 | 299 | 0 | Legacy order-entry catalog |
| **MedicationAlias** | 344 | 344* | 0 | *No `isActive` column |
| **MedicationConcept** | 686 | 5 | 681 | Canonical layer |
| **MedicationProduct** | 676 | 0 | 676 | All inactive locally |
| **MedicationPackage** | 676 | 5 | 671 | Tied to inactive products |

**Drift note:** Local catalog **299** vs Haiti seed **263** → **+36** rows likely from global baseline / ER import / promotion (e.g. `19G1-ACET-*` codes).

### 1.2 Part 1 verdicts

| Entity | Verdict | Rationale |
|--------|---------|-----------|
| CatalogMedication | **PARTIAL** | Counts valid locally; production **NOT VERIFIED**; 52 rows missing `genericName` |
| MedicationAlias | **PARTIAL** | Healthy alias volume; 40 duplicate alias strings across meds (expected for clinical shortcuts) |
| MedicationConcept | **FAIL** | 99.3% inactive (681/686) — canonical layer not operational |
| MedicationProduct | **FAIL** | 100% inactive — not activation-governed for orders |
| MedicationPackage | **FAIL** | 99.3% inactive |

**Overall Part 1:** **PARTIAL** (legacy catalog usable; canonical inventory not production-ready).

---

## Part 2 — Duplicate analysis

### 2.1 Summary table

| Category | Duplicate groups | Extra rows / notes | Severity | Examples |
|----------|------------------|--------------------|----------|----------|
| Medication **codes** | 0 | — | **LOW** | Unique constraint holds |
| **Generic names** (case-insensitive) | 61 | ~147 additional rows in groups | **MEDIUM** | Expected multi-strength: `salbutamol` (5), `paracetamol` (5), `amoxicillin` (5) |
| **Brand** (`displayNameEn`) | 62 groups | Often strength-specific EN labels | **LOW–MEDIUM** | Legitimate variants |
| **Strength** strings | 41 groups | Shared strength text across products | **MEDIUM** | Review unit normalization |
| **Route** strings | 9 groups | `orale` (139), `injectable` (42), `intraveineuse` (33) | **MEDIUM** | French free-text, not enum |
| **Aliases** (same alias → multiple meds) | 40 groups | Clinical shortcut collisions | **HIGH** | `rsi` (5), `sédation` (5), `intubation` (5), `acetaminophen` (4) |
| **Concept codes** | 0 | — | **LOW** | |
| **Product codes** | 0 | — | **LOW** | |
| **Package codes** | 0 | — | **LOW** | |
| **Legacy catalog mapping** (`legacyCatalogMedicationId`) | 0 | No duplicate links | **LOW** | |

### 2.2 Interpretation

- **Not** duplicate-code corruption — **PASS** on code integrity.
- **Generic duplicate groups** are mostly **valid SKU splits** (strength/form/route), not bad merges.
- **Alias collisions** (`rsi`, `sédation`) are **HIGH** — search may return wrong drug without disambiguation.

---

## Part 3 — Generic / brand relationship audit

### 3.1 Architecture

| Question | Answer |
|----------|--------|
| Generic stored? | **Yes** — `CatalogMedication.genericName` (when populated) |
| Brand stored? | **No dedicated column** — brand via `displayNameEn`, `name`, `MedicationAlias` |
| Relationship modeled? | **No FK** — implicit via aliases only |
| Canonical brand graph? | **Partial** — `MedicationSearchAlias` on concepts/products (sparse locally) |

### 3.2 Example pairs (local DB)

| Brand | Generic (expected) | Generic rows (`genericName`) | Brand alias hits | Linked correctly? |
|-------|-------------------|------------------------------|------------------|-------------------|
| Tylenol | Acetaminophen | 0* | 2 | **Partial** — seed uses **Paracetamol** as generic; aliases `Tylenol` / `Acetaminophen` on `ACETAMINOPHEN_500` |
| Coumadin | Warfarin | 0 | 0 | **FAIL** — warfarin not in catalog |
| Lasix | Furosemide | 2 | 2 | **PASS** |
| Glucophage | Metformin | 2 | 3 | **PASS** |

\*Search for `genericName contains 'Acetaminophen'` returns 0; paracetamol naming is intentional in Haiti seed.

### 3.3 Hardcoded search brand map

`MEDICATION_SEARCH_QUERY_ALIASES` includes Glucophage→metformin, Lipitor→atorvastatin, etc. — **does not** include Tylenol, Coumadin, or Lasix.

**Part 3 verdict:** **PARTIAL**

---

## Part 7 — Route / dosage form quality

### 7.1 Routes (catalog)

| Expected (EN) | Present in DB | Form |
|---------------|---------------|------|
| PO | **orale** (139) | French free-text |
| IV | **intraveineuse** (33), **injectable** (42) | Mixed |
| IM | **intramusculaire** (3) | French |
| SQ | **sous-cutanée** (3) | French |
| Topical | **topique** (11) | French |
| Ophthalmic | **ophtalmique** (4) | French |
| Otic | — | **Missing** |
| Nebulized / Inhaled | **inhalée** (5), **inhalation** (3) | Duplicate concepts |
| Rectal | **rectale** (1) | French |

**Structured `MedicationRoute` table:** exists in schema; **not** used by legacy catalog rows.

### 7.2 Dosage forms

**Mixed FR/EN:** `comprimé` (91), `injectable` (70), **`Tablet` (52)** — bilingual inconsistency.

**Part 7 verdict:** **PARTIAL** (values present but free-text, mixed locale, no enum enforcement on legacy catalog).

---

## Part 8 — Search quality audit

Method: replicated `expandMedicationSearchQuery` + `buildCatalogMedicationSearchWhere` + alias path (read-only, active catalog only).

| Query | Direct hits | Alias hits | Verdict |
|-------|-------------|------------|---------|
| Tylenol | 2 | 2 | **PASS** (via alias → paracetamol products) |
| Acetaminophen | 5* | 5 | **PARTIAL** — includes global baseline `19G1-ACET-*` rows |
| Coumadin | 0 | 0 | **FAIL** |
| Warfarin | 0 | 0 | **FAIL** |
| Lasix | 1–2 | 2 | **PASS** |
| Furosemide | 2 | 0 | **PASS** |
| Glucophage | 3 | 3 | **PASS** (hardcoded expansion to metformin) |
| Metformin | 3 | 0 | **PASS** |
| acetaminofen (misspell) | 0 | 0 | **FAIL** |
| metformn (misspell) | 0 | 0 | **FAIL** |

| Capability | Status |
|------------|--------|
| Generic | **PASS** |
| Brand | **PARTIAL** |
| Alias | **PASS** (where seeded) |
| Partial text | **PASS** (contains) |
| Misspellings | **FAIL** |

**Part 8 overall:** **PARTIAL**

---

## Part 9 — Order workflow quality audit

| Capability | Status |
|------------|--------|
| Dose | **PARTIAL** — `strength` on order; MAR `doseValue`/`doseUnit` |
| Route | **PARTIAL** — free-text |
| Frequency | **NOT IMPLEMENTED** |
| PRN | **NOT IMPLEMENTED** |
| Start time | **PARTIAL** — `intendedAdministrationAt` |
| Stop time | **NOT IMPLEMENTED** (MAR infusion STOP only) |
| Order status | **IMPLEMENTED** |
| Medication reconciliation | **PARTIAL** — home meds entry only |
| MAR | **PARTIAL** — append-only log |
| eMAR | **NOT IMPLEMENTED** |
| Pharmacy verification | **NOT IMPLEMENTED** |
| Controlled-substance workflows | **PARTIAL** — catalog flags; no end-to-end enforcement |
| High-alert workflows | **PARTIAL** — documentation UI + soft warnings; no DB flags |

---

## Part 10 — Governance gap summary

See [medication-production-readiness.md](./medication-production-readiness.md) for scored domains.

| Domain | Status |
|--------|--------|
| Medication family | **PARTIAL** |
| Generic/brand mapping | **PARTIAL** |
| Route | **PARTIAL** |
| Dosage form | **PARTIAL** |
| Strength | **PARTIAL** |
| Controlled substance | **PARTIAL** |
| High-alert | **MISSING** (data) |
| LASA | **MISSING** (data) |
| Antibiotic class | **PARTIAL** (heuristics only) |
| Insulin class | **PARTIAL** |
| Anticoagulant class | **PARTIAL** |
| Opioid class | **PARTIAL** |
| Benzodiazepine class | **PARTIAL** |

---

## SAFE / NOT SAFE (data quality)

| Verdict | Meaning |
|---------|---------|
| **SAFE (conditional)** | Legacy **CatalogMedication** suitable for continued Haiti MVP ordering/search **after** production count verification |
| **NOT SAFE** | Enterprise **safety governance** and **production sign-off** — 0 high-alert profiles, incomplete controlled flags, canonical layer inactive, warfarin absent, production DB unverified |

---

## Sign-off

| Item | Status |
|------|--------|
| M1.1B data quality audit | **COMPLETE** (documentation) |
| Production verification | **Pending operator** |
