# MEDUI.D4C.7C — Audit: Clinic Laboratory & Radiology Results Correction

## Git baseline (parent-verified)

| Item | Value |
|------|--------|
| Branch | `d4c7c-clinic-laboratory-radiology-results-correction` |
| Created from | `d4c7b-clinic-pharmacy-consultations-navigation` (**uncommitted D4C.7B preserved**) |
| Main history includes | D4C.7A, D4C.7, D4C.6, D4C.5B.3 (+ earlier Clinic Care) |
| Commit / push / merge | **None** (no-commit policy) |

D4C.7B remains in the working tree as certified-with-deferrals baseline (Pharmacy nav, Consultations routing). D4C.7C layers laboratory / radiology / results corrections on top without discarding 7B files.

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Orders | `Order` / `OrderItem` / OrdersService | ✔ | — | ✔ No ClinicLaboratoryOrder |
| Laboratory worklist | `/app/lab-worklist`, `WorklistsService.getLabWorklist` | ✔ | ambulatory filter + AMBULATORY badge | ✔ |
| Radiology worklist | `/app/rad-worklist`, `getRadiologyWorklist` | ✔ | ambulatory filter + AMBULATORY badge | ✔ |
| Results | `ResultsService`, `Result` Prisma | ✔ | — (RN policy unchanged) | ✔ No ClinicLaboratoryResult |
| Result viewer | `ClinicalResultViewer` | ✔ | — | ✔ |
| Acknowledgement | `POST /orders/:id/result/acknowledge` | ✔ | — | ✔ No ClinicResultAcknowledgement |
| Authorization | RolesGuard + ResultsService RN gate | ✔ | PROVIDER browse lab API | ✔ |
| Facility policy | `Facility.allowRnLabResultSubmission` | ✔ | STOP documented (no silent flip) | ✔ |
| Active Clinic Workspace | D4C.5B/6 orders + results tiles | ✔ | deep-link helpers | ✔ |

## Defect root causes

1. **RN denial message** — Expected when `allowRnLabResultSubmission === false` (default). Not a missing Clinic engine; facility policy. Haiti seed flip **STOP** (controlled config only).
2. **Clinic orders badge** — OUTPATIENT/URGENT_CARE annotated as `UNKNOWN` (« Identité à revoir ») via D3E.5 identity. Fixed at **departmental worklist** layer → `AMBULATORY` without mutating ClinicalEncounterContext.
3. **Clinic Care redirects** — Laboratory/radiology aliases pointed at bare `/app/lab-worklist` / `/app/rad-worklist` without ambulatory source filter (unlike Pharmacy D4C.7B).
4. **PROVIDER API gap** — Sidebar showed lab worklist to PROVIDER; `GET /worklists/lab` and landingRoute omitted PROVIDER → browse 403.
5. **POC vs central-lab** — No typed `resultSource` — **STOP gap** (documented deferral).

## Components parameterized for AMBULATORY

| Surface | Parameterization |
|---------|------------------|
| Sidebar | `resolveClinicCareLabRadSidebarHref` → `?source=clinic-care&ambulatory=1` |
| Clinic Care aliases | `buildClinicLaboratoryEntryHref` / `buildClinicRadiologyEntryHref` |
| Worklist pages | Client filter `filterAmbulatoryLabRadWorklistOrders` |
| Badge | `resolveDepartmentalEncounterContext` → AMBULATORY |
| Workspace tiles | Existing D4C.6 chart paths (`section=orders\|results`) |

## Forbidden authorities (none created)

ClinicLaboratoryOrder, ClinicLaboratoryResult, ClinicRadiologyOrder, ClinicRadiologyResult, ClinicDiagnosticWorklist, ClinicResultStatus, ClinicRadiologyStatus, ClinicResultAcknowledgement.

## RN / specimen distinction

`allowRnLabResultSubmission` gates **RN result ENTER** only (`ResultsService.updateResult`). Specimen / ack-start-complete via order-item workflow remains on clinical roles and is **not** auto-blocked by the submission flag (`rnLabSpecimenCollectionBlockedByResultSubmissionPolicy() === false`).

## POC STOP

No typed POC / CENTRAL_LAB / PROVIDER_PERFORMED on Result or OrderItem. Provider bedside POC cannot be safely distinguished from central-lab finalization without enterprise semantics. **Deferred** — no Clinic-only invent.

## Migration

**None.** `allowRnLabResultSubmission` unchanged.
