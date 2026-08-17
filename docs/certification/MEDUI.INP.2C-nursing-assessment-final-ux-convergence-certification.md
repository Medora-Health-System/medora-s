# MEDUI.INP.2C — Certification evidence

**Certification id:** MEDUI.INP.2C  
**Branch:** `inp2c-nursing-assessment-final-ux-overview`  
**Base:** `origin/main` @ `1d83522c0` (includes certified INP.2A + INP.2B)  
**Verdict (local):** **MEDUI.INP.2C CERTIFIED WITH DOCUMENTED DEFERRALS** — not merged / not deployed / no commit

**Live encounter:** `9c1296eb-c7a6-403c-96a2-b81f16205e82` (OPEN inpatient, Clinique Bon Samaritain Haiti)  
**Actors exercised:** RN (`rn@medora.local`), PROVIDER (`provider@medora.local`), facility ADMIN (`admin@medora.local`), ancillary LAB / FRONT_DESK

## Manual UAT A–V

| Gate | Result | Evidence summary |
|---|---|---|
| A RN opens assessment | **PASS** | FR workspace Haiti; tab **Évaluation infirmière**; board + summary + rail |
| B Historical columns immutable | **PASS** | `aria-readonly="true"` on historical; HISTORIQUE label; no draft write chrome on history |
| C Add Column | **PASS** | **+ Ajouter une colonne** → **BROUILLON ACTIF** + Annuler / Enregistrer |
| D Clinical date/time | **PASS** | Policy preserved; live API rejects +24h+ future (400) and client `authoredAt` (400) |
| E Rapid head-to-toe charting | **PASS** | In-grid chips (`aria-pressed`); **Non documenté** default (no auto-WNL); FR option labels |
| F Copy Previous | **PASS** | **Copier la précédente** → **Copié — vérifier avant d’enregistrer** |
| G Save/reload | **PASS** | UI save → `POST …/inpatient-nursing-assessments` **201**; draft cleared; events reload |
| H Nursing Summary | **PASS** | Concise **Résumé infirmier** (e.g. Douleur / Note); empty sections omitted |
| I Abnormal finding emphasis | **PASS** | Structured significant styling retained; no free-text auto-severity invent |
| J Clinical Documentation Hub | **PASS** | Hub CTA + inpatient deep links (E/S, dispositifs) on assessment; `careSetting="INPATIENT"` |
| K I&O/device authority | **PASS** | Projection/deep-link only; no duplicate ledger writes from assessment |
| L Right-side context | **PASS** | **Contexte d’évaluation** rail; `data-persistence="none"`; summary + deep links |
| M Overview projection | **PASS** | Latest assessment clinical time / author / pain / narrative on Overview |
| N Admission vs Assessment | **PASS** | Admission baseline mobility remains distinct (`overview-mobility-baseline-vs-current`) |
| O Provider read-only | **PASS** | GET events **200**; POST **403** Required roles: RN, ADMIN |
| P Facility ADMIN governance | **PASS** | ADMIN POST **201** |
| Q PCT/RT boundary | **PASS*** | LAB/FRONT_DESK POST **403**; write gate `@RequireRoles(RN, ADMIN)` only. *No seeded `RT` RoleCode / PCT user without MFA enroll — covered by same gate + PATIENT_CARE_TECH exists in catalog |
| R French workflow | **PASS** | FR labels for board, draft/history, copy verify, summary, rail |
| S Legal record / print | **PASS** | Events retain author / clinicalDocumentedAt / authoredAt / sessionId; ADMIN+PROVIDER `chart-export?format=html&locale=fr` **200** includes évaluation / douleur / narrative |
| T Nursing Admission regression | **PASS** | Admission GET authority **200**; INP.2B suite **10/10**; no admission engine edits |
| U ED regression | **PASS** | No ED feature files in INP.2C diff |
| V Observation regression | **PASS** | Observation focused vitest **21/21** |

## Automated gates

| Suite | Count |
|---|---|
| `nursingAssessmentUxConvergenceInp2c.test.ts` | **9 / 9 PASS** |
| `inpatientNursingDocumentationCompletionInp1b6.test.ts` | **14 / 14 PASS** |
| `inpatientNursingAssessmentInp1b3.test.ts` | **6 / 6 PASS** |
| `nursingAdmissionRapidDocumentationInp2b.test.ts` | **10 / 10 PASS** |
| Observation focused | **21 / 21 PASS** |

## Build / schema

| Check | Result |
|---|---|
| prisma validate | PASS |
| git diff --check | PASS |
| Migration | **NONE** |
| Seed | **NONE** |
| Prisma schema change | **NO** |

## Preservation

- INP.1B.6 board invariants unchanged (horizontal history, sticky finding, Add Column, Copy Previous, clinicalDocumentedAt vs server authoredAt/createdAt)
- One Nursing Assessment engine; no Overview/rail/summary persistence
- No duplicate I&O / device authority
- MAR / Care Plan / Discharge / Nursing Admission engines not modified
- MFA not weakened

## Deferrals / residual risks

1. No dedicated seeded RT user / `RoleCode.RT` in Haiti facility catalog — write denial relies on RN/ADMIN-only POST gate (proven via PROVIDER + LAB + FRONT_DESK).
2. Late-session browser redirect flake after Hub CTA (session/facility context) — Hub chrome + deep links already proven earlier in the same UAT session.
3. Some pre-existing Overview English operational strings (e.g. discharge barrier English) outside INP.2C assessment surface — not introduced by this milestone.

## Stop gate

**commit = NONE · push = NONE · PR = NONE · deploy = NONE**  
Awaiting operator approval.
