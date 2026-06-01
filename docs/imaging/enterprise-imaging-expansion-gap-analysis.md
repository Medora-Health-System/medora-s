# Enterprise Imaging Expansion Gap Analysis (Phase 2E.1)

**Phase:** 2E.1  
**Date:** 2026-06-01  
**Mode:** Audit + design only  

---

## 1. Gap summary

| Dimension | Current (Haiti MVP) | Enterprise legacy | Gap |
|-----------|--------------------:|------------------:|-----|
| Catalog rows | 44 (43 active) | 267 orderables | **213** legacy rows need EXPAND or MISSING resolution |
| Net-new codes (clustered) | — | — | **62–97** rows to add |
| FULL coverage | 23 / 267 (**8.6%**) | — | **91.4%** not exact-match |
| Classifier tuples | 44 rows classified | 267 implied tuples | **223** tuples not represented as distinct orderables |
| Modality families | XR, US, CT, CTA, MRI | + MRA, NM, FL | **3 families absent** |
| Laterality on XR MSK | UNSPECIFIED | L/R/Bilat per study | **Policy gap** |
| CT/MRI contrast splits | Partial | w / wo / w&wo per study | **CPT-driven gap** |
| Billing (CPT) | Example / pending | Licensed workbook | **Gate W3** |

---

## 2. Coverage gap by classification

| 2E.1 classification | Legacy rows | Catalog action | Gap severity |
|----------------------|------------:|----------------|--------------|
| **EXISTS_IN_MEDORA** | 23 | None | **Low** — alias/search only |
| **PARTIAL_MATCH** (tuple/alias) | 21 | Classifier + alias | **Low** — no new row |
| **PARTIAL_MATCH** (EXPAND) | 76 | New code each cluster | **High** — volume + laterality policy |
| **MISSING** | 137 | New code each cluster | **High** — new body regions + NM/FL/MRA |
| **SUCCESSOR_REQUIRED** | ~8 | Alias to successor | **Medium** — must not violate 2D |
| **MANUAL_REVIEW** (partial) | 10 | Decision pending | **Medium** — blocks batch sign-off |

---

## 3. Modality-specific gaps

### 3.1 X-Ray (118 legacy / 17 Medora)

| Gap type | Count (approx.) | Example |
|----------|----------------:|---------|
| Missing body region entirely | 53 MISSING | C-spine, ribs, orbit, finger, sinus |
| Laterality/view split on existing region | 62 PARTIAL→EXPAND | `Knee Left 3V` vs `XR_KNEE` |
| Protocol variants on chest | 3 TUPLE/MR | Decub, post-intubation |
| Duplicate governance | 3 MR | Abdomen 1V/2V/3V vs KUB |

**Risk:** Highest row count; EXPAND vs TUPLE policy affects **58+** codes.

### 3.2 CT (43 legacy / 9 Medora)

| Gap type | Count | Example |
|----------|------:|---------|
| Contrast phase not orderable | 14 PARTIAL | `CT Chest w IV Contrast` |
| Missing anatomy | 25 MISSING | T-spine, facial, MSK extremity, STN |
| Successor overlap | 3 | `CT_ABD` / `CT_ABDOMEN_PELVIS` |

**Risk:** **High** — contrast CPT sensitivity; must not duplicate retired `CT_HEAD`.

### 3.3 CTA (12 legacy / 3 Medora)

| Gap type | Count | Example |
|----------|------:|---------|
| Missing extremity CTA | 4 MISSING | LE/UE CTA |
| Protocol ambiguity | 5 PARTIAL/MR | Runoff, COW recon |
| Covered by FULL | 3 | Triple rule-out → `CTA_CHEST` |

**Risk:** **Medium** — protocol classifier vs separate code.

### 3.4 MRI / MRA (27 + 5 legacy / 2 Medora)

| Gap type | Count | Example |
|----------|------:|---------|
| Spine level split | 12+ | C/T/L spine MRI vs `MRI_SPINE` |
| MSK MRI | 4+ | Knee, hip, extremity |
| **MRA family absent** | 5 | All MRA MISSING |
| Contrast variants | 11 EXPAND | w / wo / w&wo head & spine |

**Risk:** **High** for MRI spine split; **High** for new MRA family introduction.

### 3.5 Ultrasound (53 legacy / 14 Medora)

| Gap type | Count | Example |
|----------|------:|---------|
| Missing specialties | 27 MISSING | Breast, thyroid, carotid, UE Doppler |
| OB protocol granularity | 10 PARTIAL TUPLE | TV, portable, BPP |
| Duplicate predecessor | 2 | `US_ABD` → `US_ABDOMEN` |

**Risk:** **Medium** — high clinical volume for OB/RUQ already covered.

### 3.6 Nuclear medicine & fluoroscopy (9 legacy / 0 Medora)

| Gap | Detail |
|-----|--------|
| Entire modality absent | 5 NM + 4 FL studies |
| Operational workflow | May not be in Haiti pilot scope |
| Classifier seeds | MODALITY_NM / MODALITY_FL exist — catalog empty |

**Risk:** **Low** for Haiti pilot; **High** for full enterprise parity.

---

## 4. Non-catalog gaps (out of 2E.1 scope but blocking)

| Gap | Blocks | Gate |
|-----|--------|------|
| Gate W2 workbook (267 rows) not populated in CSV | Batch sign-off | W2 |
| Licensed CPT workbook | Billing activation | W3 |
| Phase 2D retirement execution | Predecessor deactivation | 2D |
| `ImagingStudyAlias` authoring | Search without new rows | 2E ops |
| Radiology EXPAND vs TUPLE policy | MSK XR laterality | Clinical governance |

---

## 5. Duplicate & retirement collision matrix

| Legacy pattern | Forbidden expansion | Required handling |
|----------------|--------------------|-------------------|
| CT Head * | New `CT_HEAD` active row | Map to `CT_HEAD_WO_CONTRAST` + contrast EXPAND |
| CT Abdomen * (legacy) | New `CT_ABD` | `CT_ABDOMEN_PELVIS` + contrast codes |
| Doppler vein LE | New `DOPPLER_VEIN` | `US_VENOUS_DOPPLER_LE` |
| CTA chest (old CT code) | `CT_CHEST_CTA` duplicate | `CTA_CHEST` |
| CTA chest triple rule-out | Second `CTA_CHEST` row | `PROTOCOL_CTA_CHEST_TRIPLE_RULE_OUT` |

---

## 6. Quantified expansion gap

| Metric | Value |
|--------|------:|
| Legacy studies | 267 |
| Satisfied without new row (FULL + TUPLE + ALIAS) | **44** (23+21) |
| Legacy rows needing new catalog work | **213** (76+137) |
| Net-new codes after clustering | **62–97** |
| Increase over current catalog | **+144% to +220%** (43 → 105–140 active) |

---

## 7. Risk register

| ID | Risk | Level | Mitigation |
|----|------|-------|------------|
| G1 | MSK XR explosion (58+ codes) | **High** | Pilot batch limit; EXPAND vs TUPLE radiology decision |
| G2 | Contrast CPT mismatch | **High** | Batch 2E.2B clinical + billing review per code |
| G3 | Successor/retirement collision | **Medium** | Enforce §5 matrix in seed PR |
| G4 | MRA/NM/FL scope creep | **Medium** | Defer 2E.2E until pilot confirms modality |
| G5 | French label drift | **Medium** | FR authoring checklist per batch |
| G6 | Classifier tuple collisions | **Low** | ICM-1.0 workbook validators |
| G7 | Order/search regression | **Medium** | Alias-first for TUPLE rows; search QA per batch |

---

## 8. SAFE / NOT SAFE

| Action | Verdict |
|--------|---------|
| Phase 2E.1 inventory audit | **SAFE** |
| Phase 2E.2 catalog seed / insert | **NOT SAFE** until Gate W2 + batch sign-off |
| Full 267-row parity in one release | **NOT SAFE** — batch per roadmap |
| Haiti pilot with current 44 + classifiers | **SAFE** (unchanged) |

---

*Audit only — no implementation.*
