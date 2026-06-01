# Imaging Taxonomy Backfill Plan

**Phase:** 3C (design-only)  
**Prerequisite migrations:** 3C-M1 (FK columns), 3C-S1/S2 (vocabulary seeded)  
**Execution tool (existing):** `apps/api/prisma/scripts/backfill-catalog-classifiers.ts` → `runCatalogClassifierBackfill`

---

## 1. Backfill principles

1. **Idempotent** — re-run safe; `planFieldBackfill` skips unchanged FKs.
2. **Audited** — every field write logged to `CatalogClassifierBackfillAudit`.
3. **Non-destructive** — never clears existing FK unless target changes; never deletes catalog rows.
4. **Flag-gated** — `TERMINOLOGY_BACKFILL_ENABLED=true` required.
5. **Label-safe** — backfill updates classifier FK IDs only; does not mutate `displayNameEn`, `displayNameFr`, or `name`.
6. **Order-safe** — does not touch `OrderItem`; historical UUID references unchanged.
7. **Billing-safe** — no `BillingCatalog` or `billingCodeDefault` writes.

---

## 2. Current backfill architecture

**Service:** `apps/api/src/terminology/catalog-classifier-backfill.service.ts`

| Catalog field | Source | Map |
|---------------|--------|-----|
| `bodyRegionClassifierId` | `bodyRegion` string | `BODY_REGION_LEGACY_TO_CLASSIFIER` |
| `modalityClassifierId` | `modality` string | `MODALITY_LEGACY_TO_CLASSIFIER` |
| `viewCountClassifierId` | catalog `code` allowlist | `VIEW_COUNT_CATALOG_CODE_TO_CLASSIFIER` |
| `contrastTypeClassifierId` | catalog `code` allowlist | `CONTRAST_CATALOG_CODE_TO_CLASSIFIER` |
| `contrastTypeClassifierId` | manual review list | `CONTRAST_MANUAL_REVIEW_IMAGING_CODES` → status MANUAL_REVIEW |

**Audit statuses:** `APPLIED`, `UNCHANGED`, `SKIPPED`, `MANUAL_REVIEW`

---

## 3. Target backfill architecture (new fields)

### 3.1 New FK backfill sources

| Target FK | Primary source | Secondary source |
|-----------|----------------|------------------|
| `lateralityClassifierId` | Normalization workbook column | Parse legacy `displayNameEn` / alias patterns (Left/Right/Bilat) — **workbook preferred** |
| `anatomicSubregionClassifierId` | Workbook mapping from legacy inventory | Parse subregion tokens (C-Spine, Orbit, Finger, etc.) |
| `protocolClassifierId` | Workbook mapping | Parse protocol tokens (Triple Rule Out, FAST, HIDA, etc.) |

**Design decision:** Phase 3C backfill is **workbook-driven**, not runtime NLP. The 267-row legacy inventory (`legacy-imaging-inventory.md`) normalizes via `imaging-normalization-rules.md` into a CSV:

```
catalogCode,laterality,anatomicSubregion,protocol,contrast,viewCount,notes
XR_KNEE,,, , , ,PARTIAL — unspecified laterality
CT_HEAD_WO_CONTRAST,,, ,CONTRAST_TYPE_WITHOUT,,
```

For **existing 44 rows**, workbook authored once in Phase 3D (implementation).

### 3.2 Extended existing FK backfill (same migration wave)

| Target FK | Additional map entries |
|-----------|------------------------|
| `modalityClassifierId` | Map CTA catalog codes → `MODALITY_CTA` (may also keep `MODALITY_CT` during transition — **pick one policy**) |
| `contrastTypeClassifierId` | Expand allowlist for contrast-differentiated codes when added in 2E |
| `viewCountClassifierId` | Map all XR codes with known view semantics |
| `bodyRegionClassifierId` | New legacy bodyRegion keys → new BODY_REGION codes |

**CTA modality policy (recommended):** Catalog rows with code prefix `CTA_` or `CT_*_CTA` receive `MODALITY_CTA` classifier; legacy `modality: CT` string may remain until string cleanup phase.

---

## 4. Backfill map extensions (proposed file changes — not implemented)

**File:** `apps/api/src/terminology/catalog-classifier-backfill-map.ts`

```typescript
// Proposed additions (illustrative)

export const LATERALITY_CATALOG_CODE_TO_CLASSIFIER: Record<string, string> = {
  // Populated from Phase 3D workbook for side-specific catalog codes
  // e.g. future XR_KNEE_LEFT_3V → LATERALITY_LEFT
};

export const ANATOMIC_SUBREGION_CATALOG_CODE_TO_CLASSIFIER: Record<string, string> = {
  CT_CERVICAL_SPINE: "ANATOMIC_SUBREGION_SPINE_CERVICAL",
  CT_SPINE_LUMBAR: "ANATOMIC_SUBREGION_SPINE_LUMBAR",
  // ...
};

export const PROTOCOL_CATALOG_CODE_TO_CLASSIFIER: Record<string, string> = {
  US_FAST: "PROTOCOL_US_FAST",
  CT_CHEST_ABDOMEN_PELVIS_TRAUMA: "PROTOCOL_CT_CAP_TRAUMA",
  CTA_CHEST: "PROTOCOL_CTA_CHEST_STANDARD", // unless triple rule-out row added
  // ...
};

export const LATERALITY_MANUAL_REVIEW_IMAGING_CODES = [
  // Generic MSK rows where laterality is intentionally unspecified in catalog
  "XR_KNEE", "XR_ANKLE", "XR_WRIST", /* ... */
] as const;
```

**Service extension:** mirror existing contrast/view loops for three new FKs + audit field names.

---

## 5. Backfill phases

### Phase B0 — Pre-backfill inventory (read-only SQL)

```sql
SELECT code, "modality", "bodyRegion",
       "modalityClassifierId", "bodyRegionClassifierId",
       "contrastTypeClassifierId", "viewCountClassifierId",
       "lateralityClassifierId", "anatomicSubregionClassifierId", "protocolClassifierId"
FROM "CatalogImagingStudy"
ORDER BY code;
```

```sql
SELECT domain, COUNT(*) FROM "TermClassifier" GROUP BY domain ORDER BY domain;
```

### Phase B1 — Existing FK completion (44 rows)

**Goal:** 100% modality + bodyRegion; maximize contrast/view where deterministic.

| Step | Action |
|------|--------|
| B1.1 | Run existing backfill (no new maps) |
| B1.2 | Expand `CONTRAST_CATALOG_CODE_TO_CLASSIFIER` for WO contrast rows |
| B1.3 | Expand `VIEW_COUNT_CATALOG_CODE_TO_CLASSIFIER` for XR MSK rows default ONE or UNSPECIFIED |
| B1.4 | Re-run; export audit where status = MANUAL_REVIEW |

**Exit criteria:** MANUAL_REVIEW list documented; no SKIPPED for modality/bodyRegion on active rows.

### Phase B2 — New domain vocabulary seed

**Goal:** TermClassifier rows exist before FK assignment.

| Step | Action |
|------|--------|
| B2.1 | Deploy 3C-S1 + 3C-S2 seed |
| B2.2 | Verify domain counts |
| B2.3 | Spot-check bilingual labels |

### Phase B3 — Workbook-driven tuple backfill (44 rows)

**Goal:** Populate laterality, subregion, protocol FKs from signed-off workbook.

| Step | Action |
|------|--------|
| B3.1 | Publish `imaging-catalog-classifier-workbook.csv` (Phase 3D) |
| B3.2 | Load maps into `catalog-classifier-backfill-map.ts` |
| B3.3 | Run backfill with `TERMINOLOGY_BACKFILL_ENABLED=true` |
| B3.4 | Review audit — zero unexpected SKIPPED for workbook-covered codes |

### Phase B4 — Legacy inventory prep (267 rows — no catalog add)

**Goal:** Validate normalization rules against workbook **before** Phase 2E seed.

| Step | Action |
|------|--------|
| B4.1 | Machine-generate draft workbook from `legacy-vs-medora-coverage.md` |
| B4.2 | Clinical review gate for PARTIAL/MISSING rows |
| B4.3 | Identify tuple collisions (same tuple, different CPT → separate codes) |

**No catalog rows created in B4** — validation only.

### Phase B5 — Post-backfill verification

```sql
SELECT
  COUNT(*) FILTER (WHERE "lateralityClassifierId" IS NOT NULL) AS with_laterality,
  COUNT(*) FILTER (WHERE "anatomicSubregionClassifierId" IS NOT NULL) AS with_subregion,
  COUNT(*) FILTER (WHERE "protocolClassifierId" IS NOT NULL) AS with_protocol
FROM "CatalogImagingStudy"
WHERE "isActive" = true;
```

```sql
SELECT status, fieldName, COUNT(*)
FROM "CatalogClassifierBackfillAudit"
WHERE "runId" = :latestRunId
GROUP BY status, fieldName
ORDER BY fieldName, status;
```

---

## 6. Per-field backfill rules (44-row catalog)

| Code pattern | Laterality | Subregion | Protocol | Contrast | View |
|--------------|------------|-----------|----------|----------|------|
| `XR_*` (generic MSK) | UNSPECIFIED | — | — | NONE | ONE unless `*_2V` |
| `XR_CHEST_2V` | UNSPECIFIED | — | — | NONE | TWO |
| `XR_ABD_AP` | UNSPECIFIED | — | — | NONE | ONE |
| `CT_HEAD_WO_CONTRAST` | — | HEAD | — | WITHOUT | — |
| `CT_*` spine | — | SPINE_* | — | MANUAL_REVIEW | — |
| `CTA_*` | — | per region | CTA standard | ANGIOGRAPHIC | — |
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | — | CHEST_ABDOMEN_PELVIS | CT_CAP_TRAUMA | MANUAL_REVIEW | — |
| `US_FAST` | — | ABDOMEN | US_FAST | NONE | — |
| `US_OB_*` | — | OBSTETRICAL | OB protocol | NONE | — |
| `US_VENOUS_DOPPLER_LE` | UNSPECIFIED | LOWER_EXTREMITY | — | NONE | — |
| `MRI_*` | — | HEAD or SPINE | — | MANUAL_REVIEW | — |

Full row-level matrix deferred to Phase 3D workbook.

---

## 7. Search backfill (runtime — not DB)

After FK backfill:

| Flag | Effect |
|------|--------|
| `TERMINOLOGY_SEARCH_CLASSIFIER=true` | Extend `imagingClassifierSearchOr` with laterality, subregion, protocol relations |

**Alias backfill for classifiers:** seed via `TermClassifierAlias` in MRV seed (e.g. alias `"gauche"` → `LATERALITY_LEFT`).

**Catalog alias backfill:** unchanged — `ImagingStudyAlias` separate path; retirement transfers per Phase 2C.

---

## 8. Compatibility confirmations

### OrderItem

| Question | Answer |
|----------|--------|
| Does backfill write OrderItem? | **No** |
| Does FK change affect historical UUID? | **No** |
| Label at order time vs read time | Labels resolved from catalog at **read** time via join |
| Risk if catalog displayName changes | Independent of classifier FK — govern label changes separately |

### Audit

| Question | Answer |
|----------|--------|
| Audit table | `CatalogClassifierBackfillAudit` — append-only |
| New field names | `lateralityClassifierId`, `anatomicSubregionClassifierId`, `protocolClassifierId` |
| Retention | Permanent (clinical terminology audit) |

### ROI / chart export

| Surface | Classifier impact |
|---------|-------------------|
| Chart live preview | Uses `orderItemDisplayLabels` — catalog displayName, not classifiers |
| Department detail meta | Shows legacy `modality · bodyRegion` strings today |
| Export PDF | Same — no classifier dependency in 3C |
| Future ROI | Classifier dimensions available via catalog join when reporting matures |

### Retirement

When predecessor deactivated:

1. Do **not** backfill predecessor after cutover date (freeze).
2. Successor must have complete tuple before alias/shortcut cutover.
3. Backfill audit on predecessor remains for history.

---

## 9. Dry-run mode (recommended for implementation)

Extend backfill service with dry-run parameter (future):

| Mode | Behavior |
|------|----------|
| `dryRun: true` | Write audit rows with status `DRY_RUN`; no catalog updates |
| `dryRun: false` | Current behavior |

**Phase 3C design recommends dry-run** for first production execution — implementation in Phase 3D.

---

## 10. Failure handling

| Failure | Response |
|---------|----------|
| Target classifier not in DB | SKIPPED audit; fix seed then re-run |
| Workbook/code not in map | SKIPPED or MANUAL_REVIEW; do not guess |
| FK points to wrong domain | Prevented by map typing + unit tests |
| Seed count mismatch | Seed throws; do not run backfill |
| Partial backfill run | Re-run idempotent; UNCHANGED for settled rows |

---

## 11. Backfill exit gates (before Phase 2E catalog expansion)

| Gate | Criteria |
|------|----------|
| G1 | 3C-M1 applied all environments |
| G2 | All active catalog rows have modality + bodyRegion classifiers |
| G3 | Workbook signed for 44 rows (laterality/subregion/protocol) |
| G4 | Phase 2D US_ABD pair retired or explicitly exempted in workbook |
| G5 | MANUAL_REVIEW queue ≤ agreed threshold (contrast on CT/MRI until CPT review) |
| G6 | Staging flags enabled; search smoke tests pass |
| G7 | No billing test regressions |

---

*Phase 3C — design only. No backfill executed.*
