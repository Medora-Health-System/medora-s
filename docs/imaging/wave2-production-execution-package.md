# Wave 2 Production Execution Package (Phase 2E.6C → 2E.6D)

**Phase:** 2E.6D production runbook (authorized when [`wave2-production-authorization.md`](wave2-production-authorization.md) conditions cleared)  
**Date:** 2026-06-01  
**Environment:** Railway production  
**Minimum commit:** `52564a41` — *Add Wave 2 imaging catalog seed*

---

## 1. Preflight baseline (production — read-only)

**Expected before seed** (confirm via [`wave2-production-preflight.md`](wave2-production-preflight.md) §7):

| Metric | Value |
|--------|------:|
| Active imaging | **80** |
| Wave 1 active | **37** |
| Wave 2 codes present | **0** |
| Wave 1 aliases | **41** |
| `XR_CHEST` tuple aliases | **2** |
| `CT_HEAD` active | **false** |
| `MRI_SPINE` contrast FK | **null** |
| Imaging classifiers | **141** (7 domains) |

---

## 2. Production command (run 1)

**Prerequisites:** W2-P-01…04 cleared · `DATABASE_URL` = production · deployed API includes Wave 2 seed.

```bash
# From repository root
railway run --service Postgres --environment production -- sh -c '
export DATABASE_URL="$DATABASE_PUBLIC_URL"
pnpm --filter @medora/api run prisma:seed-catalogs
'
```

**Seed order (idempotent):** Haiti lab/imaging (44) → ER labs → MRV classifiers → Wave 1 (37) → **Wave 2 (61)** → medications.

### Run 1 — expected log line

```text
✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Wave 2 imaging catalog (61 studies, 85 aliases, 15 US tuple mappings, 31 tuple aliases, 2 tuple protocol updates)
✅ Catalogs seeded (lab, imaging, medications)
```

*First production run may differ slightly on tuple alias/protocol counts if tuple aliases partially pre-exist; postflight counts are authoritative.*

**Duration note:** Full `prisma:seed-catalogs` may take **several minutes** (Haiti meds/labs refresh). Wait for `Catalogs seeded`.

---

## 3. Postflight checks (after run 1)

Execute on production (read-only):

```bash
railway run --service Postgres --environment production -- sh -c '
export DATABASE_URL="$DATABASE_PUBLIC_URL"
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave2-staging-validation.ts
'
```

| Check | Expected |
|-------|----------|
| Wave 2 active rows | **61** (53 XR-2 + 4 CT-2 + 4 US-1) |
| Wave 2 aliases | **≥ 85** |
| Active imaging total | **141** |
| Wave 1 active | **37** (unchanged) |
| Wave 1 aliases | **41** |
| `XR_CHEST` tuple aliases | **2** |
| `CT_HEAD` | inactive |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** |
| `US_ABDOMEN` protocol | `PROTOCOL_US_ABDOMEN_LIMITED` |
| Wave 2 `billingCodeDefault` set | **0** |
| Duplicate active codes | **0** |

### Postflight SQL (spot checks)

```sql
-- Active totals
SELECT COUNT(*)::int AS active_imaging FROM "CatalogImagingStudy" WHERE "isActive" = true;

-- Wave 2 presence (sample — full validation via script)
SELECT COUNT(*)::int AS wave2_active FROM "CatalogImagingStudy"
WHERE "isActive" = true AND code = 'XR_CALCANEUS_LEFT_2V';

-- Governance
SELECT code, "isActive" FROM "CatalogImagingStudy" WHERE code IN ('CT_HEAD','CT_ABD','US_ABD','DOPPLER_VEIN');
SELECT "contrastTypeClassifierId" FROM "CatalogImagingStudy" WHERE code = 'MRI_SPINE';

-- Wave 1 alias preservation
SELECT COUNT(*)::int FROM "ImagingStudyAlias" a
JOIN "CatalogImagingStudy" c ON c.id = a."catalogImagingStudyId"
WHERE c.code IN (SELECT code FROM "CatalogImagingStudy" WHERE code = 'XR_SACRUM_COCCYX_2V');

-- XR_CHEST tuple
SELECT a.alias FROM "ImagingStudyAlias" a
JOIN "CatalogImagingStudy" c ON c.id = a."catalogImagingStudyId"
WHERE c.code = 'XR_CHEST' AND a.alias IN ('chest 1v decub','chest post intubation');

-- US tuple protocol spot-check
SELECT c.code, tc.code AS protocol_code
FROM "CatalogImagingStudy" c
LEFT JOIN "TermClassifier" tc ON tc.id = c."protocolClassifierId"
WHERE c.code IN ('US_ABDOMEN','US_SOFT');
```

---

## 4. Idempotency command (run 2)

Same command as §2. **Do not** skip postflight on run 1.

```bash
railway run --service Postgres --environment production -- sh -c '
export DATABASE_URL="$DATABASE_PUBLIC_URL"
pnpm --filter @medora/api run prisma:seed-catalogs
'
```

### Run 2 — expected log line

```text
✅ Wave 2 imaging catalog (61 studies, 0 aliases, 15 US tuple mappings, 0 tuple aliases, 0 tuple protocol updates)
```

| Check | Expected |
|-------|----------|
| Wave 2 studies upserted | **61** (idempotent) |
| New Wave 2 aliases | **0** |
| New tuple aliases | **0** |
| New tuple protocol updates | **0** |
| Active imaging | **141** (stable) |

Document results in `wave2-production-execution-report.md` and `wave2-production-idempotency-report.md` (2E.6D phase).

---

## 5. Rollback (emergency — soft deactivate only)

**Do not** hard-delete. **Do not** mutate Wave 1 or Haiti 44 catalog rows except US tuple protocol revert below.

### 5.1 Deactivate Wave 2 catalog rows

Use manifest-driven code list from [`haiti-imaging-wave2.ts`](../../apps/api/prisma/data/haiti-imaging-wave2.ts) or:

```sql
UPDATE "CatalogImagingStudy"
SET "isActive" = false, "updatedAt" = NOW()
WHERE code IN (
  'CTA_LOWER_EXTREMITY_LEFT','CTA_LOWER_EXTREMITY_RIGHT','CTA_UPPER_EXTREMITY_LEFT','CTA_UPPER_EXTREMITY_RIGHT',
  'US_AORTA','US_BLADDER','US_CHEST','US_THYROID',
  'XR_ANKLE_LEFT_2V','XR_ANKLE_LEFT_3V','XR_ANKLE_RIGHT_2V','XR_ANKLE_RIGHT_3V',
  'XR_CALCANEUS_LEFT_2V','XR_CALCANEUS_RIGHT_2V',
  'XR_ELBOW_LEFT_2V','XR_ELBOW_LEFT_3V','XR_ELBOW_LEFT_4V','XR_ELBOW_RIGHT_2V','XR_ELBOW_RIGHT_3V','XR_ELBOW_RIGHT_4V',
  'XR_FEMUR_LEFT_2V','XR_FEMUR_RIGHT_2V','XR_FOOT_BILATERAL_2V','XR_FOOT_LEFT_2V','XR_FOOT_LEFT_3V',
  'XR_FOOT_RIGHT_2V','XR_FOOT_RIGHT_3V','XR_FOREARM_LEFT_2V','XR_FOREARM_RIGHT_2V',
  'XR_HAND_LEFT_2V','XR_HAND_LEFT_3V','XR_HAND_RIGHT_2V','XR_HAND_RIGHT_3V',
  'XR_HIP_BILATERAL_WITH_PELVIS','XR_HIP_LEFT_1V','XR_HIP_LEFT_2V','XR_HIP_RIGHT_1V','XR_HIP_RIGHT_2V',
  'XR_HUMERUS_LEFT_2V','XR_HUMERUS_RIGHT_2V','XR_INFANT_FOOT_LEFT_2V',
  'XR_KNEE_LEFT_2V','XR_KNEE_LEFT_3V','XR_KNEE_LEFT_4V','XR_KNEE_LEFT_SUNRISE',
  'XR_KNEE_RIGHT_2V','XR_KNEE_RIGHT_3V','XR_KNEE_RIGHT_4V','XR_KNEE_RIGHT_SUNRISE',
  'XR_PELVIS_AP','XR_PELVIS_COMPLETE',
  'XR_SHOULDER_LEFT_2V','XR_SHOULDER_LEFT_3V','XR_SHOULDER_RIGHT_2V','XR_SHOULDER_RIGHT_3V',
  'XR_TIB_FIB_LEFT_2V','XR_TIB_FIB_RIGHT_2V',
  'XR_WRIST_LEFT_2V','XR_WRIST_LEFT_3V','XR_WRIST_RIGHT_2V','XR_WRIST_RIGHT_3V'
);

SELECT COUNT(*)::int AS active_imaging FROM "CatalogImagingStudy" WHERE "isActive" = true;
-- Expected: 80
```

### 5.2 Remove Wave 2 aliases only

```sql
DELETE FROM "ImagingStudyAlias" a
USING "CatalogImagingStudy" c
WHERE a."catalogImagingStudyId" = c.id
  AND c.code IN (
    -- same 61-code list as §5.1
    'XR_CALCANEUS_LEFT_2V','CTA_LOWER_EXTREMITY_LEFT'
    -- … full list in haiti-imaging-wave2.ts
  );
```

*Prefer targeted DELETE only for aliases created by Wave 2 seed if audit log available.*

### 5.3 US tuple protocol revert (if tuple pass must be undone)

```sql
-- Revert only if pre-seed protocol FK was NULL or different; confirm before run.
UPDATE "CatalogImagingStudy"
SET "protocolClassifierId" = NULL, "updatedAt" = NOW()
WHERE code IN ('US_ABDOMEN','US_SOFT')
  AND "protocolClassifierId" IS NOT NULL;

-- Remove tuple aliases on baseline codes (sample — adjust to alias audit)
DELETE FROM "ImagingStudyAlias" a
USING "CatalogImagingStudy" c
WHERE a."catalogImagingStudyId" = c.id
  AND c.code IN ('US_ABDOMEN','US_PELVIS','US_SCROTUM_TESTICULAR','US_SOFT','US_OB_FIRST','US_OB_GROWTH')
  AND a.alias IN ('us abdomen limited','abdomen limited','us pelvic doppler');
```

### 5.4 Rollback verification

| Check | Expected |
|-------|----------|
| Active imaging | **80** |
| Wave 2 active | **0** |
| Wave 1 active | **37** |
| `CT_HEAD` | inactive |

**Estimated recovery:** **~2–4 hours** (see [`wave2-rollback-plan.md`](wave2-rollback-plan.md)).

---

## 6. Post-execution deliverables (2E.6D)

| Artifact | Owner |
|----------|-------|
| `wave2-production-execution-report.md` | Engineering |
| `wave2-production-postflight-report.md` | Engineering |
| `wave2-production-idempotency-report.md` | Engineering |

---

*Package prepared in 2E.6C. No production execution in this phase.*
