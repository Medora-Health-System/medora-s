# Controlled Substance Governance — Implementation (M1.3C)

**Phase:** M1.3C  
**Date:** 2026-05-31  
**Authority:** M1.1B, M1.3A, M1.3B  
**Migration:** None

---

## Schema decision

**Existing schema is sufficient.** No migration in M1.3C.

| Layer | Fields used |
|-------|-------------|
| `CatalogMedication` | `isControlled`, `controlledSchedule`, `requiresWitness`, `requiresDoubleSign` |
| `MedicationSafetyProfile` | Same flags on linked `MedicationConcept` (update only when profile **already exists**) |
| `TermClassifier` | `CONTROLLED_SUBSTANCE` domain (M1.3B reference vocabulary; not assigned per medication row) |

`controlledSubstanceClass` (M1.3B enum) is carried in the **manifest** and mapped to legacy `controlledSchedule` strings (`II`, `III`, `IV`, …) at apply time. A dedicated `controlledSubstanceClass` column is **deferred** to a future schema phase if reporting requires it.

---

## Implementation artifacts

| Path | Role |
|------|------|
| `packages/shared/src/medication/controlledSubstanceGovernanceManifest.ts` | Governed assignment manifest |
| `packages/shared/src/medication/controlledSubstanceGovernanceValidation.ts` | Validation + catalog matching |
| `apps/api/prisma/helpers/seed-controlled-substance-governance.ts` | Idempotent backfill |
| `apps/api/prisma/seed-catalogs.ts` | Runs after `seedHaitiMedicationCatalog` |

---

## Manifest summary

| Status | Count | Behavior |
|--------|------:|----------|
| **APPLY** | 9 | Updates matching `CatalogMedication` (+ existing safety profiles) |
| **MANUAL_REVIEW** | 2 | Tramadol SKUs — **not** auto-applied |
| **MISSING_CATALOG** | 5 | Documented only (hydrocodone, oxycodone, codeine, alprazolam, clonazepam) |

### APPLY targets (Haiti catalog)

| Medication | Class | Schedule |
|------------|-------|----------|
| Morphine 10 mg/mL injectable | `CONTROLLED_SCHEDULE_II` | II |
| Hydromorphone | `CONTROLLED_SCHEDULE_II` | II |
| Fentanyl | `CONTROLLED_SCHEDULE_II` | II |
| Ketamine | `CONTROLLED_SCHEDULE_III` | III |
| Midazolam injectable | `CONTROLLED_SCHEDULE_IV` | IV |
| Lorazepam injectable | `CONTROLLED_SCHEDULE_IV` | IV |
| Lorazepam oral 2 mg | `CONTROLLED_SCHEDULE_IV` | IV |
| Diazepam oral 5 mg | `CONTROLLED_SCHEDULE_IV` | IV |
| Diazepam injectable | `CONTROLLED_SCHEDULE_IV` | IV |

---

## Seed / backfill

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

Order: Haiti medications → `seedControlledSubstanceGovernance`.

**Not for production** in this phase.

---

## Out of scope (M1.3C)

- Order, MAR, billing, search changes
- Importing missing controlled drugs
- Creating `MedicationSafetyProfile` when absent
- High-alert / LASA assignment (M1.3D / M1.3E)

---

## Known test flake

`medication-governance-lifecycle.e2e` acetaminophen search ranking — **pre-existing** (M1.3B.1); unrelated to controlled governance.
