# MEDUI.D5A.5A — Enterprise Dental Clinical Board Authoring Completion

**Status:** Implemented locally — **not committed / not pushed / not deployed**  
**Branch:** `d5a5-enterprise-dental-complete-clinical-board`  
**Migration:** **NONE** (reuses `20261110120000_d5a5_enterprise_dental_complete_clinical_board`)

## Root cause (UAT read-only)

`resolveProfessionGroup` prioritizes **ADMIN** over **PROVIDER**. Users with both roles resolved to profession `ADMIN`, so `resolveDentalCapabilityCodes` granted only view/admin caps — **not** `PERIODONTAL_CHART_EDIT` / `DENTAL_TREATMENT_PLAN` / `DENTAL_PROCEDURE_PERFORM` / `ODONTOGRAM_EDIT`.

API returned `canEdit: false` → UI banners: « Lecture seule — vous ne pouvez pas modifier… ».

**Not** fixed by stripping `disabled` from controls. Fixed by aligning capability policy: clinical write when **roleCodes includes PROVIDER**, even if profession winner is ADMIN. ADMIN-alone remains non-authoring.

Helpers: `canAuthorDentalClinicalBoard`, `isDentalClinicalBoardEditable` (shared) — used by API clinical board service.

## Also completed

| Area | Behavior |
|------|----------|
| History | Enterprise longitudinal projection + encounter ack `dentalHistoryReviewV1` + link to patient record. No `DentalMedicalHistory`. |
| Consents | Reuses `EnterpriseDocument` / RegistrationDocumentCenter. Overview + chart-export project status. |
| Overview | All `D5A5_OVERVIEW_SECTIONS` including alertsHistory + documents. Print via enterprise chart-export. |
| Plan acceptance ≠ consent | Copy + print label distinguish plan acceptance from signed procedural consent. |
| Odontogram | Multi-select + bulk per-tooth `ToothFinding` composer (unchanged authority). |

## Manual UAT

1. Login as **PROVIDER** or **ADMIN+PROVIDER** at Dental-enabled facility  
2. Open an **OPEN** `serviceLine=DENTAL` encounter  
3. Periodontal / Treatment Plan / Procedures / Odontogram: editable (no Lecture seule)  
4. Save each domain → refresh → data persists  
5. History: review checkbox + open patient record for longitudinal edit  
6. Consents: Documents tab; Overview documents section  
7. Overview + **Imprimer le dossier dentaire**  
8. Sign evaluation / close encounter → read-only  

## STOP

Do not commit / push / deploy / migrate production / start D5A.6 / add CDT content.
