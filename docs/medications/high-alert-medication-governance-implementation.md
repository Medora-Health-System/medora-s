# High-Alert Medication Governance — Implementation (M1.3D)

**Phase:** M1.3D  
**Date:** 2026-05-31  
**Authority:** M1.1B, M1.3A, M1.3B, M1.3C  
**Migration:** None

---

## Schema decision

**Partial schema support — no migration in M1.3D.**

| Layer | Fields used in M1.3D | Not in schema (deferred M1.3D-M1) |
|-------|----------------------|-----------------------------------|
| `CatalogMedication` | `requiresWitness`, `requiresDoubleSign` only | `isHighAlert`, `highAlertClass` |
| `MedicationSafetyProfile` | `isHighAlert`, `highAlertCategories` (JSON payload), `requiresWitness`, `requiresDoubleSign` | `highAlertClass`, `requiresDualVerification`, `requiresIndependentDoubleCheck`, `requiresMARVerification`, `requiresOverrideReason`, `requiresCosign`, `requiresReconciliationReview` |

`highAlertCategories` JSON shape (M1.3D):

```json
{
  "highAlertClass": "HIGH_ALERT_INSULIN",
  "safetyRequirements": ["REQUIRES_INDEPENDENT_DOUBLE_CHECK", "REQUIRES_MAR_VERIFICATION"],
  "sourcePhase": "M1.3D"
}
```

Safety requirement codes are **reference vocabulary** (M1.3B `SAFETY_REQUIREMENT` domain). Persisted in JSON until dedicated boolean columns exist.

---

## Implementation artifacts

| Path | Role |
|------|------|
| `packages/shared/src/medication/highAlertMedicationGovernanceManifest.ts` | Governed manifest (33 rows) |
| `packages/shared/src/medication/highAlertMedicationGovernanceValidation.ts` | Validation + matching + payload mapping |
| `apps/api/prisma/helpers/seed-high-alert-medication-governance.ts` | Idempotent backfill |
| `apps/api/prisma/helpers/medication-governance-seed-modules.ts` | ESM-safe loader (M1.3C.1) |
| `apps/api/prisma/seed-catalogs.ts` | Runs after controlled-substance seed |

---

## Manifest summary

| Status | Count | Behavior |
|--------|------:|----------|
| **APPLY** | 23 | Updates catalog witness flags + existing safety profiles |
| **MANUAL_REVIEW** | 2 | Tramadol SKUs — not auto-applied |
| **MISSING_CATALOG** | 8 | Documented only (warfarin, enoxaparin, DOACs, basal/rapid insulins, alteplase) |

### APPLY groups (Haiti catalog)

| Class | Agents |
|-------|--------|
| INSULIN | Regular, NPH, 70/30 |
| ANTICOAGULANT | Heparin |
| OPIOID | Morphine, hydromorphone, fentanyl |
| BENZODIAZEPINE | Lorazepam (IV + oral), diazepam (oral + injectable) |
| SEDATIVE | Midazolam, propofol, ketamine |
| VASOPRESSOR | Norepinephrine, adrenaline (epinephrine), phenylephrine, vasopressin, dopamine, dobutamine |
| ANTIARRHYTHMIC | Amiodarone |
| PARALYTIC | Rocuronium, succinylcholine |

M1.3C controlled assignments are **not overwritten**; witness/double-sign flags merge with OR semantics when both apply.

---

## Seed / backfill

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

Order: Haiti medications → controlled governance → **high-alert governance**.

**Not for production** in this phase.

---

## Out of scope (M1.3D)

- Order, MAR, billing, search changes
- Importing missing high-alert drugs
- Creating `MedicationSafetyProfile` when absent
- LASA assignment (M1.3E)

---

## Known test flake

`medication-governance-lifecycle.e2e` acetaminophen search — **pre-existing** (M1.3B.1); unrelated to high-alert governance.
