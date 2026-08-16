# MEDUI.INP.2A — Clinical governance audit

**Milestone:** INP.2A — Workspace chrome + Overview convergence  
**Date:** 2026-08-16

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|---|---|---|---|---|
| Inpatient sticky navigation | `inpatientWorkspaceSections` + recovery nav | ✔ | ✔ (8-module SSoT) | ✔ |
| Overview projection | `projectInpatientOverview` + synthesis | ✔ | ✔ (orders/care plan/provider docs) | ✔ |
| Clinical context rail | N/A (new projection UI only) | ✔ (same projection) | ✔ | ✔ (no persistence) |
| Nursing Admission | `InpatientAdmissionClinicalShell` | ✔ | ✔ (`readOnly`) | ✔ |
| Nursing Assessment | INP.1A / INP.1B.6 | ✔ | ✖ | ✔ |
| Orders | Departmental orders engines | ✔ (projection) | ✖ | ✔ |
| MAR | Medication administration tab | ✔ (projection) | ✖ | ✔ |
| Results | Results panels / synthesis labs | ✔ (projection) | ✖ | ✔ |
| Care Plan | D4B.6 interdisciplinary plans | ✔ (list GET) | ✖ authoring | ✔ |
| Discharge | Discharge planning surfaces | ✔ (projection) | ✖ lifecycle | ✔ |
| Timeline / events | Timeline panels + event ack | ✔ | ✔ (filtered Overview events) | ✔ |
| Notes | Notes deep-link / ER notes panel | ✔ | ✖ sticky | ✔ |
| Patient / MRN / facility | Enterprise identity | ✔ | ✖ | ✔ |

## Authority matrix

| Actor | Sticky Admission/Assessment visible | Write nursing admission | Write nursing assessment |
|---|---|---|---|
| RN | ✔ | ✔ (API + UI) | ✔ (API + UI) |
| Facility ADMIN | ✔ | ✔ (existing policy) | ✔ (existing policy) |
| PROVIDER | ✔ | ✖ (`readOnly`) | ✖ (`canEditAssessment` false) |
| PCT / technician | ✔ (where routed) | ✖ | ✖ |
| MEDORA_SUPER_ADMIN alone | Does not grant facility clinical authoring | ✖ | ✖ |

Navigation presence does **not** grant write permission. Overview and right rail are projection/navigation only (except already-authoritative event ack on Overview for providers).

## Persistence proof

- Overview: no POST/PATCH of clinical domains from Overview view.  
- Right rail: `data-persistence="none"`; no `apiFetch` writes.  
- Care-plan Overview fetch: GET list only.

## Copy cleanup (touched files)

Removed clinician-facing “legacy synthetic” wording in Overview clinical-state empty path; INP.2A i18n strings avoid D4A/D4B/INP identifiers and UUIDs.
