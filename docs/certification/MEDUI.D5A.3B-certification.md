# MEDUI.D5A.3B — Certification

**Feature:** Enterprise Dental Patient Discovery, Registration Authority & Safe Encounter Launch  
**Branch:** `d4c9-enterprise-facility-service-line-configuration-billing-workflow`  
**HEAD (pre-commit):** `a9893cffa`  
**Status:** **CERTIFIED** — pending human review  
**Commit / push / deploy:** **NONE**

## Verdict

**MEDUI.D5A.3B — ENTERPRISE DENTAL PATIENT DISCOVERY & SAFE ENCOUNTER LAUNCH — CERTIFIED**

REGISTER ONCE · SEARCH EVERYWHERE AUTHORIZED · ONE PATIENT · ONE MRN · ONE MEDICAL RECORD · ONE FACILITY · MANY SERVICE LINES

## Production root cause

Dental dashboard POSTed free-text search as `Patient.id` → 404.

## Fix summary

| Area | Change |
|---|---|
| Discovery | Reuse `PatientSearchAndSelect` + `GET /patients/search` |
| Launch | POST only `selectedPatient.id` UUID |
| Stale selection | `clearSelectionOnQueryChange` |
| Icon | Tooth stroke SVG (not ❓) |
| Migration | **NONE** |

## Validation

See stop-gate report in agent response.
