# 3C-B1 Production Classifier Backfill Authorization

**Phase:** W1.2  
**Authorization date:** 2026-05-31  
**Gate W1:** **CLOSED** (`imaging-gate-w1-closure-record.md`)  
**Medora governance:** **APPROVED**

---

## 1. Authorization status

| Decision | Status |
|----------|--------|
| **3C-B1 production apply** | **AUTHORIZED** |
| **Effective** | After successful **preflight** on the **target database** (§3) |
| **Scope** | Classifier FK backfill — Haiti **44** catalog codes (intent); see §2.1 caveat |

**Governance verdict:** **CONDITIONALLY SAFE** for production apply when preflight passes.

| Condition | If failed |
|-----------|-----------|
| 3C-M1 columns present | **NOT SAFE** — do not apply |
| ICM-1.0 imaging classifiers seeded | **NOT SAFE** — do not apply |
| Dry-run `--haiti-44-only` counts **199 / 4 / 105** | **NOT SAFE** — do not apply |
| `haiti_44_rows = 44` (or documented exception) | **NOT SAFE** without scope amendment |
| `TERMINOLOGY_BACKFILL_ENABLED=true` | Apply no-ops |

---

## 2. Authorized change summary

### 2.1 Scope caveat (mandatory preflight)

`backfill-catalog-classifiers.ts` invokes `runCatalogClassifierBackfill()` for **all** `CatalogImagingStudy` rows in the database, not only Haiti 44.

| Preflight outcome | Action |
|-------------------|--------|
| `total_imaging_rows = 44` and all codes ∈ Haiti list | **Proceed** — scope matches intent |
| Extra imaging rows exist | **STOP** — document codes; obtain scope amendment or Haiti-only filter before apply |

### 2.2 Expected slot outcomes (Haiti 44 × 7 = 308)

| Status | Count |
|--------|------:|
| APPLIED | **199** |
| MANUAL_REVIEW | **4** (contrast intentional null) |
| SKIPPED | **105** |
| **TOTAL** | **308** |

### 2.3 Systems impact

| System | Impact |
|--------|--------|
| `CatalogImagingStudy` (7 classifier FKs) | **YES** |
| `CatalogClassifierBackfillAudit` | **YES** |
| Billing, orders, search, aliases, retirement | **NO** |

---

## 3. Pre-flight commands

Run from repository root with production/staging `DATABASE_URL` configured for `@medora/api`.

### 3.1 Verify classifier counts

Expect ICM-1.0 imaging domain totals (lab domain may also be present):

```bash
pnpm --filter @medora/api exec prisma db execute --stdin <<'SQL'
SELECT domain, COUNT(*)::int AS n
FROM "TermClassifier"
WHERE "isActive" = true
GROUP BY domain
ORDER BY domain;
SQL
```

**Expected imaging domains (active):**

| Domain | Expected count |
|--------|---------------:|
| MODALITY | 8 |
| BODY_REGION | 42 |
| VIEW_COUNT | 6 |
| CONTRAST_TYPE | 5 |
| LATERALITY | 4 |
| ANATOMIC_SUBREGION | 36 |
| PROTOCOL | 40 |

**Imaging subtotal:** **141** active classifiers.

Optional guard (imaging only):

```bash
pnpm --filter @medora/api exec prisma db execute --stdin <<'SQL'
SELECT COUNT(*)::int AS imaging_classifier_count
FROM "TermClassifier"
WHERE "isActive" = true
  AND domain IN (
    'MODALITY','BODY_REGION','VIEW_COUNT','CONTRAST_TYPE',
    'LATERALITY','ANATOMIC_SUBREGION','PROTOCOL'
  );
SQL
```

### 3.2 Verify FK columns exist (3C-M1)

```bash
pnpm --filter @medora/api exec prisma db execute --stdin <<'SQL'
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'CatalogImagingStudy'
  AND column_name IN (
    'modalityClassifierId',
    'bodyRegionClassifierId',
    'contrastTypeClassifierId',
    'viewCountClassifierId',
    'lateralityClassifierId',
    'anatomicSubregionClassifierId',
    'protocolClassifierId'
  )
ORDER BY 1;
SQL
```

**Expect:** **7** rows.

### 3.3 Verify current FK null counts

```bash
pnpm --filter @medora/api exec prisma db execute --stdin <<'SQL'
SELECT
  COUNT(*)::int AS total_imaging_rows,
  COUNT(*) FILTER (WHERE code IN (
    'XR_CHEST','XR_KNEE','XR_FOOT','US_ABD','US_OB','US_RENAL','CT_HEAD','CT_ABD',
    'DOPPLER_VEIN','XR_CHEST_2V','XR_ABD_AP','XR_WRIST','XR_ANKLE','XR_SHOULDER',
    'XR_PELVIS','US_OB_FIRST','US_OB_GROWTH','US_SOFT','CT_CHEST','CT_CHEST_CTA',
    'CT_SPINE_LUMBAR','US_FAST','XR_ABDOMEN','CT_CERVICAL_SPINE','CT_ABDOMEN_PELVIS',
    'CT_CHEST_ABDOMEN_PELVIS_TRAUMA','CT_HEAD_WO_CONTRAST','CTA_CHEST','CTA_HEAD_NECK',
    'CTA_ABDOMEN_PELVIS','US_ABDOMEN','US_RUQ_GALLBLADDER','US_PELVIS',
    'US_SCROTUM_TESTICULAR','US_VENOUS_DOPPLER_LE','XR_HUMERUS','XR_ELBOW','XR_FOREARM',
    'XR_HAND','XR_HIP','XR_FEMUR','XR_TIB_FIB','MRI_BRAIN','MRI_SPINE'
  ))::int AS haiti_44_rows,
  COUNT(*) FILTER (WHERE "modalityClassifierId" IS NULL)::int AS modality_null,
  COUNT(*) FILTER (WHERE "bodyRegionClassifierId" IS NULL)::int AS body_region_null,
  COUNT(*) FILTER (WHERE "contrastTypeClassifierId" IS NULL)::int AS contrast_null,
  COUNT(*) FILTER (WHERE "viewCountClassifierId" IS NULL)::int AS view_count_null,
  COUNT(*) FILTER (WHERE "lateralityClassifierId" IS NULL)::int AS laterality_null,
  COUNT(*) FILTER (WHERE "anatomicSubregionClassifierId" IS NULL)::int AS subregion_null,
  COUNT(*) FILTER (WHERE "protocolClassifierId" IS NULL)::int AS protocol_null
FROM "CatalogImagingStudy";
SQL
```

**Preflight pass criteria:**

- `haiti_44_rows = 44`
- `total_imaging_rows = 44` (recommended; if greater, see §2.1)
- First apply: most FK null counts high (pre-backfill baseline)

Haiti-scoped null snapshot:

```bash
pnpm --filter @medora/api exec prisma db execute --stdin <<'SQL'
SELECT
  code,
  ("modalityClassifierId" IS NOT NULL) AS has_modality,
  ("bodyRegionClassifierId" IS NOT NULL) AS has_body_region,
  ("contrastTypeClassifierId" IS NOT NULL) AS has_contrast,
  ("viewCountClassifierId" IS NOT NULL) AS has_view_count,
  ("lateralityClassifierId" IS NOT NULL) AS has_laterality,
  ("anatomicSubregionClassifierId" IS NOT NULL) AS has_subregion,
  ("protocolClassifierId" IS NOT NULL) AS has_protocol
FROM "CatalogImagingStudy"
WHERE code IN (
  'XR_CHEST','XR_KNEE','XR_FOOT','US_ABD','US_OB','US_RENAL','CT_HEAD','CT_ABD',
  'DOPPLER_VEIN','XR_CHEST_2V','XR_ABD_AP','XR_WRIST','XR_ANKLE','XR_SHOULDER',
  'XR_PELVIS','US_OB_FIRST','US_OB_GROWTH','US_SOFT','CT_CHEST','CT_CHEST_CTA',
  'CT_SPINE_LUMBAR','US_FAST','XR_ABDOMEN','CT_CERVICAL_SPINE','CT_ABDOMEN_PELVIS',
  'CT_CHEST_ABDOMEN_PELVIS_TRAUMA','CT_HEAD_WO_CONTRAST','CTA_CHEST','CTA_HEAD_NECK',
  'CTA_ABDOMEN_PELVIS','US_ABDOMEN','US_RUQ_GALLBLADDER','US_PELVIS',
  'US_SCROTUM_TESTICULAR','US_VENOUS_DOPPLER_LE','XR_HUMERUS','XR_ELBOW','XR_FOREARM',
  'XR_HAND','XR_HIP','XR_FEMUR','XR_TIB_FIB','MRI_BRAIN','MRI_SPINE'
)
ORDER BY code;
SQL
```

### 3.4 Execute dry-run on target DB

**Primary (Haiti-scoped, read-only):**

```bash
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/dry-run-catalog-classifiers.ts -- --haiti-44-only
```

**Pass criteria:** JSON report shows:

- `run1.applied = 199`
- `run1.manualReview = 4`
- `run1.skipped = 105`
- `run1.totalSlots = 308` (or `imagingSlotCount` equivalent)
- `countsMatchExpected = true`
- `idempotent = true` (run1 equals run2)

**Secondary (apply-path dry-run, no writes):**

```bash
TERMINOLOGY_BACKFILL_ENABLED=true \
  pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/backfill-catalog-classifiers.ts -- --dry-run
```

---

## 4. Apply commands

**Only after §3 preflight pass and operational approval.**

```bash
TERMINOLOGY_BACKFILL_ENABLED=true \
  pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/backfill-catalog-classifiers.ts
```

Capture **`runId`** from console output or audit table.

---

## 5. Postflight validation

### 5.1 Audit summary (replace `<RUN_ID>`)

```bash
pnpm --filter @medora/api exec prisma db execute --stdin <<'SQL'
SELECT status, COUNT(*)::int
FROM "CatalogClassifierBackfillAudit"
WHERE "catalogTable" = 'CatalogImagingStudy'
  AND "runId" = '<RUN_ID>'
GROUP BY status
ORDER BY status;
SQL
```

**First apply expectation (Haiti 44 scope, null FK baseline):**

| Status | Approx. count |
|--------|-------------|
| APPLIED | 199 |
| MANUAL_REVIEW | 4 |
| SKIPPED | 105 |

### 5.2 FK population check (Haiti codes)

```bash
pnpm --filter @medora/api exec prisma db execute --stdin <<'SQL'
SELECT
  COUNT(*) FILTER (WHERE "modalityClassifierId" IS NOT NULL)::int AS modality_set,
  COUNT(*) FILTER (WHERE "bodyRegionClassifierId" IS NOT NULL)::int AS body_region_set,
  COUNT(*) FILTER (WHERE "contrastTypeClassifierId" IS NOT NULL)::int AS contrast_set,
  COUNT(*) FILTER (WHERE "viewCountClassifierId" IS NOT NULL)::int AS view_count_set,
  COUNT(*) FILTER (WHERE "lateralityClassifierId" IS NOT NULL)::int AS laterality_set,
  COUNT(*) FILTER (WHERE "anatomicSubregionClassifierId" IS NOT NULL)::int AS subregion_set,
  COUNT(*) FILTER (WHERE "protocolClassifierId" IS NOT NULL)::int AS protocol_set
FROM "CatalogImagingStudy"
WHERE code IN (
  'XR_CHEST','XR_KNEE','XR_FOOT','US_ABD','US_OB','US_RENAL','CT_HEAD','CT_ABD',
  'DOPPLER_VEIN','XR_CHEST_2V','XR_ABD_AP','XR_WRIST','XR_ANKLE','XR_SHOULDER',
  'XR_PELVIS','US_OB_FIRST','US_OB_GROWTH','US_SOFT','CT_CHEST','CT_CHEST_CTA',
  'CT_SPINE_LUMBAR','US_FAST','XR_ABDOMEN','CT_CERVICAL_SPINE','CT_ABDOMEN_PELVIS',
  'CT_CHEST_ABDOMEN_PELVIS_TRAUMA','CT_HEAD_WO_CONTRAST','CTA_CHEST','CTA_HEAD_NECK',
  'CTA_ABDOMEN_PELVIS','US_ABDOMEN','US_RUQ_GALLBLADDER','US_PELVIS',
  'US_SCROTUM_TESTICULAR','US_VENOUS_DOPPLER_LE','XR_HUMERUS','XR_ELBOW','XR_FOREARM',
  'XR_HAND','XR_HIP','XR_FEMUR','XR_TIB_FIB','MRI_BRAIN','MRI_SPINE'
);
SQL
```

Contrast nulls on **4** codes remain expected: `CT_HEAD`, `CT_ABD`, `CT_CHEST_ABDOMEN_PELVIS_TRAUMA`, `MRI_SPINE`.

---

## 6. Second-run idempotency validation

```bash
TERMINOLOGY_BACKFILL_ENABLED=true \
  pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/backfill-catalog-classifiers.ts
```

**Expect:** `applied = 0`, `unchanged ≈ 199` (imaging portion), `manualReview = 4`, `skipped ≈ 105`.

Confirm via audit for second `runId`:

```bash
pnpm --filter @medora/api exec prisma db execute --stdin <<'SQL'
SELECT status, COUNT(*)::int
FROM "CatalogClassifierBackfillAudit"
WHERE "catalogTable" = 'CatalogImagingStudy'
  AND "runId" = '<SECOND_RUN_ID>'
GROUP BY status
ORDER BY status;
SQL
```

Or re-run Haiti dry-run (should show `unchanged = 199`, `applied = 0`):

```bash
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/dry-run-catalog-classifiers.ts -- --haiti-44-only
```

---

## 7. Rollback package (Haiti catalog scope)

**Emergency rollback:** clear all **7** classifier FKs for Haiti seed codes only. Does **not** delete audit history. Legacy `modality` / `bodyRegion` strings unchanged.

```sql
-- 3C-B1 rollback — Haiti imaging catalog only
UPDATE "CatalogImagingStudy"
SET
  "modalityClassifierId" = NULL,
  "bodyRegionClassifierId" = NULL,
  "contrastTypeClassifierId" = NULL,
  "viewCountClassifierId" = NULL,
  "lateralityClassifierId" = NULL,
  "anatomicSubregionClassifierId" = NULL,
  "protocolClassifierId" = NULL,
  "updatedAt" = NOW()
WHERE code IN (
  'XR_CHEST','XR_KNEE','XR_FOOT','US_ABD','US_OB','US_RENAL','CT_HEAD','CT_ABD',
  'DOPPLER_VEIN','XR_CHEST_2V','XR_ABD_AP','XR_WRIST','XR_ANKLE','XR_SHOULDER',
  'XR_PELVIS','US_OB_FIRST','US_OB_GROWTH','US_SOFT','CT_CHEST','CT_CHEST_CTA',
  'CT_SPINE_LUMBAR','US_FAST','XR_ABDOMEN','CT_CERVICAL_SPINE','CT_ABDOMEN_PELVIS',
  'CT_CHEST_ABDOMEN_PELVIS_TRAUMA','CT_HEAD_WO_CONTRAST','CTA_CHEST','CTA_HEAD_NECK',
  'CTA_ABDOMEN_PELVIS','US_ABDOMEN','US_RUQ_GALLBLADDER','US_PELVIS',
  'US_SCROTUM_TESTICULAR','US_VENOUS_DOPPLER_LE','XR_HUMERUS','XR_ELBOW','XR_FOREARM',
  'XR_HAND','XR_HIP','XR_FEMUR','XR_TIB_FIB','MRI_BRAIN','MRI_SPINE'
);
```

**Execute via CLI (after review):**

```bash
pnpm --filter @medora/api exec prisma db execute --stdin <<'SQL'
UPDATE "CatalogImagingStudy"
SET
  "modalityClassifierId" = NULL,
  "bodyRegionClassifierId" = NULL,
  "contrastTypeClassifierId" = NULL,
  "viewCountClassifierId" = NULL,
  "lateralityClassifierId" = NULL,
  "anatomicSubregionClassifierId" = NULL,
  "protocolClassifierId" = NULL,
  "updatedAt" = NOW()
WHERE code IN (
  'XR_CHEST','XR_KNEE','XR_FOOT','US_ABD','US_OB','US_RENAL','CT_HEAD','CT_ABD',
  'DOPPLER_VEIN','XR_CHEST_2V','XR_ABD_AP','XR_WRIST','XR_ANKLE','XR_SHOULDER',
  'XR_PELVIS','US_OB_FIRST','US_OB_GROWTH','US_SOFT','CT_CHEST','CT_CHEST_CTA',
  'CT_SPINE_LUMBAR','US_FAST','XR_ABDOMEN','CT_CERVICAL_SPINE','CT_ABDOMEN_PELVIS',
  'CT_CHEST_ABDOMEN_PELVIS_TRAUMA','CT_HEAD_WO_CONTRAST','CTA_CHEST','CTA_HEAD_NECK',
  'CTA_ABDOMEN_PELVIS','US_ABDOMEN','US_RUQ_GALLBLADDER','US_PELVIS',
  'US_SCROTUM_TESTICULAR','US_VENOUS_DOPPLER_LE','XR_HUMERUS','XR_ELBOW','XR_FOREARM',
  'XR_HAND','XR_HIP','XR_FEMUR','XR_TIB_FIB','MRI_BRAIN','MRI_SPINE'
);
SQL
```

**Verify rollback:**

```bash
pnpm --filter @medora/api exec prisma db execute --stdin <<'SQL'
SELECT COUNT(*)::int AS rows_with_any_classifier_fk
FROM "CatalogImagingStudy"
WHERE code IN (
  'XR_CHEST','XR_KNEE','XR_FOOT','US_ABD','US_OB','US_RENAL','CT_HEAD','CT_ABD',
  'DOPPLER_VEIN','XR_CHEST_2V','XR_ABD_AP','XR_WRIST','XR_ANKLE','XR_SHOULDER',
  'XR_PELVIS','US_OB_FIRST','US_OB_GROWTH','US_SOFT','CT_CHEST','CT_CHEST_CTA',
  'CT_SPINE_LUMBAR','US_FAST','XR_ABDOMEN','CT_CERVICAL_SPINE','CT_ABDOMEN_PELVIS',
  'CT_CHEST_ABDOMEN_PELVIS_TRAUMA','CT_HEAD_WO_CONTRAST','CTA_CHEST','CTA_HEAD_NECK',
  'CTA_ABDOMEN_PELVIS','US_ABDOMEN','US_RUQ_GALLBLADDER','US_PELVIS',
  'US_SCROTUM_TESTICULAR','US_VENOUS_DOPPLER_LE','XR_HUMERUS','XR_ELBOW','XR_FOREARM',
  'XR_HAND','XR_HIP','XR_FEMUR','XR_TIB_FIB','MRI_BRAIN','MRI_SPINE'
)
AND (
  "modalityClassifierId" IS NOT NULL
  OR "bodyRegionClassifierId" IS NOT NULL
  OR "contrastTypeClassifierId" IS NOT NULL
  OR "viewCountClassifierId" IS NOT NULL
  OR "lateralityClassifierId" IS NOT NULL
  OR "anatomicSubregionClassifierId" IS NOT NULL
  OR "protocolClassifierId" IS NOT NULL
);
SQL
```

**Expect:** `rows_with_any_classifier_fk = 0`.

---

## 8. SAFE / NOT SAFE summary

| Scope | Verdict |
|-------|---------|
| Gate W1 | **CLOSED** |
| 3C-B1 production apply (governance) | **AUTHORIZED** |
| 3C-B1 production apply (without preflight) | **NOT SAFE** |
| 3C-B1 production apply (after preflight pass) | **SAFE** (FK-only; scope per §2.1) |
| Rollback SQL (Haiti scope) | **SAFE** — tested pattern; run only if revert required |

---

## 9. References

| Document | Role |
|----------|------|
| `imaging-gate-w1-closure-record.md` | Gate W1 closure |
| `imaging-classifier-backfill-mapping-44.md` | Authoritative matrix |
| `imaging-classifier-backfill-dry-run-validation.md` | B1E proof |
| `imaging-gate-w1-production-authorization-b1f.md` | Prior conditional runbook (superseded for authorization status by this doc) |

---

*Governance authorization only. No backfill executed by this document.*
