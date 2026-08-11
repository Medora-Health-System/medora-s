# INP.1A certification record

## Certification scope

The authority foundation is certifiable for additive backend use under `inpatientNursingAssessmentV1`: strict payload validation, inpatient-only writes, server attribution/time, atomic latest snapshot plus append-only history, exact history filtering, read-only legacy compatibility, typed Overview/legal-record adapters, and typed audited patient-history section writers.

## ED isolation

No `EmergencyNursingReassessmentPanel`, `EmergencyNursingDocumentationGrid`, ED route, ED Summary, ED history, ED disposition, or `erNursingReassessmentV1` writer was changed. New code only reads a legacy ER blob on an inpatient encounter and labels it compatibility-only.

## Database

- Prisma schema changed: **NO**
- Migration required: **NO**
- Seed required: **NO**

## Residual risks / INP.1B gate

The existing inpatient UI still mounts the uncertified ED engine and must be replaced—not adapted—by an inpatient-native UI using the new endpoints. Before signed/final correction UX is enabled, certify a signature/addendum authority. INP.1B should wire typed history, Overview, Summary/chart and print/export consumers end-to-end and add database-backed e2e coverage without changing ED behavior.
