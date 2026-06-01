# Wave 1 Alias Package (Phase W2.2 — Final)

**Phase:** W2.2 — design only  
**Date:** 2026-06-01  
**Workbook source:** `aliasRequired` column on `wave=1` rows + enterprise alias governance  

---

## 1. Summary (workbook-derived)

| Class | Catalog codes | Alias strings (est.) |
|-------|--------------|---------------------:|
| **REQUIRED** | **1** | **≥3** |
| **OPTIONAL** | **36** | **~25–32** |
| **NONE** | **0** | — |
| **Tuple pass** *(existing `XR_CHEST`, 0 inserts)* | — | **2** protocols |

| Metric | Count |
|--------|------:|
| **Total alias strings (Wave 1 scope, est.)** | **~30–37** |
| **Required alias count (workbook flag)** | **1** code → **≥3** strings |
| **Optional alias count** | **36** codes |
| **Duplicate alias conflicts** | **0** |

---

## 2. REQUIRED (workbook `aliasRequired=REQUIRED`)

| catalogCode | Minimum alias strings | Legacy labels |
|-------------|----------------------:|---------------|
| `XR_SACRUM_COCCYX_2V` | **3** | Coccyx and Sacrum; Sacrum and Coccyx; regional shorthand |

---

## 3. OPTIONAL (workbook `aliasRequired=OPTIONAL` — 36 codes)

All other Wave 1 codes. Highest-value OPTIONAL groups:

| Batch | Codes | Example legacy strings |
|-------|------:|------------------------|
| XR-1 | 18 | Abdomen 1V/2V/3V; rib left/right; spine regional names |
| CT-1 | 7 | CT Head w IV; CT Chest w/w&wo; CT Abdomen/Pelvis w* |
| MRI-1 | 11 | MRI Head w; MRI Head w&wo; regional spine wo/w/w&wo |

*Full OPTIONAL authoring is implementation-phase (2E.4A); not blocking workbook authorization.*

---

## 4. NONE

**0** Wave 1 workbook rows have `aliasRequired=NONE`.

---

## 5. Tuple pass (parallel — not in workbook rows)

Required for Wave 1 clinical parity; applies to **existing** catalog:

| catalogCode | Protocol | Legacy |
|-------------|----------|--------|
| `XR_CHEST` | `PROTOCOL_XR_CHEST_DECUBITUS` | Chest 1V Decub |
| `XR_CHEST` | `PROTOCOL_XR_CHEST_POST_INTUBATION` | Chest Post Intubation |

---

## 6. Verification

| Check | Result |
|-------|--------|
| No duplicate alias → two Wave 1 codes | **PASS** |
| No alias targeting `CT_HEAD` (retired) | **PASS** |
| No alias targeting `CT_ABD` | **PASS** |
| No alias recreating `DOPPLER_VEIN` | **PASS** (N/A Wave 1) |
| Successor: wo CT head → `CT_HEAD_WO_CONTRAST` not `CT_HEAD` | **PASS** |
| Successor: wo MRI head → `MRI_BRAIN` (existing, not Wave 1 insert) | **PASS** |

---

*No alias DB writes in W2.2.*
