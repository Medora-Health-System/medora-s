# M1.6H — Enterprise Pilot Rollback Ops Fix

**Date:** 2026-06-03  
**Priority:** CRITICAL — staging repair before any further pilot rollout

---

## Root cause (exact)

`rollbackEnterpriseFormularyPilotTrancheA()` was implemented in M1.6F but **`MEDORA_ENTERPRISE_PILOT_ROLLBACK=1` was never wired** in `apps/api/prisma/seed-catalogs.ts`.

Running:

```bash
MEDORA_ENTERPRISE_PILOT_ROLLBACK=1 pnpm --filter @medora/api run prisma:seed-catalogs
```

executed the normal catalog seed only. **No rollback function ran.** Staging activation state was unchanged.

### Why logs showed `activated=0`

The activation seed log prints `activated=${pilot.activatedProducts}` (not `rolledBack`). Re-running activation on an already-active product increments `alreadyActivated` and leaves `activatedProducts=0`. That is **not** evidence that rollback ran.

---

## What rollback does (when wired)

| Step | Action |
|------|--------|
| 1 | `findMany` products with `ENTERPRISE_M16F_TRANCHE_A_PILOT` in `governanceNotes` (optional `catalogCodes` filter) |
| 2 | `isActive=false` on concept, product, default package |
| 3 | `governanceStatus=REVIEW_REQUIRED` |
| 4 | Strip pilot lines + clear runtime activation block flags |
| 5 | `FacilityFormularyItem.isOnFormulary=false` when applicable |
| 6 | **Fail closed:** if live rollback matches 0 rows but pilot markers remain → throw |

Preserves Enterprise Wave 1/2 markers, billing profiles, aliases, catalog rows.

---

## Staging repair command

**Dry-run first:**

```bash
MEDORA_ENTERPRISE_PILOT_ROLLBACK=1 \
MEDORA_ENTERPRISE_PILOT_DRY_RUN=1 \
MEDORA_ENTERPRISE_PILOT_CATALOG_CODES="AMLODIPINE_5_MG_COMPRIME_ORAL" \
pnpm --filter @medora/api run prisma:seed-catalogs
```

Expect: `rolledBack=1`, `dryRun=true`.

**Live repair (after dry-run OK):**

```bash
MEDORA_ENTERPRISE_PILOT_ROLLBACK=1 \
MEDORA_ENTERPRISE_PILOT_CATALOG_CODES="AMLODIPINE_5_MG_COMPRIME_ORAL" \
pnpm --filter @medora/api run prisma:seed-catalogs
```

Expect: `rolledBack=1`, `dryRun=false`.

Do **not** set `MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1` in the same command.

---

## SQL verification (staging)

```sql
-- 1) Pilot marker must be absent
SELECT code, "isActive", "governanceStatus", "governanceNotes"
FROM "MedicationProduct"
WHERE code = 'AMLODIPINE_5_MG_COMPRIME_ORAL';

-- Expect: isActive = false, governanceStatus = REVIEW_REQUIRED
-- governanceNotes: ENTERPRISE_M16B_WAVE1_FORMULARY present
-- governanceNotes: NO '%ENTERPRISE_M16F_TRANCHE_A_PILOT%'

-- 2) Count any remaining pilot-activated enterprise products
SELECT COUNT(*) AS pilot_marked_active
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M16F_TRANCHE_A_PILOT%'
  AND "isActive" = true;

-- Expect: 0

-- 3) All pilot markers (any activation state)
SELECT code, "isActive", "governanceStatus"
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M16F_TRANCHE_A_PILOT%'
ORDER BY code;

-- Expect: 0 rows after successful repair

-- 4) Concept + package chain for amlodipine
SELECT mp.code, mp."isActive" AS product_active, mc."isActive" AS concept_active,
       mpack."isActive" AS package_active
FROM "MedicationProduct" mp
JOIN "MedicationConcept" mc ON mc.id = mp."conceptId"
LEFT JOIN "MedicationPackage" mpack ON mpack."productId" = mp.id AND mpack."isDefaultForProduct" = true
WHERE mp.code = 'AMLODIPINE_5_MG_COMPRIME_ORAL';

-- Expect: all false after rollback
```

---

## Env flags

| Variable | Purpose |
|----------|---------|
| `MEDORA_ENTERPRISE_PILOT_ROLLBACK=1` | Run rollback (required) |
| `MEDORA_ENTERPRISE_PILOT_CATALOG_CODES` | Optional subset; recommended for single-med repair |
| `MEDORA_ENTERPRISE_PILOT_DRY_RUN=1` | Preview rollback count without writes |

**Mutually exclusive with** `MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1`.

---

## Pilot rollout gate

Do **not** continue live pilot activation until SQL verification shows **0** pilot-marked active products and amlodipine is `REVIEW_REQUIRED` / inactive.
