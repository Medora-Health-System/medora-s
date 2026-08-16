# MEDUI.INP.2A — Certification evidence

**Certification id:** MEDUI.INP.2A  
**Program:** MEDUI.INP.2  
**Verdict (local implementation):** READY FOR OPERATOR REVIEW — **not merged / not deployed**

## Gates

| Gate | Result |
|---|---|
| Eight-module sticky nav (nursing/provider/chart) | PASS (unit) |
| Timeline/Summary removed from sticky | PASS |
| Notes not sticky; deep-link retained | PASS |
| timeline/summary → Overview | PASS |
| Provider read Admission/Assessment without nursing write | PASS (UI gates) |
| Overview read-only | PASS |
| Overview deep links | PASS |
| Orders / MAR / Results / Care Plan / Discharge projections | PASS |
| Significant events without deleting timeline engines | PASS |
| Right rail no persistence | PASS |
| EN/FR i18n for INP.2A | PASS |
| ED / Observation sticky unchanged | PASS (isolation checks) |
| Prisma / migration / seed | NONE |

## Explicit preservation

- NO new clinical authority  
- NO Overview persistence  
- NO right-rail persistence  
- NO ED authority copied  
- Timeline data retained  
- Summary data retained  
- Notes authority retained  
- INP.1B.6 unchanged  
- Care Plan D4B.6 unchanged (authoring)  
- MAR authority unchanged  
- Discharge lifecycle unchanged  
- Historical **INP.2** care-plan certification documents untouched  

## Recommended next operator action

Authorize commit / PR review only after stop-gate report acceptance. Do not merge or deploy from this milestone alone if release policy requires full INP.2 program readiness.
