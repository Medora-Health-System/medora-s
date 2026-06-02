# Canonical Stabilization Remediation (M1.5R)

**Program:** Haiti Canonical Medication Architecture  
**Phase:** M1.5R — implementation (remediation only)  
**Date:** 2026-06-02  
**Resolves:** M1.5H CRITICAL blockers  
**Constraints:** No M1.6A · no formulary expansion · no additional activation · no billing/MAR/governance/search architecture changes · no production M1.5E execution in this phase

---

## Objective

Clear all **M1.5H CRITICAL** findings so Haiti medication architecture can reach:

- **HAITI MEDICATION ARCHITECTURE STABILIZED** (after M1.5E on staging + M1.5H re-run)
- **READY FOR M1.5E STAGING EXECUTION** (after remediation applied)
- **SAFE (conditional)** for staged linkage backfill

---

## M1.5H blockers → M1.5R actions

| ID | M1.5H finding | M1.5R remediation |
|----|---------------|-----------------|
| **C1** | **64** invalid `legacyCatalogMedicationId` (acet `19G1-ACET-*` → Haiti catalog) | `remediateHaitiCanonicalStabilization` sets FK **null**; appends `HAITI_M15R_INVALID_LEGACY_LINK_REMOVED` on product `governanceNotes` |
| **C2** | **73** active `19G*` catalog rows (search pollution) | Set `CatalogMedication.isActive = false`; append `HAITI_M15R_SEARCH_POLLUTION_REMEDIATED` in `description` — **no delete** |
| **C3** | M1.5E not run (**0** / **192** links) | **Not executed in M1.5R** — staging plan only (`MEDORA_ENABLE_HAITI_CANONICAL_LINKAGE_BACKFILL=1`) |

---

## Part 1 — Root cause analysis

### Link taxonomy (`auditHaitiCanonicalStabilization`)

| Classification | Meaning |
|----------------|---------|
| **CORRECT** | Non-quarantine product linked; code aligns with manifest or catalog |
| **INCORRECT** | Baseline/clone product linked to Haiti clinical catalog |
| **QUARANTINED** | Quarantine deny-list product with legacy FK set |
| **DUPLICATE** | Multiple products share one `legacyCatalogMedicationId` |
| **MISSING** | Product row without FK (manifest gaps counted separately) |

**Local DB baseline (pre-remediation, 2026-06-02):**

| Metric | Count |
|--------|------:|
| Products with legacy FK | **64** |
| Incorrect + quarantined links | **64** |
| Correct Haiti links | **0** |
| Duplicate legacy FKs | **0** |
| Manifest `MISSING_CANONICAL_TARGET` without link | **192** |
| M1.5E marker products | **0** |

**Root cause:** Early baseline import attached **acetaminophen hash clones** (`19G1-ACET-*` products) to Haiti **paracetamol/acetaminophen** catalog rows. Provider search also indexed **73** standalone `19G*` **catalog** rows (not Haiti formulary codes).

---

## Part 2 — Acetaminophen / clone remediation

**Helper:** `apps/api/prisma/helpers/seed-haiti-canonical-stabilization-remediation.ts`

**Rules enforced:**

- Remove invalid `legacyCatalogMedicationId` only
- **Preserve** `CatalogMedication` row (orders/MAR/billing/audit keep catalog UUID)
- **No** product/concept/catalog **deletes**
- **No** mutation of order lines or administration records

**Targets unlinked:**

- `19G1-ACET-*` products → Haiti catalogs
- `PRI_ER_ACET*` / `19G*` product → non-`19G` catalog
- Acetaminophen / insulin / blocked-med clone concepts with any legacy FK

---

## Part 3 — Quarantine enforcement validator

**Module:** `packages/shared/src/medication/haitiCanonicalStabilizationRemediationValidation.ts`

`validateQuarantineRemediationEnforcement()` — **PASS** in CI

Blocks for linkage creation, activation, and search enrichment:

- `19G*` / `PRI_ER_*` product codes
- `19G*` catalog codes (pollution classifier)
- Acetaminophen / insulin / blocked-med generics
- `baselineAvailable` products

---

## Part 4 — Search pollution remediation

**Strategy:** Deactivate pollution catalog rows (`isActive = false`). Provider search already filters `isActive = true` on `CatalogMedication` — **no search service code change**.

| Pollution kind | Pattern | Action |
|----------------|---------|--------|
| Acet clone catalog | `19G1-ACET-*` | Deactivate |
| Other baseline import | `19G*` (non-Haiti) | Deactivate |
| PRI_ER acet | `PRI_ER_ACET*` | Deactivate |

**Post-remediation target:** **247** active Haiti formulary codes only (local expectation).

**Rollback:** `rollbackHaitiCanonicalStabilizationCatalogRemediation` reactivates catalogs with M1.5R marker in `description` (does **not** restore invalid product FKs).

---

## Part 5 — M1.5E execution readiness

| Check | Expected | Validator result |
|-------|----------|------------------|
| Processable `MISSING_CANONICAL_TARGET` | **192** | **192** |
| `MANUAL_REVIEW` | **55** | **55** |
| Quarantine violations in manifest | **0** | **0** |
| Readiness score | ≥ **75** | **~85** (manifest-only) |

**Gate:** **READY FOR M1.5E STAGING EXECUTION** after remediation **applied** on target DB.

---

## Part 6 — Staging backfill plan (do not run in M1.5R)

See [canonical-stabilization-remediation-runbook.md](./canonical-stabilization-remediation-runbook.md).

**Order:**

1. M1.5R remediation (`MEDORA_HAITI_STABILIZATION_REMEDIATION_DRY_RUN=0`)
2. Re-audit (`auditHaitiCanonicalStabilization`)
3. M1.5E backfill dry-run → execute on **staging only**
4. M1.5G pilot dry-run (optional)
5. Re-run M1.5H checklist

---

## Part 7–8 — Billing / governance preservation

| Domain | Impact | Verdict |
|--------|--------|---------|
| `billingCodeDefault`, `BillingCatalog`, NDC/HCPCS | Unchanged on Haiti rows | **PASS** |
| `MedicationBillingProfile` | No deletes | **PASS** |
| Charge capture / infusion billing | Catalog IDs stable | **PASS** |
| Controlled / HA / LASA / witness / MAR | No rule changes | **PASS** |
| Legal chart summaries | Unchanged | **PASS** |

---

## Part 9 — Search validation (post-remediation target)

| Query | Pre-M1.5R | Post-M1.5R (expected) |
|-------|-----------|------------------------|
| acetaminophen / Tylenol | Clone `19G1-ACET` hits | Haiti PARACETAMOL / alias only |
| ceftriaxone, Rocephin, ondansetron, Zofran, furosemide, Lasix, lorazepam, Ativan, hydromorphone, Dilaudid | **PASS** | **PASS** |
| paracetamol | **PASS** | **PASS** |

---

## Part 10 — Stabilization scores (projected post-remediation)

| Dimension | Pre | Post (projected) |
|-----------|-----|------------------|
| Linkage integrity | **35** | **90** |
| Search integrity | **40** | **90** |
| Billing integrity | **92** | **92** |
| Governance integrity | **85** | **85** |
| Quarantine integrity | **45** | **88** |
| Activation readiness | **40** | **88** |
| Enterprise readiness | **42** | **55** (still not M1.6A) |

---

## Part 11 — M1.5H recheck (projected)

| M1.5H gate | Pre | Post remediation |
|------------|-----|------------------|
| Part 1 inventory | **FAIL** | **PASS** |
| Part 2 linkage | **FAIL** | **PASS** |
| Part 4 search | **PARTIAL** | **PASS** |
| Part 7 quarantine | **FAIL** | **PASS** |
| **Overall** | **FAIL** | **PASS** (staging DB after apply) |

---

## Part 12 — Gate decisions

| Gate | Pre-M1.5R | Post-M1.5R apply + M1.5E staging |
|------|-----------|----------------------------------|
| **READY FOR M1.5E STAGING EXECUTION** | **NOT READY** | **READY** |
| **READY FOR M1.5G PILOT** | **NOT READY** | **NOT READY** (requires M1.5E) |
| **READY FOR M1.6A** | **NOT READY** | **NOT READY** |

**Final (pre-apply):** **NOT READY** for M1.5E until remediation executed on environment.

**SAFE / NOT SAFE:** **SAFE (conditional)** to **run M1.5R remediation** on staging; **NOT SAFE** to skip remediation and proceed to M1.5E.

---

## Implementation artifacts

| Artifact | Path |
|----------|------|
| Remediation classifiers | `packages/shared/src/medication/haitiCanonicalStabilizationRemediation.ts` |
| Validation / scores / M1.5H recheck | `packages/shared/src/medication/haitiCanonicalStabilizationRemediationValidation.ts` |
| DB audit + remediate + rollback | `apps/api/prisma/helpers/seed-haiti-canonical-stabilization-remediation.ts` |
| Constants | `apps/api/src/medication-master/haiti-canonical-stabilization-remediation.constants.ts` |
| Tests | `*.spec.ts` / `*.test.ts` (10 tests) |

**Opt-in seed flag:** `MEDORA_ENABLE_HAITI_CANONICAL_STABILIZATION_REMEDIATION=1` (default dry-run unless `MEDORA_HAITI_STABILIZATION_REMEDIATION_DRY_RUN=0`).
