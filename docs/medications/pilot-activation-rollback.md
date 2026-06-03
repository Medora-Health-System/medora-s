# M1.6F — Pilot Activation Rollback

## Rollback function

`rollbackEnterpriseFormularyPilotTrancheA(prisma, options)` in  
`apps/api/prisma/helpers/seed-enterprise-formulary-pilot-activation.ts`

---

## What rollback does

| Step | Action |
|------|--------|
| 1 | Find products with `ENTERPRISE_M16F_TRANCHE_A_PILOT` marker |
| 2 | Deactivate concept, product, default package |
| 3 | Set `governanceStatus=REVIEW_REQUIRED` |
| 4 | Strip pilot marker lines; clear runtime flags (order search, MAR, billing, formulary approved) |
| 5 | Set `FacilityFormularyItem.isOnFormulary=false` for pilot facility |

---

## What rollback preserves

- Enterprise Wave 1/2 markers (`ENTERPRISE_M16B_WAVE1_FORMULARY`, etc.)
- Canonical linkage (`legacyCatalogMedicationId`)
- Billing profiles and NDC/HCPCS data
- Safety profiles and aliases
- Catalog medication rows

**No data loss. No billing profile deletion.**

---

## Usage (seed — M1.6H wired)

```bash
# Dry-run first
MEDORA_ENTERPRISE_PILOT_ROLLBACK=1 \
MEDORA_ENTERPRISE_PILOT_DRY_RUN=1 \
MEDORA_ENTERPRISE_PILOT_CATALOG_CODES="AMLODIPINE_5_MG_COMPRIME_ORAL" \
pnpm --filter @medora/api run prisma:seed-catalogs

# Live rollback
MEDORA_ENTERPRISE_PILOT_ROLLBACK=1 \
MEDORA_ENTERPRISE_PILOT_CATALOG_CODES="AMLODIPINE_5_MG_COMPRIME_ORAL" \
pnpm --filter @medora/api run prisma:seed-catalogs
```

Do **not** combine with `MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1`.

See `pilot-rollback-ops-fix-m1.6h.md` for staging repair + SQL verification.

## Usage (programmatic)

```typescript
import { rollbackEnterpriseFormularyPilotTrancheA } from "./helpers/seed-enterprise-formulary-pilot-activation";

await rollbackEnterpriseFormularyPilotTrancheA(prisma, {
  facilityId: "<pilot-facility-id>",
  dryRun: true, // preview first
  catalogCodes: ["AMLODIPINE_5_MG_COMPRIME_ORAL"], // optional subset
});
```

---

## Rollback readiness

| Metric | Value |
|--------|------:|
| Rollback path implemented | Yes |
| Idempotent re-activation | Yes (after rollback, product returns to REVIEW_REQUIRED) |
| Staging rollback readiness | **100%** (0 activated — nothing to roll back yet) |

---

## Recovery verification

After rollback, confirm:

```sql
SELECT code, "isActive", "governanceStatus"
FROM "MedicationProduct"
WHERE code = 'AMLODIPINE_5_MG_COMPRIME_ORAL';

-- Expect: isActive=false, governanceStatus=REVIEW_REQUIRED
-- governanceNotes: enterprise wave marker present, pilot marker absent
```

---

## When to rollback

- Unexpected search or ordering behavior during pilot UAT
- Wrong medication activated
- Clinician/pharmacy requests pause before billing/MAR enablement

Do **not** rollback enterprise formulary seed markers — only pilot activation state.
