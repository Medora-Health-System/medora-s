# MEDUI.D4C.7 — Enterprise audit (Public Health, Pharmacy, ambulatory discharge)

## Git verification (start)

| Check | Result |
|-------|--------|
| Branch | `d4c7-public-health-pharmacy-integration` (from `origin/main`) |
| Working tree at start | Clean |
| Base | `fb864c0f2` — includes D4C.5B.3 (#73), D4C.5B.2 (#72), D4C.5B.1 (#71), D4C.6 (#70) |
| Behind origin/main | No |

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Pharmacy queue / verify / dispense | `/app/pharmacy`, PharmacyVerification, OrderItem.medicationFulfillmentIntent | ✔ | Ambulatory client filter (`?ambulatory=1`) | ✔ no ClinicPharmacy |
| MAR / onsite meds | MedicationAdministrationTab + D4C.5B.3 intent classifiers | ✔ | Discharge classification EXTERNAL_RX vs ONSITE_MAR | ✔ no ClinicMAR |
| External Rx | ClinicCareAmbulatoryPrescriptionPanel + RxPrintLayout | ✔ | — | ✔ no ClinicPrescription |
| Med recon + safety | Longitudinal recon + medicationSafetyWarnings (D4C.5B.3 acetaminophen fix) | ✔ | — | ✔ |
| Vaccination | VaccineAdministration + `/app/public-health/vaccinations` | ✔ | Clinic deep-link from Suivi/sortie | ✔ no ClinicVaccination |
| Disease reporting | DiseaseCaseReport + MSPP review | ✔ | Jurisdiction pathway helper (Facility.country) | ✔ no ClinicDiseaseReport |
| Jurisdiction | Facility.country + isHaitiPublicHealthJurisdiction | ✔ | US configured / unsupported draft-only | ✔ never UI locale |
| Discharge diagnosis instructions | providerDischargeTemplateRegistry + ProviderDischargeDocumentationSection | ✔ | Typed careSetting + facilityDisplayName adaptation | ✔ no ClinicDiagnosisInstruction |
| Patient instruction card | PatientDischargeInstructionsClosureCard | ✔ | Mounted under shared workflow | ✔ |
| Print | DischargePrintLayout / printDischarge | ✔ | Clinic print gates (empty / unsigned / ED wording) | ✔ |
| Summary | EmergencyVisitSummaryPanel (read-only) | ✔ | — | ✔ no ClinicSummary |
| Public Health nav | Santé publique / Vaccinations / Déclarations | ✔ | Contextual deep-links only | ✔ no Open PH gateway card |

## ED components parameterized (not copied)

| Component | Parameterization |
|-----------|------------------|
| `providerDischargeTemplateGoldStandard` | `resolveUniversalReturnSuffixForCareSetting` |
| `applyProviderDischargeTemplateToCard` | `careSettingContext` → `adaptDischargeSuggestedTextBodyForCareSetting` |
| `ProviderDischargeDocumentationSection` | optional `careSettingContext`; left-facility label key |
| `extractSharedFieldsFromTemplate` | optional care-setting adaptation |
| Gold / catalog ED strings | Pattern-driven typed framing for CLINIC (facility display name) — ED path unchanged when context omitted / ED |

## Persistence gaps (STOP — no migration in this cert)

| Gap | Detail |
|-----|--------|
| Clinical disease DRAFT→submit→amend | `DiseaseCaseStatus` is `SUSPECTED\|CONFIRMED\|RULED_OUT` only. Documented constant `D4C7_DISEASE_REPORT_CLINICAL_DRAFT_LIFECYCLE_PERSISTENCE_GAP`. No ClinicDiseaseReport invented. |
| Live WHO / MSPP connector | Deferred (prior D4C.2 docs). |
| Facesheet immunization SSoT fields | Deferred (prior D4C.2 docs). |

VaccineAdministration, DiseaseCaseReport, Facility.country, PharmacyVerification, MedicationFulfillmentIntent **persist** — no Prisma migration required for D4C.7 reuse path.

## Forbidden authorities (not created)

ClinicPharmacy, ClinicMedication, ClinicPrescription, ClinicMAR, ClinicVaccination, ClinicDiseaseReport, ClinicDischarge, ClinicDischargeInstruction, ClinicSummary, ClinicDiagnosisInstruction.

## Screenshot defects addressed

1. ED diagnoses engine reused for Clinic projection into Suivi/sortie.
2. “evaluated in the emergency department” → Clinic uses `evaluated at {Facility.displayName}` via typed care-setting context.
3. Empty structured boxes → full shared discharge workflow mounted (`ProviderDischargeDocumentationSection` + closure card).
