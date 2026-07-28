# MEDUI.D4C.7 — Public Health, Pharmacy, ambulatory discharge & clinical summary

## Purpose

Complete Clinic Care Public Health + Pharmacy integration and finish ambulatory discharge by **reusing** enterprise authorities. No Clinic-specific duplicate engines.

## Product outcome

Provider evaluates → diagnoses → orders → external Rx → pharmacy verifies → nursing administers onsite → review results → Suivi/sortie → diagnoses auto-appear → diagnosis-specific instructions prefill → med/Rx instructions → edit/sign → print → complete visit → Résumé → longitudinal record.

Clinic generated text uses the **actual Clinic facility name**, never “Emergency Department” / “Emergency Room” / “service d’urgence” unless the encounter is Emergency.

## Architecture

### Shared module

`packages/shared/src/auth/clinicCarePublicHealthPharmacyDischargeD4c7.ts`

- Typed `DischargeInstructionCareSettingContext` (`ED` | `CLINIC` | `URGENT_CARE` + `facilityDisplayName` + locale + jurisdiction country)
- Visit framing phrases + narrative adaptation (pattern-driven, not blind global replace)
- Ambulatory pharmacy queue filter (facility, AMBULATORY encounter types, patient, provider, date, verification, fulfillment intent)
- Jurisdiction pathway: Haiti → MSPP; US → configured; unsupported → draft-only / no false submitted
- Clinic checkout states (Retour à domicile, Suivi en clinique, Référence, Transfert ED, …)
- Print gates; PH deep-link builders; forbidden Clinic* list

### Web mounts

- `ClinicCareAmbulatoryDischargeWorkflow` on Suivi/sortie:
  - Clinic checkout radios
  - `ProviderDischargeDocumentationSection` with `careSetting: "CLINIC"` + facility display name
  - `PatientDischargeInstructionsClosureCard` (flat patient fields)
  - Print with Clinic gates
  - Contextual PH / Pharmacy deep-links (enterprise routes only)
- Pharmacy home: `?ambulatory=1` filters queue via shared helper
- Clinic Care pharmacy redirect → `/app/pharmacy?ambulatory=1`
- Summary: existing `EmergencyVisitSummaryPanel` read-only

### Care-setting language

Apply path threads `careSettingContext` through template apply / shared planning merge / gold-standard return suffix. ED callers omit context → unchanged ED wording.

## Roles

| Area | Roles |
|------|-------|
| Vaccination record | RN, PROVIDER, ADMIN, MSPP_VACCINATIONS |
| Discharge medical edit | PROVIDER, ADMIN |
| Discharge nursing flat fields | RN, ADMIN |
| Pharmacy | existing enterprise PHARMACY / ADMIN (+ RN/PROVIDER view) |

## Migration policy

**No Prisma migration. No seed.**  
`Facility.allowRnLabResultSubmission` unchanged.

Documented persistence gap: clinical DiseaseCaseReport DRAFT→submit→amend lifecycle (enum lacks DRAFT).

## Tests

See certification doc for exact counts (shared A–M + web A–H).

## Phase

Phase 1 Clinic MVP. French UI via mirrored `en.ts` / `fr.ts` (`clinicCareD4c7.*`).
