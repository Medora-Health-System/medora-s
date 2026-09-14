# Digital Care

## Purpose

Digital Care is Medora's bounded context for digitally mediated patient engagement. It provides the architectural home for future portal, communication, notification, telemedicine, education, questionnaire, monitoring, consent, proxy, and patient-facing AI capabilities.

## Owns

Digital Care owns its engagement-specific concepts, including conversations and message threads, patient-facing notifications and portal preferences, telemedicine sessions, education assignments, questionnaires, Digital Care proxy relationships, digital consent workflows, remote-monitoring engagement, and patient-facing AI interactions.

## Does Not Own

Digital Care is not the source of truth for the clinical chart, encounters, diagnoses, medications, allergies, laboratory or radiology results, pharmacy orders, provider/staff identity, facilities, organizations, billing ledgers, insurance data, authentication credentials, global authorization definitions, or canonical FHIR clinical resources.

Those concepts remain owned by their existing Medora domains.

## Communication Rule

Cross-domain integration must occur through approved public contracts, commands, queries, events, or explicitly exported interfaces. Digital Care must not reach into another bounded context's private repositories, ORM models, controllers, private services, or persistence implementation. Other bounded contexts must not deep-import Digital Care internals.

## Authorization Invariant

**Digital Care must never bypass Medora's central authorization model.**

Authentication, staff identity, organization/facility/country scope, tenant isolation, and global authorization enforcement remain responsibilities of Medora's central security architecture. Digital Care must not create a parallel authorization system or weaken existing scope rules.

## Future Modules

- portal
- communication
- notifications
- telemedicine
- education
- questionnaires
- monitoring
- consent
- proxy
- ai

DC-1A intentionally contains no controllers, endpoints, Prisma models, database migrations, background jobs, WebSockets, or UI changes.
