# D4SEC.1C.5B certification record

## Verdict: CONDITIONAL PASS

The implementation and source-level security/localization suites pass. Release has one remaining gate: run the committed PostgreSQL advisory-lock integration test and database-backed API E2E suites in GitHub CI or another disposable PostgreSQL environment. This workstation has neither Docker/PostgreSQL binaries nor a database listening on localhost:5432, so it cannot truthfully certify live concurrency or database E2E.

## Security certification
The bootstrap requires the complete D4SEC.1A principal, a matching active `AuthSession`/sid and recent database MFA. It rejects self, inactive/missing/conflicting targets, serializes the global predicate with `pg_advisory_xact_lock(7259)`, and closes on either historical completion evidence or an existing eligible approver. It creates `COMPLIANCE_SECURITY` with exactly `COMPLIANCE_AUDIT_VIEW`, `COMPLIANCE_EXPORT_MONITOR`, `COMPLIANCE_ROI_MONITOR`, `SECURITY_ACCESS_VIEW`, `SECURITY_AUDIT_VIEW`, and `PRIVILEGED_ACTION_APPROVE`. It creates no facility membership, clinical role, platform-principal assignment, or staff mutation grant. Started/completed evidence and mutations share the transaction; denial evidence excludes credentials, tokens, MFA values, authorization headers, and PHI. Ordinary D4SEC.1C.4C dual control and `SELF_APPROVAL_PROHIBITED` remain unchanged.

Focused D4SEC.1C.4A/4B/4C, principal, sid, capability guard/resolver, staff lifecycle, privileged action, bootstrap DTO, policy, and service suites passed: 11 suites / 88 tests. Bootstrap tests cover incomplete authority combinations, authority inputs ignored by policy, active-session query binding, missing/stale/forged MFA, target constraints, exact grants, audits, audit-failure propagation, historical closure, existing approver closure, and advisory-lock ordering. The PostgreSQL test is committed and intentionally conditional on `TEST_DATABASE_URL`.

## Localization certification
The existing typed `en`/`fr` catalog and `I18nProvider` remain authoritative. A bounded Platform source-literal catalog/bridge converts legacy Platform React text, accessibility attributes, placeholders, canonical codes, and known backend errors without duplicating pages or changing stored codes. Selection defaults to English, persists in localStorage and a SameSite=Lax cookie, changes without logout/routes, updates document `lang`, and uses `Intl.DateTimeFormat` with `en-US`/`fr-FR`.

Platform Overview, navigation/shell, Facilities and facility detail, Staff and staff detail, Security, privileged actions, audit, MFA recovery/step-up, one-time governance setup, Compliance/ROI/exports, Billing/RCM, Catalog/Configuration, System Health, Backup Readiness, and Go-Live Monitoring are covered. The source scanner covers the bounded Platform TSX inventory and fails for uncataloged user-facing literals. Typed EN/FR key parity and nonempty coverage pass. Exceptions are immutable identifiers/codes deliberately shown in `<code>`, proper names (`Medora`, `MSPP`, `RxNorm`), industry abbreviations (`NPI`, `RCM`, `ERA`, `MFA`), and server-provided operational data labels/details whose authoritative payload is not translation source content.

Five Platform web test files passed (43 tests), including exact catalog parity, domains/details, statuses/personas/risks/capabilities/operations, governed errors, source-literal coverage, persistence/document language, Intl date enforcement, and authority independence.

## Enterprise rule and legacy inventory
Every new Medora user-facing feature must ship English and French. Remaining non-Platform legacy conversion order: shared authentication/account UI; Facility Admin; Registration; legacy Billing/RCM; ED; Observation; Inpatient; remaining clinical domains; reports/analytics; patient-facing surfaces where applicable.

## Database and operations
Prisma schema changed: **NO**. Migration required: **NO**. Seed required: **NO**. No production access, bootstrap, staff provisioning, migration, seed, deployment, or merge occurred.
