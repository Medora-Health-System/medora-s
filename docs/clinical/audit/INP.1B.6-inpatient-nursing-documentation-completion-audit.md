# INP.1B.6 — ED → Shared → Inpatient reuse matrix (AUDIT)

**Date:** 2026-08-16  
**Branch:** `inp1b6-inpatient-nursing-documentation-completion` (from `origin/main` @ `8730e027f`)  
**Mode:** Audit complete before implementation. No Prisma migration.

## Authority boundaries (non-negotiable)

| Domain | Authority | Inpatient board role |
|--------|-----------|----------------------|
| Assessment/reassessment columns | INP.1A `inpatientNursingAssessmentV1` + `EncounterClinicalEvent` `NURSING_ASSESSMENT_SAVED` | Persist / display |
| Clinical Documentation cards (I&O, devices, safety, RT, blood, infusions, …) | Enterprise `ClinicalDocumentationHub` + card registry | Mount / project / deep-link |
| ED reassessment grid | `erNursingReassessmentV1` + ED events | **Isolate — do not import** |
| Triage / ESI / trauma / disposition | ED only | **Isolate** |
| Overview / Summary / Chart / Print / Timeline | Projections of INP.1A + clinical docs | Never duplicate store |
| Beds / encounter | Existing enterprise encounter + bed board | Out of scope |

## Clinical time vs audit time (schema STOP-GATE)

| Field | Location | Semantics |
|-------|----------|-----------|
| `EncounterClinicalEvent.createdAt` | Prisma | Server commit / audit time |
| `InpatientNursingAssessmentV1.authoredAt` | JSON snapshot (server-set) | Server attribution time (same moment as save today) |
| Save DTO | Intentionally **excludes** identity/time | Clients cannot forge `authoredAt` |
| ED `documentedAt` / `reassessmentAt` | ED JSON namespace | Clinician-selected clinical time (ED pattern) |

**Verdict:** No Prisma column is required. Safe extension is optional client field `clinicalDocumentedAt` on `inpatientNursingAssessmentSaveSchema` (JSON only). Server validates range, stores on snapshot, **never** overwrites `authoredAt` or `createdAt`. Column display and legal `occurredAt` use clinical time when present; audit provenance remains `authoredAt` + event `createdAt`.

**Prisma change: NO · Migration: NO · Seed: NO**

## ED feature classification matrix

| # | ED surface | Class | Reuse decision |
|---|------------|-------|----------------|
| 1 | `EmergencyNursingReassessmentPanel` | C (ED host) + A/B embeds | Do not mount for inpatient; copy **patterns** only |
| 2 | `EmergencyNursingDocumentationGrid` sticky labels / scroll | A | Port sticky/scroll into `NursingDocumentationBoard` |
| 3 | `ClinicalDocumentationHub` + catalog | B | Mount with `careSetting="INPATIENT"` |
| 4 | ED clinician `reassessmentAt` / `documentedAt` | A pattern / C persistence | Mirror as `clinicalDocumentedAt` on INP.1A JSON |
| 5 | Horizontal column scrolling | A | Already on board; fix sticky first column |
| 6 | ED Nursing Summary generation | A pattern / C ED payload | Redesign inpatient summary projection from INP.1A draft/latest |
| 7 | ED structured persistence (`erNursingReassessmentV1`) | C | Reject |
| 8 | Flowsheets (EDOC registry) | B | Via Clinical Documentation Hub |
| 9 | Intake & Output | B / F | Hub + overview I&O projection; board links/status only |
| 10 | Lines/drains/devices | B / F | Device EDOC + assessment condition notes; no second inventory |
| 11 | Safety documentation | B | Hub + structuredFindings safety rows |
| 12 | Respiratory documentation | B | Hub + board respiratory rows |
| 13 | Blood product documentation | B | Hub only (not assessment engine) |
| 14 | High-alert infusion | B | Hub + MAR as applicable |
| 15 | Search/filter/category | B | Hub already care-setting aware |

### Legend
- **A** reusable presentation  
- **B** reusable shared clinical component  
- **C** ED-specific — isolate  
- **D** inpatient equivalent exists  
- **E** inpatient capability missing  
- **F** authoritative-domain projection (no duplicate persistence)

## Current inpatient gaps (pre-fix)

| Gap | Evidence |
|-----|----------|
| UUID + “server-authored” chrome | `InpatientNursingAssessmentPanel` context string |
| No sticky Clinical Finding | `NursingDocumentationBoard` labels lack `position: sticky` |
| Sparse rows vs head-to-toe | ~28 rows; i18n already has fuller field catalog |
| No clinician clinical time | Save schema forbids client time; UI uses `draftTime` display only, not persisted |
| No Clinical Documentation hub on assessment | Panel does not mount `ClinicalDocumentationHub` |
| Weak Nursing Summary | Flat “Not charted” list |
| Overview nursing thin | Only admission complete + lastShift; not full INP.1A overview projection |

## Reuse before build — implementation plan

1. Extend INP.1A **JSON** with `clinicalDocumentedAt` (validated server-side).  
2. Harden `NursingDocumentationBoard` sticky label column + sticky header.  
3. Complete board rows; section-organized summary; strip technical chrome.  
4. Mount shared `ClinicalDocumentationHub` (`INPATIENT`).  
5. Extend Overview nursing module with authoritative INP.1A overview fields (projection only).  
6. Tests + certification; stop before git write.
