# Wave 3 Production Execution Package (Phase 2E.7C → 2E.7D)

**Phase:** 2E.7D production runbook  
**Date:** 2026-06-01  
**Environment:** Railway production  
**Minimum commit:** `d080595d` — *Add Wave 3 imaging catalog seed*

**Authorization:** **AUTHORIZED** — see [`wave3-production-authorization.md`](wave3-production-authorization.md) (2E.7C.1). **W3-P-01** and **W3-P-06** **CLOSED**.

---

## 0. Pre-seed validation (completed)

**Status:** Pre-seed production validation **completed successfully** (2E.7C.1).

`wave3-staging-validation.ts` was run against **production before** Wave 3 seed. Results:

| Field | Pre-seed value | Meaning |
|-------|----------------|---------|
| `summary.pass` | **false** | **Expected** — includes post-seed checks |
| `checksFailed` | **11** | Post-seed-only failures |
| `totalActiveImaging` | **141** | **PASS** — correct baseline |
| `wave3Studies` | **0** | **PASS** — Wave 3 not yet deployed |
| `wave3Aliases` | **0** | **PASS** |

**Do not** treat aggregate `pass: false` as a blocker. W3-P-01 baseline checks **passed** (active **141**, W1 **37**, W2 **61**, W3 **0**, governance intact).

**Wave 3-specific checks** (row counts, aliases, search smoke, MRA activation, active **182**) are expected to **pass only after** seed execution (2E.7D run 1).

### Expected post-seed state (after run 1)

| Metric | Target |
|--------|-------:|
| Active imaging | **182** |
| Wave 3 active rows | **41** |
| Wave 3 aliases | **~86** |
| `wave3-staging-validation.ts` | **full PASS** (`summary.pass: true`, `checksFailed: 0`) |

---

## 1. Preflight baseline (production — confirmed)

**Verified on production** (2E.7C.1) — see [`wave3-production-preflight.md`](wave3-production-preflight.md) §2:

| Metric | Value |
|--------|------:|
| Active imaging | **141** |
| Wave 1 active | **37** |
| Wave 2 active | **61** |
| Wave 3 codes present (active) | **0** |
| Wave 1 aliases | **41** |
| Wave 2 aliases | **85** |
| `CT_HEAD` active | **false** |
| `MRI_SPINE` contrast FK | **null** |
| Imaging classifiers (active) | **≥ 141** *(7 domains; staging ref **157**)* |

---

## 2. Production command (run 1)

**Prerequisites:** W3-P-01 **CLOSED** · W3-P-06 **CLOSED** · `DATABASE_URL` = production · commit **`d080595d`** or later.

```bash
# From repository root
railway run --service Postgres --environment production -- sh -c '
export DATABASE_URL="$DATABASE_PUBLIC_URL"
pnpm --filter @medora/api run prisma:seed-catalogs
'
```

**Alternative (authorized workstation):**

```bash
export DATABASE_URL="<production-connection-string>"
pnpm --filter @medora/api run prisma:seed-catalogs
```

**Seed order (idempotent):** Haiti lab/imaging (44) → ER labs → MRV classifiers → Wave 1 (37) → Wave 2 (61) → **Wave 3 (41)** → medications.

### Run 1 — expected log line

```text
✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Wave 2 imaging catalog (61 studies, 0 aliases, 15 US tuple mappings, 0 tuple aliases, 0 tuple protocol updates)
✅ Wave 3 imaging catalog (41 studies, 86 aliases)
✅ Catalogs seeded (lab, imaging, medications)
```

*First production run: Wave 1/2 lines typically show `0` new aliases; Wave 3 alias count authoritative on run 1.*

**Duration note:** Full `prisma:seed-catalogs` may take **several minutes**. Wait for `Catalogs seeded`.

---

## 3. Postflight checks (after run 1)

```bash
railway run --service Postgres --environment production -- sh -c '
export DATABASE_URL="$DATABASE_PUBLIC_URL"
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave3-staging-validation.ts
'
```

| Check | Expected |
|-------|----------|
| `summary.pass` | **true** |
| `checksFailed` | **0** |
| Wave 3 active rows | **41** (14+5+10+3+4+5) |
| Wave 3 aliases | **≥ 86** |
| Active imaging total | **182** |
| Wave 1 active | **37** |
| Wave 2 active | **61** |
| `CT_HEAD` | inactive |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** |
| Forbidden codes / LE venous splits | per script |
| Wave 3 `billingCodeDefault` set | **0** |

### Postflight SQL (spot checks)

```sql
-- Active totals
SELECT COUNT(*)::int AS active_imaging FROM "CatalogImagingStudy" WHERE "isActive" = true;

-- Wave 3 presence
SELECT COUNT(*)::int AS wave3_active FROM "CatalogImagingStudy"
WHERE "isActive" = true AND code = 'MRI_KNEE_LEFT';

-- Governance
SELECT code, "isActive" FROM "CatalogImagingStudy"
WHERE code IN ('CT_HEAD','CT_ABD','US_ABD','DOPPLER_VEIN');

SELECT "contrastTypeClassifierId" FROM "CatalogImagingStudy" WHERE code = 'MRI_SPINE';

-- Wave 1 / Wave 2 alias preservation (counts)
SELECT COUNT(*)::int AS w1_aliases FROM "ImagingStudyAlias" a
JOIN "CatalogImagingStudy" c ON c.id = a."catalogImagingStudyId"
WHERE c.code = 'XR_SACRUM_COCCYX_2V';

SELECT COUNT(*)::int AS w2_aliases FROM "ImagingStudyAlias" a
JOIN "CatalogImagingStudy" c ON c.id = a."catalogImagingStudyId"
WHERE c.code = 'XR_CALCANEUS_LEFT_2V';

-- MRA modality spot-check
SELECT code FROM "CatalogImagingStudy"
WHERE "isActive" = true AND code LIKE 'MRA_%';
```

---

## 4. Idempotency command (run 2)

Same command as §2. **Do not** skip postflight on run 1.

### Run 2 — expected log line

```text
✅ Wave 3 imaging catalog (41 studies, 0 aliases)
```

| Check | Expected |
|-------|----------|
| Wave 3 studies upserted | **41** |
| New Wave 3 aliases | **0** |
| Active imaging | **182** (stable) |
| Wave 1 / Wave 2 counts | unchanged |

Document results in `wave3-production-execution-report.md`, `wave3-production-postflight-report.md`, and `wave3-production-idempotency-report.md` (2E.7D phase).

---

## 5. Rollback (emergency — soft deactivate only)

**Do not** hard-delete. **Do not** mutate Wave 1, Wave 2, or Haiti baseline rows.

### 5.1 Deactivate Wave 3 catalog rows

Use full code list from [`apps/api/prisma/data/haiti-imaging-wave3.ts`](../../apps/api/prisma/data/haiti-imaging-wave3.ts) (`HAITI_IMAGING_WAVE3_CATALOG`).

```sql
UPDATE "CatalogImagingStudy"
SET "isActive" = false, "updatedAt" = NOW()
WHERE code IN (
  'MRI_CHOLANGIOGRAM','MRI_HIP_BILATERAL_WO_CONTRAST','MRI_HIP_LEFT_WO_CONTRAST','MRI_HIP_RIGHT_WO_CONTRAST',
  'MRI_KNEE_LEFT','MRI_KNEE_RIGHT','MRI_LOWER_EXTREMITY_LEFT_W_WO_CONTRAST','MRI_LOWER_EXTREMITY_RIGHT_W_WO_CONTRAST',
  'MRI_PELVIS','MRI_PELVIS_LIMITED','MRI_SELLA',
  'MRI_UPPER_EXTREMITY_LEFT_WO_CONTRAST','MRI_UPPER_EXTREMITY_RIGHT_WO_CONTRAST','MRI_UPPER_EXTREMITY_RIGHT_W_WO_CONTRAST',
  'MRA_BRAIN','MRA_CAROTID_W_CONTRAST','MRA_CAROTID_WO_CONTRAST','MRA_LE_LEFT_W_CONTRAST','MRA_LE_RIGHT_W_CONTRAST',
  'US_CAROTID_DUPLEX',
  'US_ARTERIAL_DOPPLER_LE_BILATERAL','US_ARTERIAL_DOPPLER_LE_LEFT','US_ARTERIAL_DOPPLER_LE_RIGHT',
  'US_VENOUS_DOPPLER_UE_BILATERAL','US_VENOUS_DOPPLER_UE_LEFT','US_VENOUS_DOPPLER_UE_RIGHT',
  'US_ARTERIAL_DOPPLER_UE_BILATERAL','US_ARTERIAL_DOPPLER_UE_LEFT','US_ARTERIAL_DOPPLER_UE_RIGHT',
  'US_BREAST_BILATERAL','US_BREAST_LEFT','US_BREAST_RIGHT',
  'FL_ESOPHAGRAM','FL_LINE_PLACEMENT','FL_TUBE_PLACEMENT','FL_LUMBAR_PUNCTURE',
  'NM_HIDA','NM_GB_EMPTYING','NM_VQ_PERFUSION','NM_VQ_VENTILATION','NM_VQ_COMBINED'
);

SELECT COUNT(*)::int AS active_imaging FROM "CatalogImagingStudy" WHERE "isActive" = true;
-- Expected: 141
```

### 5.2 Remove Wave 3 aliases only

```sql
DELETE FROM "ImagingStudyAlias" a
USING "CatalogImagingStudy" c
WHERE a."catalogImagingStudyId" = c.id
  AND c.code IN (
    'MRI_CHOLANGIOGRAM','MRI_HIP_BILATERAL_WO_CONTRAST','MRI_HIP_LEFT_WO_CONTRAST','MRI_HIP_RIGHT_WO_CONTRAST',
    'MRI_KNEE_LEFT','MRI_KNEE_RIGHT','MRI_LOWER_EXTREMITY_LEFT_W_WO_CONTRAST','MRI_LOWER_EXTREMITY_RIGHT_W_WO_CONTRAST',
    'MRI_PELVIS','MRI_PELVIS_LIMITED','MRI_SELLA',
    'MRI_UPPER_EXTREMITY_LEFT_WO_CONTRAST','MRI_UPPER_EXTREMITY_RIGHT_WO_CONTRAST','MRI_UPPER_EXTREMITY_RIGHT_W_WO_CONTRAST',
    'MRA_BRAIN','MRA_CAROTID_W_CONTRAST','MRA_CAROTID_WO_CONTRAST','MRA_LE_LEFT_W_CONTRAST','MRA_LE_RIGHT_W_CONTRAST',
    'US_CAROTID_DUPLEX',
    'US_ARTERIAL_DOPPLER_LE_BILATERAL','US_ARTERIAL_DOPPLER_LE_LEFT','US_ARTERIAL_DOPPLER_LE_RIGHT',
    'US_VENOUS_DOPPLER_UE_BILATERAL','US_VENOUS_DOPPLER_UE_LEFT','US_VENOUS_DOPPLER_UE_RIGHT',
    'US_ARTERIAL_DOPPLER_UE_BILATERAL','US_ARTERIAL_DOPPLER_UE_LEFT','US_ARTERIAL_DOPPLER_UE_RIGHT',
    'US_BREAST_BILATERAL','US_BREAST_LEFT','US_BREAST_RIGHT',
    'FL_ESOPHAGRAM','FL_LINE_PLACEMENT','FL_TUBE_PLACEMENT','FL_LUMBAR_PUNCTURE',
    'NM_HIDA','NM_GB_EMPTYING','NM_VQ_PERFUSION','NM_VQ_VENTILATION','NM_VQ_COMBINED'
  );
```

### 5.3 Re-verify Wave 2

```bash
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave2-staging-validation.ts
```

**Estimated rollback duration:** **~2–3 hours** (see [`wave3-rollback-plan.md`](wave3-rollback-plan.md)).

---

## 6. 2E.7D documentation deliverables (after execution)

| Report | Purpose |
|--------|---------|
| `wave3-production-execution-report.md` | Run 1 log + metrics |
| `wave3-production-postflight-report.md` | Validation JSON |
| `wave3-production-idempotency-report.md` | Run 2 |

---

*No production execution in 2E.7C — runbook only.*
