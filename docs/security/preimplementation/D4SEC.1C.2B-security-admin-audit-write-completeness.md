# D4SEC.1C.2B preimplementation audit — security-admin audit writes

## Audit-first findings

The requested parent `docs/security/audit/D4SEC.1C.2-security-sensitive-admin-audit-completeness.md` is not present on the audited base (merge commit `36ca9db`); the D4SEC.1C.2A implementation and certification are present. `AuditLog.facilityId` is nullable, so global events can be represented without a fake facility and no schema change is needed. `AuditService.log` already accepts a Prisma transaction client and rethrows transaction writes, providing a safe atomic primitive. The actor FK retention concern remains deferred.

### Priority findings

* **P0:** global identity/status, password reset, facility role changes, facility activation, and MSPP authority writes were missing required atomic authoritative audit rows.
* **P0:** MFA reset mutated sessions and the user in separate commits before a non-transactional audit.
* **P1:** security metadata had no explicit fail-closed forbidden-key boundary.
* **P1:** cross-tenant/inactive target denials returned tenant-safe not-found without a security denial event.
* **P2:** ordinary language, care-profile, billing workflow/identity, catalog, retry, and test-alert operations are not all security events; existing domain audit behavior remains unchanged to prevent severity flooding.

## Authoritative mutation matrix (before implementation)

| Class | Endpoint / service | Target | Before coverage | Success | Denial | Actor / facility / entity | Safe evidence | Severity | Atomicity | Classification / remediation |
|---|---|---|---|---|---|---|---|---|---|---|
| Global identity | `PATCH /admin/users/:id`, `updateProfile` | `User` names/email | none | missing | global denial partial | authenticated ID / global / user | none | HIGH | mutation only | MISSING; add atomic event |
| Global identity | `PATCH /admin/users/:id/status`, `updateStatus` | `User.isActive` + roles | none | missing | global denial partial | authenticated ID / global / user | none | CRITICAL | mutation transaction only | MISSING; add event in transaction |
| Facility authority | `PATCH /admin/users/:id/roles`, `updateRoles` | facility `UserRole` set/departments | none | missing | boundary partial | ID / selected facility / user | none | HIGH | role transaction; follow-up user write | UNSAFE; combine and audit |
| User creation | `POST /admin/users`, `create` | user + facility roles | none | missing | ordinary validation only | ID / selected facility / user | none | HIGH | mutation transaction | PARTIAL; add one event |
| Password/session | `PATCH /admin/users/:id/password`, `resetPassword` | credential + sessions | none; sessions not revoked | missing | global denial partial | ID / global / user | none | CRITICAL | non-atomic | UNSAFE; revoke and audit together |
| MFA | `POST /admin/mfa/reset`, `MfaService.adminReset` | MFA fields + sessions | unsafe metadata convention | present | boundary/protected denial partial | ID / actor context / user | counts/roles | CRITICAL | three independent writes | UNSAFE; combine + safe helper |
| Platform authority | no grant/revoke or `canCreateFacilities` mutation route | `User` platform authority | N/A | N/A | tenant role assignment blocked | ID / facility / user | reason | CRITICAL/HIGH | denial audit best effort/fail closed config | COMPLETE for absence; preserve block |
| Facility creation | `POST /admin/facilities`, `create` | facility + owner ADMIN | direct row | present | unaudited unauthorized attempt | ID / created facility / facility | profile/service lines | HIGH | atomic | PARTIAL; normalize helper |
| Facility active | `PATCH /admin/facilities/:id`, `setFacilityActive` | `Facility.isActive` | none | missing | ordinary platform denial | ID / facility / facility | none | CRITICAL | non-atomic audit absent | MISSING; add atomic event |
| Facility security config | `PATCH .../service-config` | care/access capabilities | direct row | present | ordinary scope denial | ID / facility / facility | semantic profile | HIGH | atomic | COMPLETE; retain |
| Facility language | `PATCH .../language` | language only | none | none | ordinary scope denial | — | — | routine | mutation only | not security-sensitive |
| Billing/pro identity | user/facility billing identity/workflow patches | credential-adjacent identifiers/config | no dedicated security audit | none | boundary for global user billing | varies | values could be sensitive | MEDIUM | delegated services | DEFER: parent audit absent; do not misclassify ordinary billing |
| MSPP | `POST /admin/mspp-access/assignments` | MSPP assignment | none | missing | platform principal protection unaudited | ID / global / assignment | role/scope | HIGH | non-atomic audit absent | MISSING; add atomic grant |
| MSPP | `PATCH /admin/mspp-access/assignments/:id` | role/scope/active | none | missing | protected target unaudited | ID / global / assignment | before/after | HIGH | non-atomic | MISSING; add atomic changed/revoked |
| MSPP onboarding | `POST /admin/mspp-access/onboard` | user identity/credential + MSPP grant | none | missing | protected target denial | ID / global / user+assignment | unsafe risk from password | CRITICAL | multiple commits | UNSAFE; remains a separately documented blocker below |
| Break-glass | patient break-glass start/end and material-use helper | session/patient access | existing start/access/end | present | ordinary authorization denial not flooded | ID / facility / session | reason-presence/use context | CRITICAL | start/end audit uses same tx | COMPLETE; certify, do not rewrite |
| Other admin routes | catalog classification, export retry, test alert | operational | domain-specific or none | existing | routine | contextual | domain data | MEDIUM/routine | varies | out of security-admin scope |

## Implementation boundary

Implement a small helper over `AuditService`, atomic writes for the listed P0 paths, deterministic high-risk boundary denials, and tests. Do not modify schema, migrations, seeds, read redaction, authorization decisions, break-glass design, production, or staff capability modeling.
