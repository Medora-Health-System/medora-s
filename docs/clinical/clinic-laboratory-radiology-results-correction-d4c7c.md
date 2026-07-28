# MEDUI.D4C.7C — Clinic Laboratory and Radiology Workflow, Result Entry, Completion, and Authorization Correction

## Purpose

Apply the same Medora enterprise laboratory / radiology / results standards used in ED and Hospital Care to Clinic ambulatory encounters — without a parallel Clinic diagnostic engine.

Flow: Provider places order → Lab/Rad worklist → authorized staff performs → result entry → verify/finalize → provider receives → abnormal/critical highlighted → acknowledge → Active Clinic Workspace + discharge + Summary + longitudinal.

## Canonical authorities

| Concern | Authority |
|---------|-----------|
| Lab queue | `/app/lab-worklist` + `GET /worklists/lab` |
| Rad queue | `/app/rad-worklist` + `GET /worklists/radiology` |
| Result entry | `PUT /orders/:id/result` (`ResultsService`) |
| Result ack | `POST /orders/:id/result/acknowledge` |
| Viewer | `ClinicalResultViewer` |
| Clinic aliases | `/app/clinic-care/laboratory` → `buildClinicLaboratoryEntryHref()`; radiology → rad entry |

Clinic entry: `/app/lab-worklist?source=clinic-care&ambulatory=1` (and rad equivalent).

## Order routing

| Category | Worklist |
|----------|----------|
| LAB / LAB_TEST | Laboratory |
| IMAGING / IMAGING_STUDY | Radiology |
| MEDICATION | Pharmacy only — **never** Lab/Rad |

AMBULATORY = encounter types `OUTPATIENT` \| `URGENT_CARE` (presentation filter).

## Actions (remain distinct)

**Lab:** accept, collect, receive, reject, begin processing, enter, verify, finalize, amend.

**Radiology:** accept, schedule, begin, complete, preliminary, final, amend.

**Acknowledgement ≠ entry/finalization.**

## Role / capability matrix (documented)

See `D4C7C_ROLE_CAPABILITY_MATRIX_DOC` in shared package. Server enforcement:

- Lab browse: LAB, RN, PROVIDER, ADMIN
- Rad browse: RADIOLOGY, ADMIN
- RN ENTER: facility `allowRnLabResultSubmission` + LAB_TEST only
- Front Desk / Billing: no result entry

## Facility policy

`Facility.allowRnLabResultSubmission` (default `false`). Denial FR:

> Cet établissement n'autorise pas la saisie de résultats de laboratoire par les infirmiers.

Do **not** silently set globally. Haiti Clinic enablement = controlled seed/admin — **STOP documented**.

## Active Clinic Workspace

Orders tile + Results tile reuse D4C.6 board/inbox and chart deep links. Canonical result viewer only. Header alerts: concise, no PHI in general dashboards.

## French localization

- Nav group: **Laboratoire et imagerie**
- Liste laboratoire / Liste imagerie (uiLabels)
- Statuses via `printOutput.orderItemChart` / `orderItemStatus` (PLACED, SIGNED, IN_PROGRESS, …) — display-layer only
- Badge: **Ambulatoire** (not raw AMBULATORY / UNKNOWN for outpatient)

## Navigation

Capability-driven (`laboratoryEnabled` / `radiologyEnabled`). Radiology hidden when facility lacks RADIOLOGY service line / module (CLINIC defaults include LABORATORY, not RADIOLOGY).

## Deferred STOP gaps

1. RN lab entry seed for Haiti Clinic (`allowRnLabResultSubmission`)
2. Typed POC vs central-lab vs provider-performed result source

## Related modules

- `packages/shared/src/auth/clinicCareLaboratoryRadiologyResultsCorrectionD4c7c.ts`
- D4C.6 ambulatory orders/results, D4C.5B.3 RN policy STOP, D4C.7B pharmacy pattern
