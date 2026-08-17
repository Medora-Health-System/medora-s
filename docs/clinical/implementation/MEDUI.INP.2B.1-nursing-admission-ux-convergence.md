# MEDUI.INP.2B.1 — Nursing Admission UX convergence (layout / save / time)

**Status:** Implemented locally — STOP for operator visual review before INP.2B.2.  
**Do not commit / push / merge / deploy** unless the operator approves.

## What this phase did

- Three-pane desktop layout: left 240–280px, center remaining, right 320–380px sticky
- Clickable six-stage top tracker (existing `NURSING_ADMISSION_STAGES`)
- Clickable subsection cards with status
- One Clinical Documentation launcher in the left nav
- Encounter lifecycle actions behind a disclosure (existing `InpatientLifecycleActionsMenu`)
- Sticky right rail: code/isolation/allergies projection + clinical datetime + Save draft / Save and continue
- Additive JSON `clinicalDocumentedAt` on `medSurgNursingAdmissionV1` (not Prisma)
- Section PATCH preserves other sections; 409 → conflict recovery
- Local draft stash when switching subsections
- Overview projection includes clinical documented time

## Explicitly deferred to INP.2B.2

- Mode-of-arrival icon cards
- Full subsection rapid-control redesign
- Stage 6 review-and-complete rewrite
- Live browser UAT / EN-FR live locale proof

## Persistence

JSON only. Migration **NONE**. Seed **NONE**.
