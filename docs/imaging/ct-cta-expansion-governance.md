# CT / CTA Expansion Governance (Phase 2E.2B)

**Phase:** 2E.2B — audit + design only  
**Date:** 2026-06-01  
**Prerequisites:** 2E.1 complete; 2E.2A complete; Gate W1 closed; 3C-B1 contrast governance closed  

**Authority:** `legacy-vs-medora-coverage.md`, `imaging-contrast-final-ratification.md`, `imaging-taxonomy-governance-appendix.md` (MR-M3), ICM-1.0  

---

## 1. Executive summary

| Family | Legacy studies | New catalog rows (design) | No new row |
|--------|---------------:|--------------------------:|-----------:|
| **CT** | 43 | **31** | 12 |
| **CTA** | 12 | **4** | 8 |
| **Total** | **55** | **35** | 20 |

---

## 2. Part 1 — CT / CTA inventory (55 legacy studies)

### 2.1 CT classification (43)

| 2E.2B disposition | Count | New row? |
|-------------------|------:|:--------:|
| **EXISTS_IN_MEDORA** (FULL) | 5 | No |
| **SUCCESSOR** | 4 | No |
| **ALIAS** | 3 | No |
| **TUPLE** | 2 | No |
| **MANUAL_REVIEW** | 1 | No *(protocol on existing)* |
| **EXPAND** (contrast / pelvis split) | 7 | **Yes** |
| **MISSING** | 25 | **Yes** |
| **Total** | **43** | **31** *(7+24)* |

*Note: Legacy “CT Abdomen *” (3) → **SUCCESSOR/ALIAS** to `CT_ABDOMEN_PELVIS` contrast family — **no** `CT_ABD` expansion. “CT Angiogram Abdomen” → **TUPLE** to `CTA_ABDOMEN_PELVIS` (not a CT row).*

| Phase 3A tier | CT count |
|-------------|--------:|
| FULL | 5 |
| PARTIAL | 16 |
| MISSING | 25 |

### 2.2 CTA classification (12)

| 2E.2B disposition | Count | New row? |
|-------------------|------:|:--------:|
| **EXISTS_IN_MEDORA** (FULL) | 3 | No |
| **ALIAS** | 4 | No |
| **MANUAL_REVIEW** | 4 | No *(protocol/alias resolution)* |
| **MISSING** | 4 | **Yes** |
| **EXPAND** | 0 | — |
| **Total** | **12** | **4** |

| Phase 3A tier | CTA count |
|---------------|--------:|
| FULL | 3 |
| PARTIAL | 5 |
| MISSING | 4 |

### 2.3 EXISTS_IN_MEDORA (8)

| Legacy study | Medora code |
|--------------|-------------|
| CT C-Spine wo IV Contrast | `CT_CERVICAL_SPINE` |
| CT Chest wo IV Contrast | `CT_CHEST` |
| CT Head wo IV Contrast | `CT_HEAD_WO_CONTRAST` |
| CT Head w&wo IV Contrast | `CT_HEAD_WO_CONTRAST` *(wo phase)* |
| CT L-Spine wo IV Contrast | `CT_SPINE_LUMBAR` |
| CTA Chest w Reconstruction | `CTA_CHEST` |
| CTA Chest Triple Rule Out | `CTA_CHEST` |
| CTA Head and Neck | `CTA_HEAD_NECK` |

### 2.4 SUCCESSOR (4) — no new row

| Legacy study | Successor / target | Rule |
|--------------|-------------------|------|
| CT Head wo IV Contrast | `CT_HEAD_WO_CONTRAST` | **Not** `CT_HEAD` (retired) |
| CT Abdomen w / wo / w&wo IV Contrast | `CT_ABDOMEN_PELVIS` contrast EXPAND codes | **Not** `CT_ABD` |
| CT Angiogram Abdomen | `CTA_ABDOMEN_PELVIS` | Modality = CTA, not CT |
| *(predecessor)* `CT_CHEST_CTA` | `CTA_CHEST` | Do not recreate |

### 2.5 ALIAS (7) — no new row

| Legacy study | Target |
|--------------|--------|
| CT Head w&wo IV Contrast | `CT_HEAD_WO_CONTRAST` *(wo leg)* |
| CTA Head | `CTA_HEAD_NECK` |
| CTA COW / Carotids w Reconstructions | `CTA_HEAD_NECK` + carotid protocol tokens |
| CTA Head Circle of Willis w Reconstructions | `CTA_HEAD_NECK` *(COW → alias per MR-M3)* |
| CTA Chest w Reconstruction | `CTA_CHEST` *(recon = technique alias)* |

### 2.6 TUPLE (2) — no new row

| Legacy study | Target | Protocol / classifier |
|--------------|--------|----------------------|
| CT Angiogram Abdomen | `CTA_ABDOMEN_PELVIS` | `MODALITY_CTA`, angiographic contrast |
| CT Abdomen/Pelvis wo IV Contrast | `CT_ABDOMEN_PELVIS` | `CONTRAST_TYPE_WITHOUT` *(post–contrast EXPAND)* |

### 2.7 MANUAL_REVIEW (5) — resolved without new row (design)

| Legacy study | Resolution |
|--------------|------------|
| CT Chest HR | **TUPLE** — `CT_CHEST` + `PROTOCOL_CT_CHEST_HR` |
| CTA Abdominal Aorta w Reconstructions | **TUPLE** — `CTA_ABDOMEN_PELVIS` + `PROTOCOL_CTA_ABDOMINAL_AORTA` |
| CTA Abdominal Aorta w Runoff | **TUPLE** — `CTA_ABDOMEN_PELVIS` + `PROTOCOL_CTA_ABDOMINAL_AORTA_RUNOFF` |
| CTA COW / Carotids w Reconstructions | **ALIAS** → `CTA_HEAD_NECK` |
| CTA Head Circle of Willis w Reconstructions | **ALIAS** → `CTA_HEAD_NECK` |

---

## 3. Part 3 — Contrast governance (ICM-1.0 only)

**Forbidden:** `CONTRAST_TYPE_UNSPECIFIED`, new contrast policies, oral contrast classifiers not in ICM-1.0.

### 3.1 Legacy label → ICM mapping (design vocabulary)

| Design label | ICM-1.0 classifier | Used for 2E.2B new rows |
|--------------|-------------------|-------------------------|
| **CONTRAST_IV** | `CONTRAST_TYPE_WITH` | w IV Contrast |
| **CONTRAST_IV_ORAL** *(w&wo)* | `CONTRAST_TYPE_WITH_AND_WITHOUT` | w&wo IV Contrast |
| **CONTRAST_NONE** *(non-contrast CT)* | `CONTRAST_TYPE_WITHOUT` | wo IV Contrast |
| **CONTRAST_ANGIOGRAPHIC** | `CONTRAST_TYPE_ANGIOGRAPHIC` | All CTA rows |
| **CONTRAST_ORAL** | — | **Not used** (no oral-phase CT in legacy inventory) |
| **CONTRAST_UNSPECIFIED** | **null FK only** | Ratified existing rows only |

### 3.2 Intentional-null contrast (unchanged — B1B)

| Code | Contrast FK | Applies to 2E.2B? |
|------|-------------|-------------------|
| `CT_HEAD` (retired) | null | **No expansion** |
| `CT_ABD` (predecessor) | null | **No expansion** |
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | null (intentional) | **No change** |

### 3.3 Contrast counts on **new** catalog rows (35)

| Mapping | New row count |
|---------|-------------:|
| **CONTRAST_IV** (`CONTRAST_TYPE_WITH`) | 10 |
| **CONTRAST_IV_ORAL** (`CONTRAST_TYPE_WITH_AND_WITHOUT`) | 4 |
| **CONTRAST_NONE** (`CONTRAST_TYPE_WITHOUT`) | 17 |
| **CONTRAST_ANGIOGRAPHIC** | 4 *(CTA only)* |
| **CONTRAST_ORAL** | 0 |
| **CONTRAST_UNSPECIFIED** (null FK) | 0 *(no new nulls)* |

---

## 4. Part 4 — CTA governance (MR-M3)

### 4.1 Approved Haiti catalog (must remain valid)

| Code | Status | Compliance |
|------|--------|------------|
| `CTA_CHEST` | Active | **COMPLIANT** — standard + triple rule-out via protocol |
| `CTA_HEAD_NECK` | Active | **COMPLIANT** — superset for head/neck/COW aliases |
| `CTA_ABDOMEN_PELVIS` | Active | **COMPLIANT** — abdominal angio + aorta protocol variants |

*Haiti catalog does not include standalone `CTA_HEAD` — MR-M3 “KEEP DISTINCT” satisfied by `CTA_HEAD_NECK` + aliases, not a second head-only row.*

### 4.2 CTA expansion disposition

| Legacy study | MR-M3 / appendix | 2E.2B action |
|--------------|-------------------|--------------|
| CTA Chest w Reconstruction | Recon → alias | **EXISTS** `CTA_CHEST` |
| CTA Chest Triple Rule Out | KEEP DISTINCT protocol | **EXISTS** `CTA_CHEST` + `PROTOCOL_CTA_CHEST_TRIPLE_RULE_OUT` |
| CTA Head and Neck | KEEP DISTINCT | **EXISTS** `CTA_HEAD_NECK` |
| CTA Head | Head angio | **ALIAS** → `CTA_HEAD_NECK` |
| CTA COW / Carotids w Reconstructions | COW → alias | **ALIAS** → `CTA_HEAD_NECK` |
| CTA Head Circle of Willis w Reconstructions | COW alias | **ALIAS** → `CTA_HEAD_NECK` |
| CTA Abdominal Aorta w Reconstructions | Aorta protocol | **TUPLE** on `CTA_ABDOMEN_PELVIS` |
| CTA Abdominal Aorta w Runoff | Runoff protocol | **TUPLE** on `CTA_ABDOMEN_PELVIS` |
| CTA Lower Extremity Left/Right | — | **KEEP DISTINCT** — new `CTA_LE_LEFT`, `CTA_LE_RIGHT` |
| CTA Upper Extremity Left/Right | — | **KEEP DISTINCT** — new `CTA_UE_LEFT`, `CTA_UE_RIGHT` |

**No new row** for: reconstruction tokens, COW, carotid-only splits (alias/protocol only).

---

## 5. Part 5 — Duplicate / retirement safety

| Check | Result | Evidence |
|-------|--------|----------|
| **CT_HEAD reactivation** | **PASS** | No proposed `CT_HEAD` active row; only `CT_HEAD_WO_CONTRAST` + `CT_HEAD_W_CONTRAST` |
| **CT_ABD duplication** | **PASS** | Legacy abdomen CT → `CT_ABDOMEN_PELVIS_*`; predecessor unchanged until 2D |
| **Duplicate CTA chest** | **PASS** | No second `CTA_CHEST`; `CT_CHEST_CTA` not recreated |
| **CTA_HEAD vs CTA_HEAD_NECK** | **PASS** | No competing `CTA_HEAD` catalog insert |
| **Retirement violations** | **PASS** | Expansion additive only |
| **Successor-map violations** | **PASS** | See §2.4 |
| **Duplicate active codes** | **PASS** | 35 unique proposed codes (matrix in candidate list) |
| **CAP trauma contrast null** | **PASS** | B1B ratification preserved |

### Duplicate-risk register

| Risk ID | Description | Severity | Mitigation |
|---------|-------------|----------|------------|
| D1 | `CT_CHEST` vs `CT_CHEST_W_IV` coexist | Low | Distinct contrast classifiers |
| D2 | `CT_ABDOMEN_PELVIS` vs pelvis-only legacy | Medium | Explicit `CT_PELVIS_*` rows |
| D3 | CTA runoff CPT ≠ standard abdominal CTA | Medium | Protocol classifiers; billing MR |
| D4 | Perfusion CT CPT | High | `CT_BRAIN_PERFUSION` isolated in CT-3 |

---

## 6. Part 7 — Implementation readiness

| Gate / blocker | Status |
|----------------|--------|
| Gate W1 (Haiti 44) | **CLOSED** |
| Gate W2 (CT/CTA workbook slice) | **OPEN** |
| 3C-B1 contrast governance | **CLOSED** — no new null policies |
| MR-M3 CTA | **RESOLVED** in this design |
| CT Chest HR / CTA aorta MR | **RESOLVED** as TUPLE/ALIAS |
| French labels | **NOT READY** |
| Licensed CPT (Gate W3) | **NOT READY** |

### Verdict

| Scope | Verdict |
|-------|---------|
| **2E.2B design / governance** | **SAFE** |
| **2E.2B catalog implementation** | **NOT SAFE** until Gate W2 + batch sign-off |

### Blockers

1. Gate W2 workbook CSV for CT/CTA batch  
2. Clinical ratification of CT-3 advanced anatomy scope (Haiti pilot)  
3. `displayNameFr` authoring (35 rows)  
4. Staging seed + classifier FK backfill for new rows (post-insert)  
5. Billing review queue (`PENDING_CPT_REVIEW` on all new rows)  

---

## 7. Cross-references

| Document | Role |
|----------|------|
| `ct-cta-expansion-candidate-list.md` | Full matrix |
| `ct-cta-expansion-batch-plan.md` | CT-1 / CT-2 / CT-3 |
| `imaging-contrast-final-ratification.md` | B1B intentional null |
| `imaging-taxonomy-governance-appendix.md` | MR-M3 |

---

*Audit only — no code, seeds, migrations, commits, or catalog inserts.*
