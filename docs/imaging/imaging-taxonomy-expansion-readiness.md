# Imaging Taxonomy Expansion Readiness

**Phase:** 3D.2 (audit-only)  
**Inputs:** Workbook population audit; classifier catalog; Phase 3C migration/backfill plans

---

## 1. Executive verdict

| Program phase | Ready? | Verdict |
|---------------|--------|---------|
| **3C-M1** (schema DDL — 3 FK columns) | Yes | **SAFE** |
| **3C-S1/S2** (classifier vocabulary seed) | Partial | **NOT SAFE** until manifest clinical sign-off |
| **3C-B1** (44-row backfill) | No | **NOT SAFE** until Gate W1 |
| **2E** (enterprise catalog expansion) | No | **NOT SAFE** until Gate W2 |

**Phase 3D.2 population audit:** **SAFE** — authoritative mappings documented at audit level.

---

## 2. Readiness by implementation phase (Part 6)

### 2.1 Ready for 3C-M1? — **YES (SAFE)**

| Criterion | Status |
|-----------|--------|
| Target FK columns defined | ✓ 3 columns in schema design |
| Workbook dependency for DDL | **None** — additive nullable columns |
| Classifier vocabulary required for DDL | **No** |
| Breaking-change risk | Low |

**Action:** 3C-M1 may proceed independently of workbook CSV materialization.

### 2.2 Ready for 3C-S1/S2? — **NOT SAFE**

| Criterion | Status | Blocker |
|-----------|--------|---------|
| Domain list finalized | ✓ | — |
| Exact code manifest | ✓ | `imaging-taxonomy-classifier-catalog.md` — 141 imaging codes |
| Code counts for seed guard | ✓ | Manifest in classifier catalog §6 |
| Clinical sign-off on PROTOCOL/ANATOMIC_SUBREGION | ✗ | 40 + 36 codes unaudited by radiology |
| Workbook validates all codes used | ✗ | Population at audit level only |
| `MRV_CLASSIFIER_DOMAIN_COUNTS` update plan | ✓ | Documented |

**Blockers:** B-S1 clinical sign-off; B-S2 confirm no duplicate PROTOCOL semantics.

### 2.3 Ready for 3C-B1? — **NOT SAFE**

| Criterion | Status | Blocker |
|-----------|--------|---------|
| 44-row classifier tuple assigned | ✓ | Population doc §2 |
| 3C-M1 applied | ✗ | Not implemented |
| 3C-S1/S2 seeded | ✗ | Not implemented |
| Contrast manual review cleared (9 CT/MRI) | ✗ | 34/44 rows still MR=YES |
| Gate W1 (signed 44-row workbook) | ✗ | No CSV; no clinical sign-off |
| Retirement pairs frozen | ✗ | Phase 2D incomplete |

**Blockers:** Full Gate W1 from Phase 3D readiness doc.

### 2.4 Ready for 2E? — **NOT SAFE**

| Criterion | Status | Blocker |
|-----------|--------|---------|
| 267 legacy rows mapped | ✓ | Coverage + disposition in population doc |
| Net-new code estimate | ✓ | 62–97 codes |
| NEW code manifest (named codes) | Partial | MISSING clusters proposed; not fully named |
| EXPAND vs TUPLE decided | Partial | 107 PARTIAL dispositions assigned |
| 10 MANUAL_REVIEW PARTIAL cleared | ✗ | XR abdomen, ribs+CXR, CTA recon |
| FR labels for new rows | ✗ | 137 MISSING + ~76 EXPAND |
| Licensed CPT | ✗ | 100% pending_license |
| Phase 2D retirements | ✗ | 5 pairs pending |
| Target catalog size validated | ✓ | 105–140 active rows |

**Blockers:** Gate W2; Phase 2D; licensed CPT; localization authoring.

---

## 3. Key counts (audit rollup)

### 3.1 Classifier counts

| Domain | Proposed total |
|--------|---------------:|
| MODALITY | 8 |
| BODY_REGION | 42 |
| VIEW_COUNT | 6 |
| CONTRAST_TYPE | 5 |
| LATERALITY | 4 |
| ANATOMIC_SUBREGION | 36 |
| PROTOCOL | 40 |
| **Imaging total** | **141** |

### 3.2 Expansion counts

| Metric | Count |
|--------|------:|
| Current catalog rows | 44 |
| Current active rows | 43 |
| Legacy studies | 267 |
| FULL → existing code | 23 |
| PARTIAL → existing + disposition | 107 |
| MISSING → new code | 137 |
| PARTIAL EXPAND (new codes) | 76 legacy rows → ~18–28 codes |
| MISSING clusters | 137 legacy rows → ~72–86 codes |
| **Net-new canonical codes (estimate)** | **62–97** |
| **Target active catalog post-2E** | **105–140** |
| Planned retirements | 5 predecessors |

### 3.3 Manual review counts

| Queue | Count |
|-------|------:|
| 44-row catalog MR=YES | 34 |
| PARTIAL MANUAL_REVIEW disposition | 10 |
| MISSING (CPT + localization) | 137 |
| **Governance queue (deduped estimate)** | **~145** |

### 3.4 PARTIAL disposition counts

| Disposition | Count |
|-------------|------:|
| EXPAND | 76 |
| TUPLE_VARIANT | 19 |
| ALIAS | 2 |
| MANUAL_REVIEW | 10 |

---

## 4. Gate status

### Gate W1 — Workbook ready for 3C-B1

| Check | Status |
|-------|--------|
| 44-row tuple in population doc | ✓ |
| CSV artifact | ✗ |
| Clinical sign-off | ✗ |
| MR=YES cleared | ✗ (34 remain) |
| 3C-M1 + S1/S2 complete | ✗ |

**W1 status:** **NOT MET**

### Gate W2 — Workbook ready for 2E planning

| Check | Status |
|-------|--------|
| 267 legacy rows disposition assigned | ✓ |
| Net-new code estimate | ✓ |
| All NEW codes named | ✗ |
| FR labels for NEW rows | ✗ |
| MANUAL_REVIEW partials cleared | ✗ |
| Tuple collision report | ✗ (not automated) |

**W2 status:** **NOT MET**

### Gate W3 — Billing activation

| Check | Status |
|-------|--------|
| Licensed CPT source | ✗ |
| CPT conflicts resolved | ✗ (6 documented) |

**W3 status:** **NOT MET**

---

## 5. Blockers (priority order)

| # | Blocker | Blocks |
|---|---------|--------|
| 1 | 34/44 catalog rows still MR=YES (contrast + MSK policy) | 3C-B1 |
| 2 | No clinical sign-off on 141-classifier manifest | 3C-S1/S2 |
| 3 | 10 PARTIAL MANUAL_REVIEW studies undecided | 2E planning |
| 4 | Phase 2D retirement incomplete (5 pairs) | 2E, 3C-B1 |
| 5 | 137 MISSING rows — FR labels not authored | 2E seed |
| 6 | Licensed CPT unavailable | Billing activation |
| 7 | Workbook CSV not materialized | Governance workflow |

---

## 6. Recommended sequence (updated post-3D.2)

```
3D.2 population audit (THIS PHASE) ✓
        ↓
Clinical sign-off: 44-row tuple + classifier manifest (141 codes)
        ↓
3C-M1 migration (parallel OK)
        ↓
3C-S1/S2 seed (141 imaging classifiers)
        ↓
Clear MR queue on 44 rows (contrast + XR abdomen decision)
        ↓
3C-B1 backfill (Gate W1)
        ↓
Phase 2D retirement (5 pairs)
        ↓
Resolve 10 PARTIAL MANUAL_REVIEW + name 62–97 NEW codes
        ↓
Gate W2 → Phase 2E family batches (XR → US → CT → MRI → Advanced)
```

---

## 7. Risk summary

| Risk | Level | Mitigation |
|------|-------|------------|
| Classifier sprawl (141 codes) | Medium | Domain count guards; seed manifest |
| EXPAND policy inflates catalog beyond 140 rows | Medium | Hybrid tuple strategy; cluster side variants |
| Premature 2E without 2D | **High** | Enforce gate order |
| Workbook drift from docs | Medium | Export CSV from population doc |
| 3C-M1 without vocabulary | Low | FKs nullable; flags off |

---

## 8. SAFE / NOT SAFE matrix

| Action | Verdict |
|--------|---------|
| Phase 3D.2 population audit | **SAFE** |
| Adopt classifier manifest (141 codes) as design baseline | **SAFE** |
| Adopt expansion estimate (62–97 new codes) | **SAFE** |
| Materialize workbook CSV from population doc | **SAFE** (governance) |
| **3C-M1** schema migration | **SAFE** |
| **3C-S1/S2** vocabulary seed | **NOT SAFE** until clinical sign-off |
| **3C-B1** backfill | **NOT SAFE** until Gate W1 |
| **2D** duplicate retirement | **NOT SAFE** (unchanged) |
| **2E** enterprise expansion | **NOT SAFE** until Gate W2 |
| Billing activation | **NOT SAFE** until Gate W3 |

---

## 9. Deliverables checklist (Phase 3D.2)

| Deliverable | Status |
|-------------|--------|
| `imaging-taxonomy-workbook-population.md` | ✓ |
| `imaging-taxonomy-classifier-catalog.md` | ✓ |
| `imaging-taxonomy-expansion-readiness.md` | ✓ |
| `imaging-taxonomy-workbook.csv` | ✗ Out of scope (Phase 3D.3 governance export) |

---

*Phase 3D.2 — audit only. No implementation.*
