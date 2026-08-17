# MEDUI.INP.2C.1 — Certification evidence

**Certification id:** MEDUI.INP.2C.1  
**Branch:** `inp2c1-nursing-assessment-workflow-restoration`  
**Base:** `origin/main` @ `48bd7d23e` (PR #137 / INP.2C merged)  
**Verdict:** **MEDUI.INP.2C.1 — CERTIFIED** (local). **Not merged / not deployed / no commit**

**Live encounter:** `9c1296eb-c7a6-403c-96a2-b81f16205e82` (OPEN inpatient, Clinique Bon Samaritain Haiti)  
**Actors:** RN (`rn@medora.local`), PROVIDER (`provider@medora.local`), facility ADMIN (`admin@medora.local`)

## Final gate table

| Gate | Result |
|---|---|
| A Layout target | **PASS** |
| B Longitudinal documentation | **PASS** |
| C Clinical selected time persistence | **PASS** |
| D Nursing Note | **PASS** |
| E Clinical Documentation convergence | **PASS** |
| F Scroll/sticky behavior | **PASS** |
| G RN/Admin/Provider roles | **PASS** |
| H EN/FR | **PASS** |
| I Regression/builds | **PASS** |

## Legal-time proof (STOP-GATE C)

Selected UI: `2026-08-17T12:04` local (Haiti UTC−5)

| Field | Value |
|---|---|
| `clinicalDocumentedAt` | `2026-08-17T17:04:00.000Z` |
| `authoredAt` | `2026-08-17T19:04:52.872Z` |
| `createdAt` | `2026-08-17T19:04:52.884Z` |

**clinical effective time and server audit time remained distinct.** Selected clinical time was not overwritten with save time. Column header showed `12:04 PM 8/17/2026`.

## H EN/FR live proof

- **FR (prior UAT):** Évaluation infirmière, Résumé infirmier (dernier), Constat clinique, + Ajouter une colonne, Copier la précédente, BROUILLON ACTIF / ENREGISTRÉE, Date/heure, Note infirmière, Enregistrer la note, Documentation clinique, Ouvrir E/S, Ouvrir les dispositifs; dropdowns French.
- **EN (this pass):** Haiti `Facility.defaultLanguage` temporarily set to `en` via platform `PATCH /admin/facilities/:id/language`, then restored to `fr`. Live chrome: Nursing Assessment, Nursing Summary (latest), Clinical finding, + Add column, Copy previous, ACTIVE DRAFT, SAVED / HISTORICAL, Date / Time (clinical documented time), Nursing Note (optional), Save nursing note, Clinical Documentation, Open I&O, Open devices. Dropdown visible labels English (Alert, Unlabored, …), not raw enums (`ALERT` values remain internal).
- EN/FR i18n keys mirrored in `inpatientNursingAssessmentInp2c.{en,fr}.ts`.

## Automated gates

| Suite | Count |
|---|---|
| `nursingAssessmentWorkflowRestorationInp2c1.test.ts` | **12 / 12** |
| `nursingAssessmentUxConvergenceInp2c.test.ts` | **9 / 9** |
| INP.1B.6 completion | **14 / 14** |
| INP.1B.3 | **6 / 6** |
| INP.2B admission | **10 / 10** |
| Overview `inpatientOverview.d4a34.test.ts` | **9 / 9** |
| EDOC I&O | **9 / 9** |
| EDOC devices | **3 / 3** |
| EDOC catalog | **11 / 11** |
| ED nursing restoration | **7 / 7** |
| Observation workspace + departmental | **6 / 6 + 3 / 3** |
| **Focused total** | **99 / 99** |

web `tsc --noEmit` **PASS** · web `next build` **PASS** (re-run after UAT Next on port 3011 was stopped; 173 pages) · shared build **PASS** · api `nest build` **PASS** · prisma validate **PASS** · `git diff --check` **PASS**

Clinical UAT A–G retained: this finalization changed documentation/whitespace and locale-for-proof only. Product source was not changed after the prior live UAT.

## Schema

Prisma validate **PASS** · Migration **NONE** · Seed **NONE**

## Stop gate

**commit = NONE · push = NONE · PR = NONE · deploy = NONE**
