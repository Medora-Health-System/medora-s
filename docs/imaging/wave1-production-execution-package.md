# Wave 1 Production Execution Package (Phase 2E.5A.1 → 2E.5B)

**Phase:** 2E.5B execution runbook (authorized by [`wave1-production-authorization-final-v2.md`](wave1-production-authorization-final-v2.md))  
**Date:** 2026-06-01  
**Environment:** Railway production  

---

## 1. Preflight baseline (production — read-only, 2E.5A.1)

| Metric | Value |
|--------|------:|
| Active imaging | **43** |
| Wave 1 codes present | **0** |
| `CT_HEAD` active | **false** |
| `MRI_SPINE` contrast FK | **null** |
| Imaging classifiers | **141** (domains per preflight doc) |

---

## 2. Production command

**Prerequisites:** `DATABASE_URL` = production (Railway medora-s service or approved proxy). Deployed commit includes Wave 1 seed (`643258c9` or later on `main`).

```bash
# From repository root
pnpm --filter @medora/api run prisma:seed-catalogs
```

**Seed order (idempotent):** Haiti lab/imaging (44) → ER labs → MRV classifiers → **Wave 1 (37)** → medications.

### Run 1 — expected log

```text
✅ Wave 1 imaging catalog (37 studies, 41 aliases, 2 XR_CHEST tuple aliases)
✅ Catalogs seeded (lab, imaging, medications)
```

---

## 3. Postflight checks (after run 1)

Execute on production (read-only SELECT):

| Check | Expected |
|-------|----------|
| Wave 1 active rows | **37** |
| Wave 1 aliases | **41** |
| `XR_CHEST` tuple aliases | **2** (`chest 1v decub`, `chest post intubation`) |
| Active imaging total | **80** |
| `CT_HEAD` | inactive |
| Wave 1 `billingCodeDefault` | **0** rows set |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** |
| Wave-1-internal duplicate aliases | **0** |

```sql
-- Active Wave 1 count
SELECT COUNT(*)::int FROM "CatalogImagingStudy"
WHERE "isActive" = true AND code IN (
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

SELECT COUNT(*)::int FROM "CatalogImagingStudy" WHERE "isActive" = true;

SELECT "contrastTypeClassifierId" FROM "CatalogImagingStudy" WHERE code = 'MRI_SPINE';
```

Optional:

```bash
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave1-staging-validation.ts
```

*(Requires production `DATABASE_URL` and deployed script.)*

---

## 4. Idempotency (run 2)

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

**Expected:**

```text
✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Catalogs seeded (lab, imaging, medications)
```

**Pass:** Postflight counts unchanged; no duplicate aliases on Wave 1 codes.

---

## 5. Rollback (if needed)

See [`wave1-rollback-plan.md`](wave1-rollback-plan.md) — soft `isActive=false` on 37 codes; active imaging returns to **43**; do not reactivate `CT_HEAD`.

---

## 6. Out of scope

- Waves 2–4 · billing/CPT · Phase 2D retirement · search redesign · production API redeploy (unless separately approved)

---

*Execution package — perform only under 2E.5B authorization.*
