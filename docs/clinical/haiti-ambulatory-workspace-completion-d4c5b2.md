# MEDUI.D4C.5B.2 — Haiti ambulatory clinical workspace completion

## Purpose

Complete the Haiti ambulatory encounter workspace on the existing D4C.5B Active Clinic Workspace:

- One patient, one workspace, one header, one-click sections
- Simple provider + nursing documentation
- French-only Haiti UI (locale `fr`) with French saved narrative generation via i18n
- Canonical diagnoses / Rx / discharge engines
- Complete encounter Summary (saved record, not form catalog)
- No ED/inpatient chrome in routine Clinic for Haiti
- No duplicate clinical authorities

## Jurisdiction

`Facility.country` via `isHaitiPublicHealthJurisdiction` (`HT` | `HTI` | `Haiti`).  
UI locale is presentation only — never used to decide Haiti restrictions.

## Section order (tiles)

Intake → Med Eval → Orders → **Rx** → Meds → Results → Dx → Clinical Data → Nursing/MA → Notes → Follow-up/Checkout → Summary

## Key mounts

| Tile | Engine |
|------|--------|
| Intake | `EmergencyTriagePanel` |
| Medical Evaluation | `ProviderDocumentationWorkspace` (`AMBULATORY`) + Haiti field/template filters |
| Orders | `EmergencyErOrdersPanel` (`medicationOrderMode=DEFAULT`, trauma assist hidden for Haiti) |
| Rx | `ClinicCareAmbulatoryPrescriptionPanel` → `CreateOrderModal` DEFAULT |
| Medications | `MedicationAdministrationTab` (Shift Timeline hidden for Haiti ambulatory) |
| Clinical Data | `EmergencyClinicalDataPanel` `careSetting=CLINIC` + registry filter |
| Nursing | `EnterpriseNursingClinicalWorkspaceD4b2` `careSetting=AMBULATORY` |
| Follow-up | Date checklist + `PatientDischargeInstructionsClosureCard` |
| Summary | `EmergencyVisitSummaryPanel` (read-only; IV/procedures fetch off) |

## Shared contracts

- `packages/shared/src/auth/clinicCareAmbulatoryEncounterWorkspaceD4c5b.ts` — Rx section + pharmacist tiles
- `packages/shared/src/auth/clinicCareHaitiAmbulatoryWorkspaceD4c5b2.ts` — Haiti helpers
- Nursing D4B.2 — `AMBULATORY` visibleIn + hub map → `CLINIC`

## Explicit non-goals

- No ClinicHPI / ClinicDiagnosis / ClinicRx / ClinicDischarge / ClinicSummary / ClinicNursingNote / ClinicVitals
- No HaitiDiagnosis table
- No unauthorized terminology import
- Do not remove U.S. ED/provider options globally

## Related docs

- Audit: `docs/clinical/haiti-ambulatory-workspace-completion-d4c5b2-audit.md`
- Certification: `docs/certification/MEDUI.D4C.5B.2-certification.md`
