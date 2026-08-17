# MEDUI.INP.2B — Nursing admission enterprise rapid-documentation audit

**Date:** 2026-08-16  
**Scope:** INP.2B only

## Persistence authority

| Item | Finding |
|---|---|
| Durable store | `Encounter.admissionSummaryJson.medSurgNursingAdmissionV1` |
| Schema | `packages/shared/.../medSurgNursingAdmissionD4a1.ts` |
| API | `inpatient-operations` nursing-admission GET/PATCH/sign/verify |
| Prisma | **No migration** — JSON only |

## Reuse matrix

| Domain | Existing authority | Reused | Changed | New authority? | Notes |
|---|---|---|---|---|---|
| Patient identity | Registration / patient projection | ✔ | UI | No | Demographics projected, not forked |
| History | Patient clinical history preload | ✔ | Review rapid control | No | Review/ack only |
| Allergies | Enterprise allergy + preload verify | ✔ | Review rapid control | No | No admission allergy array |
| Home meds | Home medication recon authority | ✔ | Review rapid control | No | No second med list |
| Code status | `inpatientClinicalOpsV1` / header | ✔ | Hide free-text fork | No | Read-only projection |
| Isolation | Clinical ops / header | ✔ | Hide free-text fork | No | No silent isolation order |
| Falls | FALL_SAFETY + EDOC + rapid | ✔ | Stage remap | No | |
| Skin/wounds | SKIN_WOUND + EDOC | ✔ | Rapid baseline chips | No | No wound inventory fork |
| Devices | LINES_DRAINS_DEVICES + EDOC | ✔ | Rapid confirm | No | |
| Nutrition | Admission section + rapid YNU | ✔ | Rapid | No | No diet order from admission |
| Psychosocial | PSYCHOSOCIAL section | ✔ | Rapid living/residence/needs | No | Screening only |
| Education | EDUCATION_COMMUNICATION | ✔ | Stage keep | No | |
| Discharge baseline | Psychosocial rapid flags | ✔ | Capture only | No | Does not authorize discharge |
| Overview | `projectInpatientOverview` | ✔ | Admission projection | No | Read-only |
| Audit/legal | Signature + amendments | ✔ | API write RN/ADMIN | No | Signed remains immutable |

## Root causes addressed

1. Excessive `?` help icons on every field  
2. Free-text code/isolation forks vs enterprise ops  
3. Weak arrival rapid documentation  
4. Overview only showed boolean admission complete  
5. PROVIDER could PATCH/sign nursing admission via API  

## STOP gate — schema

No missing authority required Prisma. **NO migration.**
