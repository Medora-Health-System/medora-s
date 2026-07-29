# MEDUI.D4C.7H — MAR safety acknowledgement & prescription print authority

## Purpose

1. Restore MAR allergy acknowledgement control so RNs can complete administration when the server requires ack.  
2. Print outpatient prescriptions with facility identity from the canonical facility print projection.  
3. Eliminate blank `about:blank` print windows by consolidating on one ready print execution path.

## Architecture (non-negotiable)

- One enterprise MAR engine (`MedicationAdministrationTab` + medication-administration API)  
- One allergy documentation gate (`encounter-allergy-safety`)  
- One Rx print layout (`RxPrintLayout`)  
- One facility print identity (`projectFacilityPrintIdentity`)  

**Forbidden:** `ClinicMarAllergyConfirmation`, `ClinicPrescriptionPrint`, hard-coded facility names, noopener print opens.

## MAR behaviour

1. Clinic ambulatory passes `encounterAllergySource` (vitals / nursingAssessment / triage snapshot).  
2. MAR tab always hydrates allergy evaluation via source or `GET /encounters/:id`.  
3. Categories drive FR/EN ack copy (`KNOWN` / `NKDA` / `UNKNOWN`).  
4. Acknowledgement checkbox sits above Enregistrer; submit disabled until checked.  
5. Client sends `safetyAcknowledgedMedicationAllergies: true`.  
6. Server rejects missing ack; audit stores ack + `allergyAcknowledgementVersion` (`d4c7h.v1`) + category.  
7. If server returns the allergy confirmation message, UI forces the ack control visible.

## Print behaviour

1. Build facility identity from facility display name + care profile address.  
2. Validate ≥1 medication line and non-empty HTML.  
3. Require facility name when Clinic/outpatient policy asks (`requireFacilityIdentity`).  
4. `window.open("", "_blank")` **without** noopener; write complete HTML; print after readiness.  
5. Typed error codes mapped to i18n (`clinicCareD4c7h.rx.*` / `printOutput.rx.*`).

## Tests

- `packages/shared/src/auth/enterpriseMarSafetyAckRxPrintAuthorityD4c7h.test.ts`  
- `apps/web/src/features/clinic-care/clinicCareEnterpriseMarSafetyAckRxPrintD4c7h.test.ts`  
- Regression: D4C.7G shared/web tests  

## Migration / seed

None.

## Deferrals

- Facility fax field not on operational address model — print when/if added.  
- Logo / advanced jurisdictional Rx templates.  
- Direct medication–allergen conflict override UI beyond existing governance panels (not weakened).  
- Prisma persistence of printable facility snapshot on Order row (session/facilityId at print time used).
