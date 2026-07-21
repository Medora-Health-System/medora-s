# D3E.7 — Inpatient Clinical Operations & Durable Documentation

**Certification:** `MEDUI.INPATIENT_CLINICAL_OPERATIONS.D3E7`

## Decision

**YES — WITH REVIEW ITEMS**

## Architecture (zero migration)

Durable Inpatient clinical state reuses:

| Concern | Reuse |
|---|---|
| H&P / progress / nursing narrative | `EncounterNote` (+ amend) via shared notes API |
| Attending / nurse current assignment | `Encounter.physicianAssignedUserId` / `nurseAssignedUserId` |
| Code status, isolation, consults, care plan, discharge planning, med-rec decisions | `Encounter.admissionSummaryJson.inpatientClinicalOpsV1` |
| Placement mutations | `POST /internal-placement/:id/transitions` (D3C) |
| Direct admission | `POST /inpatient-operations/direct-admission` → `Encounter` type `INPATIENT` only |
| Beds | Existing Floor Board / bed keys on placement — **no second inventory** |
| Orders / Lab / Rad / Pharmacy / MAR / Results | Shared enterprise engines on the Inpatient encounter |

## Local activation profile

Enable (local/test only; production defaults remain OFF):

```bash
DIRECT_INPATIENT_ADMISSION_ENABLED=true
NEXT_PUBLIC_DIRECT_INPATIENT_ADMISSION_ENABLED=true
PLACEMENT_ACTIONS_ENABLED=true
NEXT_PUBLIC_PLACEMENT_ACTIONS_ENABLED=true
INPATIENT_WORKSPACE_ENABLED=true
NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED=true
INPATIENT_DOCUMENTATION_ENABLED=true
NEXT_PUBLIC_INPATIENT_DOCUMENTATION_ENABLED=true
INPATIENT_NURSING_ENABLED=true
NEXT_PUBLIC_INPATIENT_NURSING_ENABLED=true
INPATIENT_CONSULTS_ENABLED=true
NEXT_PUBLIC_INPATIENT_CONSULTS_ENABLED=true
INPATIENT_CARE_PLAN_ENABLED=true
NEXT_PUBLIC_INPATIENT_CARE_PLAN_ENABLED=true
INPATIENT_DISCHARGE_PLANNING_ENABLED=true
NEXT_PUBLIC_INPATIENT_DISCHARGE_PLANNING_ENABLED=true
INTERNAL_PLACEMENT_WORKFLOW_ENABLED=true
NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED=true
RECEIVING_ENCOUNTER_FOUNDATION_ENABLED=true
NEXT_PUBLIC_RECEIVING_ENCOUNTER_FOUNDATION_ENABLED=true
```

Canonical profile constant: `INPATIENT_OPS_DEV_ACTIVATION_PROFILE` in `@medora/shared`.

## Hard blockers vs advisories

**Hard blockers (admission):** patient required, facility/auth, open-encounter conflict, cross-facility, unauthorized actor.

**Not hard blockers:** missing code status, missing nurse assignment, missing Observation note/MAR, incomplete H&P before arrival.

**Advisories:** undocumented code status (banner), pending med-rec, incomplete nursing admission assessment.

## Review items

1. Accept / bed-assign placement transitions still require **ADMIN** in clinic MVP role mapping.
2. Care-team history is append-only JSON + current assignment columns (no dedicated history table).
3. Consult / care-plan / discharge / med-rec persist under JSON until a dedicated entity is justified.
4. Med-rec CONTINUE does not auto-create orders — explicit subsequent order action required.
5. Transfer-in is foundation-level (`EXTERNAL_TRANSFER` source) without D3F transfer engine.
6. HospitalEpisode for direct admit is created when foundation flag is ON; ED eligibility path remains ED-centric elsewhere.

## Validation

```bash
pnpm inpatient-operations:validate
pnpm inpatient-documentation:validate
pnpm inpatient-nursing:validate
pnpm inpatient-consults:validate
pnpm inpatient-discharge:validate
pnpm direct-admission:validate
pnpm placement-actions:validate
```

## Constraints honored

- No migrations applied
- Production feature defaults OFF
- No push
- No D3F Transfers / ICU / OR / PACU
- No duplicate Lab / Rad / Pharmacy / MAR / bed inventory
