# LASA Medication Governance — Implementation (M1.3E)

**Phase:** M1.3E  
**Date:** 2026-05-31  
**Authority:** M1.1B, M1.3A, M1.3B, M1.3C, M1.3D  
**Migration:** None

---

## Schema decision

**Partial support — no migration in M1.3E.**

| Field | Used in M1.3E |
|-------|----------------|
| `MedicationSafetyProfile.lasaGroupId` | Set to manifest `lasaGroupCode` |
| `MedicationSafetyProfile.highAlertCategories` | Merged JSON key `lasa` (preserves M1.3D HA payload) |

**Not in schema (deferred M1.3E-M1):** `isLASA`, `CatalogMedication.lasaGroupId`, `requiresOverrideReason`, dedicated LASA severity column.

`highAlertCategories.lasa` shape:

```json
{
  "lasaGroupCode": "GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE",
  "lasaGroupLabel": "Morphine / hydromorphone",
  "lasaSeverity": "LASA_HIGH",
  "sourcePhase": "M1.3E"
}
```

---

## Implementation artifacts

| Path | Role |
|------|------|
| `packages/shared/src/medication/lasaMedicationGovernanceManifest.ts` | 17 rows, 8 groups |
| `packages/shared/src/medication/lasaMedicationGovernanceValidation.ts` | Validation + matching + JSON merge |
| `apps/api/prisma/helpers/seed-lasa-medication-governance.ts` | Idempotent backfill |
| `apps/api/prisma/seed-catalogs.ts` | Runs after high-alert seed |

---

## Manifest summary

| Status | Members | Groups |
|--------|--------:|-------:|
| **APPLY** | 8 | 4 |
| **MANUAL_REVIEW** | 5 | 2 |
| **MISSING_CATALOG** | 4 | 2 |

### APPLY groups (Haiti catalog)

| Group | Severity | Members |
|-------|----------|---------|
| `GROUP_LASA_OPIOID_MORPHINE_HYDROMORPHONE` | LASA_HIGH | Morphine 10 mg/mL, hydromorphone |
| `GROUP_LASA_VASOPRESSOR_EPI_NOREPI` | LASA_HIGH | Adrenaline, norepinephrine |
| `GROUP_LASA_INOTROPE_DOPAMINE_DOBUTAMINE` | LASA_HIGH | Dopamine, dobutamine |
| `GROUP_LASA_CEFAZOLIN_CEFTRIAXONE` | LASA_MEDIUM | Cefazolin 1 g, ceftriaxone 1 g injectable |

M1.3C/M1.3D assignments are **not modified**; LASA JSON is merged into existing `highAlertCategories`.

---

## Seed

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

**Not for production** in this phase.

---

## Out of scope

- Order, MAR, billing, search changes
- Importing missing LASA drugs
- Creating `MedicationSafetyProfile` when absent

---

## Known test flake

`medication-governance-lifecycle.e2e` acetaminophen search — **pre-existing** (M1.3B.1).
