# D4SEC.1C.5B Platform staff bootstrap and localization audit

## Verdict and repository-grounded root cause
The D4SEC.1A resolver requires the active immutable user, `canCreateFacilities`, and an active `MEDORA_SUPER_ADMIN` assignment together. Email, a role string alone, facility administration, and either condition alone do not confer authority. D4SEC.1C.4C correctly lets that principal request `STAFF_PROVISION`, but approval requires a separately active staff grant of `PRIVILEGED_ACTION_APPROVE`; the state machine rejects requester equals approver and target equals approver. There was no initial-governance completion endpoint or principal-only first-approver workflow. With zero independent holders, no valid second actor could approve and execute the first request: this is the deadlock.

Existing direct principal staff methods predate the dual-control request UI. They are not used for bootstrap because they do not provide the one-time closure/concurrency invariant.

## Authoritative design proof
The narrow operation is server-selected `COMPLIANCE_SECURITY` plus exactly `COMPLIANCE_AUDIT_VIEW`, `COMPLIANCE_EXPORT_MONITOR`, `COMPLIANCE_ROI_MONITOR`, `SECURITY_ACCESS_VIEW`, `SECURITY_AUDIT_VIEW`, and `PRIVILEGED_ACTION_APPROVE`. It grants no staff mutation, facility, billing, system, clinical role, membership, or super-admin authority.

Eligibility is: authenticated complete D4SEC.1A principal; active principal; valid non-revoked, unexpired `AuthSession` matching JWT `sid`; database session MFA not older than `MFA_STEP_UP_MAX_AGE_SECONDS` (default 300 seconds); no completed bootstrap audit marker; no active user with an active staff profile and active approval grant; distinct active target; target exists and has no staff profile; nonempty validated reason and ticket. Client bootstrap flags and MFA claims are absent from the input.

A PostgreSQL transaction-scoped advisory lock serializes the global predicate. Closure is the immutable completed audit marker OR an authoritative eligible approver, recomputed under lock. Thus concurrency cannot produce two first approvers and later deactivation cannot reopen the one-time operation. Started, mutations, lifecycle, grants, and completed audit evidence share one transaction; an audit write failure rolls everything back. Denials emit `PLATFORM_GOVERNANCE_BOOTSTRAP_DENIED`. Evidence contains immutable actor/target IDs, persona, exact codes, reason, ticket, and result—never secrets, tokens, MFA proof, credentials, authorization headers, or PHI.

## Localization audit
No general i18n dependency or authoritative user preference existed. The smallest compatible reusable architecture is typed source catalogs plus a client provider. Locale is `en` or `fr`, defaults to `en`, persists in localStorage and a SameSite cookie, updates `document.documentElement.lang`, never enters auth state, and leaves routes stable. `Intl.DateTimeFormat` supplies locale-aware presentation. Canonical backend enums/codes remain unchanged; display keys use `persona.*`, `capability.*`, `operation.*`, and `error.*`.

Namespaces are `common`, `auth`, `navigation`, `platform`, `facilities`, `staff`, `security`, `compliance`, `billing`, `catalog`, `system`, and reserved `clinical`. Catalog parity is tested. New user-facing strings must use catalog keys or document a temporary exception.

## Remaining inventory and sequence
The complete Platform Admin tree is covered by the typed catalog and bounded Platform source-literal bridge, including detail screens, projections, canonical display values, governed errors, accessibility attributes, and locale-aware dates. A source scanner prevents uncataloged Platform user-facing literals. Remaining non-Platform rollout order is shared authentication/account UI; Facility Admin; Registration; legacy Billing/RCM; ED; Observation; Inpatient; remaining clinical domains; reports/analytics; and patient-facing surfaces. No clinical conversion or authority change is made here.

## Database and seed
No Prisma schema change, migration, or seed is required. Closure derives from existing `AuditLog`, profile, capability and grant state. Translation catalogs are source assets. **Seed: NO.**
