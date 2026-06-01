# Imaging Taxonomy Workbook Readiness

**Phase:** 3D (audit + design only)  
**Question:** Is the enterprise imaging taxonomy workbook **sufficient** to proceed with Phase 3C-M1 implementation and Phase 2E enterprise expansion?

---

## 1. Readiness verdict

| Program | Workbook sufficient? | Verdict |
|---------|---------------------|---------|
| **Phase 3C-M1** (schema migration — 3 new FK columns) | **Yes** — migration is vocabulary-agnostic DDL | **SAFE TO IMPLEMENT 3C-M1** *(schema only; no seeds/backfill)* |
| **Phase 3C-S1/S2** (classifier vocabulary seed) | **Partially** — domain list defined; exact code manifest needs workbook-driven counts | **NOT SAFE** until starter vocabulary signed |
| **Phase 3C-B1** (44-row classifier backfill) | **No** — workbook not populated or signed | **NOT SAFE** |
| **Phase 2D** (duplicate retirement) | **No** — retirement pairs lack complete successor tuples + billing | **NOT SAFE** *(unchanged from Phase 2D audit)* |
| **Phase 2E** (enterprise catalog expansion) | **No** — 137 MISSING rows unmapped to canonical codes | **NOT SAFE** |

**Phase 3D overall:** **SAFE** for design completion; **NOT SAFE** for workbook-driven implementation until population + sign-off gates pass.

---

## 2. Readiness by dimension

### 2.1 Workbook schema readiness — **READY**

| Criterion | Status |
|-----------|--------|
| Required columns defined (16) | ✓ |
| Validation rules documented | ✓ |
| Repository mapping documented | ✓ |
| Coverage / billing / retirement enums defined | ✓ |
| Maintenance workflow defined | ✓ |
| Optional governance columns specified | ✓ |

**Deliverable:** `imaging-taxonomy-workbook-design.md` §2

### 2.2 Current catalog readiness (44 rows) — **NOT READY FOR BACKFILL**

| Criterion | Status | Blocker |
|-----------|--------|---------|
| Classifier tuple drafted | ✓ (design) | — |
| Clinical sign-off on tuples | ✗ | Required for 3C-B1 |
| Contrast semantics resolved (9 codes) | ✗ | MANUAL_REVIEW queue |
| Laterality policy for generic MSK XR | ✗ | EXPAND vs TUPLE decision |
| Retirement predecessor tuples aligned | ✗ | 5 pairs pending Phase 2D |
| Workbook CSV row per code | ✗ | Not materialized |

**Summary:** 44 rows are **architecturally mappable** but **operationally unsigned**.

### 2.3 Legacy mapping readiness (267 rows) — **NOT READY**

| Criterion | Status | Detail |
|-----------|--------|--------|
| Legacy inventory captured | ✓ | Phase 3A |
| Coverage tier assigned | ✓ | FULL 23 / PARTIAL 107 / MISSING 137 |
| Canonical code for FULL/PARTIAL | ✓ | In `legacy-vs-medora-coverage.md` |
| Classifier tuple per legacy row | ✗ | 0/267 |
| NEW canonical codes for MISSING | ✗ | ~100–150 estimated; not assigned |
| EXPAND vs TUPLE decisions | ✗ | 107 PARTIAL rows |
| Workbook artifact | ✗ | 0 rows in CSV |

**Summary:** Coverage **audit** complete; workbook **population** not started.

### 2.4 Localization readiness — **PARTIALLY READY**

| Criterion | Status |
|-----------|--------|
| EN/FR rules defined | ✓ |
| 44-row display name audit | ✓ — 0 mixed-language violations |
| Duplicate FR pairs identified | ✓ — 3 pairs flagged |
| FR labels for expansion rows | ✗ — 137 MISSING |
| Workbook localization validators | ✗ — not built |

**Verdict:** Safe for **current** 44-row UI; **not ready** for enterprise expansion labels.

### 2.5 Billing readiness — **NOT READY**

| Criterion | Status |
|-----------|--------|
| Billing Status taxonomy in workbook | ✓ |
| Example CPT inventory (20 codes) | ✓ — reference only |
| Licensed CPT source | ✗ |
| CPT conflict register | ✓ — 6 conflicts documented |
| 100% pending_license | ✓ — expected |
| Billing row per workbook entry | ✗ — not populated |

**Verdict:** Billing governance **designed**; billing activation **blocked** on licensed CPT + tuple sign-off.

### 2.6 Expansion readiness (Phase 2E) — **NOT READY**

| Gate | Status | Reference |
|------|--------|-----------|
| Phase 3C-M1 migration | Not applied | `imaging-taxonomy-migration-plan.md` |
| Classifier vocabulary (7 domains) | Not seeded | Phase 3C-S1/S2 |
| 44-row backfill complete | Not started | Phase 3C-B1 |
| Phase 2D retirements | Not complete | Phase 2D audit |
| Workbook 267-row population | Not started | This phase |
| NEW code manifest (~100–150) | Not assigned | Phase 3B hybrid estimate |
| NM / FL / MRA modality families | Not in seed | Phase 3C-S1 |
| Licensed CPT workbook | Not available | Phase 2E governance |

---

## 3. Implementation sufficiency analysis (Part 7)

### 3.1 Is the workbook design sufficient for 3C-M1?

**Yes.**

3C-M1 adds three nullable FK columns to `CatalogImagingStudy`. The migration:

- Does not require populated workbook rows
- Does not require seeded LATERALITY / ANATOMIC_SUBREGION / PROTOCOL values
- Is forward-only additive DDL per Phase 3C migration plan

**Condition:** 3C-M1 may proceed **independently** of workbook population. Workbook is required before **3C-B1 backfill**, not before **3C-M1 DDL**.

### 3.2 Is the workbook design sufficient for 2E enterprise expansion?

**No — design is sufficient; populated workbook is not.**

Phase 2E requires:

| Requirement | Workbook provides | Ready? |
|-------------|-------------------|--------|
| Stable canonical codes for ~100–150 new rows | Schema column `Canonical Code` | Design ✓; values ✗ |
| Classifier tuple per row | 7 classifier columns | Design ✓; values ✗ |
| Duplicate avoidance | Retirement + tuple collision rules | Design ✓; values ✗ |
| French display names | `Display Name FR` | Design ✓; 137 missing |
| Billing governance | `Billing Status` | Design ✓; not populated |
| Search aliases | Optional `Legacy Aliases` | Design ✓; not populated |
| Retirement sequencing | `Retirement Candidate` + `Successor Code` | Partial — 5/6 pairs |

**Minimum workbook completion for 2E planning:** FULL + PARTIAL rows (130) with tuples + MISSING rows (137) with proposed NEW codes and EXPAND/TUPLE decisions.

---

## 4. Blockers (ordered)

### P0 — Blocks 3C-B1 and any classifier-dependent work

| # | Blocker | Owner | Resolution |
|---|---------|-------|------------|
| B1 | Workbook not materialized (0 CSV rows) | Clinical + engineering | Export 44-row draft to CSV; clinical sign-off |
| B2 | Contrast semantics unresolved on 9 CT/MRI codes | Radiology | Workbook `Manual Review Required` clearance |
| B3 | Phase 3C-S1/S2 vocabulary not seeded | Engineering | Implement seed after manifest sign-off |
| B4 | `VIEW_COUNT_ONE`, `LATERALITY_UNSPECIFIED` not seeded | Engineering | Part of 3C-S1/S2 |

### P1 — Blocks 2D retirement and 2E expansion

| # | Blocker | Owner | Resolution |
|---|---------|-------|------------|
| B5 | Phase 2D retirement incomplete (5 pairs) | Engineering + clinical | Execute retirement after B1–B4 |
| B6 | `XR_ABDOMEN` ↔ `XR_ABD_AP` duplicate undecided | Clinical | Workbook row decision |
| B7 | 107 PARTIAL rows — EXPAND vs TUPLE policy | Clinical + product | Workbook `Catalog Action` column |
| B8 | 137 MISSING rows — NEW code assignment | Clinical + radiology | Workbook population batch |
| B9 | No licensed CPT source | Legal/billing | External; workbook stays `PENDING_CPT_REVIEW` |

### P2 — Blocks billing activation and search parity

| # | Blocker | Owner | Resolution |
|---|---------|-------|------------|
| B10 | ~180 legacy studies without alias mapping | Engineering | Workbook `Legacy Aliases` population |
| B11 | Workbook CSV linter / validator | Engineering | Phase 3E tooling |
| B12 | Production OrderItem retirement safety SQL | Ops | Pre-retirement verification |

---

## 5. Recommended implementation order

```
┌─────────────────────────────────────────────────────────────┐
│ 3D.1 — THIS PHASE (complete)                                │
│  Workbook schema + 44-row draft + gap/readiness docs        │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3D.2 — Workbook population (next; still design/governance)  │
│  Export imaging-taxonomy-workbook.csv                       │
│  44 rows: clinical sign-off on tuples                       │
│  267 rows: merge legacy-vs-medora-coverage.md               │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3C-M1 — Schema migration (can parallel 3D.2)                │
│  Add 3 FK columns — no data dependency                      │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3C-S1/S2 — Vocabulary seed                                  │
│  Driven by signed workbook classifier manifest               │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3C-B1 — 44-row backfill                                     │
│  Requires signed workbook + vocabulary seed                  │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2D — Duplicate retirement (5 + 1 pairs)                     │
│  Requires backfill + billing review                         │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2E — Enterprise catalog expansion                           │
│  Requires full workbook + EXPAND/TUPLE decisions            │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Exit gates

### Gate W1 — Workbook ready for 3C-B1

- [ ] `imaging-taxonomy-workbook.csv` exists with 44 active + 1 retired row
- [ ] All classifier columns filled with valid proposed codes
- [ ] `Manual Review Required = NO` on all active rows (or documented exceptions)
- [ ] Clinical sign-off recorded
- [ ] No duplicate active `Canonical Code`

### Gate W2 — Workbook ready for 2E planning

- [ ] 267 legacy rows populated
- [ ] All MISSING rows have proposed `Canonical Code`
- [ ] EXPAND vs TUPLE decided for 107 PARTIAL rows
- [ ] Tuple collision report clean
- [ ] FR labels authored for all NEW rows
- [ ] Billing Status assigned (may remain `PENDING_CPT_REVIEW`)

### Gate W3 — Workbook ready for billing activation

- [ ] Licensed CPT source available
- [ ] No unresolved `CPT_CONFLICT` without documented policy
- [ ] Retirement pairs have single active billing identity

---

## 7. Risk summary

| Risk | Level | Mitigation |
|------|-------|------------|
| Workbook schema drift from repo | Low | Single CSV + version header |
| Clinical disagreement on EXPAND vs TUPLE | **High** | Early radiology sign-off on MSK policy |
| Workbook population labor (267 rows) | **Medium** | Auto-draft from coverage doc + manual review |
| Premature 2E seed without workbook | **High** | Gate W2 enforcement |
| 3C-M1 without workbook | Low | DDL only; flags stay off |

---

## 8. Final SAFE / NOT SAFE matrix

| Action | Verdict |
|--------|---------|
| Phase 3D design audit | **SAFE** |
| Workbook schema adoption | **SAFE** |
| Materialize workbook CSV (governance activity) | **SAFE** |
| Phase 3C-M1 schema migration | **SAFE** *(independent of workbook population)* |
| Phase 3C-S1/S2 vocabulary seed | **NOT SAFE** until starter manifest signed |
| Phase 3C-B1 backfill | **NOT SAFE** until Gate W1 |
| Phase 2D duplicate retirement | **NOT SAFE** *(unchanged)* |
| Phase 2E catalog expansion | **NOT SAFE** until Gate W2 |
| Billing activation from workbook | **NOT SAFE** until Gate W3 |

---

## 9. Deliverables checklist (Phase 3D)

| Deliverable | Status |
|-------------|--------|
| `imaging-taxonomy-workbook-design.md` | ✓ Created |
| `imaging-taxonomy-workbook-gap-analysis.md` | ✓ Created |
| `imaging-taxonomy-workbook-readiness.md` | ✓ Created |
| `imaging-taxonomy-workbook.csv` | ✗ Out of scope (population = Phase 3D.2) |

---

*Phase 3D — audit + design only. No code, migrations, seeds, commits, or deployments.*
