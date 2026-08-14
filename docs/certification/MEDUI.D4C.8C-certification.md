# MEDUI.D4C.8C — Certification

**Feature:** Enterprise Patient Medical Record Index, Audit/Export & Final D4C.8 Certification  
**Branch:** `d4c8c-enterprise-patient-medical-record-index-audit-export-certification`  
**Status:** Implemented pending review (**do not commit/push** until approval)

## Verdict

**CERTIFIED WITH DOCUMENTED DEFERRALS**

### Program roll-up

| Milestone | Verdict |
|---|---|
| MEDUI.D4C.8A | CERTIFIED (merged PR #116) |
| MEDUI.D4C.8B | CERTIFIED (merged PR #117) |
| MEDUI.D4C.8C | CERTIFIED WITH DOCUMENTED DEFERRALS |
| **MEDUI.D4C.8** | **ENTERPRISE CLOSED ENCOUNTER & LEGAL MEDICAL RECORD — CERTIFIED FOR PRODUCTION WITH DOCUMENTED DEFERRALS** |

## Non-negotiable architecture statements

- ONE Patient authority
- ONE Encounter authority
- ONE lifecycle authority (D4C.7K)
- ONE closed-view authority (D4C.8A)
- ONE clinical-record composition (D4C.8B)
- ONE audit authority (`AuditLog` / admin readers)
- SIGNED ≠ CLOSED
- Reopen ≠ unlock documentation
- Patient record ≠ encounter record
- Clinical record ≠ security audit log

## Evidence matrix

| Requirement | Evidence | Status |
|---|---|---|
| Patient page is longitudinal index | `EnterprisePatientMedicalRecord` wraps `/app/patients/[id]` | ✔ |
| Encounter index OPEN/CLOSED | `projectEnterprisePatientEncounterIndex` + `PatientConsultationsTab` | ✔ |
| CLOSED lock + aria-label | `showClosedLock` + `closedAria` FR/EN | ✔ |
| CLOSED → encounterId closed viewer | href `/app/encounters/:id` | ✔ |
| OPEN → active workspace by setting | ambulatory / ED active / inpatient shell | ✔ |
| No D4C.8B embed on patient page | `patientPageMustNotEmbedClosedClinicalRecord` | ✔ |
| Reopen Admin-only | D4C.7K `shouldShowEnterpriseReopenAction` | ✔ |
| Encounter export human-readable | chart-export HTML structured-dl (no json-block dump) | ✔ |
| Privileged audit not weakened | ADMIN link to `/app/admin/audit` only | ✔ |
| No migration / seed | Projection/UI only | ✔ |

## Documented deferrals

- EnterpriseDocument center on patient page
- Patient-scoped privileged AuditLog filter UI (facility admin console remains)
- chart-summary retirement / pure index-only data spine (still longitudinal-only)
- Full patient longitudinal legal PDF beyond print + ROI

## Manual UAT

See certification report section 49 / prompt TEST A–H.

## Migration / seed

```text
Migration: NONE
Seed: NONE
```
