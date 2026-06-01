# Wave 2 Alias Package (Phase 2E.6A)

**Phase:** 2E.6A — design only  
**Date:** 2026-05-31  
**Workbook source:** `aliasRequired` on `wave=2` rows + 2E.2A/2B/2D legacy mapping

---

## 1. Summary (workbook-derived)

| Class | Catalog codes | Alias strings (est.) |
|-------|--------------|---------------------:|
| **REQUIRED** | **2** | **≥6** (≥3 per code) |
| **OPTIONAL** | **59** | **~55–75** |
| **NONE** | **0** | — |
| **US tuple pass** *(existing codes, 0 inserts)* | **15** protocols | See staging plan |

| Metric | Count |
|--------|------:|
| **Total alias strings (Wave 2 scope, est.)** | **~65–85** |
| **Required alias codes (workbook)** | **2** |
| **Duplicate alias conflicts (within Wave 2 design)** | **0** |
| **Cross-wave collision (design-time)** | **0** |

---

## 2. REQUIRED (`aliasRequired=REQUIRED`)

| catalogCode | Minimum strings | Legacy labels (2E.2A) |
|-------------|----------------:|----------------------|
| `XR_CALCANEUS_LEFT_2V` | **3** | Os Calcis Left 2V; calcaneus left; calcanéus gauche |
| `XR_CALCANEUS_RIGHT_2V` | **3** | Os Calcis Right 2V; calcaneus right; calcanéus droite |

---

## 3. OPTIONAL (`aliasRequired=OPTIONAL` — 59 codes)

Highest-value groups for 2E.6B authoring:

| Batch | Codes | Example legacy / shorthand |
|-------|------:|----------------------------|
| XR-2 MSK | 51 (excl. REQUIRED) | Ankle 2V/3V; Knee 2V/3V/4V; Sunrise; Hand/Foot bilateral |
| CT-2 CTA | 4 | CTA LE/UE left/right; angioscanner membre |
| US-1 | 4 | Thyroid; Aorta; Bladder; Chest US |

**Adoption backlog (non-blocking, from 2E.5C):** optional strings `lumbar spine xray`, `radiographie lombaire` on lumbar XR (Wave 1 codes — not Wave 2 inserts).

*Full OPTIONAL authoring is implementation-phase (2E.6B); not blocking staging authorization.*

---

## 4. NONE

**0** Wave 2 workbook rows have `aliasRequired=NONE`.

---

## 5. Verification

| Check | Result |
|-------|--------|
| No duplicate alias → two Wave 2 codes (design) | **PASS** |
| No alias targeting retired `CT_HEAD` | **PASS** |
| No alias recreating `DOPPLER_VEIN` / `US_ABD` / `CT_ABD` | **PASS** |
| No collision with Wave 1 alias set (distinct codes) | **PASS** |
| No collision with Haiti 44 codes (distinct codes) | **PASS** |
| CTA aliases must not map to `CTA_CHEST` / `CTA_HEAD_NECK` | **PASS** (distinct codes) |
| Global production duplicate alias strings (pre-existing) | **6** — re-validate at staging; not introduced by Wave 2 design |

---

*No alias DB writes in 2E.6A.*
