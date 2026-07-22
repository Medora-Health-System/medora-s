# Medora Enterprise Clinical Documentation Constitution

**Status:** Non-negotiable architectural rule  
**Applies to:** All specialty engines (ED, Observation, Med/Surg, ICU, Surgery, PACU, Pediatrics, L&D, future services)

## Principle

Medora maintains **ONE** enterprise longitudinal clinical documentation foundation.

Specialty engines **reuse and extend**. They do **not** fork enterprise domains.

Creating a duplicate enterprise documentation domain is an **architectural failure**.

## Ownership model

| Owner | Owns |
|---|---|
| **Patient** | Longitudinal history, allergies, medications, social/family history, communication preferences, baseline clinical information |
| **Encounter** | Verification, admission assessment, reassessment, interpretation, encounter/specialty findings, care plan, signatures, amendments |

## Enterprise-owned domains

Patient demographics · Medical history · Surgical history · Allergies · Home medications · Medication reconciliation foundation · Social / tobacco / alcohol / recreational drug history · Family history · Preferred language · Communication needs · Functional / mobility baseline · Existing devices · Existing wounds · Wound documentation · Skin documentation · Fall risk · Pain assessment foundation · Nutrition screening foundation · Elimination documentation foundation · Patient belongings · Cash / valuables · Advance directives · Code status · Care team identity · Clinical timeline · Clinical audit trail · Documentation draft framework · Clinical signature framework

## Specialty engines may only

- Extend / specialize / configure
- Add specialty-specific assessments, workflows, calculations, and sections

## Specialty engines shall not

- Create another Medical History, Allergy, Home Medication, Social History, Wound, Skin, Belongings, Draft, Signature, or Clinical Timeline engine

## Required certification section

Every documentation certification report must include **ENTERPRISE DOMAIN AUDIT**:

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |

## Canonical reuse anchors (current platform)

| Domain | Primary component |
|---|---|
| Longitudinal history (PMH/PSH/allergies/home meds/social) | `Patient.clinicalHistoryProfileJson` / `patientClinicalHistoryProfile.ts` |
| Admission verification (encounter) | `admissionSummaryJson.medSurgNursingAdmissionV1` |
| Structured clinical assessments | EDOC registry + `EncounterClinicalDocumentationEntry` |
| Med recon / code status / isolation / nursing complete | `inpatientClinicalOpsV1` |
| Belongings / valuables | EDOC9 + D4A belongings/cash contracts |
| Skin / wounds | EDOC20 + admission POA wound contracts |
| Fall / neuro / pain | EDOC13 / EDOC14 |
| Draft / expected-version | Admission doc CAS + clinical draft recovery patterns |
| Signature / witness | EDOC witness + nursing admission signature |
| Timeline / audit | `EncounterClinicalEvent` + `AuditService` |

See also: `.cursor/rules/enterprise-clinical-documentation-constitution.mdc`
