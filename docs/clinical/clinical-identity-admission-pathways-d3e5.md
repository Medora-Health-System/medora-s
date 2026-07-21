# D3E.5 — Clinical Identity & Admission Pathways Hardening

**Certification:** `MEDUI.CLINICAL_IDENTITY_ADMISSION_PATHWAYS.D3E5`

## Decision

Clinical encounter identity is **explicit, authoritative, deterministic, and server-owned**.
Observation vs Inpatient is **never** inferred from `admittedAt`, length of stay, unit/bed naming, or routes.

## Canonical identity source (zero schema change)

1. `Encounter.type === EMERGENCY` → `EMERGENCY`
2. `admissionSummaryJson.requestedEncounterType` (D3C receiving create) → `OBSERVATION` | `INPATIENT`
3. Explicit `billingClassification` `OBSERVATION` | `INPATIENT`
4. Bare `Encounter.type === INPATIENT` → **`INPATIENT`** (direct admission first-class)
5. Otherwise → `UNKNOWN` (never silently coerced to Observation or Inpatient for unknown types)

Resolver: `resolveClinicalEncounterContext` in `packages/shared/src/encounters/clinicalEncounterIdentity.ts`.

## Short-stay helpers

`isObservationShortStayEncounter` remains for **utilization / analytics only**.
It must not control worklist badges, chart certification domain, order/MAR routing, census, or admission eligibility.

## Admission pathways

Domain intents: `ADMIT_TO_OBSERVATION`, `ADMIT_TO_INPATIENT`, `DIRECT_INPATIENT_ADMISSION`,
`SCHEDULED_INPATIENT_ADMISSION`, `TRANSFER_IN_TO_INPATIENT`, `CONVERT_OBSERVATION_TO_INPATIENT`.

Hard blockers vs advisories: `evaluateAdmissionHardBlockers` / `evaluateAdmissionAdvisories`.
Missing nurse / isolation / code status / Observation docs are **advisory only**.

## Receiving encounters

Arrival creates receiving encounter with explicit `requestedEncounterType` + matching `billingClassification`.
Observation and Inpatient are sibling destinations — not sequential states.

## Feature flags

All D3 flags remain **OFF**. Identity bugfix is **unconditional** (unsafe heuristic removal).
New admission UI activation remains gated by existing placement / receiving flags.

## Migrations

**None.** No migrations applied.

## Validation

```bash
pnpm clinical-identity:validate
pnpm admission-pathways:validate
pnpm direct-admission:validate
pnpm encounter-context:validate
```
