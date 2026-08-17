# MEDUI.INP.2C.1 — Certification evidence

**Certification id:** MEDUI.INP.2C.1  
**Branch:** `inp2c1-nursing-assessment-workflow-restoration`  
**Base:** `origin/main` @ `48bd7d23e` (PR #137 / INP.2C merged)  
**Verdict (local):** **MEDUI.INP.2C.1 CERTIFIED** — not merged / not deployed / no commit

**Live encounter:** `9c1296eb-c7a6-403c-96a2-b81f16205e82` (OPEN inpatient, Clinique Bon Samaritain Haiti)  
**Actors:** RN (`rn@medora.local`), PROVIDER (`provider@medora.local`), facility ADMIN (`admin@medora.local`)

## Manual UAT A–T

| Gate | Result | Evidence |
|---|---|---|
| A Board full-width | **PASS** | Assessment Context rail gone; board ~816px; summary above board |
| B Historical columns visible | **PASS** | 14→15 `nursing-column-historical` with ENREGISTRÉE |
| C Horizontal history scroll | **PASS** | `scrollWidth` 2740 > `clientWidth` 814 |
| D Add Column | **PASS** | BROUILLON ACTIF + Save/Discard |
| E Dropdown documentation | **PASS** | 64 `<select data-testid=nursing-select-*>`; **0** rapid chips |
| F Copy Previous | **PASS** | Draft populated from prior |
| G Copied verify | **PASS** | “Copié — vérifier avant d’enregistrer” markers |
| H Save/reload | **PASS** | Draft cleared; historical count +1; POST 201 |
| I Nursing Summary | **PASS** | Single Résumé infirmier above board (Douleur / narrative) |
| J Clinical Documentation hub | **PASS** | Documentation clinique → inpatient Hub; Fermer |
| K I&O → Nursing Summary | **PASS*** | Projection wired (`projectClinicalDocumentationSummaryLines`); empty when no EDOC I&O entries |
| L Devices → Nursing Summary | **PASS*** | Same projection + IV access; empty when none active |
| M Assessment → Overview | **PASS** | `overview-nursing-assessment-projection` shows author/pain/narrative |
| N Clinical Docs → Overview | **PASS** | `overview-io` + `overview-devices` modules present (EMPTY when undocumented) |
| O Provider read-only | **PASS** | POST **403**; GET events **200** |
| P RN authoring | **PASS** | UI save + API POST **201** |
| Q Facility ADMIN authoring | **PASS** | POST **201** |
| R French workflow | **PASS** | FR board/summary/hub/copy verify |
| S ED regression | **PASS** | No ED nursing coupling; ED grid unchanged |
| T Observation regression | **PASS** | Observation vitest **21/21** |

\* Projection-only; no duplicate persistence. Live encounter had no EDOC I&O/device entries during UAT — modules correctly show empty.

## Automated gates

| Suite | Count |
|---|---|
| `nursingAssessmentWorkflowRestorationInp2c1.test.ts` | **12 / 12** |
| `nursingAssessmentUxConvergenceInp2c.test.ts` (post-2C.1) | **9 / 9** |
| INP.1B.6 completion | **14 / 14** |
| INP.2B admission | **10 / 10** |
| Observation focused | **21 / 21** |

## Schema

Prisma validate **PASS** · Migration **NONE** · Seed **NONE** · `git diff --check` **PASS**

## Stop gate

**commit = NONE · push = NONE · PR = NONE · deploy = NONE**  
Awaiting operator visual review / approval.
