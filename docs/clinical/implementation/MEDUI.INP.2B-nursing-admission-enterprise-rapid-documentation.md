# MEDUI.INP.2B — Nursing admission enterprise rapid-documentation

**Program:** MEDUI.INP.2  
**Milestone:** INP.2B  
**Status:** Implemented locally — DO NOT MERGE / DEPLOY without operator approval

## What changed

- Stage regrouping for bedside coherence (6 stages, same 20 sections)
- Removed routine help `?` icons (clinical/legal whitelist only)
- Rapid structured controls for arrival, history/allergy/med review, skin, psychosocial/discharge baseline
- Suppressed OVERVIEW free-text `codeStatus` / `isolationStatus` (header/ops remain authority)
- Admission context rail (projection-only)
- Overview nursing-admission projection + deep link
- API PATCH/sign/verify restricted to RN/ADMIN (GET remains readable by providers)
- EN/FR i18n (`inpatientAdmissionInp2b` + option catalogs)

## Explicit non-goals honored

- No new nursing documentation engine  
- No Prisma / migration / seed  
- MAR / Care Plan authoring / Discharge lifecycle unchanged  
- INP.1B.6 Nursing Assessment unchanged  
- INP.2C–2H not implemented  

## Performance

Overview loads admission documentation in the existing `Promise.allSettled` fan-out. Rail uses in-memory ops projections already loaded by the admission shell.
