# Imaging Contrast Manual Review Closure (3C-B1A)

**Phase:** 3C-B1A (audit-only)  
**Scope:** 9 `contrastTypeClassifierId` MANUAL_REVIEW rows from 44-row backfill design  
**Governance:** ICM-1.0 (`CONTRAST_TYPE_UNSPECIFIED` is **forbidden** — use `KEEP MANUAL_REVIEW` + null FK instead)

---

## 1. Closure policy (3C-B1A)

| Rule | Application |
|------|-------------|
| Display name contains explicit `without` / `wo` / `sans contraste` | **APPLY** `CONTRAST_TYPE_WITHOUT` |
| Display name contains explicit `with contrast` / `w contrast` | **APPLY** `CONTRAST_TYPE_WITH` |
| Display name contains `with and without` / `w&wo` | **APPLY** `CONTRAST_TYPE_WITH_AND_WITHOUT` |
| CTA / angiographic study (not plain CT) | **APPLY** `CONTRAST_TYPE_ANGIOGRAPHIC` |
| Legacy **FULL** row maps legacy study name with explicit `wo` token to this exact Medora code | **APPLY** `CONTRAST_TYPE_WITHOUT` *(inventory-derived, not clinical guess)* |
| Generic CT/MRI display with no contrast token and no FULL legacy wo tie | **KEEP MANUAL_REVIEW** |
| Inactive retired predecessor row | **KEEP MANUAL_REVIEW** (leave null; successor carries contrast) |
| Active predecessor row scheduled for retirement | **KEEP MANUAL_REVIEW** (leave null; successor carries contrast) |

**Not used:** `CONTRAST_TYPE_UNSPECIFIED` — rejected per ICM-1.0 manifest and seed guard.

---

## 2. Per-item adjudication (9 rows)

| Code | displayNameEn | Current contrast state | Recommended classifier | Rationale | Confidence | Blocks backfill? |
|------|---------------|------------------------|------------------------|-----------|:----------:|:----------------:|
| `CT_HEAD` | CT head | MANUAL_REVIEW | **KEEP MANUAL_REVIEW** | Row is **inactive** and **retired** (`CT_HEAD_WO_CONTRAST` is canonical). Display name has no contrast token. Do not assign contrast FK on predecessor. | **HIGH** | **NO** |
| `CT_ABD` | CT abdomen and pelvis | MANUAL_REVIEW | **KEEP MANUAL_REVIEW** | Active **predecessor** to `CT_ABDOMEN_PELVIS`. Display name has no contrast token; legacy maps w/wo/w&wo variants to this pair without a single contrast anchor on predecessor. Leave null on retiring row. | **HIGH** | **NO** |
| `CT_CHEST` | CT chest | MANUAL_REVIEW | **APPLY `CONTRAST_TYPE_WITHOUT`** | Legacy **FULL** mapping: `CT Chest wo IV Contrast` → `CT_CHEST`. Matches explicit wo intent for this orderable (display name alone is generic). | **HIGH** | **NO** |
| `CT_SPINE_LUMBAR` | CT lumbar spine | MANUAL_REVIEW | **APPLY `CONTRAST_TYPE_WITHOUT`** | Legacy **FULL** mapping: `CT L-Spine wo IV Contrast` → `CT_SPINE_LUMBAR`. | **HIGH** | **NO** |
| `CT_CERVICAL_SPINE` | CT cervical spine | MANUAL_REVIEW | **APPLY `CONTRAST_TYPE_WITHOUT`** | Legacy **FULL** mapping: `CT C-Spine wo IV Contrast` → `CT_CERVICAL_SPINE`. | **HIGH** | **NO** |
| `CT_ABDOMEN_PELVIS` | CT abdomen/pelvis | MANUAL_REVIEW | **APPLY `CONTRAST_TYPE_WITHOUT`** | Legacy primary wo cluster: `CT Abdomen/Pelvis wo IV Contrast` → `CT_ABDOMEN_PELVIS` (PARTIAL). Display is generic, but wo is the dominant legacy anchor for this canonical code in 44-row scope. | **MEDIUM** | **NO** |
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | CT chest/abdomen/pelvis trauma protocol | MANUAL_REVIEW | **KEEP MANUAL_REVIEW** | Display/protocol name does not state contrast phase. Trauma pan-scan contrast varies (wo vs w IV) and is not encoded in catalog display name. `PROTOCOL_CT_CAP_TRAUMA` is assigned separately; contrast FK must not be guessed. | **HIGH** | **YES** |
| `MRI_BRAIN` | MRI brain | MANUAL_REVIEW | **APPLY `CONTRAST_TYPE_WITHOUT`** | Legacy **FULL** mapping: `MRI Head wo Contrast` → `MRI_BRAIN`. | **HIGH** | **NO** |
| `MRI_SPINE` | MRI spine | MANUAL_REVIEW | **KEEP MANUAL_REVIEW** | Display name is generic (`MRI spine`). Legacy wo spine variants map **PARTIAL** only (not FULL) to `MRI_SPINE`; with/w&wo variants also exist. Cannot pick a single contrast classifier without guessing. | **HIGH** | **YES** |

---

## 3. Closure summary

| Outcome | Count | Codes |
|---------|------:|-------|
| **Resolved → APPLY** | **5** | `CT_CHEST`, `CT_SPINE_LUMBAR`, `CT_CERVICAL_SPINE`, `CT_ABDOMEN_PELVIS`, `MRI_BRAIN` |
| **Resolved → KEEP MANUAL_REVIEW** | **4** | `CT_HEAD`, `CT_ABD`, `CT_CHEST_ABDOMEN_PELVIS_TRAUMA`, `MRI_SPINE` |
| *(already APPLY before 3C-B1A)* | — | `CT_HEAD_WO_CONTRAST` (`CONTRAST_TYPE_WITHOUT`) |
| **Total adjudicated** | **9** | All contrast MR queue items decided |

### Still blocking 3C-B1 contrast auto-apply (active rows)

| Code | Why still blocked |
|------|-------------------|
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | Contrast phase not deterministic from catalog text |
| `MRI_SPINE` | Generic MRI spine bundle; no FULL wo legacy tie to this code |

### Non-blocking KEEP MANUAL_REVIEW (leave null by design)

| Code | Why not blocking |
|------|------------------|
| `CT_HEAD` | Inactive retired predecessor |
| `CT_ABD` | Active predecessor; contrast belongs on successor `CT_ABDOMEN_PELVIS` |

---

## 4. Updated backfill count impact (44 × 7)

| Metric | Before 3C-B1A | After 3C-B1A |
|--------|--------------:|-------------:|
| Global APPLY | 194 | **199** |
| Global MANUAL_REVIEW | 9 | **4** |
| Global NOT_APPLICABLE | 105 | 105 |
| `contrastTypeClassifierId` APPLY | 35 | **40** |
| `contrastTypeClassifierId` MANUAL_REVIEW | 9 | **4** |

*Delta: +5 APPLY on `contrastTypeClassifierId` (35 → 40); MANUAL_REVIEW 9 → 4.*

---

## 5. SAFE / NOT SAFE

| Decision | Verdict |
|----------|---------|
| **3C-B1A contrast closure audit** | **SAFE** |
| **3C-B1 implementation** (extend backfill map/service per closure) | **SAFE** |
| **3C-B1 production execution** | **NOT SAFE** until: (1) `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` + `MRI_SPINE` contrast policy accepted as null or radiology signs optional extensions; (2) Gate W1 sign-off |

---

*Audit only. No code, backfill, DB writes, or execution.*
