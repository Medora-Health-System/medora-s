# Wave 1 Production Runbook Validation (Phase 2E.5A)

**Phase:** 2E.5A  
**Date:** 2026-06-01  
**Audited artifacts:**

- [`imaging-b1-production-authorization.md`](imaging-b1-production-authorization.md) (3C-B1 — reference patterns)
- [`wave1-rollback-plan.md`](wave1-rollback-plan.md)
- [`wave1-production-readiness.md`](wave1-production-readiness.md)
- [`wave1-staging-validation-plan.md`](wave1-staging-validation-plan.md)
- `apps/api/prisma/seed-catalogs.ts` (implementation truth)

**Verdict:** **PASS** (runbook correctness) · **FAIL** (production execution evidence not present)

---

## 1. Scope alignment

| Document | Wave 1 scope? | Validation |
|----------|:-------------:|------------|
| `wave1-production-readiness.md` | **Yes** | Primary 2E.5B runbook |
| `wave1-rollback-plan.md` | **Yes** | Rollback |
| `wave1-staging-validation-plan.md` | **Yes** | Postflight expectations |
| `imaging-b1-production-authorization.md` | **No** (3C-B1 Haiti **44** backfill) | **Reference only** — classifier count SQL and FK column checks **reusable**; backfill/dry-run commands **not** part of Wave 1 seed |

---

## 2. Seed command correctness

### 2.1 Authorized command

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

| Check | Result |
|-------|--------|
| Matches `apps/api/package.json` script `prisma:seed-catalogs` | **PASS** |
| Invokes `seed-catalogs.ts` | **PASS** |
| Order: Haiti imaging (44) → ER labs → **MRV classifiers** → **Wave 1** → medications | **PASS** (classifiers before Wave 1) |
| Wave 1 function | `seedHaitiImagingWave1` | **PASS** |
| Forbidden codes excluded from manifest | **PASS** (`WAVE1_FORBIDDEN_CATALOG_CODES`) |

### 2.2 Expected console output

**First run:**

```text
✅ Wave 1 imaging catalog (37 studies, 41 aliases, 2 XR_CHEST tuple aliases)
✅ Catalogs seeded (lab, imaging, medications)
```

**Second run (idempotency):**

```text
✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Catalogs seeded (lab, imaging, medications)
```

| Check | 2E.4B | Runbook |
|-------|--------|---------|
| Run 1 counts | **PASS** | **PASS** |
| Run 2 counts | **PASS** | **PASS** |

---

## 3. Preflight commands (from B1 + Wave 1)

### 3.1 Migration

```bash
cd apps/api
pnpm exec prisma migrate deploy
pnpm exec prisma validate
```

**Expect:** `20260902120000_imaging_taxonomy_classifiers` applied; schema valid.

### 3.2 Classifier counts (reuse B1 §3.1)

```sql
SELECT domain, COUNT(*)::int AS n
FROM "TermClassifier"
WHERE "isActive" = true
GROUP BY domain
ORDER BY domain;
```

**Imaging domains expected (active):**

| Domain | Count |
|--------|------:|
| MODALITY | 8 |
| BODY_REGION | 42 |
| VIEW_COUNT | 6 |
| CONTRAST_TYPE | 5 |
| LATERALITY | 4 |
| ANATOMIC_SUBREGION | 36 |
| PROTOCOL | 40 |
| **Imaging subtotal** | **141** |

*Plus `LAB_CATEGORY: 16` if full MRV seed present.*

### 3.3 Catalog preflight (Wave 1)

```sql
-- Active imaging (expect 43 before Wave 1 prod seed)
SELECT COUNT(*)::int AS active_imaging
FROM "CatalogImagingStudy" WHERE "isActive" = true;

-- Wave 1 not yet present (expect 0)
SELECT COUNT(*)::int AS wave1_present
FROM "CatalogImagingStudy"
WHERE code IN (
  'XR_ABDOMEN_1V','XR_ABDOMEN_2V','XR_ABDOMEN_3V_ACUTE',
  'XR_RIBS_LEFT_WITH_CXR','XR_RIBS_RIGHT_WITH_CXR',
  'XR_CSPINE_1V_LATERAL','XR_CSPINE_2_3V','XR_CSPINE_3V_UPRIGHT','XR_CSPINE_COMPLETE',
  'XR_LSPINE_2V','XR_LSPINE_2V_UPRIGHT','XR_LSPINE_3V','XR_LSPINE_3V_UPRIGHT',
  'XR_TSPINE_2V','XR_TSPINE_3V_UPRIGHT','XR_THORACOLUMBAR_2V',
  'XR_SACRUM_COCCYX_2V','XR_RIBS_LEFT','XR_RIBS_RIGHT',
  'CT_HEAD_W_CONTRAST','CT_CHEST_W_IV_CONTRAST','CT_CHEST_W_WO_CONTRAST',
  'CT_ABDOMEN_PELVIS_W_IV_CONTRAST','CT_ABDOMEN_PELVIS_W_WO_CONTRAST',
  'CT_PELVIS_WO_CONTRAST','CT_PELVIS_W_WO_CONTRAST',
  'MRI_BRAIN_W_CONTRAST','MRI_BRAIN_W_WO_CONTRAST',
  'MRI_CSPINE_WO_CONTRAST','MRI_CSPINE_W_CONTRAST','MRI_CSPINE_W_WO_CONTRAST',
  'MRI_LSPINE_WO_CONTRAST','MRI_LSPINE_W_CONTRAST','MRI_LSPINE_W_WO_CONTRAST',
  'MRI_TSPINE_WO_CONTRAST','MRI_TSPINE_W_CONTRAST','MRI_TSPINE_W_WO_CONTRAST'
);

SELECT code, "isActive" FROM "CatalogImagingStudy" WHERE code = 'CT_HEAD';

SELECT code, "contrastTypeClassifierId"
FROM "CatalogImagingStudy" WHERE code = 'MRI_SPINE';
```

**Pass:** `active_imaging = 43`, `wave1_present = 0`, `CT_HEAD.isActive = false`, `MRI_SPINE.contrastTypeClassifierId IS NULL`.

**Note:** If production already seeded Wave 1 in error, `wave1_present = 37` — proceed with idempotent seed but postflight uses **80** active, not 43→80 delta.

---

## 4. Postflight commands

```sql
-- Wave 1 active (37)
SELECT COUNT(*)::int FROM "CatalogImagingStudy"
WHERE "isActive" = true AND code IN ( /* 37 codes */ );

-- Wave 1 aliases (41)
SELECT COUNT(*)::int FROM "ImagingStudyAlias" a
JOIN "CatalogImagingStudy" c ON c.id = a."catalogImagingStudyId"
WHERE c.code IN ( /* 37 codes */ );

-- XR_CHEST tuple (2)
SELECT a.alias FROM "ImagingStudyAlias" a
JOIN "CatalogImagingStudy" c ON c.id = a."catalogImagingStudyId"
WHERE c.code = 'XR_CHEST'
  AND a.alias IN ('chest 1v decub', 'chest post intubation');

-- Active total (80)
SELECT COUNT(*)::int FROM "CatalogImagingStudy" WHERE "isActive" = true;

-- Billing safety
SELECT COUNT(*)::int FROM "CatalogImagingStudy"
WHERE code IN ( /* 37 */ ) AND "billingCodeDefault" IS NOT NULL;

-- MRI_SPINE regression
SELECT "contrastTypeClassifierId" FROM "CatalogImagingStudy" WHERE code = 'MRI_SPINE';

-- Wave-1-internal duplicate aliases (0 rows)
SELECT a.alias, COUNT(*) FROM "ImagingStudyAlias" a
JOIN "CatalogImagingStudy" c ON c.id = a."catalogImagingStudyId"
WHERE c.code IN ( /* 37 */ )
GROUP BY a.alias HAVING COUNT(*) > 1;
```

Optional:

```bash
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave1-staging-validation.ts
```

---

## 5. Rollback validation

| Requirement | `wave1-rollback-plan.md` | Correct? |
|-------------|--------------------------|----------|
| `UPDATE … SET isActive = false` for 37 codes | §2.1 | **PASS** |
| Active catalog → 43 (+ inactive CT_HEAD) | §2.1 step 2 | **PASS** |
| Optional alias DELETE (not deactivate table) | §2.2 | **PASS** |
| Classifier FKs left on inactive rows | §2.3 preferred | **PASS** |
| No `MRI_SPINE` / W1-44 tuple changes | §2.3 | **PASS** |
| No hard delete catalog | §1 | **PASS** |
| No reactivate `CT_HEAD` | W2.3 / 2D policy | **PASS** |

**Rollback runbook:** **PASS**

**Gap:** `imaging-b1-production-authorization.md` rollback section covers **backfill audit** reversal, not Wave 1 — use Wave 1 rollback only.

---

## 6. Idempotency verification

| Step | Command / check | Pass criteria |
|------|-----------------|---------------|
| 1 | First `prisma:seed-catalogs` | Log: 37, 41, 2 |
| 2 | Postflight counts | 37 / 41 / 80 |
| 3 | Second `prisma:seed-catalogs` | Log: 37, **0**, **0** |
| 4 | Re-postflight | Counts unchanged |

**Validated on staging:** 2E.4B **PASS**  
**Validated on production:** Not executed in 2E.5A

---

## 7. Monitoring checks (during execution)

| Signal | Action if failed |
|--------|------------------|
| Prisma P2022 (missing column) | Stop — run `migrate deploy` |
| `[wave1-seed] missing TermClassifier` | Stop — run `seedMrvClassifiers` path via full seed-catalogs |
| `[wave1-seed] forbidden catalog code` | Stop — manifest corruption |
| Non-zero `billingCodeDefault` on new rows | Stop — out of scope change |
| Seed duration spike / lock timeout | Retry once; else abort |

---

## 8. Runbook validation result

| Area | PASS / FAIL |
|------|-------------|
| Command correctness | **PASS** |
| Preflight SQL completeness | **PASS** |
| Postflight SQL completeness | **PASS** |
| Rollback correctness | **PASS** |
| Idempotency spec | **PASS** |
| B1 doc cross-use | **PASS** (classifier preflight only) |
| Production execution evidence | **FAIL** (not run) |

**Overall runbook validation:** **PASS** — safe to execute **after** C1, C2, C4, C6 close.

---

*2E.5A — no production writes.*
