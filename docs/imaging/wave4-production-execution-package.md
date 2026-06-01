# Wave 4 Production Execution Package (Phase 2E.8C → 2E.8D)

**Phase:** 2E.8D production runbook  
**Date:** 2026-06-01  
**Environment:** Railway production  
**Minimum commit:** `103b05ec` — *Add Wave 4 imaging catalog seed*

**Authorization:** **AUTHORIZED WITH CONDITIONS** — see [`wave4-production-authorization.md`](wave4-production-authorization.md). **W4-P-01** **OPEN** until operator preflight §0 complete.

---

## 0. Pre-seed validation (required before run 1)

**Status:** Operator must complete before 2E.8D (2E.8C agent session did not run live production).

`wave4-staging-validation.ts` against **production before** Wave 4 seed. Expected:

| Field | Pre-seed value | Meaning |
|-------|----------------|---------|
| `summary.pass` | **false** | **Expected** — includes post-seed checks |
| `checksFailed` | **~9** | Post-seed-only failures |
| `totalActiveImaging` | **182** | **PASS** — correct baseline |
| `wave4Studies` | **0** | **PASS** — Wave 4 not yet deployed |
| `wave4Aliases` | **0** | **PASS** |

**Do not** treat aggregate `pass: false` as a blocker. W4-P-01 baseline checks must **pass** (active **182**, W1 **37**, W2 **61**, W3 **41**, W4 **0**, governance intact).

**Wave 4-specific checks** (row counts, aliases, search smoke, classifiers **31/31**, active **213**) pass only **after** seed execution (2E.8D run 1).

### Expected post-seed state (after run 1)

| Metric | Target |
|--------|-------:|
| Active imaging | **213** |
| Wave 4 active rows | **31** (XR-3 **7** + CT-3 **24**) |
| Wave 4 aliases | **~72** |
| `wave4-staging-validation.ts` | **full PASS** (`summary.pass: true`, `checksFailed: 0`) |

---

## 1. Preflight baseline (production — expected)

**Verify on production** (2E.8C / W4-P-01) — see [`wave4-production-preflight.md`](wave4-production-preflight.md) §2:

| Metric | Value |
|--------|------:|
| Active imaging | **182** |
| Wave 1 active | **37** |
| Wave 2 active | **61** |
| Wave 3 active | **41** |
| Wave 4 codes present (active) | **0** |
| Wave 3 aliases | **~86** |
| `CT_HEAD` active | **false** |
| `MRI_SPINE` contrast FK | **null** |

---

## 2. Production command (run 1)

**Prerequisites:** W4-P-01 **CLOSED** · W4-P-06 **CLOSED** · `DATABASE_URL` = production · commit **`103b05ec`** or later.

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

**Seed order (idempotent):** Haiti lab/imaging (44) → ER labs → MRV classifiers → Wave 1 (37) → Wave 2 (61) → Wave 3 (41) → **Wave 4 (31)** → medications.

### Run 1 — expected log line

```text
✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Wave 2 imaging catalog (61 studies, 0 aliases, 15 US tuple mappings, 0 tuple aliases, 0 tuple protocol updates)
✅ Wave 3 imaging catalog (41 studies, 0 aliases)
✅ Wave 4 imaging catalog (31 studies, 72 aliases)
✅ Catalogs seeded (lab, imaging, medications)
```

*First production run: Waves 1–3 lines typically show `0` new aliases; Wave 4 alias count authoritative on run 1.*

**Duration note:** Full `prisma:seed-catalogs` may take **several minutes**. Wait for `Catalogs seeded`.

---

## 3. Postflight checks (after run 1)

```bash
railway run --service Postgres --environment production -- sh -c '
export DATABASE_URL="$DATABASE_PUBLIC_URL"
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave4-staging-validation.ts
'
```

| Check | Expected |
|-------|----------|
| `summary.pass` | **true** |
| `checksFailed` | **0** |
| `wave4Studies` | **31** |
| `wave4Aliases` | **≥ 72** |
| Active imaging total | **213** |
| Wave 1 active | **37** |
| Wave 2 active | **61** |
| Wave 3 active | **41** |
| `CT_HEAD` | inactive |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** |
| Forbidden codes / CTA extremity | per script |
| Wave 4 `billingCodeDefault` set | **0** |

### Postflight SQL (spot checks)

```sql
-- Active totals
SELECT COUNT(*)::int AS active_imaging FROM "CatalogImagingStudy" WHERE "isActive" = true;

-- Wave 4 presence
SELECT COUNT(*)::int AS wave4_active FROM "CatalogImagingStudy"
WHERE "isActive" = true AND code = 'XR_AC_JOINT_LEFT_2V';

-- Governance
SELECT code, "isActive" FROM "CatalogImagingStudy"
WHERE code IN ('CT_HEAD','CT_ABD','US_ABD','DOPPLER_VEIN');

SELECT "contrastTypeClassifierId" FROM "CatalogImagingStudy" WHERE code = 'MRI_SPINE';

-- Wave 3 preservation
SELECT COUNT(*)::int AS wave3_active FROM "CatalogImagingStudy"
WHERE "isActive" = true AND code = 'MRI_KNEE_LEFT';

-- CT vs CTA disambiguation
SELECT code FROM "CatalogImagingStudy"
WHERE "isActive" = true AND code LIKE 'CTA_LOWER_EXTREMITY_%';
```

---

## 4. Idempotency command (run 2)

Same command as §2. **Do not** skip postflight on run 1.

### Run 2 — expected log line

```text
✅ Wave 4 imaging catalog (31 studies, 0 aliases)
```

| Check | Expected |
|-------|----------|
| Wave 4 studies upserted | **31** |
| New Wave 4 aliases | **0** |
| Active imaging | **213** (stable) |
| Wave 1 / 2 / 3 counts | unchanged |

Document results in `wave4-production-execution-report.md`, `wave4-production-postflight-report.md`, and `wave4-production-idempotency-report.md` (2E.8D phase).

---

## 5. Rollback (emergency — soft deactivate only)

**Do not** hard-delete. **Do not** mutate Waves 1–3 or Haiti baseline rows.

### 5.1 Deactivate Wave 4 catalog rows

Use full code list from [`apps/api/prisma/data/haiti-imaging-wave4.ts`](../../apps/api/prisma/data/haiti-imaging-wave4.ts) (`HAITI_IMAGING_WAVE4_CATALOG`).

```sql
UPDATE "CatalogImagingStudy"
SET "isActive" = false, "updatedAt" = NOW()
WHERE code IN (
  'XR_AC_JOINT_BILATERAL_2V','XR_AC_JOINT_LEFT_2V','XR_AC_JOINT_RIGHT_2V',
  'XR_CLAVICLE_LEFT_2V','XR_CLAVICLE_RIGHT_2V','XR_SCAPULA_LEFT','XR_SCAPULA_RIGHT',
  'CT_BRAIN_PERFUSION','CT_FACIAL_WO_CONTRAST','CT_MAXILLOFACIAL_WO_CONTRAST','CT_MAXILLOFACIAL_W_IV_CONTRAST',
  'CT_ORBITS_WO_CONTRAST','CT_SINUSES_WO_CONTRAST',
  'CT_STN_WO_CONTRAST','CT_STN_W_IV_CONTRAST','CT_STN_W_WO_CONTRAST',
  'CT_TSPINE_WO_CONTRAST',
  'CT_FOOT_LEFT_WO_CONTRAST','CT_FOOT_RIGHT_WO_CONTRAST',
  'CT_HIP_LEFT_WO_CONTRAST','CT_HIP_RIGHT_WO_CONTRAST',
  'CT_KNEE_LEFT_WO_CONTRAST','CT_KNEE_RIGHT_WO_CONTRAST',
  'CT_LOWER_EXTREMITY_LEFT_W_IV_CONTRAST','CT_LOWER_EXTREMITY_LEFT_WO_CONTRAST',
  'CT_LOWER_EXTREMITY_RIGHT_W_IV_CONTRAST','CT_LOWER_EXTREMITY_RIGHT_WO_CONTRAST',
  'CT_UPPER_EXTREMITY_LEFT_W_IV_CONTRAST','CT_UPPER_EXTREMITY_LEFT_WO_CONTRAST',
  'CT_UPPER_EXTREMITY_RIGHT_W_IV_CONTRAST','CT_UPPER_EXTREMITY_RIGHT_WO_CONTRAST'
);

SELECT COUNT(*)::int AS active_imaging FROM "CatalogImagingStudy" WHERE "isActive" = true;
-- Expected: 182
```

### 5.2 Remove Wave 4 aliases only

```sql
DELETE FROM "ImagingStudyAlias" a
USING "CatalogImagingStudy" c
WHERE a."catalogImagingStudyId" = c.id
  AND c.code IN (
    'XR_AC_JOINT_BILATERAL_2V','XR_AC_JOINT_LEFT_2V','XR_AC_JOINT_RIGHT_2V',
    'XR_CLAVICLE_LEFT_2V','XR_CLAVICLE_RIGHT_2V','XR_SCAPULA_LEFT','XR_SCAPULA_RIGHT',
    'CT_BRAIN_PERFUSION','CT_FACIAL_WO_CONTRAST','CT_MAXILLOFACIAL_WO_CONTRAST','CT_MAXILLOFACIAL_W_IV_CONTRAST',
    'CT_ORBITS_WO_CONTRAST','CT_SINUSES_WO_CONTRAST',
    'CT_STN_WO_CONTRAST','CT_STN_W_IV_CONTRAST','CT_STN_W_WO_CONTRAST',
    'CT_TSPINE_WO_CONTRAST',
    'CT_FOOT_LEFT_WO_CONTRAST','CT_FOOT_RIGHT_WO_CONTRAST',
    'CT_HIP_LEFT_WO_CONTRAST','CT_HIP_RIGHT_WO_CONTRAST',
    'CT_KNEE_LEFT_WO_CONTRAST','CT_KNEE_RIGHT_WO_CONTRAST',
    'CT_LOWER_EXTREMITY_LEFT_W_IV_CONTRAST','CT_LOWER_EXTREMITY_LEFT_WO_CONTRAST',
    'CT_LOWER_EXTREMITY_RIGHT_W_IV_CONTRAST','CT_LOWER_EXTREMITY_RIGHT_WO_CONTRAST',
    'CT_UPPER_EXTREMITY_LEFT_W_IV_CONTRAST','CT_UPPER_EXTREMITY_LEFT_WO_CONTRAST',
    'CT_UPPER_EXTREMITY_RIGHT_W_IV_CONTRAST','CT_UPPER_EXTREMITY_RIGHT_WO_CONTRAST'
  );
```

### 5.3 Re-verify Wave 3

```bash
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave3-staging-validation.ts
```

**Estimated rollback duration:** **~2–3.5 hours** (see [`wave4-rollback-plan.md`](wave4-rollback-plan.md)).

---

## 6. 2E.8D documentation deliverables (after execution)

| Report | Purpose |
|--------|---------|
| `wave4-production-execution-report.md` | Run 1 log + metrics |
| `wave4-production-postflight-report.md` | Validation JSON |
| `wave4-production-idempotency-report.md` | Run 2 |

---

*No production execution in 2E.8C — runbook only.*
