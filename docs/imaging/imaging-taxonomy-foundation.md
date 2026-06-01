# Imaging Taxonomy Foundation

**Phase:** 3B (audit-only)  
**Inputs:** Phase 3A legacy inventory (267 studies), MRV classifier foundation (Phase 2B.2), `CatalogImagingStudy` schema  
**Status:** Design reference — not implemented

---

## 1. Purpose

Define a **canonical imaging taxonomy** for Medora that can represent legacy enterprise radiology orderables (~267 rows) without requiring 267 unconstrained free-text catalog codes.

The taxonomy separates:

| Layer | Role | Mutability |
|-------|------|------------|
| **Stable catalog identity** | `CatalogImagingStudy.code` + UUID | Immutable after orders exist |
| **Canonical classifiers** | `TermClassifier` domains (MRV) | Governed vocabulary; bilingual labels |
| **Legacy string fields** | `modality`, `bodyRegion`, `searchText` | Transitional; backfilled from classifiers |
| **Presentation** | `displayNameEn`, `displayNameFr` | Curated per locale |

---

## 2. Current repository architecture (read-only)

### 2.1 Database — `CatalogImagingStudy`

**Source:** `apps/api/prisma/schema.prisma`

| Field | Type | Taxonomy role |
|-------|------|---------------|
| `code` | String @unique | Stable catalog key |
| `modality` | String? | Legacy free-text (`XR`, `US`, `CT`, `MRI`) |
| `bodyRegion` | String? | Legacy free-text (30+ inconsistent values) |
| `modalityClassifierId` | FK → `TermClassifier` | **Canonical modality** |
| `bodyRegionClassifierId` | FK → `TermClassifier` | **Canonical body region** |
| `contrastTypeClassifierId` | FK → `TermClassifier` | **Canonical contrast** |
| `viewCountClassifierId` | FK → `TermClassifier` | **Canonical view count** |
| *(none)* | — | **Laterality, protocol, anatomic subregion — not modeled** |

Relations: `onDelete: SetNull` on classifier FKs (safe for classifier retirement).

### 2.2 Database — `TermClassifier` system

**Source:** `apps/api/prisma/schema.prisma`, `apps/api/prisma/data/mrv-classifier-foundation.ts`

| Component | Purpose |
|-----------|---------|
| `TermClassifier` | Domain + code + sort + searchText |
| `TermClassifierLabel` | Bilingual display (`fr`, `en`) |
| `TermClassifierAlias` | Search synonyms |
| `CatalogClassifierBackfillAudit` | Append-only backfill audit trail |

**Seeded imaging domains today:**

| Domain | Seeded values | Used on `CatalogImagingStudy` |
|--------|--------------:|------------------------------|
| `MODALITY` | 4 | Yes (`modalityClassifierId`) |
| `BODY_REGION` | 28 | Yes (`bodyRegionClassifierId`) |
| `VIEW_COUNT` | 1 | Yes (`viewCountClassifierId`) |
| `CONTRAST_TYPE` | 2 | Yes (`contrastTypeClassifierId`) |
| `LAB_CATEGORY` | 16 | No (lab only) |

### 2.3 Runtime integration

| Path | Role |
|------|------|
| `apps/api/prisma/helpers/seed-mrv-classifiers.ts` | Seeds `MRV_CLASSIFIER_FOUNDATION` |
| `apps/api/src/terminology/catalog-classifier-backfill.service.ts` | Backfills classifier FKs from legacy strings / code allowlists |
| `apps/api/src/terminology/catalog-classifier-backfill-map.ts` | Static legacy → classifier maps |
| `apps/api/src/terminology/terminology-classifier-search.util.ts` | Optional classifier-aware search OR clauses |
| `apps/api/src/terminology/terminology-flags.util.ts` | Feature flags (default **off**): `TERMINOLOGY_READ_CLASSIFIER`, `TERMINOLOGY_SEARCH_CLASSIFIER`, `TERMINOLOGY_BACKFILL_ENABLED` |
| `apps/api/src/terminology/resolve-classifier-catalog-meta.util.ts` | Builds FR meta line from modality + body region classifiers only |
| `apps/api/src/order-catalog/imaging-catalog.service.ts` | Primary search; legacy string `contains` + optional classifier search |
| `apps/api/src/order-catalog/catalog-search.mapper.ts` | Maps imaging rows to search DTO; classifier meta line when read flag on |

**Billing:** Classifiers are **not** used in billing resolution (`imaging-successor-billing.spec.ts` asserts no classifier billing path).

### 2.4 Shared package

**Source:** `packages/shared/src/schemas/encounterProcedureAdvanced.ts`

- `PROCEDURE_LATERALITY_VALUES`: `LEFT`, `RIGHT`, `OTHER` — **procedure documentation only**, not wired to `CatalogImagingStudy`.

No imaging taxonomy types exist in `packages/shared` today.

---

## 3. Recommended canonical taxonomy model

### 3.1 Classifier domains (target state)

| Domain | Required for legacy parity | Schema FK today | Priority |
|--------|---------------------------|-----------------|----------|
| `MODALITY` | Yes | Yes | **P0 — extend values** |
| `BODY_REGION` | Yes | Yes | **P0 — extend values** |
| `CONTRAST_TYPE` | Yes (CT/MRI/CTA) | Yes | **P0 — extend values** |
| `VIEW_COUNT` | Yes (XR primarily) | Yes | **P0 — extend values** |
| `LATERALITY` | Yes (118+ legacy XR/US/CT rows) | **No** | **P1 — new domain + FK** |
| `ANATOMIC_SUBREGION` | Yes (RUQ, C-spine, orbit, etc.) | **No** | **P1 — new domain + FK** |
| `PROTOCOL` | Yes (PE, trauma CAP, OB dating, triple rule-out) | **No** | **P2 — new domain + FK** |
| `EXAM_INTENT` | Optional (screening vs diagnostic, portable) | **No** | **P3** |

### 3.2 Modality family normalization (maps Phase 3A families → `MODALITY`)

| Phase 3A family | Target classifier(s) | Notes |
|-----------------|------------------------|-------|
| X-Ray | `MODALITY_XR` | Exists |
| CT | `MODALITY_CT` | Exists |
| CTA | **`MODALITY_CTA`** (new) or `MODALITY_CT` + `CONTRAST_TYPE_ANGIOGRAPHIC` | Today CTA rows use `modality: CT` |
| MRI | `MODALITY_MRI` | Exists |
| MRA | **`MODALITY_MRA`** (new) | Entire family absent |
| Ultrasound | `MODALITY_US` | Exists; duplex may need **`MODALITY_US_DOPPLER`** sub-modality |
| Nuclear Medicine | **`MODALITY_NM`** (new) | Absent |
| Fluoroscopy | **`MODALITY_FL`** (new) | Absent |

### 3.3 Contrast type normalization (target vocabulary)

| Legacy pattern | Target `CONTRAST_TYPE` code |
|----------------|----------------------------|
| `wo IV Contrast` / `wo Contrast` / `sans contraste` | `CONTRAST_TYPE_WITHOUT` *(exists)* |
| `w IV Contrast` / `w Contrast` | `CONTRAST_TYPE_WITH` *(new)* |
| `w&wo IV Contrast` | `CONTRAST_TYPE_WITH_AND_WITHOUT` *(new)* |
| CTA / angiographic | `CONTRAST_TYPE_ANGIOGRAPHIC` *(exists)* |
| None (plain XR, most US) | `CONTRAST_TYPE_NONE` *(new)* or null FK |

### 3.4 View count normalization (target vocabulary)

| Legacy pattern | Target `VIEW_COUNT` code |
|----------------|-------------------------|
| `1V`, single view, CXR 1 view | `VIEW_COUNT_ONE` *(new)* |
| `2V`, `2 View` | `VIEW_COUNT_TWO` *(exists)* |
| `3V`, `4V`, `Complete` | `VIEW_COUNT_THREE`, `VIEW_COUNT_FOUR`, `VIEW_COUNT_COMPLETE` *(new)* |
| Sunrise, decub, upright | **`VIEW_PROJECTION_*`** or protocol domain *(P2)* |

### 3.5 Laterality normalization (target vocabulary — not in schema)

| Legacy pattern | Target `LATERALITY` code |
|----------------|-------------------------|
| Left | `LATERALITY_LEFT` |
| Right | `LATERALITY_RIGHT` |
| Bilateral / Bilat | `LATERALITY_BILATERAL` |
| Unspecified | `LATERALITY_UNSPECIFIED` |

### 3.6 Body region vs anatomic subregion

**`BODY_REGION`** — coarse anatomic anchor (28 values today; sufficient for ~60% of legacy MSK XR).

**`ANATOMIC_SUBREGION`** *(new)* — finer slices required for legacy parity:

- Spine segments: cervical / thoracic / lumbar / thoracolumbar / coccyx
- MSK subunits: finger, toe, calcaneus, clavicle, scapula, AC joint
- Head/neck: orbit, sinus, mandible, TMJ, soft tissue neck
- Vascular: aorta, carotid, runoff territories

### 3.7 Protocol normalization (target vocabulary — not in schema)

Examples from legacy inventory requiring `PROTOCOL` (not expressible as view/contrast alone):

| Legacy example | Proposed `PROTOCOL` code |
|----------------|-------------------------|
| CTA Chest Triple Rule Out | `PROTOCOL_CTA_CHEST_TRIPLE_RULE_OUT` |
| CT Chest/Abdomen/Pelvis trauma | `PROTOCOL_CT_CAP_TRAUMA` *(partial: `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` exists as row)* |
| US OB Biophysical Profile | `PROTOCOL_US_OB_BPP` |
| US FAST | `PROTOCOL_US_FAST` *(partial: dedicated catalog row)* |
| Chest Post Intubation | `PROTOCOL_XR_CHEST_POST_INTUBATION` |
| HIDA / VQ / perfusion NM | `PROTOCOL_NM_*` family |

---

## 4. Catalog row composition model

A legacy orderable maps to a **catalog identity** plus **classifier tuple**:

```
CatalogImagingStudy
  code: stable immutable key
  displayNameEn / displayNameFr: curated labels
  classifier tuple:
    MODALITY *
    BODY_REGION *
    LATERALITY (future)
    ANATOMIC_SUBREGION (future)
    CONTRAST_TYPE (when applicable)
    VIEW_COUNT (when applicable)
    PROTOCOL (when applicable)
```

**Design rule:** Do not encode laterality, contrast, and view count only in `code` string permutations unless billing requires distinct orderable UUIDs.

**Duplicate governance:** When two catalog rows differ only by deprecated naming (Phase 2C/2D pairs), classifiers should converge on the **successor** tuple; predecessor rows retire.

---

## 5. Feature-flag rollout model (existing)

| Flag | Effect |
|------|--------|
| `TERMINOLOGY_BACKFILL_ENABLED` | Runs classifier FK backfill script |
| `TERMINOLOGY_READ_CLASSIFIER` | Search DTO meta line uses classifier labels |
| `TERMINOLOGY_SEARCH_CLASSIFIER` | Search queries include classifier alias matches |

Taxonomy expansion should remain **flag-gated** until bilingual labels and backfill audits pass.

---

## 6. Relationship to Phase 3A findings

| Phase 3A metric | Taxonomy implication |
|-----------------|---------------------|
| 267 legacy studies | Cannot map 1:1 to 44 rows without classifier dimensions |
| 107 PARTIAL | Partial = classifier tuple incomplete vs legacy |
| 137 MISSING | Missing = modality and/or body region not in seed **and** no classifier path |
| 53 missing XR | Requires VIEW_COUNT + LATERALITY + ANATOMIC_SUBREGION expansion |
| 25 missing CT | Requires CONTRAST_TYPE variants + MSK body regions + PROTOCOL |
| NM + FL + MRA absent | Requires new MODALITY classifiers before any rows |

---

## 7. Governance ownership

| Concern | Owner module |
|---------|--------------|
| Classifier vocabulary | `mrv-classifier-foundation.ts` + future migrations |
| Catalog → classifier backfill | `catalog-classifier-backfill-map.ts` |
| Duplicate retirement | `imaging-catalog-successor-map.ts` |
| Search shortcuts | `imaging-catalog.service.ts` + retirement constants |
| Licensed CPT | `imaging-cpt-mapping-review.ts` (parallel track) |

---

*Phase 3B — audit only. No schema, seed, or runtime changes.*
