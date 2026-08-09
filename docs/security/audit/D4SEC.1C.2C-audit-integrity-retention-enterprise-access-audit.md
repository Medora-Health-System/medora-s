# D4SEC.1C.2C — Audit integrity, retention, and enterprise access audit

**Audit date:** 2026-08-09
**Scope:** repository state `081cf6d` (merged PR #91)
**Mode:** architecture audit only; no runtime code, migration, seed, production access, deployment, or UI change

## 1. Executive verdict

**An implementation may proceed only as a staged `GO` after the P0 controls below are accepted; the present runtime is `NO-GO` for an enterprise audit reader or audit export.** PR #91 / D4SEC.1C.2B is in the audited ancestry. Its normalized, transactional security-administration writes must be preserved.

The customer reader is conditionally certified for active facilities: its database predicate always includes the authoritative facility, so caller-controlled cursors and filters cannot remove tenant isolation. It is not an internal reader. Certification is withheld for historical actor privacy because platform attribution is recomputed from *current* authority: a deactivated/de-authorized former platform principal can be rendered as an ordinary named user.

The highest risks are:

1. `AuditLog.userId` and `facilityId` use `ON DELETE SET NULL`; deleting either principal destroys authoritative historical attribution and can mislabel an actor as `System`.
2. PostgreSQL and Prisma permit arbitrary audit update/delete. A shipped patient-data cleanup script deletes clinical audit rows. There is no tamper-evident integrity mechanism or database-enforced append-only boundary.
3. The general `AuditService` accepts arbitrary JSON and has no universal secret/PHI minimization gate. The security-admin helper rejects secret-shaped keys, but 289 domain calls and direct writes can bypass it.
4. No enterprise audit API, audit-export capability boundary, audit lifecycle policy, legal hold, archive, or auditable retention executor exists.

**Recommended branches:** (1) `codex/d4sec-1c-2c-integrity-retention-foundation`; (2) after that merges, `codex/d4sec-1c-2c-enterprise-audit-reader`; (3) defer export to `codex/d4sec-1c-3-audit-export-capability`. **Migration required:** yes. **Seed required:** no.

## 2. Current architecture

All runtime domain audit writes converge on the Prisma `AuditLog` table through `AuditService.log`, except one direct transactional facility-profile write, two seed `createMany` paths (plus generated `seed.js`), and a destructive maintenance script. `AuditService` enriches metadata from request-local actor role/source and can use a supplied Prisma transaction. Transaction writes rethrow on failure; non-transaction writes are best-effort by default, with configurable fail-closed behavior only when a caller marks an event critical.

D4SEC.1C.2B adds `logSecurityAdminAudit`: normalized event/outcome/severity/source-operation evidence, mandatory immutable actor `User.id`, critical semantics, transaction support, and recursive rejection of secret-shaped keys. This is domain-specific and must not replace clinical, billing, compliance, break-glass, or operational ownership.

The only general audit-event API is customer-scoped `GET /admin/audit/events`. Existing platform-only routes use the `admin/*` namespace (`admin/system-health`, `admin/backup-readiness`, `admin/export-monitoring`, `admin/roi-monitoring`, and catalog audit), guarded by the authoritative platform-principal resolver. There is no existing enterprise `AuditLog` event reader.

## 3. `AuditLog` schema findings

| Concern | Repository truth | Assessment |
|---|---|---|
| Primary key | `id String @id @default(uuid())` | Stable immutable identifier by convention only. |
| Timestamp | `createdAt DateTime @default(now())` | No `updatedAt`; useful but not proof of immutability. |
| Actor | nullable `userId String?`; optional `User` relation | System events are possible, but actor loss is indistinguishable from intentional system actor. |
| Actor FK | `User(id)`, migration `ON DELETE SET NULL ON UPDATE CASCADE` | Historical actor can disappear. |
| Facility | nullable `facilityId`; optional `Facility` relation | Global events supported; historical tenant attribution can disappear. |
| Facility FK | migration `ON DELETE SET NULL ON UPDATE CASCADE` | Unsafe for retained history. |
| Entity | required free-text `entityType`, nullable free-text `entityId` | Flexible but not referentially protected or tenant-derived. |
| Clinical links | nullable `patientId`, `encounterId`, `orderId`; relations are optional | Linked record deletion nulls context; metadata may still contain identifiers. |
| Metadata | arbitrary nullable PostgreSQL JSON/Prisma `Json?` | No schema, encryption class, size bound, universal redaction, or integrity digest. |
| Request evidence | nullable `ip`, `userAgent` | Potential personal data; lifecycle and access need policy. |
| Indexes | individual indexes on `userId`, `facilityId`, `createdAt`, `encounterId` | No compound `(facilityId, createdAt, id)` or enterprise search indexes. |
| Uniqueness | primary key only | Seed `skipDuplicates` does not deduplicate semantically. |
| Update/delete | Prisma exposes both; DB has no trigger/privilege restriction | Records are mutable/deletable. |
| Integrity | no row hash, chain, signature, immutable archive, or append-only DB rule | Cannot demonstrate tamper evidence. |

## 4. Actor-FK retention findings

`User.id` remains the authoritative actor identifier. **Do not add a duplicate actor ID and do not derive identity from email.** Change `AuditLog.userId` to a nullable relation with `onDelete: Restrict`/`NoAction`: null continues to mean a genuinely non-user system event, while an attributed event permanently retains its immutable `User.id`.

Routine `User` deletion must be prohibited. Use account deactivation, session revocation, capability/membership deactivation, and—when approved by privacy/legal governance—irreversible anonymization of mutable profile/contact fields while retaining the row and immutable ID. The anonymization act must itself be security-audited by ID. A narrowly controlled exceptional erasure workflow requires legal approval and cannot silently orphan audit history.

Apply the same retention principle to `Facility`: operational closure is `isActive=false`, not deletion. Make the audit FK restrictive. Facility names may change, so internal truth remains facility ID plus the retained facility record; if legal requires point-in-time labels, add a governed semantic snapshot rather than a second authority identifier.

Deactivated actors and facilities remain readable internally when authorized. The customer endpoint currently rejects inactive facility context; that is safe for ordinary customer access but a separate authorized internal reader must support historical inactive-facility search.

## 5. Complete write-path inventory

### Authoritative normalized security-admin audit

Fifteen production call sites invoke `logSecurityAdminAudit`: `admin-facilities.service.ts` (2), `admin-mspp-access.service.ts` (4), `admin-users.service.ts` (6), `user-mutation-boundary.ts` (2), and `auth/mfa/mfa.service.ts` (1). The helper itself performs the single normalized call to `AuditService`. PR #91 makes successful protected mutations transaction-scoped and captures meaningful denials; these controls remain authoritative.

### Clinical, break-glass, billing/compliance, and operational calls

The exhaustive production-source inventory below gives each file and number of direct general `AuditService` calls. Classification is by owning domain; mixed files are called out.

* **Clinical (including clinical access):** `appointments/appointments.service.ts` (6); `diagnoses/diagnoses.service.ts` (6); `encounters/admission-command-center.service.ts` (2), `admission-correlation.service.ts` (4), `clinical-documentation.service.ts` (4), `encounter-notes.service.ts` (4), `encounters.service.ts` (19), `enterprise-assignment.service.ts` (3), `enterprise-command.service.ts` (9), `enterprise-encounter-lifecycle.service.ts` (1), `enterprise-workflow/clinical-rules-orchestration.service.ts` (6), `enterprise-workflow/enterprise-workflow-orchestration.service.ts` (8), `hospital-episode.service.ts` (9), `inpatient-lifecycle.service.ts` (5), `inpatient-operations.service.ts` (21), `internal-placement.service.ts` (5), `observation-operations.service.ts` (2), `observation-order-template.service.ts` (1); `facilities/facility-bed-board.service.ts` (1); `fhir/fhir-resource.service.ts` (5); `follow-ups/follow-ups.service.ts` (5); `medication-administration/medication-administration.service.ts` (6); `medication-safety/controlled-substance-mar-governance.util.ts` (4), `high-alert-mar-governance.util.ts` (2), `lasa-mar-governance.util.ts` (2), `pharmacy-mar-governance.util.ts` (1), `pharmacy-verification.service.ts` (2); `orders/medication-order-lifecycle.service.ts` (5), `orders-continuous-fluid.service.ts` (2), `orders-fluid-bolus.service.ts` (2), `orders-lab-radiology-effective-time.service.ts` (2), `orders.service.ts` (16); `pathways/pathways.service.ts` (4); `patients/chart-summary.service.ts` (1), `patient-clinical-history.service.ts` (2), `patient-insurance.service.ts` (4), `patients.service.ts` (4); `pharmacy-inventory/pharmacy-inventory.service.ts` (2); `results/results.service.ts` (4); `triage/triage-carry-forward.service.ts` (2), `triage-vitals-reading.service.ts` (2), `triage.service.ts` (1).
* **Break-glass:** `patients/break-glass.service.ts` (3), plus `common/break-glass/break-glass-audit.helper.ts` (one helper write not included in the 289 direct-call count). These require the highest clinical-access lifecycle class and legal hold support.
* **Billing/export/compliance:** `admin/admin-billing-governance.service.ts` (1); `admin/admin-roi-monitoring.controller.ts` (1); `billing/billing-auto-mapping.service.ts` (1), `billing.service.ts` (2), `external-billing-automation.service.ts` (8), `external-billing-export.service.ts` (4), `procedure-revenue-review.service.ts` (1); `encounters/billing-classification.service.ts` (3), `chart-export.service.ts` (4); `queues/queues.service.ts` (4, mixed billing/order); `reports/reports.controller.ts` (1); `roi/chart-roi.service.ts` (6). Existing chart, ROI, billing, and report exports are business-record exports, **not an enterprise `AuditLog` export API**.
* **Compliance/public health:** `mspp/mspp-alert-investigation.service.ts` (4), `mspp/mspp.service.ts` (7), `public-health/public-health.service.ts` (12).
* **Operational/platform/catalog:** `admin/admin-catalog-audit.service.ts` (1); `encounters/operational-governance.service.ts` (8); all medication-master services: `controlled-catalog-import-medication` (2), `controlled-catalog-import-procedure` (1), `er-procedure-catalog-import` (2), `er-procedure-complexity-review` (2), `high-risk-medication-review` (3), `medication-formulary-promotion` (1), `medication-global-baseline-auto-approve` (1), `medication-product-activation-governance` (1), `medication-product-governance` (1), `medication-staging-duplicate-governance` (3), `priority-er-inventory-promotion` (2); `platform-announcements/platform-announcements.service.ts` (1).
* **Legacy/ad-hoc direct writes:** `admin/admin-facilities.service.ts` directly calls transactional `tx.auditLog.create` once for facility care-profile update; `prisma/seed.ts` and `prisma/helpers/seed-demo-haiti.ts` call `createMany` (the generated `prisma/seed.js` mirrors seed behavior). These bypass the service sanitizer/failure policy. No runtime `update`, `updateMany`, `delete`, `upsert`, or raw SQL mutation was found.

The 78 production source files contain **289 direct general `AuditService` calls** plus the security helper and break-glass helper paths. The common service is the sole normal `auditLog.create` implementation. Many calls occur after their business mutation and omit `tx`; therefore failures can produce unaudited mutations under best-effort mode. Integrity controls must be centralized without converting domain semantics into security-admin semantics.

## 6. Mutation/deletion inventory

* `apps/api/scripts/clearPatientData.ts` calls transactional `tx.auditLog.deleteMany` for every row with patient, encounter, or order linkage. This is an explicit destructive bypass and must be removed/replaced with a non-destructive development database reset that cannot target regulated environments.
* Prisma Client makes `update`, `updateMany`, `delete`, and `deleteMany` available everywhere even though no runtime update path was found.
* FK cascades set actor/facility/patient/encounter/order references to null; these are implicit mutations of retained rows.
* No raw SQL audit write/mutation exists outside schema migrations and read-only monitoring SQL.
* Seeds insert ad-hoc `SEED` rows. They are not production retention policy and do not justify mutable storage.

## 7. Customer reader certification

| Control | Verdict |
|---|---|
| Authoritative facility validation | PASS: service loads the exact active facility and then checks persisted active ADMIN membership or authoritative platform authority. Header/JWT facility is only an input to that server-side check. |
| Exact tenant isolation | PASS: `where.facilityId` is unconditional and composed last from server context. |
| Cursor isolation | PASS for confidentiality: decoded cursor contributes only `(createdAt,id)` bounds beneath the fixed facility predicate. Recommend a signed/versioned cursor containing scope/filter fingerprint to prevent confusion/replay. |
| Filter isolation | PASS: actor, encounter, entity/action and presets only narrow the fixed facility scope. Cross-tenant `entityId` is not currently exposed as a filter. |
| Platform attribution | **FAIL for historical state:** current authority is recomputed; revoked/deactivated/deleted former platform actors lose neutral classification. |
| Platform ID/email | PASS in response projection: actor ID and email are not returned. `actorUserId` is accepted as a filter but not echoed. |
| Secrets | Conditional: response returns only a summarized metadata allowlist, not raw JSON; write-time general metadata remains unsafe. |
| Inactive facility | PASS/intentional deny for customers. |
| Platform principal | PASS only with explicit active facility context; it does not become a global reader. |

Keep this endpoint customer-scoped. Fix immutable actor classification at write/storage time (classification, not a duplicate actor ID) before full certification.

## 8. Internal reader findings

No existing internal enterprise event reader exists. Platform monitoring endpoints aggregate/select narrow audit subsets but do not provide authoritative event search.

Follow the established platform operations convention and add **`GET /admin/platform-audit/events`** (not `/platform/*`, for which no repository convention exists) behind a dedicated service and authorization policy. To minimize ambiguity, an equally acceptable implementation is `/admin/audit/internal/events`; do not overload `/admin/audit/events`. The route must initially accept only `resolvePlatformAuthority(...).granted`, require MFA policy already applicable to the platform role, and never infer authority from email, request role, or facility header.

Minimum filters: bounded time range, facility ID including inactive, actor immutable user ID, event/action, entity type/id, outcome, severity, source operation, retention class, page size, and signed scope-bound cursor. Default to a short window and bounded page; require an explicit reason/ticket for broader/high-risk access. Projection: audit ID, timestamp, immutable actor ID (nullable only for true system events), immutable actor classification, facility ID, event/action, entity type/id, severity, outcome, source operation, and allowlisted safe semantic evidence. Exact user email/name should be an optional separately justified identity-detail expansion, not default event search.

Never return passwords/hashes, access or refresh tokens/hashes, MFA secret/ciphertext, recovery codes/hashes, API keys, authorization/cookie headers, session credentials, encryption/signing material, raw request bodies, or unnecessary PHI. Do not return raw metadata.

## 9. Authorization findings

Transitional access is platform-principal-only using persisted active user + `canCreateFacilities` + active `MEDORA_SUPER_ADMIN` assignment. Require defense-in-depth route metadata and a service-adjacent authority recheck. Customer ADMIN, MSPP roles, platform labels from JWT, and client facility headers are insufficient.

D4SEC.1C.3 may extend the policy adapter—without changing storage—to conceptual capabilities `AUDIT_VIEW_SECURITY`, `AUDIT_VIEW_COMPLIANCE`, `AUDIT_EXPORT`, and `AUDIT_MANAGE_RETENTION`. Capabilities should be narrow, persisted, independently revocable, MFA/session-assurance aware, purpose-bound, and facility/data-class constrained. Employee status alone grants nothing. Do not add roles or grants in 1C.2C.

## 10. Customer/internal projection matrix

| Stored truth | Customer facility view | Medora authorized internal view |
|---|---|---|
| platform actor `userId` + immutable `PLATFORM_PRINCIPAL` classification | `Medora Platform Administration`; no ID/email/name | immutable `User.id`, classification; identity details only if separately justified |
| null system actor + `SYSTEM` classification | `System` | null actor ID + `SYSTEM` |
| facility actor | tenant-safe display identity/role hint; no global email | immutable ID and classification; minimum necessary identity |
| facility ID | exact requesting facility only | exact ID, including inactive history, subject to capability/purpose |
| metadata | allowlisted semantic summary | separately allowlisted safe evidence, never raw metadata |
| PHI-linked IDs | only tenant-scoped operational identifiers | default pseudonymous IDs; detail access is higher-risk and audited |

Actor classification must be captured authoritatively at event time (for example `SYSTEM`, `FACILITY_USER`, `PLATFORM_PRINCIPAL`, future `MEDORA_EMPLOYEE`) and cannot be recalculated from current grants. It supplements—never replaces—`userId`.

## 11. PHI and minimum-necessary analysis

Audit metadata may contain patient/encounter/order identifiers and arbitrary caller evidence; free text may carry PHI. Internal access is therefore not automatically non-PHI. Establish per-event evidence schemas with: prohibited-key/value detection; maximum depth/size; no clinical narrative by default; stable IDs rather than names/diagnoses; classification (`NONE`, `PSEUDONYMOUS`, `PHI`); and retention class. Reject secrets fail closed. For PHI, allow only a documented event-specific field and purpose.

Enterprise search defaults must exclude raw evidence and should not join patient demographics. Detail access to PHI-bearing evidence requires an appropriate compliance/security capability, reason/ticket, narrower scope, and a high-risk access event. Rate limits, maximum range/result limits, anomaly alerts, and export separation prevent broad PHI enumeration.

## 12. Auditing audit access strategy

Write normalized events to the same store through a privileged-audit helper: `ENTERPRISE_AUDIT_SEARCH`, `ENTERPRISE_AUDIT_DETAIL_VIEW`, `ENTERPRISE_AUDIT_EXPORT_REQUESTED/COMPLETED/FAILED`, `ENTERPRISE_AUDIT_ACCESS_DENIED`, and future `AUDIT_RETENTION_POLICY_CHANGED`. Record actor ID/classification, outcome, purpose/ticket, normalized filter fingerprint, time range, facility scope/count (not patient names or returned data), result count, request correlation ID, and export artifact ID/hash where applicable.

Avoid recursion/noise by emitting one search event for the initial normalized query and material filter/scope changes, not each cursor page. A continuation token carries a search-session ID; subsequent pages update non-authoritative metrics/telemetry or are sampled, not recursively audited. Do not include audit-access events in the same search session unless explicitly requested, and never audit the audit event's own insertion as another read. Denials are always recorded after authentication establishes an actor; unauthenticated probes go to security telemetry because there is no authoritative `User.id`.

## 13. Retention findings

No AuditLog cleanup job, scheduler, TTL, partition lifecycle, archive, legal hold, lifecycle column, or configurable audit-retention executor exists. The only cleanup is the unsafe manual patient-data script. Railway backups/PITR are out-of-band operational assumptions and restore runbooks; backups are not immutable audit archives and cannot implement selective legal hold or disposition.

Separate three decisions:

1. **Technical architecture:** append-only active partitions; explicit event retention class; legal-hold registry; policy version; archive manifest with counts/ranges and cryptographic digests; immutable/WORM-capable encrypted object storage; verified restore/retrieval; two-person disposition approval; auditable batch deletion only after archive/hold/policy gates.
2. **Configurable policy:** effective-dated class-to-duration/archive/disposition rules owned through change control, never a silent default and never seeded as production truth.
3. **Contractual/regulatory policy:** actual durations, jurisdictions, customer contracts, litigation holds, and record-of-care relationships require Medora governance/legal/privacy approval. This audit invents no period.

At minimum use distinct lifecycle classes for security authentication/administration, platform administration, clinical/chart access, clinical record-change evidence, billing/export/ROI, public-health/compliance, operational, and break-glass. Break-glass and export evidence merit high-sensitivity/high-retention treatment, but legal decides periods. A record on hold is never deleted regardless of elapsed policy.

## 14. Export findings

There is no audit-event export endpoint. Existing billing, chart, report, ROI, and tooling exports are separate domains. Defer enterprise audit export until D4SEC.1C.3 supplies `AUDIT_EXPORT`, unless governance explicitly accepts platform-principal-only implementation in a later isolated slice.

Future export must be asynchronous and purpose/ticket-bound; use the same server-side filters/projection as the reader; prohibit customer ADMIN; enforce PHI classification; encrypt in transit/at rest; short-lived single-use download; artifact hash, row count, expiry and deletion evidence; no raw metadata; and audit request, generation, download, failure, expiration, and revocation. Customer audit export requires a separately designed tenant product/capability and is not implied by customer read permission.

## 15. Threat matrix

| # | Scenario | Current result / risk | Required control |
|---:|---|---|---|
| 1 | ADMIN uses another facility cursor | Fixed facility predicate prevents disclosure; cursor can alter page location. | Signed scope/filter-bound cursor + regression test. |
| 2 | ADMIN supplies another facility ID | Persisted active membership check denies. | Keep service-adjacent check; audit meaningful denial. |
| 3 | ADMIN calls internal endpoint | No endpoint today. | Platform authority/capability only; 403 and denial event. |
| 4 | Future staff lacks capability | Model absent. | Default deny; D4SEC.1C.3 explicit capability. |
| 5 | Platform principal reads internal audit | Impossible today. | Permit via authoritative resolver, MFA, purpose, access event. |
| 6 | Platform principal reads inactive facility | Customer API denies. | Internal API alone supports inactive history. |
| 7 | Deleted/deactivated actor | Delete nulls ID; deactivation breaks historical platform masking. | Restrict delete; retain/anonymize User; stored actor classification. |
| 8 | Deleted/deactivated facility | Delete nulls facility; inactive remains intact. | Restrict delete; deactivate and retain. |
| 9 | Audit mutation | Prisma/DB permit it. | DB append-only trigger/privileges; integrity verification/alert. |
| 10 | Audit deletion | Cleanup script and Prisma permit it. | Remove bypass; governed disposition function only. |
| 11 | Secret in metadata | Security helper rejects key markers; general paths do not. | Universal evidence schemas + recursive key/value redaction/rejection. |
| 12 | Unnecessary PHI | Arbitrary JSON permits it. | Data classification, allowlists, size limits, review/tests. |
| 13 | Customer ADMIN requests export | No audit export exists. | Keep denied; do not infer export from read role. |
| 14 | Authorized compliance staff exports | Capability absent. | Defer to `AUDIT_EXPORT`; governed asynchronous artifact. |
| 15 | Broad PHI enumeration | Customer is tenant/range bounded; future internal search could enable it. | Default narrow range, pseudonymous list, rate/query limits, detail gate/anomaly detection. |
| 16 | Recursive audit-read noise | Not currently audited. | One search-session event, no per-page recursion. |
| 17 | Cleanup removes legally held rows | No policy/hold; script deletes directly. | Hold-first executor, dry-run, approvals, archive verification. |
| 18 | Break-glass lifecycle | Events exist but no lifecycle class/hold. | Dedicated high-sensitivity retention class. |
| 19 | Cross-tenant entity ID filter | Customer query has encounter filter under fixed facility; entityId filter absent. | Every future filter remains ANDed to authoritative scope; validate linked entity facility where detail joining occurs. |
| 20 | Forged actor/facility context | JWT actor ID plus persisted service checks protect customer read; generic writers trust supplied IDs. | Derive write actor/scope from authenticated server context; restrict raw service API/direct Prisma. |

## 16. P0/P1/P2/P3 findings

**P0 before enterprise reader/export:** restrictive actor/facility deletion semantics and no hard deletion workflows; append-only DB enforcement; eliminate destructive script bypass; stored actor classification; universal secret rejection and safe evidence projection; authoritative platform-only internal policy; audit privileged access.

**P1 before production retention execution:** retention class/policy version/hold architecture; integrity digest/ledger and verification alerts; scope-bound cursor; compound indexes; migration data audit; PHI schemas; restore/archive/disposition runbooks and tests.

**P2:** D4SEC.1C.3 capability adapter, staff classifications, high-risk detail endpoint if justified, anomaly/rate monitoring, asynchronous governed export.

**P3:** performance partitioning based on measured volume, SIEM forwarding, dashboard UI and advanced compliance analytics. These cannot substitute for P0/P1 controls.

## 17. Recommended schema changes

1. Specify `onDelete: Restrict`/`NoAction` for `AuditLog.user` and `AuditLog.facility`; retain nullable scalar fields only for genuinely unattributed/global events.
2. Add immutable `actorClassification` enum, `event`/`outcome`/`severity`/`sourceOperation` normalized nullable fields for gradual domain adoption, `retentionClass`, `policyVersion`, `evidenceClassification`, and optional request correlation ID. Do not duplicate actor ID.
3. Add tamper-evidence fields such as canonical payload digest, integrity scheme/version, and an independently anchored batch/ledger reference. A simple mutable row hash alone is insufficient.
4. Add compound indexes supporting `(facilityId, createdAt, id)`, `(userId, createdAt, id)`, and bounded enterprise fields after query-plan validation.
5. Add a legal-hold/policy/batch-manifest model rather than a boolean that an ordinary writer can clear.
6. Enforce append-only behavior in PostgreSQL. Application runtime roles get `SELECT/INSERT`, not `UPDATE/DELETE`; a trigger rejects mutation. A separate tightly controlled disposition database role/function may delete eligible archived, unheld batches and must emit an immutable manifest externally/ledger-wise.

## 18. Recommended API changes

Keep `GET /admin/audit/events` unchanged in customer purpose and response shape, except adopt signed scope-bound cursors and immutable stored platform classification. Add the minimal internal search described in section 8. Do not add internal detail until a use case proves it necessary. Do not add export in the first reader slice. Never accept an actor ID from a write DTO; write context derives it from authenticated server state.

## 19. Recommended service changes

Introduce an append-only `AuditWriter` facade with typed domain evidence policies, server-derived actor/facility context, canonicalization/digest, classification and transaction support. Retain domain-specific adapters (`SecurityAdminAudit`, clinical, billing, break-glass) rather than one semantic mega-helper. Restrict direct Prisma access by lint/static check and code ownership. Make criticality/failure mode policy event-class driven, not caller-optional. Add `EnterpriseAuditAuthorizationPolicy` as the future capability seam and a projection service that never exposes raw metadata.

## 20. Migration assessment

**A migration is required, but none is created by this audit.** It must preserve every row and `User.id`/facility ID; no repair may search or join by email.

Proposed Prisma changes are listed in section 17. Preflight must count null/non-null actors/facilities, verify every non-null ID resolves, detect duplicate IDs/impossible timestamps, inventory metadata size/secret/PHI risk without logging values, and identify all existing system events. Backfill actor classification solely from immutable IDs and contemporaneous authoritative evidence; ambiguous historical rows become an explicit `UNKNOWN` classification, never guessed from email. Apply additive columns first, backfill by IDs in reviewed batches, validate constraints, then change FKs/privileges/trigger.

Local generation/application after approval: `npm run prisma:migrate --workspace=@medora/api` (using the repository script). Production deployment after backup, staging rehearsal, legal approval and change window: `npm run migrate:deploy --workspace=@medora/api`.

Rollback is forward-fix: do not restore old `SET NULL` semantics or discard new evidence. If backfill/validation fails, stop before constraint activation; additive columns remain safe. If the append-only trigger blocks an unexpected path, disable application traffic and correct that path—do not broadly grant mutation. A database restore risks losing post-backup audit records and requires incident reconciliation against the external integrity ledger/archive.

## 21. Seed assessment

**No seed is required or permitted for D4SEC.1C.2C.** Do not seed employees, grants, a support-address authority, a second principal, or production retention policy. Enum/schema defaults must not silently assert a legal policy. Test fixtures may create synthetic users/policies only inside isolated tests.

## 22. Mandatory regression-test plan

Exact implementation checks:

1. `npm run build --workspace=@medora/shared && npm run build --workspace=@medora/api`
2. `npm run test --workspace=@medora/shared`
3. `npm run test --workspace=@medora/api -- --runInBand`
4. `npm run prisma:generate --workspace=@medora/api`
5. `npx prisma validate --schema apps/api/prisma/schema.prisma`
6. Migration integration on a production-shaped clone: apply, verify row/ID counts and FK resolution, attempt User/Facility deletion, rollback transaction, and compare canonical samples by immutable ID.
7. DB integrity integration: application role cannot update/delete; insert works; tampering is rejected/alerted; controlled unheld expired disposition works; held/regulated rows cannot be removed.
8. Static repository check fails on `auditLog.update*`, `delete*`, direct create/createMany, and raw SQL outside approved writer/migration/disposition modules.
9. Customer e2e: all scenarios 1, 2, 6, 19 and 20; active/inactive facility; foreign cursor/filter; neutral current and former/deactivated platform actor; no ID/email/secret/raw metadata.
10. Internal e2e: customer ADMIN and unprivileged future employee denied; forged JWT role denied; platform principal allowed; inactive facility accessible; exact actor ID/classification; bounded filters/cursor; no raw secrets/PHI.
11. Metadata property/fuzz tests: nested/mixed-case/punctuation secret keys, secret-shaped values, oversized/deep JSON, PHI fields, cyclic/non-JSON inputs; authorized semantic booleans remain allowed.
12. Audit-access tests: initial/material search audited once; pagination not noisy; detail/export/denial audited; insertion does not recursively generate another access event.
13. Retention tests: policy versions/effective dates, legal hold precedence, dry run, archive digest/count verification, partial failure/idempotency, concurrent writes, break-glass lifecycle, and no silent default deletion.
14. Export tests when D4SEC.1C.3 is ready: capability separation, purpose, facility/data class, artifact encryption/hash/expiry, single-use authorization, auditing, and PHI-safe projection.

Known Jest ESM/shared resolution failures must be reported separately; they do not waive targeted unit/integration/e2e certification.

## 23. Recommended implementation slices

1. **Integrity/identity migration:** deletion prohibition, stored classification, additive normalized/lifecycle/integrity fields, indexes, DB append-only enforcement, destructive-script removal, static guard.
2. **Writer hardening:** typed evidence schemas, universal secret/PHI controls, canonical digest/ledger, transaction/failure policy, incremental domain adapters. Preserve 1C.2B semantics.
3. **Customer recertification:** immutable platform projection and signed tenant/filter cursor; no enterprise expansion.
4. **Enterprise reader:** platform-principal-only policy adapter, minimum projection/search, inactive history, access-event strategy, tests; no export.
5. **Retention foundation:** policy/hold/archive manifest and dry-run tooling. Production durations/disposition remain blocked on governance/legal approval.
6. **D4SEC.1C.3 follow-on:** employee capabilities and classifications.
7. **Export follow-on:** only after capability, PHI, artifact, and retention governance certification.

## 24. Platform Admin dashboard alignment

D4SEC.1C.2C supplies backend foundations only:

* **Security / Access control, MFA/recovery, Privileged actions, Security audit:** immutable actors, normalized security events, integrity verification, privileged search, denied-access evidence.
* **Compliance / Audit logs, ROI monitoring, Export monitoring, Compliance controls:** separated internal projection, PHI classification, lifecycle/hold policy, access/export event vocabulary, governed future export. Existing ROI/export aggregates remain separate.
* **System Operations / System health, Backup readiness, Go-live monitoring:** integrity/retention health signals, archive/restore verification and policy status. Backups remain disaster recovery, not the audit archive.

No dashboard UI, unrestricted employee access, policy grant, retention duration, export button, or production operation is enabled by this audit.

## 25. Certification prerequisites

D4SEC.1C.2C implementation is certified `GO` only when all P0 items and applicable P1 items have landed in reviewed slices; migration rehearsal proves zero actor/facility attribution loss; every write/deletion path is covered; customer isolation and historical neutral attribution pass; platform authority is the sole transitional internal authorization; internal reads/denials are audited without recursion; raw secrets/PHI are excluded; governance/legal approves lifecycle classes and any disposition policy; backup/archive restoration is demonstrated; and the mandatory tests pass or have explicitly accepted, unrelated environment exceptions.

Until then: **NO-GO for internal enterprise audit availability, audit export, or automated audit deletion.** Migration: **required after approval**. Seed: **not required**. Production access/deployment/merge: **out of scope and not performed**.
