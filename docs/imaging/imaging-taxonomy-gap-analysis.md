# Imaging Taxonomy Gap Analysis

**Phase:** 3B (audit-only)  
**Baseline:** Phase 3A legacy inventory (267 studies) vs Medora MRV + `CatalogImagingStudy` schema  
**Medora catalog:** 44 seed rows (43 active)

---

## 1. Executive summary

| Classifier dimension | Schema FK | Seeded values | Backfill map | Search integrated | Legacy coverage |
|---------------------|-----------|--------------:|--------------|-------------------|-----------------|
| **MODALITY** | Yes | 4 | Yes | Yes | **Partial** — missing NM, FL, MRA, CTA-as-distinct |
| **BODY_REGION** | Yes | 28 | Yes (30 legacy keys) | Yes | **Partial** — ~40+ legacy regions unmapped |
| **CONTRAST_TYPE** | Yes | 2 | Yes (5 codes) | Yes | **Critical gap** — no WITH / WWO; 9 manual-review CT/MRI |
| **VIEW_COUNT** | Yes | 1 | Yes (1 code) | Yes | **Critical gap** — 1/118 XR legacy variants covered |
| **LATERALITY** | **No** | 0 | **No** | **No** | **Absent** — ~90+ legacy studies encode Left/Right/Bilat |
| **ANATOMIC_SUBREGION** | **No** | 0 | **No** | **No** | **Absent** — spine segments, digits, specialty regions |
| **PROTOCOL** | **No** | 0 | **No** | **No** | **Absent** — PE, trauma CAP, OB phases, NM, fluoro |

---

## 2. Current classifier inventory (seeded)

**Source:** `apps/api/prisma/data/mrv-classifier-foundation.ts`

### MODALITY (4)

| Code | EN label | Legacy family served |
|------|----------|---------------------|
| `MODALITY_XR` | X-ray | X-Ray (118) |
| `MODALITY_US` | Ultrasound | Ultrasound (53) |
| `MODALITY_CT` | CT | CT (43) + CTA (12) folded in |
| `MODALITY_MRI` | MRI | MRI (27) |

### BODY_REGION (28)

Covers Haiti seed MSK + ED core: chest, abdomen, pelvis, head, spine (generic + cervical), kidney, obstetrical, scrotum, soft tissue, vascular, lower extremity, and MSK joints (knee, ankle, wrist, shoulder, elbow, forearm, hand, hip, thigh, leg, foot, arm).

**Not covered** (examples from legacy inventory):

- Thoracic spine, lumbar spine (XR), coccyx/sacrum
- Ribs, sternum, clavicle, scapula, AC joint
- Facial bones, mandible, orbit, sinus, skull, nasal bones, TMJ
- Finger, toe, calcaneus/os calcis
- Breast, thyroid/neck, bladder, groin, axilla
- Aorta (US), upper extremity (vascular)

### VIEW_COUNT (1)

| Code | Legacy match |
|------|--------------|
| `VIEW_COUNT_TWO` | `XR_CHEST_2V` only via backfill allowlist |

### CONTRAST_TYPE (2)

| Code | Legacy match |
|------|--------------|
| `CONTRAST_TYPE_WITHOUT` | `CT_HEAD_WO_CONTRAST` |
| `CONTRAST_TYPE_ANGIOGRAPHIC` | CTA rows (4 codes) |

**Manual review list (9 CT/MRI codes):** contrast unspecified — excluded from backfill (`CONTRAST_MANUAL_REVIEW_IMAGING_CODES`).

---

## 3. Missing classifier inventory (required for legacy parity)

### P0 — Extend existing domains (no schema change)

| Domain | Missing values (estimated) | Legacy drivers |
|--------|---------------------------:|----------------|
| `MODALITY` | +4 (`CTA`, `MRA`, `NM`, `FL`) | 12 + 5 + 5 + 4 legacy studies |
| `CONTRAST_TYPE` | +3 (`WITH`, `WITH_AND_WITHOUT`, `NONE`) | All CT/MRI contrast variants (~40 rows) |
| `VIEW_COUNT` | +4 (`ONE`, `THREE`, `FOUR`, `COMPLETE`) | XR view variants (~100 rows) |
| `BODY_REGION` | +25–35 subregions | Spine XR, head/face, ribs, breast, vascular territories |

### P1 — New domains (schema + FK required)

| Domain | Est. values | FK on `CatalogImagingStudy` | Legacy drivers |
|--------|------------:|----------------------------|----------------|
| `LATERALITY` | 4 | **New column** `lateralityClassifierId` | Any Left/Right/Bilat legacy row |
| `ANATOMIC_SUBREGION` | 30–50 | **New column** `anatomicSubregionClassifierId` | Spine level, digits, orbits, etc. |

### P2 — New domains (protocol-specific)

| Domain | Est. values | FK | Legacy drivers |
|--------|------------:|-----|----------------|
| `PROTOCOL` | 40–60 | **New column** `protocolClassifierId` | CTA triple rule-out, OB TV/BPP, NM HIDA/VQ, fluoro LP/tube |

---

## 4. Per legacy family — classifier support matrix

Legend: ✅ Seeded + backfill path | ⚠️ Partial | ❌ Missing

| Family | Studies | MODALITY | BODY_REGION | LATERALITY | CONTRAST | VIEW_COUNT | SUBREGION | PROTOCOL |
|--------|--------:|----------|-------------|------------|----------|------------|-----------|----------|
| **X-Ray** | 118 | ✅ XR | ⚠️ MSK ok; spine/face missing | ❌ | N/A | ❌ (1/118) | ❌ | ⚠️ (KUB, decub, post-intub) |
| **CT** | 43 | ✅ CT | ⚠️ | ❌ MSK/extremity | ❌ w/wo/w&wo | N/A | ❌ STN, face, orbit | ❌ perfusion, HR |
| **CTA** | 12 | ⚠️ folded into CT | ⚠️ | ❌ extremity | ⚠️ angio only | N/A | ❌ | ❌ triple rule-out, runoff |
| **MRI** | 27 | ✅ MRI | ⚠️ spine generic only | ❌ extremity | ❌ | N/A | ❌ sella, cholangiogram | ❌ |
| **MRA** | 5 | ❌ | ❌ | ❌ | ⚠️ | N/A | ❌ carotid/brain | ❌ |
| **Ultrasound** | 53 | ✅ US | ⚠️ | ❌ | N/A | N/A | ⚠️ RUQ/scrotum ok | ❌ OB phases, Doppler protocols |
| **Nuclear Medicine** | 5 | ❌ | ❌ | N/A | N/A | N/A | ❌ | ❌ HIDA/VQ |
| **Fluoroscopy** | 4 | ❌ | ❌ | N/A | N/A | N/A | ❌ | ❌ |

---

## 5. Medora catalog row classifier coverage (44 rows)

**Backfill sources:** `catalog-classifier-backfill-map.ts`, `catalog-classifier-backfill.service.ts`

| Classifier | Rows with deterministic backfill | Manual review | No path |
|------------|-----------------------------------:|--------------:|--------:|
| `modalityClassifierId` | 44 (via `modality` string) | 0 | 0 |
| `bodyRegionClassifierId` | ~44 (30 legacy keys mapped) | 0 | 0 if key in map |
| `contrastTypeClassifierId` | 5 allowlist | 9 CT/MRI | ~30 unset |
| `viewCountClassifierId` | 1 (`XR_CHEST_2V`) | 0 | 16 XR + others |

**Runtime read/search:** Classifier labels appear in search meta **only when** `TERMINOLOGY_READ_CLASSIFIER` / `TERMINOLOGY_SEARCH_CLASSIFIER` env flags are `true` (default off).

---

## 6. Migration impact assessment

### 6.1 Schema changes required (future — not in 3B)

| Change | Risk | Notes |
|--------|------|-------|
| Add `TermClassifier` rows (existing domains) | **Low** | Seed-only; no migration |
| Add `lateralityClassifierId` FK | **Medium** | Nullable FK + index; backward compatible |
| Add `anatomicSubregionClassifierId` FK | **Medium** | Same pattern |
| Add `protocolClassifierId` FK | **Medium** | Same pattern |
| Expand `TermClassifier.domain` enum discipline | **Low** | Domain is free string `@db.VarChar(32)` today |

**No migration required** for P0 vocabulary expansion if only adding seed rows + backfill map entries.

### 6.2 Data migration / backfill

| Task | Impact |
|------|--------|
| Re-run `backfill-catalog-classifiers.ts` | Updates FK columns; writes audit rows |
| Map 267 legacy labels → classifier tuples | New normalization workbook (Phase 3C+) |
| Retire duplicate pairs (Phase 2D) | Predecessor rows deactivated; classifiers on successor |

**Order safety:** `OrderItem.catalogItemId` is UUID — classifier backfill does **not** rewrite order references.

### 6.3 Runtime impact

| Surface | Impact when flags enabled |
|---------|---------------------------|
| Imaging search | Additional OR clauses via classifier aliases |
| Search DTO meta line | Modality + body region labels from classifiers |
| Billing | **None** — billing uses `code` / `BillingCatalog.externalCode` |
| Chart / legal record | Display uses catalog labels at order time; classifiers are enrichment only |

---

## 7. Catalog impact assessment

### 7.1 Row explosion vs classifier composition

| Strategy | 267 legacy orderables | Pros | Cons |
|----------|----------------------:|------|------|
| **A — 267 catalog rows** | 267 new codes | 1:1 ordering parity | Duplicate governance nightmare; search bloat |
| **B — Classifier-composed catalog** | ~80–120 canonical rows | Governed; fewer duplicates | Requires full taxonomy (P0–P2) |
| **C — Hybrid (recommended)** | Expand to ~100–150 rows + classifiers | Billing-distinct exams stay separate rows; laterality/views as classifiers when CPT shared | Requires normalization rules (see `imaging-normalization-rules.md`) |

Phase 3A showed **51% MISSING** with strategy implicit-A against 44 rows. Strategy C aligns with Phase 2E batch plan.

### 7.2 Catalog fields unchanged in 3B

No changes to: `haiti-imaging-studies.ts`, aliases, search shortcuts, billing maps, successor maps.

### 7.3 Blockers before catalog expansion

1. Phase **2D** duplicate retirements incomplete (4 dual-active pairs).
2. **P0 classifier vocabulary** not expanded (contrast, view, modality families).
3. **P1 laterality** domain undefined in schema.
4. Licensed CPT workbook still `pending_license` for all 44 rows.

---

## 8. Gap closure sequencing (reference)

| Phase | Scope |
|-------|-------|
| **3B** *(this audit)* | Taxonomy design + gap documentation |
| **3C** *(future)* | Classifier vocabulary spec + normalization workbook |
| **3D** *(future)* | Schema FK additions for LATERALITY / SUBREGION / PROTOCOL |
| **2E.x** *(future)* | Batch catalog expansion using taxonomy |

---

*Phase 3B — audit only. No implementation.*
