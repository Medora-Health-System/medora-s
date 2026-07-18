# Medication Intelligence Phase 8 — Clinical Knowledge Foundation

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_8_CLINICAL_KNOWLEDGE_FOUNDATION`

## Architecture

Phase 8 stores structured, versioned, provenance-aware clinical knowledge attached to **canonical** `MedicationConcept` / `MedicationProduct` identities from Phases 1–7.

It does **not**:

- perform clinical decision support
- interrupt providers
- recommend treatments
- calculate patient-specific dosing
- change search, ordering, MAR, or billing

Clinical knowledge is completely separated from medication identity (no duplicated drug names/strengths as identity).

## Clinical knowledge model

Hub: `MedicationClinicalProfile` (lifecycle + provenance + optional concept/product FKs).

Domain tables (owned by profile):

- Dosing: `MedicationDoseRecommendation`, `MedicationWeightBasedDose`
- Adjustments: `MedicationRenalAdjustment`, `MedicationHepaticAdjustment`
- Administration: `MedicationAdministrationInstruction`, `MedicationInfusionGuidance`
- Safety narrative: contraindications, precautions, black-box, pregnancy, lactation, high-alert/LASA/controlled metadata
- Monitoring, storage, reconstitution
- Emergency use profiles (RSI, ACLS, PALS, stroke, sepsis, trauma, sedation, toxicology, anaphylaxis, status epilepticus)

Sources/versions: `MedicationClinicalKnowledgeSource`, `MedicationClinicalKnowledgeVersion`.

## Versioning

- Approved knowledge is immutable in place.
- Changes require a new draft (fork/supersession) with a new knowledge version.
- Multiple authoritative sources may coexist; partial unique indexes limit one APPROVED profile per identity+source.

## Provenance

Profiles carry knowledge source/version labels, evidence level, effective date, reviewed/approved actors and timestamps (`updatedAt` as last modified).

## Approval workflow

Lifecycle: `DRAFT` → `UNDER_REVIEW` → `APPROVED` → `SUPERSEDED` / `RETIRED`.

Only `MEDICATION_ADMIN` may approve. Only `APPROVED` knowledge is eligible for **future** clinical use (not activated in Phase 8).

## Administration & dosing guidance

Structured route/method/diluent/IV push/infusion/central-line/extravasation/monitoring fields. Dose kinds include fixed, weight-based, BSA, age, adult, pediatric, and renal/hepatic tables — stored only, never calculated against a patient.

## Emergency medicine metadata

`MedicationEmergencyProfile.useProfile` tags support future EM workflows without changing current behavior.

## Future decision support roadmap

Later phases may consume APPROVED knowledge for CDS, alerts, and patient-specific dosing — only after explicit activation governance. Interaction checking remains out of Phase 8.

## API / UI

- REST: `/medications/clinical-knowledge/*`
- Admin UI: `/app/admin/medication-governance/clinical-knowledge` (French i18n)

## Certification

```bash
pnpm --filter @medora/api medication:certify:phase8
```

Expected: `MEDICATION_INTELLIGENCE_PHASE_8_CERTIFIED` with `AutomaticClinicalActivationEnabled: NO`.
