# CT / CTA Expansion Batch Plan (Phase 2E.2B)

**Phase:** 2E.2B  
**Date:** 2026-06-01  
**Reference:** `ct-cta-expansion-candidate-list.md` (31 CT + 4 CTA = **35** new rows)  

---

## 1. Batch overview

| Batch | Focus | CT rows | CTA rows | Total | Risk | MR | Billing review |
|-------|--------|--------:|---------:|------:|------|---:|---------------:|
| **CT-1** | Core CT contrast + pelvis | **7** | 0 | **7** | **High** | 0 | 7 |
| **CT-2** | CTA extremity expansion | 0 | **4** | **4** | **Medium** | 0 | 4 |
| **CT-3** | Advanced CT anatomy | **24** | 0 | **24** | **High** | 0 | 24 |
| **Tuple pass** *(parallel)* | HR chest, aorta CTA, COW aliases | 0 | 0 | 0 | **Low** | 5 legacy | 0 |
| **Total new rows** | | **31** | **4** | **35** | | | **35** |

*Manual-review legacy studies (5) resolved with **no** new row — see tuple/alias pass.*

---

## 2. Batch CT-1 — Core CT expansion (7 rows)

### 2.1 Scope

Contrast and pelvis splits on existing clinical anchors:

| Code | Legacy drivers |
|------|----------------|
| `CT_HEAD_W_CONTRAST` | CT Head w IV Contrast |
| `CT_CHEST_W_IV_CONTRAST` | CT Chest w IV Contrast |
| `CT_CHEST_W_WO_CONTRAST` | CT Chest w&wo IV Contrast |
| `CT_ABDOMEN_PELVIS_W_IV_CONTRAST` | CT Abdomen/Pelvis w IV; legacy Abdomen w IV (successor) |
| `CT_ABDOMEN_PELVIS_W_WO_CONTRAST` | CT Abdomen/Pelvis w&wo; legacy Abdomen w&wo |
| `CT_PELVIS_WO_CONTRAST` | CT Pelvis wo IV Contrast |
| `CT_PELVIS_W_WO_CONTRAST` | CT Pelvis w&wo IV Contrast |

### 2.2 Deliverables (implementation phase)

- 7 `CatalogImagingStudy` rows + classifier FK backfill
- Aliases from legacy contrast strings
- No change to `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` contrast null (B1B)

### 2.3 Risk

**High** — contrast CPT sensitivity; must not create `CT_HEAD` or `CT_ABD` rows.

---

## 3. Batch CT-2 — CTA expansion (4 rows)

### 3.1 Scope

| Code | Legacy |
|------|--------|
| `CTA_LOWER_EXTREMITY_LEFT` | CTA Lower Extremity Left |
| `CTA_LOWER_EXTREMITY_RIGHT` | CTA Lower Extremity Right |
| `CTA_UPPER_EXTREMITY_LEFT` | CTA Upper Extremity Left |
| `CTA_UPPER_EXTREMITY_RIGHT` | CTA Upper Extremity Right |

### 3.2 Parallel tuple / alias pass (0 rows)

| Legacy | Action on existing codes |
|--------|-------------------------|
| CTA Chest Triple Rule Out | `CTA_CHEST` + `PROTOCOL_CTA_CHEST_TRIPLE_RULE_OUT` |
| CTA Chest w Reconstruction | `CTA_CHEST` + recon alias |
| CTA Abdominal Aorta w Reconstructions | `CTA_ABDOMEN_PELVIS` + `PROTOCOL_CTA_ABDOMINAL_AORTA` |
| CTA Abdominal Aorta w Runoff | `CTA_ABDOMEN_PELVIS` + `PROTOCOL_CTA_ABDOMINAL_AORTA_RUNOFF` |
| CTA Head / COW / Willis recon | Aliases → `CTA_HEAD_NECK` |
| CT Chest HR | `CT_CHEST` + `PROTOCOL_CT_CHEST_HR` |
| CT Angiogram Abdomen | Alias → `CTA_ABDOMEN_PELVIS` |

### 3.3 Risk

**Medium** — MR-M3 compliance; no duplicate `CTA_CHEST` / `CTA_HEAD` rows.

---

## 4. Batch CT-3 — Advanced CT / trauma-adjacent (24 rows)

### 4.1 Scope

| Subgroup | Rows | Examples |
|----------|-----:|----------|
| Head / face / neck | 8 | Perfusion, facial, maxillofacial, orbits, sinuses, STN (×3) |
| Spine | 1 | T-spine wo |
| MSK extremity CT | 12 | Foot, hip, knee, LE, UE (bilateral w/wo/IV) |
| **Total** | **24** | |

*Optional Haiti pilot deferral: perfusion, maxillofacial IV, full UE/LE set — flag at Gate W2.*

### 4.2 Risk

**High** — volume; many `PENDING_CPT_REVIEW`; perfusion CPT complexity (D4).

---

## 5. Recommended sequence

```text
Tuple/alias pass (0 rows) — can run with CT-1
    ↓
CT-1 (7) — contrast / pelvis
    ↓
CT-2 (4) — CTA extremity + CTA protocol aliases
    ↓
CT-3 (24) — advanced anatomy (pilot scope gate)
```

---

## 6. Gate W2 checklist (per batch)

- [ ] Workbook CSV slice for batch  
- [ ] Retirement / successor matrix re-check  
- [ ] Contrast mapping uses ICM-1.0 only (§3 governance)  
- [ ] `CTA_CHEST`, `CTA_HEAD_NECK`, `CTA_ABDOMEN_PELVIS` unchanged and compliant  
- [ ] French `displayNameFr` authored  
- [ ] Staging seed + classifier FK backfill on new rows  
- [ ] Clinical sign-off for batch scope  

---

## 7. Return summary

| Metric | Value |
|--------|------:|
| **Total CT legacy studies** | **43** |
| **Total CTA legacy studies** | **12** |
| **Total new CT catalog rows** | **31** |
| **Total new CTA catalog rows** | **4** |
| **Total new rows (CT+CTA)** | **35** |
| **Batch CT-1** | **7** |
| **Batch CT-2** | **4** |
| **Batch CT-3** | **24** |
| **Manual-review legacy (no new row)** | **5** |
| **Billing-review rows** | **35** |

| Verdict | |
|---------|---|
| **2E.2B design** | **SAFE** |
| **2E.2B implementation** | **NOT SAFE** until Gate W2 + batch sign-off |

---

*Audit only — no implementation.*
