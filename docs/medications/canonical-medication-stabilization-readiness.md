# Canonical Medication Stabilization Readiness (M1.5H)

**Date:** 2026-06-02  
**Phase:** M1.5H — audit only  
**Decision:** **HAITI MEDICATION ARCHITECTURE NOT STABILIZED**

---

## Phase completion matrix

| Phase | Deliverable | Code/CI | Local DB |
|-------|-------------|---------|----------|
| **M1.5D** | 247-entry linkage manifest + quarantine + validation | **Complete** | N/A |
| **M1.5E** | Linkage backfill helper + M1.5E search-preservation gate | **Complete** | **Not applied** (0 markers) |
| **M1.5F** | Provider search cutover audit | **Complete** | Pollution confirmed |
| **M1.5G** | T1 activation pilot (≤82 / 38 eligible) + rollback | **Complete** | **Not applied** (0 pilot rows) |
| **M1.5H** | Stabilization audit (this doc) | **Complete** | **FAIL** operational gate |

---

## Part-by-part readiness

| Audit part | Verdict | Blocker |
|------------|---------|---------|
| 1 — Architecture inventory | **FAIL** | 73 active acet clone catalog rows; wrong 64 FK links |
| 2 — Linkage integrity | **FAIL** | M1.5E not run; baseline acet links |
| 3 — Pilot activation (M1.5G) | **PASS** | Design only until M1.5E |
| 4 — Provider search | **PARTIAL** | Acetaminophen/Tylenol clone pollution |
| 5 — Billing | **PASS** | — |
| 6 — Governance | **PASS** | Sparse profiles on noise concepts |
| 7 — Quarantine | **FAIL** | Catalog-level acet rows not quarantined |
| 8 — Performance | **LOW** risk | — |
| 9 — Rollback | **PASS** | Code + tests |
| 10 — Gap register | Documented | See risk register |
| 11 — Final decision | **NOT STABILIZED** | — |
| 12 — Enterprise (M1.6A) | **NOT READY** | — |

---

## Stabilization checklist (required before “STABILIZED”)

### Data remediation (blocking)

1. **Unlink** 64 `MedicationProduct` rows where `genericName` matches acetaminophen clone and `legacyCatalogMedicationId` points at Haiti clinical catalogs (M1.5B recommendation).
2. **Deactivate or archive** 73 active `CatalogMedication` rows with code prefix `19G1-ACET-` from provider search (keep audit trail).
3. Run **M1.5E** backfill: `MEDORA_ENABLE_HAITI_CANONICAL_LINKAGE_BACKFILL=1` on staging; verify **192** clean links, **0** quarantine violations.

### Pilot validation (blocking for production Haiti)

4. Dry-run M1.5G: `MEDORA_HAITI_CANONICAL_ACTIVATION_PILOT_DRY_RUN=1`.
5. Activate ≤38 eligible T1 rows in **one** pilot facility; measure search catalog-id set before/after (must be identical count).
6. Execute rollback drill; confirm M1.5E marker restored.

### Search quality (blocking)

7. Re-run alias matrix (§M1.5H audit Part 4); require **PASS** on acetaminophen, paracetamol, Tylenol.
8. Confirm ceftriaxone / controlled substances remain **MANUAL_REVIEW** until governance profiles seeded.

### Formulary gaps (blocking for anticoag / enterprise)

9. Add or formally defer warfarin/Coumadin and enoxaparin/Lovenox with clinical sign-off.
10. Document vaccine gap policy for M1.6A.

---

## When to declare STABILIZED

Replace **NOT STABILIZED** with **HAITI MEDICATION ARCHITECTURE STABILIZED** only when **all** are true on the **target production/staging** environment:

| Criterion | Target |
|-----------|--------|
| M1.5E markers | ~192 Haiti clean links |
| Wrong baseline links | **0** |
| Active `19G1-ACET-*` catalog | **0** |
| Provider search Part 4 | **PASS** (not PARTIAL) |
| M1.5G pilot | Completed or explicitly deferred with sign-off |
| Enterprise expansion | Medical director + pharmacy lead approval |

---

## SAFE / NOT SAFE (clinic operations)

| Operation | Verdict |
|-----------|---------|
| Daily ordering on Haiti 247-code catalog (excluding 19G acet) | **SAFE (conditional)** |
| Acetaminophen search without clone remediation | **NOT SAFE** |
| Bulk canonical activation | **NOT SAFE** |
| M1.6A enterprise formulary audit | **NOT SAFE** until checklist complete |

---

## CI / build readiness

| Check | Status |
|-------|--------|
| `@medora/shared` tests | **1056 passed** |
| `@medora/api` build | **PASS** |
| `prisma validate` | **PASS** |
| `verify:web` | **PASS** |

Architecture **codebase** is maintainable and test-covered; **operational** stabilization is the remaining work.
