# Imaging Normalization Rules

**Phase:** 3B (audit-only)  
**Purpose:** Define how legacy imaging study labels (Phase 3A inventory) normalize into Medora canonical classifier tuples and catalog identities.  
**Status:** Rules for future implementation — **not applied** in this phase.

---

## 1. Principles

1. **Stable `code` is identity** — never rename a catalog code after orders exist; retire via Phase 2C/2D governance.
2. **Classifiers are vocabulary** — bilingual labels live in `TermClassifierLabel`; aliases in `TermClassifierAlias`.
3. **Legacy strings are transitional** — `modality` and `bodyRegion` remain until backfill + search cutover complete.
4. **Do not guess CPT** — contrast/view/laterality normalization does not imply billing codes.
5. **French product UI** — `displayNameFr` is curated French; legacy English strings feed EN labels and aliases only.
6. **Prefer classifiers over row explosion** when legacy studies share the same billable identity and clinical protocol.
7. **Prefer separate catalog rows** when legacy studies require distinct order UUIDs for billing, consent, or protocol capture.

---

## 2. Parsing legacy display names

Legacy names follow recurring token patterns (exact strings in `legacy-imaging-inventory.md`):

| Token | Extract to classifier | Examples |
|-------|----------------------|----------|
| `Left` / `Right` / `Bilateral` / `Bilat` | `LATERALITY_*` | `Knee Left 3V`, `Foot Bilateral 2V` |
| `1V`, `2V`, `3V`, `4V`, `2 View`, `Complete` | `VIEW_COUNT_*` | `Chest X-Ray 2 View (CXR)` |
| `wo IV Contrast`, `w IV Contrast`, `w&wo IV Contrast` | `CONTRAST_TYPE_*` | `CT Head wo IV Contrast` |
| `wo Contrast`, `w Contrast`, `w&wo Contrast` | `CONTRAST_TYPE_*` | `MRI Head wo Contrast` |
| Leading modality prefix | `MODALITY_*` | `CT`, `MRI`, `US`, `MRA`, `CTA`, `XR implicit` |
| Body noun phrase | `BODY_REGION_*` + optional `ANATOMIC_SUBREGION_*` | `C-Spine`, `RUQ`, `Tibia/Fibula` |
| Trailing protocol phrases | `PROTOCOL_*` | `Triple Rule Out`, `Post Intubation`, `Biophysical Profile` |

**Normalization order:** MODALITY → BODY_REGION → ANATOMIC_SUBREGION → LATERALITY → VIEW_COUNT → CONTRAST_TYPE → PROTOCOL.

---

## 3. Modality rules

| Legacy family | Rule | Target `MODALITY` |
|---------------|------|-------------------|
| Plain radiograph names without prefix | Default XR | `MODALITY_XR` |
| Names starting with `CT ` but not `CTA` | Non-angio CT | `MODALITY_CT` |
| Names starting with `CTA` | Angiographic CT | `MODALITY_CTA` *(proposed)* |
| Names starting with `MRI` | MRI | `MODALITY_MRI` |
| Names starting with `MRA` | MR angiography | `MODALITY_MRA` *(proposed)* |
| Names starting with `US` | Ultrasound | `MODALITY_US` |
| Names containing `Doppler` under US family | US duplex | `MODALITY_US` + `PROTOCOL_US_DOPPLER_*` |
| HIDA, VQ, Lung Scan, Gallbladder Emptying | Nuclear medicine | `MODALITY_NM` *(proposed)* |
| Fluoro, Esophagram, Line/Tube Placement | Fluoroscopy | `MODALITY_FL` *(proposed)* |

**Conflict rule:** If `CTA` appears in name, assign `MODALITY_CTA` even when current Medora seed uses `modality: CT`.

---

## 4. Body region rules

### 4.1 Direct mappings (existing `BODY_REGION_*`)

| Legacy term | Classifier |
|-------------|------------|
| Chest, CXR, Thorax | `BODY_REGION_CHEST` |
| Abdomen, KUB, ASP | `BODY_REGION_ABDOMEN` |
| Pelvis, Hip w Pelvis | `BODY_REGION_PELVIS` |
| C-Spine, Cervical (CT/MRI) | `BODY_REGION_SPINE_CERVICAL` |
| L-Spine, Lumbar (CT/MRI) | `BODY_REGION_SPINE` *(subregion refines)* |
| Head, Brain, MRI Head | `BODY_REGION_HEAD` |
| Neck, STN, Soft Tissue Neck | `BODY_REGION_HEAD_NECK` or subregion |
| Knee / Ankle / Wrist / Shoulder / Elbow / Hand / Foot / Hip / Humerus / Femur / Forearm / Tibia-Fibula | Matching MSK `BODY_REGION_*` |
| RUQ, Gallbladder | `BODY_REGION_ABDOMEN_RUQ` |
| Renal | `BODY_REGION_KIDNEY` |
| Scrotum | `BODY_REGION_SCROTUM` |
| Obstetric (`US OB *`) | `BODY_REGION_OBSTETRICAL` |
| Pelvis (US) | `BODY_REGION_PELVIS` |

### 4.2 Require new `BODY_REGION` or `ANATOMIC_SUBREGION`

| Legacy term | Recommended classifier |
|-------------|---------------------|
| T-Spine, Thoracolumbar | `ANATOMIC_SUBREGION_SPINE_THORACIC` / `_THORACOLUMBAR` |
| Coccyx, Sacrum | `ANATOMIC_SUBREGION_SPINE_SACrum_COCCYX` |
| Ribs, Sternum | `ANATOMIC_SUBREGION_RIBS` / `_STERNUM` |
| Clavicle, Scapula, AC Joint | `ANATOMIC_SUBREGION_CLAVICLE` etc. |
| Facial bones, Mandible, Orbit, Sinus, Skull, Nasal, TMJ | Head/facial subregions |
| Finger, Toe, Calcaneus | Digit subregions |
| Breast, Thyroid, Bladder, Groin, Axilla, Aorta | Dedicated regions |
| Lower/Upper extremity (whole) | `BODY_REGION_LOWER_EXTREMITY` / new UE region |

---

## 5. Laterality rules

Extract before view count. Apply to XR, CT MSK, MRI MSK, US Doppler, CTA extremity.

| Pattern | `LATERALITY` code |
|---------|-------------------|
| `\bLeft\b` | `LATERALITY_LEFT` |
| `\bRight\b` | `LATERALITY_RIGHT` |
| `\bBilateral\b` or `\bBilat\b` | `LATERALITY_BILATERAL` |
| No lateral token | `LATERALITY_UNSPECIFIED` |

**Catalog row rule:** If legacy inventory lists separate Left and Right orderables and CPT differs by side, use **separate catalog codes**. If CPT is side-agnostic, use **one catalog code** + laterality classifier (future order attribute or separate rows per site policy — site policy decision required before implementation).

---

## 6. View count rules (primarily XR)

| Pattern | `VIEW_COUNT` code |
|---------|-------------------|
| `1V`, `1 View`, single-view CXR | `VIEW_COUNT_ONE` |
| `2V`, `2 View`, `2-3V` (use min) | `VIEW_COUNT_TWO` |
| `3V`, `3 View` | `VIEW_COUNT_THREE` |
| `4V`, `4 View` | `VIEW_COUNT_FOUR` |
| `Complete` (spine/face/sinus) | `VIEW_COUNT_COMPLETE` |
| `Sunrise`, `Decub`, `Upright`, `Post Intubation` | **`PROTOCOL_*`** (not view count alone) |

**Special case:** `XR_CHEST` vs `XR_CHEST_2V` — already split in Medora; normalize legacy CXR 1-view → former, 2-view → latter.

---

## 7. Contrast rules (CT, MRI, CTA, some NM)

| Pattern | `CONTRAST_TYPE` code |
|---------|---------------------|
| `wo IV Contrast`, `wo Contrast`, `sans contraste` | `CONTRAST_TYPE_WITHOUT` |
| `w IV Contrast`, `w Contrast` (not w&wo) | `CONTRAST_TYPE_WITH` *(proposed)* |
| `w&wo`, `with and without` | `CONTRAST_TYPE_WITH_AND_WITHOUT` *(proposed)* |
| CTA / Angiogram / Angiographic | `CONTRAST_TYPE_ANGIOGRAPHIC` |
| Plain XR, most US, NM without contrast phrase | `CONTRAST_TYPE_NONE` or null FK |

**Medora duplicate pairs:** `CT_HEAD` vs `CT_HEAD_WO_CONTRAST` — successor carries `CONTRAST_TYPE_WITHOUT`; do not add undifferentiated `CT_HEAD` row.

---

## 8. Protocol rules

Assign when clinical intent is not captured by contrast + view + region:

| Legacy pattern | `PROTOCOL` *(proposed)* |
|----------------|-------------------------|
| `Triple Rule Out` | `PROTOCOL_CTA_CHEST_TRIPLE_RULE_OUT` |
| `Trauma`, `CAP`, pan-scan | `PROTOCOL_CT_CAP_TRAUMA` |
| `Post Intubation` | `PROTOCOL_XR_CHEST_POST_INTUBATION` |
| `FAST`, `eFAST` | `PROTOCOL_US_FAST` |
| `US OB <14 Weeks *` | `PROTOCOL_US_OB_FIRST_TRIMESTER_*` |
| `US OB >14 Weeks *` | `PROTOCOL_US_OB_SECOND_THIRD_*` |
| `Biophysical Profile` | `PROTOCOL_US_OB_BPP` |
| `HIDA`, `VQ`, `Perfusion/Ventilation` | `PROTOCOL_NM_*` |
| `Esophagram`, `Line Placement`, `Tube Placement` | `PROTOCOL_FL_*` |
| `Brain Perfusion` | `PROTOCOL_CT_BRAIN_PERFUSION` |
| `Cholangiogram` (MR) | `PROTOCOL_MRI_CHOLANGIOGRAM` |

---

## 9. Catalog identity (`code`) assignment rules

### 9.1 When to reuse an existing Medora code (FULL normalization)

All of the following must match an existing row's classifier tuple (or accepted partial per Phase 3A FULL):

- Modality family
- Body region intent
- Contrast (if applicable)
- View count (if applicable for XR)
- No distinct protocol requiring separate billing

**Examples:**

| Legacy | Existing code |
|--------|---------------|
| `CT Head wo IV Contrast` | `CT_HEAD_WO_CONTRAST` |
| `Chest X-Ray 1 View (CXR)` | `XR_CHEST` |
| `Chest X-Ray 2 View (CXR)` | `XR_CHEST_2V` |
| `US RUQ` | `US_RUQ_GALLBLADDER` |
| `US Renal Complete` | `US_RENAL` |

### 9.2 When to create a new catalog code (future phases)

- No existing tuple match AND clinically orderable at enterprise scale.
- Licensed CPT mapping requires distinct `BillingCatalog.externalCode`.
- Protocol cannot be captured by classifiers alone (site policy).

**Proposed code shape** (from Phase 3A normalization proposal):

```
{MODALITY}_{BODY}_{LATERALITY}_{CONTRAST}_{VIEW}_{PROTOCOL_SUFFIX}
```

Examples: `CT_HEAD_W_CONTRAST`, `XRAY_KNEE_LEFT_3V`, `CTA_CHEST_TRIPLE_RULE_OUT`.

### 9.3 When to retire — not create — a code

Phase 2C/2D duplicate pairs: create **no** new row for predecessor intent; normalize to successor and deactivate predecessor.

---

## 10. Alias and search normalization

| Source | Target |
|--------|--------|
| Legacy abbreviations (`CXR`, `KUB`, `ASP`, `RUQ`, `BPP`) | `ImagingStudyAlias` on canonical row |
| Exact phrase shortcuts | `IMAGING_ALIAS_CODE_MAP` in `imaging-catalog.service.ts` — one canonical code post-retirement |
| Classifier aliases | `TermClassifierAlias` — bilingual search tokens |

**Rule:** After duplicate retirement, shortcuts must return **successor only** (CT Head pilot pattern).

---

## 11. Display name normalization

| Field | Rule |
|-------|------|
| `displayNameEn` | Construct from classifier EN labels + protocol suffix; do not copy legacy string verbatim if ambiguous |
| `displayNameFr` | Curated French clinical label; never auto-translate from legacy English |
| `searchText` | Lowercase concat of code, EN/FR labels, classifier aliases, legacy synonyms |

---

## 12. Per-family normalization summary

| Family | Primary classifiers | Separate rows vs classifiers |
|--------|--------------------|-----------------------------|
| **X-Ray** | MODALITY, BODY_REGION, LATERALITY, VIEW_COUNT, PROTOCOL | Laterality + view often need classifiers; 118 legacy → ~25–40 canonical rows + tuples |
| **CT** | MODALITY, BODY_REGION, CONTRAST_TYPE, LATERALITY (MSK) | Contrast variants usually **separate rows** (CPT-driven) |
| **CTA** | MODALITY_CTA, BODY_REGION, PROTOCOL | Protocol variants (triple rule-out) likely **separate rows** |
| **MRI** | MODALITY, BODY_REGION, CONTRAST_TYPE | Contrast variants **separate rows**; region splits (C/L/T-spine) **separate rows or subregion** |
| **MRA** | MODALITY_MRA, BODY_REGION, CONTRAST_TYPE | New modality family — all **new rows** |
| **Ultrasound** | MODALITY, BODY_REGION, PROTOCOL | OB phases and Doppler protocols need PROTOCOL; duplex laterality via LATERALITY |
| **Nuclear Medicine** | MODALITY_NM, PROTOCOL | All **new rows** — no NM modality today |
| **Fluoroscopy** | MODALITY_FL, PROTOCOL | All **new rows** |

---

## 13. Validation gates (before any seed change)

| Gate | Check |
|------|-------|
| G1 | Classifier tuple appears in normalization workbook |
| G2 | Bilingual `TermClassifierLabel` present |
| G3 | No alias collision across active rows (Phase 2C scan) |
| G4 | CPT status not `pending_license` if billing row requested |
| G5 | Successor map updated if superseding duplicate |
| G6 | Backfill audit run with `TERMINOLOGY_BACKFILL_ENABLED` |

---

## 14. Explicit non-rules (out of scope for normalization)

- Do not infer contrast from `isEssential` or search ranking.
- Do not map NM/FL studies to XR or CT proxies.
- Do not merge `CTA` into generic `CT_CHEST` without protocol classifier.
- Do not assign laterality from free-text `bodyRegion` legacy field.

---

*Phase 3B — audit only. Rules are design artifacts for Phase 3C+ implementation.*
