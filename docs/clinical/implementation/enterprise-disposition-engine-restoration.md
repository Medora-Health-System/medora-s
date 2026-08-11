# Enterprise disposition engine restoration

The Main ED board now delegates pathway classification to the existing shared `resolveEdDispositionPath`. Admission versus observation is projected from `admissionSummaryJson.admissionPacketV1.levelOfCareCode`, with the existing flat care level and `requestedEncounterType` accepted as compatibility readers. It does not persist a new label or status.

The badge renders the authoritative decision immediately after the normal server reload. Discharge home and admission are no longer weakened into "pending" primary labels; readiness and transfer progress remain separate operational indicators.

The global exception filter emits PHI-safe client-error telemetry: request ID, normalized route (query removed), HTTP operation, and canonical code. Admission DTO failures have the stable `ADMISSION_DECISION_INVALID_PAYLOAD` code. Payloads, patient identifiers, field values, names, and MRNs are never logged.

## Inpatient reuse boundary

Reusable enterprise concepts are disposition path, destination/level-of-care transition, attribution, correction history, placement correlation, readiness, departure, and closure. ED-specific documents (`erDispositionV1`, LWBS and ED pathway boards) remain ED-owned. A later inpatient phase should reuse transition/correlation concepts, not consume ED JSON or add another encounter status.

## Deployment

Prisma schema changed: **NO**. Local migration: **NOT REQUIRED**. Production migration: **NOT REQUIRED**. Seed: **NOT REQUIRED**.
