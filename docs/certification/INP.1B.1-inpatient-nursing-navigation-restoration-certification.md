# INP.1B.1 inpatient nursing navigation restoration certification

## Certification statement

The actual shared inpatient chart route now renders Nursing Admission and Nursing Assessment as first-class sticky-header destinations immediately after Overview. Both preserve encounter identity, support direct URL/refresh resolution, and open the existing authoritative inpatient clinical engines.

## Evidence matrix

- Header content/order: asserted against the CHART runtime catalog.
- Admission: switches to `InpatientAdmissionClinicalShell` with the current encounter ID.
- Assessment/reassessment: switches to `InpatientNursingAssessmentPanel`; saves and history remain on the dedicated INP.1A endpoints; the ED reassessment engine is absent.
- Overview: explicit admission and conditional start/reassess assessment buttons invoke canonical section navigation.
- Authorization: shared visibility does not enable controls for non-RN/non-Admin users; API authority is unchanged.
- Deep links: canonical and normalized aliases parse on initial load and subsequent URL updates; unknown/disallowed values keep the established safe fallback.
- Localization: English and French navigation/action/reassessment terminology is cataloged.
- Isolation: no Emergency or Observation source was modified.
- Record safety: no raw JSON UI, browser persistence, schema, migration, seed, or new persistence authority was introduced.

## Database and release declaration

- Prisma schema changed: **NO**
- Local migration required: **NO**
- Production migration required: **NO**
- Seed required: **NO**
- Production access: **NO**
- Deployment: **NO**
- Merge: **NO**
