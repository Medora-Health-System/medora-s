# Imaging Classifier Backfill Readiness (3C-B1)

**Phase:** 3C-B1 through W1.2 (audit + implementation; apply not executed)  
**Execution:** Not executed on production  
**Scope:** 44 existing `CatalogImagingStudy` rows only  
**Contrast closure:** `imaging-contrast-manual-review-closure.md` (3C-B1A); `imaging-contrast-final-ratification.md` (3C-B1B)  
**Gate W1:** **CLOSED** — `imaging-gate-w1-closure-record.md` (W1.2)  
**Production authorization:** `imaging-b1-production-authorization.md` (W1.2)  
**Dry-run:** `imaging-classifier-backfill-dry-run-validation.md` (3C-B1E)

---

## 1. Preconditions check

| Prerequisite | Status |
|---|---|
| 3C-M1 schema deployed | ✅ complete (stated) |
| 3C-S1 seeds deployed | ✅ complete (stated) |
| 3C-S2 seeds deployed | ✅ complete (stated) |
| Production domain counts verified | ✅ complete (stated) |
| Governance (S1–S6) ready | ✅ complete (stated) |

---

## 2. 44-row mapping summary

| Metric | Count |
|---|---:|
| Total rows | 44 |
| Active rows | 43 |
| Inactive rows | 1 (`CT_HEAD`) |
| Total classifier slots | 308 |
| APPLY | 199 |
| MANUAL_REVIEW | 4 |
| NOT_APPLICABLE | 105 |
| DEFER | 0 |

### By classifier field

| Field | APPLY | MANUAL_REVIEW | NOT_APPLICABLE | DEFER |
|---|---:|---:|---:|---:|
| `modalityClassifierId` | 44 | 0 | 0 | 0 |
| `bodyRegionClassifierId` | 44 | 0 | 0 | 0 |
| `contrastTypeClassifierId` | 40 | 4 | 0 | 0 |
| `viewCountClassifierId` | 17 | 0 | 27 | 0 |
| `lateralityClassifierId` | 44 | 0 | 0 | 0 |
| `anatomicSubregionClassifierId` | 2 | 0 | 42 | 0 |
| `protocolClassifierId` | 8 | 0 | 36 | 0 |

*Note: `CTA_HEAD_NECK` and `CTA_ABDOMEN_PELVIS` show protocol “MANUAL_REVIEW” in the matrix narrative (leave null); slot rollup counts them under NOT_APPLICABLE (36), not MANUAL_REVIEW.*

---

## 3. Remaining blockers

### Blocking (must resolve before production apply)

1. **Target DB preflight** — M1 columns, 141 imaging classifiers, Haiti 44 row scope, dry-run counts (see `imaging-b1-production-authorization.md` §3)  
2. **Operational window** — `TERMINOLOGY_BACKFILL_ENABLED=true`, rollback owner confirmed  

### Resolved (governance + technical)

- **Gate W1 — CLOSED** (W1.2) — workbook CSV, MR reconciliation, Medora attestation  
- **3C-B1 production apply — AUTHORIZED** (preflight required)  

### Resolved (technical)

- **3C-B1D** — 7-field backfill implementation complete
- **3C-B1E** — dry-run validation SAFE (199/4/105/308; idempotent)
- **Contrast governance** — CLOSED (3C-B1A + 3C-B1B)
- **FK backfill row blockers** — **0** active rows block mapping-44 auto-apply (workbook `MR=YES` ≠ field-level block)

### Non-blocking governance traceability

1. XR abdomen view policy (`XR_ABDOMEN` → `VIEW_COUNT_UNSPECIFIED`) — resolved in mapping-44  
2. CTA protocol null on `CTA_HEAD_NECK`, `CTA_ABDOMEN_PELVIS` — by design  
3. Duplicate predecessor notes (`US_ABD`, `DOPPLER_VEIN`, `CT_ABD`, `CT_CHEST_CTA`, `CT_HEAD`) — 2D retirement scope  

---

## 4. Implementation recommendation

**Recommended:** Extend existing `apps/api/prisma/scripts/backfill-catalog-classifiers.ts` (Option A).

Rationale:
- Already feature-flag gated.
- Already writes field-level audit rows.
- Already has idempotent planning logic.
- Lowest architectural risk for clinic MVP.

---

## 5. Safety decision

| Decision point | Verdict |
|---|---|
| 3C-B1 implementation package design | **SAFE** |
| 3C-B1 contrast governance (B1A + B1B) | **CLOSED** |
| Gate W1 (formal closure) | **CLOSED** (W1.2) |
| 3C-B1 dry-run (staging / simulation) | **SAFE** |
| 3C-B1 production execution | **AUTHORIZED** — **NOT SAFE** until target DB preflight passes |

**Why NOT SAFE without preflight:** Wrong-environment apply (missing M1/S1/S2) or extra catalog rows beyond Haiti 44.

---

## 6. Runbook-level go/no-go checklist (future apply)

- [x] 7-field backfill implementation complete (3C-B1D)
- [x] Dry-run executed and counts match mapping-44 (3C-B1E)
- [x] Contrast manual-review queue adjudicated (3C-B1A + 3C-B1B)
- [x] Gate W1 workbook CSV + clinical sign-off complete (W1.1 + W1.2)
- [x] Gate W1 closure recorded (`imaging-gate-w1-closure-record.md`)
- [ ] Target DB preflight passed
- [ ] Feature flag enablement approved for apply window
- [ ] Rollback runbook and owner confirmed (`imaging-b1-production-authorization.md` §7)

---

*Audit/design only. No code changes outside docs, no DB writes, no execution.*
