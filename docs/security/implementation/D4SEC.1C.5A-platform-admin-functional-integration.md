# D4SEC.1C.5A implementation record

## Final implementation verdict

**FUNCTIONALLY COMPLETE FOR AUTHORITATIVE PLATFORM-SAFE OPERATIONS; CI VALIDATION PENDING.** No clinical workflow file was modified.

## Operational functions

- Authoritative platform-aware landing, safe platform redirects, care/platform workspace switch, and shared Medora wordmark.
- Facility name/code/country/type search, status filter, create, bounded detail, language, type/service/care configuration, billing identity, billing workflow, departments, and dual-controlled activation/deactivation.
- Eligible-user search, Medora staff list/detail, persona/lifecycle history, privileged provisioning and capability grants, immediate authority-reducing revoke, and lifecycle operations under existing policy.
- Reusable session-bound authenticator step-up with HttpOnly replacement token and exactly one operation retry.
- Privileged create/view/approve/reject/cancel/execute for `STAFF_PROVISION`, `STAFF_GRANT_CAPABILITY`, `FACILITY_ACTIVATION_CHANGE`, and `MFA_RESET`.
- Dedicated typed System Health, Backup Readiness, and Go-Live views with explicit facility selection.
- Enterprise audit, compliance coverage/risk signals, export monitoring, PHI-free ROI aggregate, and catalog classification audit.
- Facility-scoped billing governance, claim-submission queue, and Payments/ERA queue under `BILLING_RCM_VIEW`; no fabricated global totals or global chart fetch.
- Clear Facility Users versus Medora Staff boundary. Existing facility user, medication-governance, import, analytics, and clinical-rule tools retain their current facility/role guards.

## Endpoints

New or completed platform endpoints: `POST /platform/facilities`; `GET /platform/facilities/:id`; `GET/PATCH /platform/facilities/:id/configuration|language|service-config|billing-identity|billing-workflow`; `GET /platform/eligible-users`; `GET /platform/security/users`; and `GET /platform/operations/system-health|backup-readiness|go-live|compliance|exports|billing|claims|payments|catalog-audit|roi`. The existing `/platform/privileged-action-requests` state machine now accepts the two additional certified operations. The existing backend `POST /auth/mfa/step-up` remains the only step-up implementation.

## Persisted-state change

Prisma schema changed: **YES**. Migration: `20261105120000_d4sec_1c5a_facility_activation_dual_control`. It adds a restrictive optional Facility target, makes User target optional, enforces exactly one target, and adds the two operation enum values. No seed was added.

## Authority-bound dispositions

No platform-native mutation adapter is added for facility Users & Access, medication governance/import, or enterprise clinical rules because their existing guards express facility/clinical authority and platform capability must not imply RolesGuard authority. MSPP administration remains independent for the same reason. These functions are reachable contextually by dual-authority users; they are not represented as platform-authorized operations.

No production access, migration, seed, cleanup, staff mutation, deployment, or merge occurred.
