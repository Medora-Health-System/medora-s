# D4A.0 — Connected inpatient admission intake, patient identity selection, bed assignment & clinical handoff

**Certification:** `MEDUI.CONNECTED_INPATIENT_ADMISSION_INTAKE.D4A0`

## Decision

Implementation permitted under Phase 1 clinic MVP. Zero-schema additive reuse of Patient, Encounter, Floor Board / FacilityBedBoardService, AdmissionCorrelation, HospitalEpisode, and inpatient clinical ops JSON. Production feature defaults remain OFF. Migrations not generated or applied.

## Problem corrected

Hospital Admission Intake previously allowed a free-text search field to remain visually coupled to a sticky selection without mandatory demographic confirmation, and treated bed as optional free text. That risked wrong-patient admission and bed inventory drift.

## Target flow

1. Start Hospital Admission (unit board preselects requested unit)
2. Search existing patient (≥3 meaningful characters; shared `PatientSearchAndSelect`)
3. Explicit result selection → `selectedPatientId`
4. Confirm demographics (identity, contact, coverage, clinical context)
5. Complete governed admission details (source, datetime, diagnosis, reason, service, level of care)
6. Select available bed from Floor Board inventory for the requested unit
7. Start Inpatient Encounter (server-derived receiving nurse; atomic bed assign)
8. Redirect to Inpatient Chart → Admission clinical shell

## Authoritative identity

| Rule | Enforcement |
|---|---|
| Typed text is never patient identity | `typedPatientTextIsAuthoritativeIdentity()` / `resolveAuthoritativePatientId` |
| Explicit selection required | UI stores only `selectedPatientId` from search hits |
| Admission never creates Patient | No create path on intake; Registration CTA when no results |
| Shared search | `PatientSearchAndSelect` used by Registration + Admission Intake |

## Bed assignment

- Label: **Assigned bed** (required)
- Options: Floor Board rows for selected unit with status `AVAILABLE` only
- Server re-reads effective bed row via `FacilityBedBoardService.getEffectiveBedRow`
- `assertBedAssignableOrThrow` + occupancy check inside `createDirectAdmission`
- Conflict code: `BED_NO_LONGER_AVAILABLE` (clear bed selection client-side; keep patient/form)

## Clinical handoff shell

`InpatientAdmissionClinicalShell` establishes the connected Admission workspace sections (overview through provider handoff), section completion states, save/resume scaffold, ED preload provenance gates, belongings/valuables/wound scaffolds. Full Medical/Surgical clinical engine content is deferred to later D4A phases.

## Feature flags

Production defaults remain OFF (`DIRECT_INPATIENT_ADMISSION_ENABLED`, inpatient workspace/ops flags, admission correlation UI, etc.). Local/test activation permitted.

## Validation

```bash
pnpm inpatient-patient-search:validate
pnpm inpatient-patient-selection:validate
pnpm inpatient-demographic-confirmation:validate
pnpm inpatient-bed-assignment:validate
pnpm inpatient-admission-handoff:validate
pnpm inpatient-admission-clinical-shell:validate
```

Benchmark: `connectedInpatientAdmissionIntakeD4a0Benchmark` (≥1800 deterministic scenarios).

## Schema / migrations

- Schema changes: none (additive JSON + existing patient/bed columns for display)
- Migration files: none
- Migrations applied: none
