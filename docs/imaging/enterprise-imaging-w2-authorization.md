# Enterprise Imaging W2 Authorization (Phase W2.1)

**Phase:** W2.1 — Gate W2 closure audit  
**Date:** 2026-06-01  
**Workbook:** [`enterprise-imaging-workbook.csv`](enterprise-imaging-workbook.csv) (**170** rows)  

---

## 1. Gate status

| Gate | Status |
|------|--------|
| **W1** (44-row classifier backfill) | **CLOSED** |
| **W2** (enterprise catalog expansion) | **OPEN** |
| **W2.1 workbook consolidation** | **COMPLETE** |

**Begin enterprise catalog implementation (production):** **NOT SAFE**  
**Begin Wave 1 implementation planning (staging design):** **YES** *(with conditions below)*  

---

## 2. Part 2 — Duplicate audit (workbook)

| Check | Result | Duplicates |
|-------|--------|----------:|
| Duplicate `catalogCode` | **PASS** | **0** |
| Duplicate `displayNameEn` | **PASS** | **0** |
| Duplicate `displayNameFr` | **PASS** | **0** |
| Duplicate alias targets (design) | **PASS** | **0** conflicts |
| Retirement: `CT_HEAD` reactivation | **PASS** | Not in workbook |
| Retirement: `CT_ABD` duplication | **PASS** | Not in workbook |
| Retirement: `DOPPLER_VEIN` recreation | **PASS** | Not in workbook |
| Successor violations | **PASS** | — |
| Orphan wave rows | **PASS** | All rows wave 1–4 |

**Total duplicate count:** **0**

---

## 3. Part 5 — Wave validation

| Wave | Rows | Batches | Orphans |
|------|-----:|---------|:-------:|
| **1** | **37** | XR-1, CT-1, MRI-1 | 0 |
| **2** | **61** | XR-2, CT-2, US-1 | 0 |
| **3** | **41** | MRI-2, MRA-1, US-2, US-3, FL-1, NM-1 | 0 |
| **4** | **31** | XR-3, CT-3 | 0 |
| **Total** | **170** | | **0** |

---

## 4. Part 6 — Gate W2 blocker re-evaluation

| ID | Blocker | State | Blocking reason | Required resolution | Implementation impact |
|----|---------|-------|-----------------|---------------------|------------------------|
| B1 | Enterprise workbook | **CLOSED** | Was empty | W2.1 CSV + MD | Unblocks staging planning |
| B2 | Per-wave clinical sign-off | **OPEN** | No signed wave manifests | Clinical approval per wave | Blocks production apply |
| B3 | French labels | **CLOSED** *(workbook)* | Missing FR | 170 FR in CSV; optional clinical polish | Staging can use draft FR |
| B4 | Pilot scope matrix | **OPEN** | MRA/FL/NM/CT-3 deferral unset | Product + clinical decision | May reduce live row count |
| B5 | Staging seed apply | **OPEN** | Not executed | Engineering wave seeds | Blocks production |
| B6 | Staging classifier backfill | **OPEN** | Not run on new rows | Backfill script per wave | Blocks production |
| B7 | Staging smoke tests | **OPEN** | No QA evidence | Order/modality tests | Blocks production |
| B8 | Alias package execution | **OPEN** | ~42 REQUIRED aliases not loaded | Alias seed per wave | UX risk if ignored |
| B9 | CPT / billing (W3) | **DEFERRED** | 170 `PENDING_CPT_REVIEW` | Licensed CPT workbook | Blocks charge capture only |
| B10 | Preflight on target DB | **OPEN** | Not run | Count + duplicate check | Blocks production apply |
| B11 | US tuple pass | **OPEN** | 15 protocols on existing codes | Classifier update + sign-off | Blocks US-1 production parity |
| B12 | `MRI_SPINE` B1B regression | **OPEN** | Not validated post-wave | Automated check Wave 1 | Blocks MRI-1 production |
| B13 | Phase 2D retirement | **DEFERRED** | Predecessors still active | Separate 2D gate | Operational confusion risk |
| B14 | XR-3b optional rows | **DEFERRED** | 33 rows not in workbook | Separate slice if needed | None for core 170 |
| B15 | US MANUAL_REVIEW (8 studies) | **DEFERRED** | Out of core workbook | 2E.2D-b future batch | None for core 170 |

### State counts

| State | Count |
|-------|------:|
| **CLOSED** | **3** (B1, B3 workbook, design package) |
| **OPEN** | **8** |
| **DEFERRED** | **4** |

---

## 5. Part 7 — Wave 1 implementation planning authorization

| Question | Answer |
|----------|--------|
| Can Wave 1 move to **implementation planning**? | **YES** |
| Can Wave 1 move to **production apply**? | **NO** |

### Justification (YES for planning)

1. **Workbook** contains all **37** Wave 1 codes with unique tuples and FR labels.  
2. **Duplicate audit** = 0.  
3. **Retirement guards** satisfied in design.  
4. **W1** classifier program complete on existing 44 rows.

### Conditions before staging apply

- [ ] Clinical review of Wave 1 FR labels (optional polish)  
- [ ] Engineering seed manifest from workbook slice (wave=1)  
- [ ] Preflight script defined  
- [ ] `MRI_SPINE` regression test plan documented  
- [ ] CT contrast rows cross-checked vs B1B policy  

### Conditions before production

- All **OPEN** blockers B2, B5–B8, B10–B12 resolved for Wave 1  
- **W2-Wave1** sign-off recorded  

---

## 6. SAFE / NOT SAFE matrix

| Scope | Verdict |
|-------|---------|
| W2.1 workbook consolidation | **SAFE** |
| Gate W2 closure (full) | **NOT SAFE** |
| Wave 1 implementation **planning** | **YES** |
| Wave 1 production apply | **NOT SAFE** |
| Full enterprise implementation | **NOT SAFE** |

---

## 7. Return summary

| Metric | Value |
|--------|------:|
| Total workbook rows | **170** |
| Expected catalog size (44 + 170) | **214** |
| Wave 1 / 2 / 3 / 4 | **37 / 61 / 41 / 31** |
| Duplicate count | **0** |
| Alias REQUIRED (est.) | **42** |
| FR READY | **170** |
| Gate W2 | **OPEN** |

---

## 8. Next steps (documentation only)

1. Clinical sign-off Wave 1 manifest (37 codes).  
2. Author engineering seed spec from CSV `wave=1`.  
3. Plan tuple pass (XR chest) parallel to Wave 1.  
4. Close **W2-Wave1** → authorize staging apply.  
5. Repeat per wave; close full Gate W2 when all authorized waves complete.

---

*W2.1 — no implementation.*
