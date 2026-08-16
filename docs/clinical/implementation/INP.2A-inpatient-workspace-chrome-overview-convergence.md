# MEDUI.INP.2A — Inpatient workspace chrome + Overview convergence

**Program:** MEDUI.INP.2 (milestones INP.2A–INP.2H)  
**Scope:** INP.2A only  
**Status:** Implemented locally — **DO NOT MERGE / DO NOT DEPLOY** until operator authorization

## Intent

Converge inpatient clinical sticky navigation to eight modules and complete Overview as a read-only clinical command center with a projection-only right-side context rail.

## Navigation (canonical)

1. Overview  
2. Nursing Admission  
3. Nursing Assessment  
4. Review Orders  
5. MAR  
6. Review Results  
7. Care Plan  
8. Discharge  

Removed from sticky navigation (engines retained): Notes, Timeline, Summary.  
`?section=timeline` / `?section=summary` resolve to Overview.

## Architecture / reuse

| Concern | Authority reused | INP.2A change |
|---|---|---|
| Sticky nav | `inpatientWorkspaceSections.ts`, recovery primary-nav helpers | Eight-module SSoT |
| Overview projection | `projectInpatientOverview`, clinical synthesis, provider workspace bootstrap | Orders / Care Plan / Provider docs cards + deep links |
| MAR / Results / Discharge slices | Existing synthesis projection | Display + deep link only |
| Care Plan list | `GET /encounters/:id/care-plans` (D4B.6) | Read projection only — no authoring UI change |
| Right rail | Same Overview projection object | No independent fetch authority |
| Nursing Admission read | Existing admission shell | `readOnly` for non-RN/non-ADMIN |
| Nursing Assessment write | Existing `canEditAssessment` | Unchanged (RN/ADMIN) |

## Explicit non-goals (honored)

- NO new clinical authority  
- NO Overview persistence  
- NO right-rail persistence  
- NO ED authority copied  
- Timeline data retained  
- Summary data retained  
- Notes authority retained (deep-link / documentation surfaces)  
- INP.1B.6 unchanged  
- Care Plan D4B.6 authoring unchanged  
- MAR administration unchanged  
- Discharge lifecycle unchanged  
- NO Prisma schema / migration / seed  
- Historical care-plan cert id **INP.2** untouched  

## Performance

Overview mode loads synthesis, nursing assessment events, and care-plan list via `Promise.allSettled` after provider workspace bootstrap. Rail shares the same `projectInpatientOverview` object (no second fan-out).

## Files (primary)

- `apps/web/src/features/inpatient-workspace/inpatientWorkspaceSections.ts`
- `apps/web/src/features/inpatient-workspace/InpatientActiveWorkspaceView.tsx`
- `apps/web/src/features/inpatient-workspace/InpatientOverviewView.tsx`
- `apps/web/src/features/inpatient-workspace/InpatientClinicalContextRail.tsx`
- `apps/web/src/features/inpatient-workspace/projectInpatientOverview.ts`
- `apps/web/src/features/inpatient-workspace/InpatientProviderWorkspacePanel.tsx`
- `apps/web/src/features/inpatient-workspace/InpatientAdmissionClinicalShell.tsx`
- `apps/web/src/features/inpatient-workspace/InpatientWorkspacePanel.tsx`
- `packages/shared/src/encounters/inpatientWorkspaceRecoveryD4a27b.ts`
- `packages/shared/src/encounters/providerClinicalSynthesisD4a26a.ts`
- `apps/api/src/encounters/clinical-synthesis.service.ts`
- i18n: `inpatientOverviewInp2a.en.ts` / `.fr.ts` (+ mirrors)
- tests: `inpatientWorkspaceChromeInp2a.test.ts`
