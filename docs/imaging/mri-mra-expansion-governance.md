# MRI / MRA Expansion Governance (Phase 2E.2C)

**Phase:** 2E.2C — audit + design only  
**Date:** 2026-06-01  
**Prerequisites:** 2E.1–2E.2B complete; Gate W1 closed; 3C-B1/B1B contrast governance closed  

**Authority:** `legacy-vs-medora-coverage.md`, `imaging-contrast-final-ratification.md`, `imaging-taxonomy-governance-appendix.md`, ICM-1.0  

---

## 1. Executive summary

| Family | Legacy studies | New catalog rows | Absorbed (no new row) |
|--------|---------------:|-----------------:|----------------------:|
| **MRI** | 27 | **25** | **2** |
| **MRA** | 5 | **5** | **0** |
| **Total** | **32** | **30** | **2** |

**Existing catalog:** `MRI_BRAIN`, `MRI_SPINE` (B1B intentional null contrast on `MRI_SPINE`). **No MRA rows today.**

---

## 2. Part 1 — MRI / MRA inventory

### 2.1 MRI summary (27 legacy studies)

| Category | Count | New row? |
|----------|------:|:--------:|
| **EXISTS_IN_MEDORA** | 1 | No |
| **PARTIAL_MATCH** | 12 | **11 yes**, **1 no** (tuple) |
| **MISSING** | 14 | **Yes** |
| **ALIAS** | 0 | No *(wo phase of w&wo covered under PARTIAL)* |
| **SUCCESSOR** | 0 | — |
| **MANUAL_REVIEW** | 0 | No *(resolved in design)* |
| **Total** | **27** | **25** |

| Phase 3A tier | Count |
|---------------|------:|
| FULL | 1 |
| PARTIAL | 12 |
| MISSING | 14 |

**PARTIAL_MATCH breakdown (12):**

| Sub-disposition | Count | Outcome |
|-----------------|------:|---------|
| Contrast EXPAND (brain + spine) | 11 | New catalog codes |
| Protocol TUPLE (limited exam) | 1 | `MRI_BRAIN` + alias/protocol — no new code |

### 2.2 MRA summary (5 legacy studies)

| Category | Count | New row? |
|----------|------:|:--------:|
| **EXISTS_IN_MEDORA** | 0 | — |
| **PARTIAL_MATCH** | 0 | — |
| **MISSING** | 5 | **Yes** |
| **ALIAS** | 0 | — |
| **SUCCESSOR** | 0 | — |
| **MANUAL_REVIEW** | 0 | — |
| **KEEP DISTINCT** *(MRA strategy)* | 5 | **Yes** |
| **Total** | **5** | **5** |

| Phase 3A tier | Count |
|---------------|------:|
| FULL | 0 |
| PARTIAL | 0 |
| MISSING | 5 |

### 2.3 MRI — full legacy register

| # | Legacy study | Phase 3A | 2E.2C disposition | Medora / proposed code |
|---|--------------|----------|-------------------|-------------------------|
| 1 | MRI C-Spine w Contrast | PARTIAL | PARTIAL_MATCH → EXPAND | `MRI_CSPINE_W_CONTRAST` |
| 2 | MRI C-Spine wo Contrast | PARTIAL | PARTIAL_MATCH → EXPAND | `MRI_CSPINE_WO_CONTRAST` |
| 3 | MRI C-Spine w&wo Contrast | PARTIAL | PARTIAL_MATCH → EXPAND | `MRI_CSPINE_W_WO_CONTRAST` |
| 4 | MRI Cholangiogram | MISSING | MISSING | `MRI_CHOLANGIOGRAM` |
| 5 | MRI Head w Contrast | PARTIAL | PARTIAL_MATCH → EXPAND | `MRI_BRAIN_W_CONTRAST` |
| 6 | MRI Head wo Contrast | FULL | **EXISTS_IN_MEDORA** | `MRI_BRAIN` |
| 7 | MRI Head w&wo Contrast | PARTIAL | PARTIAL_MATCH → EXPAND | `MRI_BRAIN_W_WO_CONTRAST` *(wo → `MRI_BRAIN`)* |
| 8 | MRI Head/Brain Limited | PARTIAL | PARTIAL_MATCH → TUPLE | `MRI_BRAIN` *(no new row)* |
| 9 | MRI Hip Bilateral wo Contrast | MISSING | MISSING | `MRI_HIP_BILATERAL_WO_CONTRAST` |
| 10 | MRI Hip Left wo Contrast | MISSING | MISSING | `MRI_HIP_LEFT_WO_CONTRAST` |
| 11 | MRI Hip Right wo Contrast | MISSING | MISSING | `MRI_HIP_RIGHT_WO_CONTRAST` |
| 12 | MRI Knee Left | MISSING | MISSING | `MRI_KNEE_LEFT` |
| 13 | MRI Knee Right | MISSING | MISSING | `MRI_KNEE_RIGHT` |
| 14 | MRI L-Spine w Contrast | PARTIAL | PARTIAL_MATCH → EXPAND | `MRI_LSPINE_W_CONTRAST` |
| 15 | MRI L-Spine wo Contrast | PARTIAL | PARTIAL_MATCH → EXPAND | `MRI_LSPINE_WO_CONTRAST` |
| 16 | MRI L-Spine w&wo Contrast | PARTIAL | PARTIAL_MATCH → EXPAND | `MRI_LSPINE_W_WO_CONTRAST` |
| 17 | MRI Lower Extremity Left w&wo Contrast | MISSING | MISSING | `MRI_LOWER_EXTREMITY_LEFT_W_WO_CONTRAST` |
| 18 | MRI Lower Extremity Right w&wo Contrast | MISSING | MISSING | `MRI_LOWER_EXTREMITY_RIGHT_W_WO_CONTRAST` |
| 19 | MRI Pelvis | MISSING | MISSING | `MRI_PELVIS` |
| 20 | MRI Pelvis Limited | MISSING | MISSING | `MRI_PELVIS_LIMITED` |
| 21 | MRI Sella | MISSING | MISSING | `MRI_SELLA` |
| 22 | MRI T-Spine w Contrast | PARTIAL | PARTIAL_MATCH → EXPAND | `MRI_TSPINE_W_CONTRAST` |
| 23 | MRI T-Spine wo Contrast | PARTIAL | PARTIAL_MATCH → EXPAND | `MRI_TSPINE_WO_CONTRAST` |
| 24 | MRI T-Spine w&wo Contrast | PARTIAL | PARTIAL_MATCH → EXPAND | `MRI_TSPINE_W_WO_CONTRAST` |
| 25 | MRI Upper Extremity Left wo Contrast | MISSING | MISSING | `MRI_UPPER_EXTREMITY_LEFT_WO_CONTRAST` |
| 26 | MRI Upper Extremity Right wo Contrast | MISSING | MISSING | `MRI_UPPER_EXTREMITY_RIGHT_WO_CONTRAST` |
| 27 | MRI Upper Extremity Right w&wo Contrast | MISSING | MISSING | `MRI_UPPER_EXTREMITY_RIGHT_W_WO_CONTRAST` |

### 2.4 MRA — full legacy register

| # | Legacy study | Phase 3A | 2E.2C disposition | Proposed code |
|---|--------------|----------|-------------------|---------------|
| 1 | MRA Brain | MISSING | MISSING → **KEEP DISTINCT** | `MRA_BRAIN` |
| 2 | MRA Carotid w Contrast | MISSING | MISSING → **KEEP DISTINCT** | `MRA_CAROTID_W_CONTRAST` |
| 3 | MRA Carotid wo Contrast | MISSING | MISSING → **KEEP DISTINCT** | `MRA_CAROTID_WO_CONTRAST` |
| 4 | MRA Lower Extremity Left w Contrast | MISSING | MISSING → **KEEP DISTINCT** | `MRA_LE_LEFT_W_CONTRAST` |
| 5 | MRA Lower Extremity Right w Contrast | MISSING | MISSING → **KEEP DISTINCT** | `MRA_LE_RIGHT_W_CONTRAST` |

---

## 3. Part 3 — MRA governance strategy

### 3.1 Per-study disposition

| Legacy study | Disposition | Rationale |
|--------------|-------------|-----------|
| MRA Brain | **KEEP DISTINCT** | `MODALITY_MRA` ≠ `MODALITY_MRI`; not absorbable by `MRI_BRAIN` |
| MRA Carotid w Contrast | **KEEP DISTINCT** | Vascular MR angiography; distinct from `CTA_HEAD_NECK` |
| MRA Carotid wo Contrast | **KEEP DISTINCT** | Contrast phase split |
| MRA Lower Extremity Left w Contrast | **KEEP DISTINCT** | No MRI LE angiographic equivalent |
| MRA Lower Extremity Right w Contrast | **KEEP DISTINCT** | Symmetric LE orderable |

**No ALIAS or SUCCESSOR** for any MRA study.

### 3.2 Can MRA be absorbed by existing MRI rows?

| Candidate absorption | Verdict |
|--------------------|---------|
| MRA Brain → `MRI_BRAIN` | **REJECT** — modality taxonomy requires `MODALITY_MRA` |
| MRA Carotid → `MRI` head/neck | **REJECT** — use `MRA_CAROTID_*` |
| MRA LE → `MRI_LOWER_EXTREMITY_*` | **REJECT** — angiographic technique ≠ structural MRI |

**Final:** **0** MRA studies absorbed; **5** new rows.

### 3.3 ICM-1.0 / CTA appendix / retirement

| Check | Result |
|-------|--------|
| `MODALITY_MRA` in seed manifest | **PASS** |
| Distinct from `MODALITY_CTA` / `MODALITY_MRI` | **PASS** |
| MR-M3 CTA rules | **N/A** — MRA not CTA; no COW alias bleed |
| Retirement / successor (Haiti 44) | **PASS** — no MRA predecessors |
| Overlap `CTA_HEAD_NECK` | **PASS** — different modality classifier on orders |

---

## 4. Part 4 — Contrast governance

### 4.1 Allowed ICM contrast classifiers (no new policies)

| Allowed code | Legacy pattern | New rows |
|--------------|----------------|--------:|
| `CONTRAST_TYPE_WITHOUT` | wo Contrast | 17 |
| `CONTRAST_TYPE_WITH` | w Contrast | 9 |
| `CONTRAST_TYPE_WITH_AND_WITHOUT` | w&wo Contrast | 4 |
| **Intentional null FK** *(B1B “UNSPECIFIED”)* | Not classifiable as single phase | **1 existing only** |

**Note on `CONTRAST_TYPE_UNSPECIFIED`:** ICM-1.0 **forbids** seeding `CONTRAST_TYPE_UNSPECIFIED` as a classifier code. The only approved **UNSPECIFIED** state is **intentional null** `contrastTypeClassifierId` on existing `MRI_SPINE` per **B1B-RAT-MRI-SPINE-001**. **No new row** may use null unless a future governance amendment ratifies it.

### 4.2 Contrast counts (30 new rows + 1 existing)

| Category | MRI new | MRA new | Existing `MRI_SPINE` |
|----------|--------:|--------:|---------------------:|
| `CONTRAST_TYPE_WITHOUT` | 16 | 2 | — |
| `CONTRAST_TYPE_WITH` | 5 | 3 | — |
| `CONTRAST_TYPE_WITH_AND_WITHOUT` | 4 | 0 | — |
| Intentional null (UNSPECIFIED) | 0 | 0 | **1** |

### 4.3 Manual governance review (contrast / catalog)

| Item | Issue | Design resolution | Blocks apply? |
|------|-------|-------------------|:-------------:|
| `MRI_SPINE` generic | B1B intentional null | **No change** | No |
| `MRI_KNEE_LEFT` / `MRI_KNEE_RIGHT` | No contrast in legacy name | Default **WITHOUT**; Gate W2 clinical ack | No |
| `MRI_PELVIS` vs `MRI_PELVIS_LIMITED` | Limited = separate orderable? | **Two rows** (enterprise faithful) | No |
| `MRI Head/Brain Limited` | Limited vs full brain | **TUPLE** on `MRI_BRAIN` | No |
| `MRA` pilot scope | Haiti may not run MRA | Optional **defer MRA-1** batch | Scope only |

**Manual-review count (legacy studies):** **0** blocking · **4** Gate W2 acknowledgements

---

## 5. Part 5 — Duplicate / retirement safety

### 5.1 Verification checklist

| Check | Result |
|-------|--------|
| No duplicate MRI codes | **PASS** — 25 unique |
| No duplicate MRA codes | **PASS** — 5 unique |
| No retirement conflicts | **PASS** |
| No successor violations | **PASS** |
| No alias conflicts | **PASS** |
| No overlap violating `MRI_BRAIN` wo | **PASS** |
| No overlap violating `MRI_SPINE` null | **PASS** |

### 5.2 Duplicate-risk matrix

| ID | Risk | Severity | `MRI_BRAIN` | `MRI_SPINE` | Mitigation |
|----|------|----------|:-----------:|:-----------:|------------|
| D1 | New `MRI_BRAIN_W_*` vs existing `MRI_BRAIN` | Low | **Related** | — | wo remains on `MRI_BRAIN` only |
| D2 | Regional spine codes vs generic `MRI_SPINE` | Medium | — | **Related** | Do not backfill contrast on `MRI_SPINE` |
| D3 | `MRI_SELLA` vs `MRI_BRAIN` (both head) | Low | **Related** | — | Subregion `ANATOMIC_SUBREGION_SELLA` |
| D4 | `MRA_BRAIN` vs `MRI_BRAIN` | Low | **Related** | — | `MODALITY_MRA` vs `MODALITY_MRI` |
| D5 | `MRA_CAROTID_*` vs `CTA_HEAD_NECK` | Medium | — | — | Modality + protocol separation |
| D6 | Duplicate legacy strings on aliases | Low | — | — | Alias table QA per batch |
| D7 | `MRI_PELVIS` vs `MRI_PELVIS_LIMITED` | Low | — | — | Distinct codes + billing review |

### 5.3 Existing row protection

| Code | Protection rule |
|------|-----------------|
| `MRI_BRAIN` | Do not retire; wo contrast remains here; w/w&wo on new codes |
| `MRI_SPINE` | **Do not** set `contrastTypeClassifierId` in 2E.2C; B1B null preserved |

---

## 6. Part 7 — Implementation readiness

| Gate | Status |
|------|--------|
| Gate W1 | **CLOSED** |
| Gate W2 (MRI/MRA slice) | **OPEN** |
| 3C-B1 / B1B contrast | **CLOSED** |
| CTA governance appendix | **N/A** (MRA separate) |
| French labels (30 rows) | **NOT READY** |
| Licensed CPT | **NOT READY** |

| Scope | Verdict |
|-------|---------|
| **2E.2C design** | **SAFE** |
| **2E.2C implementation** | **NOT SAFE** |

### Blockers (complete list)

1. Gate W2 workbook CSV slice + batch clinical sign-off  
2. French `displayNameFr` for 30 new rows  
3. Staging catalog seed (30 rows) + classifier FK backfill  
4. Billing review (`PENDING_CPT_REVIEW` all new rows)  
5. Haiti pilot scope decision on **MRA-1** and optional MRI-2 deferrals  
6. Gate W2 acknowledgement: knee contrast default WITHOUT  
7. Search alias authoring (out of scope for design apply — required before production UX)  

---

## 7. Cross-references

| Document | Role |
|----------|------|
| `mri-mra-expansion-candidate-list.md` | Matrix + core/advanced/protocol tags |
| `mri-mra-expansion-batch-plan.md` | Batches + complexity |

---

*Audit only — no implementation.*
