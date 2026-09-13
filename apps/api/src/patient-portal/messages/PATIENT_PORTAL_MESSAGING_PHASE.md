# Patient Portal Secure Messaging Phase

## Scope

This phase adds asynchronous secure messaging between a verified Medora Patient portal account and the linked facility care team.

It is not an emergency communication channel and must not be presented as real-time emergency care. Telemedicine, live chat presence, push notifications, message attachments, delivery/read receipts, and provider-specific routing are intentionally outside this phase.

## Patient routes

All patient routes use `PatientPortalAuthGuard` followed by `PatientPortalFacilityGuard`. The authoritative `patientId` and `facilityId` come from the verified portal link on the server, never from request JSON.

- `GET /patient/v1/facilities/:facilityId/messages/threads`
- `POST /patient/v1/facilities/:facilityId/messages/threads`
- `GET /patient/v1/facilities/:facilityId/messages/threads/:threadId`
- `POST /patient/v1/facilities/:facilityId/messages/threads/:threadId/messages`

Patients may choose only a bounded category, subject, and message body. They cannot choose a patient ID, staff user ID, provider destination, facility destination, attachment, or authorization scope in the payload.

## Staff routes

Staff routes remain on the existing staff authentication tree (`AuthGuard("jwt")` + `RolesGuard`). Only active facility `PROVIDER` and `RN` memberships are accepted in this phase.

- `GET /patient-portal/v1/staff/messages/threads`
- `GET /patient-portal/v1/staff/messages/threads/:threadId`
- `POST /patient-portal/v1/staff/messages/threads/:threadId/messages`
- `POST /patient-portal/v1/staff/messages/threads/:threadId/close`

Staff may view historical threads for their authorized facility. New staff replies additionally require that the thread still belongs to an active patient portal account with an active VERIFIED, unrevoked facility link. This prevents new content from being written to an inbox the patient can no longer access. Historical threads may still be closed after link revocation.

## Persistence and tenant isolation

`PatientPortalMessageThread` stores the portal account, authoritative clinical patient, and facility tuple. `PatientPortalMessage` stores immutable message authorship as either PATIENT or STAFF.

Database constraints/triggers provide defense in depth:

- a thread requires an active portal account, active facility, matching clinical patient facility, and exact VERIFIED/unrevoked portal link;
- patient-authored messages must use the portal account that owns the thread;
- no message can be appended after a thread is closed;
- sender attribution is mutually exclusive and retained through restrictive foreign keys;
- closed threads require both a closure timestamp and staff closer identity.

Application queries still scope patient thread reads by `threadId + portalAccountId + patientId + facilityId`. Staff reads scope by the authenticated facility established through `RolesGuard`.

## Data minimization

Patient responses never expose staff user IDs or portal-account IDs. Staff authors are projected to the patient simply as `CARE_TEAM`.

Message bodies and subjects are not copied into audit metadata. Audit metadata uses opaque IDs, category, lengths, counts, and operation names only.

The detailed message view returns at most the newest 500 messages. The API restores chronological order for display and returns `messagesTruncated: true` when older messages exist. Thread lists are bounded to 100 most-recent conversations in this first phase.

## Audit behavior

Patient message mutations and their `PatientPortalAuditLog` records occur in the same database transaction. If the mutation audit cannot be persisted, the message mutation rolls back.

Staff replies and closes use the existing staff `AuditService` with the same transaction and `critical: true`.

Read events are also audited but do not copy message text into audit metadata.

## Explicitly deferred

- attachments or document sharing through messages;
- direct patient-selected clinician routing;
- email/SMS notification bodies containing message content;
- WebSocket/realtime presence and typing indicators;
- read receipts and message-delivery state;
- telemedicine/video visits;
- message search across facilities;
- automated clinical interpretation or AI-generated replies.

Any future attachment or notification phase must receive a separate authorization, storage, PHI-minimization, and audit review before implementation.
