# Imaging Taxonomy Schema Design

**Phase:** 3C (design-only)  
**Inputs:** Phase 3B taxonomy foundation, gap analysis, normalization rules  
**Status:** Proposed architecture — not implemented

---

## 1. Architecture options analysis

### Option A — Generic `TermClassifier` model (extend current)

Extend the existing MRV pattern: new classifier **domains** seeded into `TermClassifier`; new nullable **FK columns** on `CatalogImagingStudy` pointing to domain-filtered classifiers.

| Pros | Cons |
|------|------|
| Already implemented for MODALITY, BODY_REGION, CONTRAST_TYPE, VIEW_COUNT | Domain discipline enforced by convention + seed guards, not DB enum |
| Shared seed pipeline (`seed-mrv-classifiers.ts`) | `TermClassifier` relations grow with each new FK |
| Shared backfill audit (`CatalogClassifierBackfillAudit`) | Imaging-only domains mixed with LAB_CATEGORY in same table |
| Shared bilingual labels + aliases | No structured parent/child between BODY_REGION and ANATOMIC_SUBREGION |
| Lab catalog already uses same model | |
| Feature-flag rollout proven (2B.2) | |

### Option B — Imaging-specific taxonomy tables

New tables e.g. `ImagingTaxonomyDomain`, `ImagingTaxonomyValue`, `CatalogImagingStudyTaxonomy` junction with typed columns or JSON blob.

| Pros | Cons |
|------|------|
| Imaging-only schema clarity | **Duplicates** MRV infrastructure |
| Could encode hierarchy (region → subregion) | New seed, backfill, search, audit paths |
| | Breaks Phase 2B.2 investment |
| | Two terminology systems for clinical catalogs (lab vs imaging) |
| | Higher migration and maintenance cost |

### Option C — Hybrid model

Keep `TermClassifier` for vocabulary; add `CatalogImagingStudyTaxonomyProfile` (1:1) with optional JSON or typed columns for imaging-only attributes (protocol parameters, NM tracer, fluoro duration).

| Pros | Cons |
|------|------|
| Vocabulary stays centralized | Two sources of truth per catalog row |
| Room for protocol-specific metadata later | JSON blob hurts query/index governance |
| | Over-engineered for Phase 1 clinic MVP |
| | Backfill complexity |

---

## 2. Recommendation: **Option A — Extended generic `TermClassifier`**

**Rationale:**

1. Phase 2B.2 explicitly designed `TermClassifier` as **Medora Reference Vocabulary** for catalog classifiers — not lab-only.
2. `CatalogImagingStudy` already has four classifier FKs with `onDelete: SetNull` — adding three more follows established pattern (`20260901120000_mrv_classifier_foundation`).
3. Billing guard tests require classifiers **not** in billing path — generic model preserves that boundary.
4. Enterprise scale (~100–150 catalog rows + classifiers) does not justify parallel taxonomy tables.
5. Parent/child (BODY_REGION vs ANATOMIC_SUBREGION) can be governed by **normalization rules** and seed aliases without DB hierarchy.

**Defer Option C** until a concrete protocol requires non-vocabulary attributes (e.g. NM radiopharmaceutical dose) — out of Phase 1 scope.

---

## 3. Current architecture

```
TermClassifier (domain, code, labels, aliases)
    ↑ FK (nullable, SetNull)
CatalogImagingStudy
    ├── modality / bodyRegion (legacy strings)
    ├── modalityClassifierId
    ├── bodyRegionClassifierId
    ├── contrastTypeClassifierId
    └── viewCountClassifierId
    ↑ catalogItemId (UUID)
OrderItem (IMAGING_STUDY) — no classifier snapshot
    → chart/worklist join catalog at read time
```

**Classifier domains seeded today:** MODALITY (4), BODY_REGION (28), VIEW_COUNT (1), CONTRAST_TYPE (2), LAB_CATEGORY (16).

**Runtime:** Classifier read/search off by default (`terminology-flags.util.ts`).

---

## 4. Target architecture

```
TermClassifier
  domains:
    MODALITY          (+ CTA, MRA, NM, FL proposed)
    BODY_REGION       (+ expansions)
    VIEW_COUNT        (+ ONE, THREE, FOUR, COMPLETE)
    CONTRAST_TYPE     (+ WITH, WITH_AND_WITHOUT, NONE)
    LATERALITY        (NEW)
    ANATOMIC_SUBREGION (NEW)
    PROTOCOL          (NEW)

CatalogImagingStudy
  existing FKs (unchanged)
  + lateralityClassifierId       → TermClassifier WHERE domain=LATERALITY
  + anatomicSubregionClassifierId → TermClassifier WHERE domain=ANATOMIC_SUBREGION
  + protocolClassifierId         → TermClassifier WHERE domain=PROTOCOL
  legacy strings retained (transitional)

CatalogClassifierBackfillAudit
  fieldName values extended for new FK columns
```

### 4.1 Prisma schema changes (proposed)

**`CatalogImagingStudy` — add columns:**

| Column | Type | Relation name |
|--------|------|---------------|
| `lateralityClassifierId` | `String?` | `ImagingLateralityClassifier` |
| `anatomicSubregionClassifierId` | `String?` | `ImagingAnatomicSubregionClassifier` |
| `protocolClassifierId` | `String?` | `ImagingProtocolClassifier` |

**`TermClassifier` — add reverse relations:**

```prisma
imagingLaterality       CatalogImagingStudy[] @relation("ImagingLateralityClassifier")
imagingAnatomicSubregion CatalogImagingStudy[] @relation("ImagingAnatomicSubregionClassifier")
imagingProtocol         CatalogImagingStudy[] @relation("ImagingProtocolClassifier")
```

**Indexes:** one index per new FK column (match existing pattern).

**FK policy:** `onDelete: SetNull`, `onUpdate: NoAction` — same as existing classifier FKs.

**No changes to:** `OrderItem`, `ImagingStudyAlias`, `BillingCatalog`, `Order` tables.

### 4.2 Domain vocabulary (initial seed targets)

#### LATERALITY (4 values)

| Code | EN | FR |
|------|----|----|
| `LATERALITY_LEFT` | Left | Gauche |
| `LATERALITY_RIGHT` | Right | Droit |
| `LATERALITY_BILATERAL` | Bilateral | Bilatéral |
| `LATERALITY_UNSPECIFIED` | Unspecified | Non précisé |

#### ANATOMIC_SUBREGION (starter set — expand in 3D workbook)

| Code | Example legacy driver |
|------|----------------------|
| `ANATOMIC_SUBREGION_SPINE_CERVICAL` | C-Spine XR/CT |
| `ANATOMIC_SUBREGION_SPINE_THORACIC` | T-Spine |
| `ANATOMIC_SUBREGION_SPINE_LUMBAR` | L-Spine XR |
| `ANATOMIC_SUBREGION_SPINE_SACRUM_COCCYX` | Coccyx and Sacrum |
| `ANATOMIC_SUBREGION_ORBIT` | Orbit Left/Right |
| `ANATOMIC_SUBREGION_SINUS` | Sinus Complete |
| `ANATOMIC_SUBREGION_RIBS` | Ribs Left/Right |
| `ANATOMIC_SUBREGION_FINGER` | Finger *V |
| `ANATOMIC_SUBREGION_TOE` | Toe *V |
| `ANATOMIC_SUBREGION_AC_JOINT` | AC Joint * |
| … | ~30–50 total per Phase 3B estimate |

**Rule:** `BODY_REGION` remains coarse anchor; `ANATOMIC_SUBREGION` refines when legacy name specifies subregion (spine level, digit, orbit). Both may be set.

#### PROTOCOL (starter set)

| Code | Example legacy driver |
|------|----------------------|
| `PROTOCOL_CTA_CHEST_TRIPLE_RULE_OUT` | CTA Chest Triple Rule Out |
| `PROTOCOL_CT_CAP_TRAUMA` | CT CAP trauma / pan scan |
| `PROTOCOL_US_FAST` | FAST |
| `PROTOCOL_US_OB_FIRST_TRIMESTER` | US OB <14 Weeks * |
| `PROTOCOL_US_OB_LATE_TRIMESTER` | US OB >14 Weeks * |
| `PROTOCOL_US_OB_BPP` | Biophysical Profile |
| `PROTOCOL_XR_CHEST_POST_INTUBATION` | Chest Post Intubation |
| `PROTOCOL_NM_HIDA` | HIDA Scan |
| `PROTOCOL_NM_VQ` | VQ Scan * |
| `PROTOCOL_FL_TUBE_PLACEMENT` | Tube Placement Fluoro |
| … | ~40–60 total per Phase 3B estimate |

### 4.3 Expanded existing domains (no new FK — seed only)

| Domain | Additions |
|--------|-----------|
| MODALITY | `MODALITY_CTA`, `MODALITY_MRA`, `MODALITY_NM`, `MODALITY_FL` |
| CONTRAST_TYPE | `CONTRAST_TYPE_WITH`, `CONTRAST_TYPE_WITH_AND_WITHOUT`, `CONTRAST_TYPE_NONE` |
| VIEW_COUNT | `VIEW_COUNT_ONE`, `VIEW_COUNT_THREE`, `VIEW_COUNT_FOUR`, `VIEW_COUNT_COMPLETE` |
| BODY_REGION | Ribs, sternum, breast, thyroid, bladder, aorta, upper extremity, etc. |

These use **existing FK columns** — no schema migration beyond optional if none needed.

---

## 5. Domain governance rules

| Rule | Enforcement |
|------|-------------|
| Domain string max 32 chars | `@db.VarChar(32)` on `TermClassifier.domain` |
| Code max 64 chars | `@db.VarChar(64)` |
| Unique (domain, code) | DB unique constraint |
| Forbidden domains | `seed-mrv-classifiers.ts` — extend blocklist if needed |
| Forbidden codes | e.g. keep `CONTRAST_TYPE_UNSPECIFIED` blocked; use `LATERALITY_UNSPECIFIED` instead |
| Domain count verification | Extend `MRV_CLASSIFIER_DOMAIN_COUNTS` after each seed batch |
| Deactivate, never delete | `isActive: false` on retired classifiers; FK SetNull |

---

## 6. Compatibility matrix

| Consumer | Impact of new FKs | Mitigation |
|----------|-------------------|------------|
| **OrderItem** | None — stores `catalogItemId` UUID only | No migration |
| **Historical orders** | Chart reload joins catalog by ID; inactive catalog still loads | Unchanged behavior |
| **Display labels** | `displayNameEn`/`Fr` remain primary; classifiers enrich meta line only | Do not change display names during backfill |
| **Billing** | Classifiers not in billing path (guarded by tests) | No billing schema change |
| **Search** | Optional OR clauses when `TERMINOLOGY_SEARCH_CLASSIFIER=true` | Extend `imagingClassifierSearchOr` |
| **Retirement (2C/2D)** | Successor row receives classifier tuple; predecessor deactivated | Retirement scripts do not clear successor FKs |
| **Audit** | `CatalogClassifierBackfillAudit` logs new field names | Extend backfill service |
| **Chart export** | Uses order enrichment labels + legacy modality string | Classifier meta optional; export unchanged unless flag on |
| **ROI / reporting** | Aggregates by `CatalogImagingStudy.code` today | Future: report dimensions from classifier domains (Phase 5+) |
| **Offline readiness** | Classifier IDs are stable UUIDs; vocabulary seedable | Compatible with future sync |
| **Enterprise catalog (~267 legacy)** | Hybrid row + tuple model per Phase 3B | New rows get full tuple at seed time |

---

## 7. `packages/shared` impact (future implementation)

**Phase 3C design only — no changes now.**

| Area | Recommendation |
|------|----------------|
| `CatalogImagingLabel` type | Optionally add classifier summary fields for chart meta (read-only) |
| Order line snapshot | **Do not** add classifier FKs to `OrderItem` in Phase 3C/3D — catalog join sufficient for MVP |
| Laterality at order time | `OrderItem.manualSecondaryText` already exists for imaging precision; future phase may formalize |

**Note:** `PROCEDURE_LATERALITY_VALUES` in `encounterProcedureAdvanced.ts` is procedure-documentation only — not reusable as catalog FK without aliasing to `LATERALITY_*` classifiers.

---

## 8. Search architecture (target)

**Layer 1 (unchanged):** Legacy string `contains` on code, names, searchText, modality, bodyRegion.

**Layer 2 (flag-gated):** Classifier alias + searchText match on all seven imaging FK relations.

**Layer 3 (unchanged):** `ImagingStudyAlias` table + `IMAGING_ALIAS_CODE_MAP` exact shortcuts.

**Ranking (unchanged):** `catalog-search-rank.util.ts` — tier + essential + sortPriority; classifiers do not affect rank in 3C design.

**Meta line (extend):** `buildImagingClassifierMetaLine` — today modality + body region only; future: append laterality/view/contrast when read flag on (display density rule: keep compact for operational boards).

---

## 9. Alias architecture (target)

| Alias type | Owner | Rule |
|------------|-------|------|
| Catalog row aliases | `ImagingStudyAlias` | Legacy synonyms → canonical **code**; retirement transfers per Phase 2C |
| Classifier aliases | `TermClassifierAlias` | Vocabulary synonyms (e.g. "2V" → VIEW_COUNT_TWO) |
| Search shortcuts | `IMAGING_ALIAS_CODE_MAP` | Exact query → single canonical code post-retirement |

**Collision policy:** Global alias uniqueness not enforced across studies — Phase 2C governance scans required before expansion.

---

## 10. What this design explicitly does not include

- New catalog rows (Phase 2E / 3D+)
- CPT / billing mapping changes
- `OrderItem` classifier snapshot columns
- Imaging-specific taxonomy tables (Option B)
- JSON taxonomy profile blob (Option C)
- Facility-scoped classifier overrides (Phase 6+)

---

*Phase 3C — design only. No schema migration applied.*
