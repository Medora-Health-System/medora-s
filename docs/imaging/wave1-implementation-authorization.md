# Wave 1 Implementation Authorization (Phase W2.2 — Final)

**Phase:** W2.2  
**Date:** 2026-06-01  
**Authority:** [`enterprise-imaging-workbook.csv`](enterprise-imaging-workbook.csv) (`wave=1`, **37** rows)  

---

## 1. Return summary

| Metric | Value |
|--------|------:|
| **Wave 1 row count** | **37** |
| **XR-1 / CT-1 / MRI-1** | **19 / 7 / 11** |
| **Alias count (est.)** | **~30–37** strings |
| **Required alias codes (workbook)** | **1** |
| **Billing review count** | **37** |
| **Classifier completeness** | **100%** required slots · **94.6%** incl. recommended subregion |
| **Gate W2 (enterprise)** | **OPEN** |
| **Gate W2-Wave1 design** | **AUTHORIZED → 2E.4A staging** |
| **2E.4A readiness** | **YES** |
| **SAFE / NOT SAFE** | Design **SAFE** · Production **NOT SAFE** |

---

## 2. Part 1 — Authoritative inventory (workbook)

Derived exclusively from CSV `wave=1`:

| Batch | Count |
|-------|------:|
| XR-1 | 19 |
| CT-1 | 7 |
| MRI-1 | 11 |
| **Total** | **37** |

**Audits:** duplicate codes **0** · duplicate EN **0** · duplicate FR **0** · forbidden retired codes in slice **0** · retirement/successor **PASS**.

Full row listing: [`wave1-implementation-inventory.md`](wave1-implementation-inventory.md).

---

## 3. Part 2 — Alias package

| Class | Count |
|-------|------:|
| REQUIRED (workbook) | **1** code |
| OPTIONAL (workbook) | **36** codes |
| NONE | **0** |
| Tuple pass (`XR_CHEST`) | **2** protocols |

Details: [`wave1-alias-package.md`](wave1-alias-package.md).

---

## 4. Part 3 — Classifier package

| Metric | Value |
|--------|------:|
| **Complete rows** (modality, body, contrast, laterality, view where required) | **37** |
| **Incomplete rows** (recommended polish only) | **2** (`XR_RIBS_LEFT`, `XR_RIBS_RIGHT` — empty subregion in CSV) |
| **Missing ICM dependencies** | **0** |
| **Completeness (required fields)** | **100%** |
| **Completeness (incl. recommended subregion)** | **94.6%** (35/37) |

All Wave 1 classifier codes exist in ICM-1.0 seed manifest.

---

## 5. Part 4 — Billing package

| State | Count |
|-------|------:|
| billing-ready | **0** |
| billing-review (`PENDING_CPT_REVIEW`) | **37** |
| billing-deferred (W3) | **37** |

Details: [`wave1-billing-package.md`](wave1-billing-package.md).

---

## 6. Part 5–6 — Staging & rollback

- [`wave1-staging-validation-plan.md`](wave1-staging-validation-plan.md)  
- [`wave1-rollback-plan.md`](wave1-rollback-plan.md)  

---

## 7. Part 7 — Gate W2 re-evaluation

| ID | Blocker | State | Owner | Evidence needed | Resolution |
|----|---------|-------|-------|-----------------|------------|
| B1 | Enterprise workbook | **CLOSED** | Eng | W2.1 CSV | Done |
| B2 | Per-wave clinical sign-off | **OPEN** | Clinical | Signed manifest | Blocks production |
| B3 | French labels | **CLOSED** | i18n | 37 FR in CSV | Clinical polish optional |
| B4 | Pilot scope (waves 3–4) | **DEFERRED** | Product | Scope doc | N/A Wave 1 |
| B5 | Staging seed | **OPEN** | Eng | 2E.4A apply log | Blocks production |
| B6 | Classifier backfill W1 rows | **OPEN** | Eng | Dry-run output | Blocks production |
| B7 | Staging smoke | **OPEN** | QA | Checklist | Blocks production |
| B8 | Alias execution | **OPEN** | Eng | Alias seed proof | Blocks production UX |
| B9 | CPT / W3 | **DEFERRED** | Billing | CPT workbook | Charge capture only |
| B10 | Preflight | **OPEN** | Eng | SQL counts | Blocks production |
| B11 | US tuple (wave 2) | **DEFERRED** | Clinical | N/A | Not Wave 1 |
| B12 | `MRI_SPINE` regression | **OPEN** | Eng | Test output | Blocks production |
| B13 | Phase 2D retirement | **DEFERRED** | Eng | 2D gate | Operational |
| B14 | XR-3b | **DEFERRED** | Product | Optional slice | Not Wave 1 |
| B15 | US MR defer | **DEFERRED** | Clinical | 2E.2D-b | Not Wave 1 |
| **W2-Wave1 workbook slice** | **CLOSED** | Eng | This W2.2 package | Unblocks **2E.4A** |

| State | Count |
|-------|------:|
| CLOSED | **4** |
| OPEN | **8** |
| DEFERRED | **6** |

**Gate W2 (full enterprise):** **OPEN**  
**Gate W2-Wave1 (design → 2E.4A staging):** **AUTHORIZED**

---

## 8. Part 8 — Can Phase 2E.4A begin?

### Answer: **YES**

**Justification:** All **37** Wave 1 rows are uniquely defined in the enterprise workbook with complete required classifier tuples, FR labels, billing deferral, and governance guards. W2.2 staging validation and rollback plans are complete. Remaining OPEN blockers affect **production** or **later waves**, not the start of staging implementation.

### Exact 2E.4A scope

| In scope | Out of scope |
|----------|--------------|
| Upsert **37** `CatalogImagingStudy` rows (`wave=1` manifest) | Waves 2–4 (**133** rows) |
| Classifier FK backfill for those 37 codes | 2D retirement execution |
| REQUIRED aliases + `XR_CHEST` tuple pass | W3 CPT activation |
| Set `ANATOMIC_SUBREGION_RIBS` on `XR_RIBS_LEFT` / `XR_RIBS_RIGHT` | Search redesign |
| Execute staging validation plan | Billing price changes |
| Rollback drill | |

### Blockers if answer were NO (none for staging start)

*Production-only blockers:* B2, B5–B8, B10, B12 — must close after 2E.4A staging, before production.

---

## 9. Sign-off

| Role | W2.2 design | 2E.4A staging | Production |
|------|:-----------:|:-------------:|:----------:|
| Engineering | ☐ | ☐ | ☐ |
| Clinical | ☐ | ☐ | ☐ |
| QA | ☐ | ☐ | ☐ |

---

*W2.2 final — no implementation.*
