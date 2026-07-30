# MEDUI.D5A.1 — Domain model proposal (Dental & Orthodontics)

**Status:** Proposed — **no persistence in D5A.1**. Names are conceptual until D5A.2+ naming review.

## Parent authorities (existing)

`Facility` · `Patient` · `Encounter` · `Appointment` · `Order`/`OrderItem` · `EnterpriseDocument` · `FollowUp` · `BillingEvent` · `AuditLog` · `Diagnosis` · `User` / `UserRole`

## Tooth-numbering policy

| Layer | Rule |
|---|---|
| Storage | Canonical tooth code (notation-independent), e.g. permanent FDI-aligned internal codes or Universal-mapped keys |
| Display | Facility/user config: `UNIVERSAL` \| `FDI` \| `PALMER` |
| Conversion | Shared pure functions + tests; never store only display glyphs |

Dentition type: `PRIMARY` \| `MIXED` \| `PERMANENT` (patient- or encounter-scoped snapshot).

## Tooth surface model

Structured codes (not free-text-only):

`MESIAL` · `DISTAL` · `OCCLUSAL` · `INCISAL` · `BUCCAL`/`FACIAL` · `LINGUAL`/`PALATAL`

Support: multi-surface sets · whole-tooth · root · quadrant · arch · full-mouth.

## Proposed dental-specific models

| Model | Purpose | Parent | Scope | Versioning |
|---|---|---|---|---|
| `DentalEncounterProfile` | Care-setting markers / specialty tags for ambulatory dental visit | Encounter | facility, patient, encounter | soft |
| `DentitionState` | Current dentition type + eruption summary | Patient | patient, facility | projected from events |
| `ToothState` | Current-state projection per tooth | Patient | patient | rebuildable |
| `ToothFinding` | Observation/finding (caries, fracture, …) | Patient (+ optional Encounter) | + tooth | append / amend |
| `ToothSurfaceFinding` | Surface-scoped finding | ToothFinding | surfaces[] | append |
| `DentalTreatmentPlan` | Versioned plan header | Patient (+ Encounter origin) | | versions |
| `DentalTreatmentPlanItem` | Planned procedure / tooth / surfaces | Plan | | immutable after accept |
| `DentalProcedureEvent` | Performed clinical procedure | Encounter (+ optional plan item, OrderItem) | | append-only complete |
| `PeriodontalAssessment` | Assessment header | Encounter / Patient | | versioned snapshot |
| `PeriodontalSiteMeasurement` | Site metrics (PD, BOP, …) | Assessment | tooth/site | normalized rows |
| `OrthodonticCase` | Longitudinal ortho episode | Patient | facility | lifecycle states |
| `OrthodonticAssessment` | Structured assessment | Case (+ Encounter) | | versioned |
| `OrthodonticTreatmentPlan` | Versioned ortho plan | Case | | accept → immutable |
| `OrthodonticTreatmentPhase` | Phase within plan | Plan | | |
| `OrthodonticAppliance` | Appliance instance | Case | arch/teeth | status history |
| `OrthodonticProgressRecord` | Progress note linkage | Encounter + Case | | |
| `DentalImageAssociation` | Links document/order item → tooth/arch/case | EnterpriseDocument / OrderItem | | |

## Distinctions (odontogram authority)

| Concept | Not the same as |
|---|---|
| Observation / finding | Diagnosis code |
| Proposed treatment | Completed procedure |
| Scheduled / ordered | Billed charge |
| Historical restoration | Current caries finding |
| Patient-reported history | Clinician observation |

Odontogram UI = projection of findings + current `ToothState` + history retained. Never overwrite historical state without audit.

## Orthodontic case lifecycle (proposed)

`CONSULTATION` → `RECORDS_PENDING` → `ASSESSMENT_IN_PROGRESS` → `TREATMENT_PLAN_PROPOSED` → `TREATMENT_PLAN_ACCEPTED` → `ACTIVE_TREATMENT` → (`TREATMENT_PAUSED`) → `DEBONDING_READY` → `RETENTION` → `COMPLETED` | `DISCONTINUED` | `TRANSFERRED`

**OrthodonticCase ≠ Encounter.**

## JSON vs normalized

| Domain | Preference |
|---|---|
| Tooth identity, findings, surfaces, plan items, procedure events, OrthodonticCase, appliances, periodontal sites | **Normalized** tables |
| Narrative assessment sections, config | **Typed versioned JSON** with schemaVersion |
| Photos, signed consents, external reports | **EnterpriseDocument** (+ association) |

Do not use one untyped JSON bag as the clinical tooth model.

## Periodontal scope

**Include in program** as D5A.6 (not D5A.2–5 blockers): probing depth, recession/CAL, BOP, suppuration, mobility, furcation, plaque/calculus, six-point sites — typed measurements, not one blob.

## Imaging / photography

Reuse Orders (IMAGING) + Results + EnterpriseDocument. Association table for tooth/arch/case/before-after. No second repository. DICOM: not present as PACS — defer native DICOM; allow non-DICOM uploads under auth.

## Cephalometric

Upload + structured report fields first. Landmark tracing engine: future (calibration, formulas, specialist validation, regulatory).

## Diagnosis / coding

Reuse `Diagnosis` + ICD-10 where applicable. Dental procedure terminology: facility-configured catalogs; **do not** embed licensed CDT datasets without authorization. Haiti: local billing terminology configuration.

## Deletion / retention

Clinical findings, accepted plans, signed consents, completed procedures: soft-delete / amend only; FK `Restrict` on Patient/Facility parents per data-safety rules.
