# D4A.1 — Medical/Surgical nursing admission & structured clinical assessment engine

**Certification:** `MEDUI.MEDSURG_NURSING_ADMISSION.D4A1`

## Decision

Implementation permitted under Phase 1 clinic MVP. Zero-schema durable documentation under `Encounter.admissionSummaryJson.medSurgNursingAdmissionV1`. Longitudinal history remains on `Patient.clinicalHistoryProfileJson`. Production feature defaults remain OFF. Migrations not generated or applied.

## Architectural principle

| Layer | Owns |
|---|---|
| **Patient** | Longitudinal medical/surgical/allergy/home-med/social history |
| **Encounter** | Verification, interpretation, reassessment, findings, care plan, signatures |

Never duplicate patient history into every encounter. Preloaded items arrive **unverified** with provenance and require Confirm / Update / Unable to verify.

## Repository audit (reuse-first)

| DOMAIN | SHARED | ENCOUNTER | REUSE |
|---|---|---|---|
| Medical/Surgical/Social/Allergies/Home meds | `clinicalHistoryProfileJson` | Verification lines in `medSurgNursingAdmissionV1` | Extend profile + admission verify |
| Pain / Fall / Skin / Wound / Belongings | — | EDOC cards | Shell references; EDOC remains durable assessment engine |
| Med recon / nursing complete | — | `inpatientClinicalOpsV1` | Aggregate flags + recon lines |
| Draft / expectedVersion | — | Admission doc `expectedVersion` | CAS on section save/sign |
| Signature / handoff | — | Nurse signature + provider handoff task | Encounter-local |

## New durable structure (JSON only)

`admissionSummaryJson.medSurgNursingAdmissionV1`:

- preloadedItems + provenance
- section drafts / completion states
- homeMedicationLines (`createsInpatientOrder: false`)
- belongings / cash / wounds scaffolds
- head-to-toe system map (EDOC reuse domains)
- nurseSignature
- providerHandoff

## API

- `GET /inpatient-operations/encounters/:id/nursing-admission`
- `PATCH .../nursing-admission/sections`
- `POST .../nursing-admission/verify-preload`
- `POST .../nursing-admission/sign`

## Validation

```bash
pnpm medsurg-nursing-admission:validate
```

Benchmark ≥2500 deterministic scenarios (`medSurgNursingAdmissionD4a1Benchmark`).

## Schema / migrations

None. Production untouched.
