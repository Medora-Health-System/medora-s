# Wave 4 Alias Package (Phase 2E.8A)

**Phase:** 2E.8A — design only  
**Date:** 2026-06-01  
**Workbook source:** `aliasRequired` on Wave 4 rows (`implementationBatch` XR-3, CT-3)  
**Legacy mapping:** [`enterprise-imaging-alias-package.md`](enterprise-imaging-alias-package.md) · [`xray-expansion-candidate-list.md`](xray-expansion-candidate-list.md) · [`ct-cta-expansion-batch-plan.md`](ct-cta-expansion-batch-plan.md)

---

## 1. Summary (workbook-derived)

| Class | Catalog codes | Alias strings (est.) |
|-------|--------------|---------------------:|
| **REQUIRED** | **0** | **0** |
| **OPTIONAL** | **31** | **~45–70** |
| **NONE** | **0** | — |

| Metric | Count |
|--------|------:|
| **Total alias strings (Wave 4 core, est.)** | **~45–70** |
| **Required alias codes (workbook)** | **0** |
| **Recommended high-value OPTIONAL codes** | **~14** (see §3) |
| **Duplicate alias conflicts (within Wave 4 design)** | **0** |
| **Cross-wave collision (design-time)** | **0** |

---

## 2. Workbook classification (31 codes)

All **31** Wave 4 core rows have `aliasRequired=OPTIONAL`. No workbook row is `REQUIRED` or `NONE`.

| Batch | Codes | Workbook alias |
|-------|------:|----------------|
| XR-3 | 7 | OPTIONAL (all) |
| CT-3 | 24 | OPTIONAL (all) |

**Enterprise alias inventory (reference):**

| Group | Est. strings | Focus |
|-------|-------------:|-------|
| XR-3 shoulder girdle | ~7–12 | AC / clavicle / scapula; French shorthand |
| CT-3 MSK | ~12–18 | Foot, hip, knee, LE/UE legacy names |
| CT-3 head/face/neck | ~8–15 | Sinuses, orbits, STN, facial/maxillofacial |
| CT-3 perfusion | ~2–4 | Brain perfusion synonyms |

---

## 3. Recommended OPTIONAL authoring (2E.8B — not workbook REQUIRED)

| Batch | Code | Example legacy / shorthand aliases |
|-------|------|----------------------------------|
| XR-3 | `XR_AC_JOINT_*` | AC joint; articulation acromio-claviculaire; shoulder AC |
| XR-3 | `XR_CLAVICLE_*` | clavicle xray; radiographie clavicule |
| XR-3 | `XR_SCAPULA_*` | scapula; omoplate |
| CT-3 | `CT_SINUSES_WO_CONTRAST` | sinus CT; TDM sinus |
| CT-3 | `CT_ORBITS_WO_CONTRAST` | orbit CT; TDM orbites |
| CT-3 | `CT_STN_*` | soft tissue neck; cou parties molles |
| CT-3 | `CT_TSPINE_WO_CONTRAST` | thoracic spine CT; T-spine |
| CT-3 | `CT_KNEE_*` / `CT_HIP_*` / `CT_FOOT_*` | MSK CT legacy short names |
| CT-3 | `CT_LOWER_EXTREMITY_*` / `CT_UPPER_EXTREMITY_*` | LE/UE CT (distinct from CTA angio aliases) |
| CT-3 | `CT_BRAIN_PERFUSION` | perfusion CT; CT perfusion cérébrale |

*Full OPTIONAL set is implementation-phase (2E.8B); not blocking staging authorization.*

**XR-3b (optional parity):** If authorized later, **+33** rows carry separate alias budget (~80–120 strings est.) — not in 2E.8A core.

---

## 4. REQUIRED / OPTIONAL / NONE — return counts

| Class | Code count | Est. alias strings |
|-------|----------:|-------------------:|
| **REQUIRED** | **0** | **0** |
| **OPTIONAL** | **31** | **~45–70** |
| **NONE** | **0** | **0** |
| **Total** | **31** | **~45–70** |

---

## 5. Verification

| Check | Result |
|-------|--------|
| No duplicate alias → two Wave 4 codes (design) | **PASS** |
| No alias targeting retired `CT_HEAD` | **PASS** |
| No alias recreating `DOPPLER_VEIN` / `US_ABD` / `CT_ABD` | **PASS** |
| No collision with Wave 1 codes | **PASS** |
| No collision with Wave 2 codes | **PASS** |
| No collision with Wave 3 codes | **PASS** |
| No collision with Haiti 44 manifest codes | **PASS** |
| CT MSK aliases must not conflate `MODALITY_CT` with `CTA_*` | **PASS** — distinct codes and labels |
| XR shoulder girdle vs Wave 2 `XR_SHOULDER_*` | **PASS** — AC/clavicle/scapula subregions, not duplicate shoulder 2V/3V codes |
| Retirement conflicts | **PASS** — `retirementImpact=NONE` on all 31 |
| Successor conflicts | **PASS** — `successorImpact=NONE` on all 31 |
| Global production duplicate alias strings (pre-existing) | **6** groups — re-validate at staging; not introduced by Wave 4 design |

---

*No alias DB writes in 2E.8A.*
