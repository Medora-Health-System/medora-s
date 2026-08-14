# MEDUI.D4C.8C — Domain Audit

**Prerequisites on main:** MEDUI.D4C.8A (PR #116), MEDUI.D4C.8B (PR #117)  
**Mode:** Patient longitudinal index + export/audit composition. No second clinical engine. No Prisma migration expected.

## Verdict of audit

Patient `/app/patients/[id]` is already a longitudinal hub (summary, encounters, orders/results via chart-summary, vaccinations, clinical history). D4C.8.1 already projects CLOSED locks and routes CLOSED rows to `/app/encounters/:id`. D4C.8C must:

1. Brand the page as the enterprise Patient Medical Record **index**
2. Enrich the encounter index (OPEN vs CLOSED navigation by care setting)
3. Keep CLOSED legal composition on the encounter route (D4C.8A/8B) — never embed it on Patient
4. Reuse encounter chart-export + admin AuditLog — do not invent PatientAuditLog / ClinicMedicalRecord

## Findings

| Area | Authority | Reuse | Risk if forked |
|---|---|---|---|
| Patient page | `patients/[id]/page.tsx` | Shell wrapper | Duplicate chart engine |
| Encounter index | `PatientConsultationsTab` + `GET /patients/:id/encounters` | Enrich rows | N+1 full charts |
| CLOSED navigation | D4C.8A `enterpriseEncounterRecordPath` | Keep | Parallel closed chart |
| OPEN navigation | Clinic ambulatory path / ED active / encounter shell | Care-setting adapters | Clinic-only hardcode |
| Longitudinal domains | clinicalHistoryProfile, chart-summary tabs | Keep patient-scoped | Merge into encounter note |
| chart-summary | `ChartSummaryService` | Longitudinal only; forbidden for closed legal record | Use as legal export |
| Encounter export | `EncounterChartExportService` + HTML util | Humanize JSON presentation | Second export engine |
| Patient print | `PatientChartPrintLayout` | Browser print; encounter-bounded sections | Claim as sole legal record |
| ROI | Admin `/roi-requests` | Keep ADMIN | Weaken auth |
| AuditLog privileged | `/admin/audit` ADMIN+ | Link only from patient shell | Expose to RN/PROVIDER |
| Clinical audit timeline | chart-summary subset | Keep labeled clinical history | Confuse with security audit |
| EnterpriseDocument | Registration document center | Defer mount on patient page | Fake document authority |
| Reopen | D4C.7K only | Unchanged | Room/bed/billing unlock |

## STOP risks avoided

- No second Patient / Encounter / lifecycle / closed viewer / clinical-record composition
- Privileged AuditLog UI not broadened to clinical roles
- chart-summary not used as CLOSED legal authority
- No Prisma migration

## Proposed reuse architecture

```text
EnterprisePatientMedicalRecord (shell on /app/patients/:id)
  ├── Overview / longitudinal tabs (existing)
  ├── Encounter Index (PatientConsultationsTab + D4C.8C projection)
  │     ├── OPEN → care-setting active workspace
  │     └── CLOSED 🔒 → EnterpriseClosedEncounterViewer → ClinicalRecord
  ├── Admin audit link → /app/admin/audit (ADMIN only)
  └── Encounter export → existing chart-export HTML (PROVIDER/ADMIN)
```
