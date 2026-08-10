# D4SEC.1C.3 preimplementation design

## Security invariants

Authority starts from immutable authenticated User.id. It requires an active User, active `MedoraStaffProfile`, active non-revoked grant, and active capability definition. Email, name, request role/facility, customer ADMIN, role strings, `canCreateFacilities`, and environment allowlists are excluded.

D4SEC.1A remains a centralized bootstrap exception: the existing authoritative platform principal may override capability guards only when decorator policy explicitly permits it. Mutating staff classification/grants is principal-only in this phase. Platform grants never participate in RolesGuard or clinical membership.

## Data design

* `MedoraStaffProfile`: durable classification, active lifecycle, classifier/deactivator User.id attribution and safe reasons.
* `PlatformCapability`: deterministic code, label, description, active state, and LOW/MODERATE/HIGH/CRITICAL risk level.
* `PlatformCapabilityGrant`: target, definition, active/revoked lifecycle, grant/revoke actor ids, timestamps, reason and optional ticket. Revoked rows are retained; a partial unique index permits at most one active target/code pair.
* All user relations use restrictive deletion. No facility FK exists because capability authority is global and a facility header must be inert.

## Catalog disposition

Implemented now means the engine or this minimal API consumes the code. Catalog-only means reserved, grantable metadata exists but no governed product endpoint consumes it. Deferred means no authority row is created.

* **Implemented now:** `STAFF_VIEW`, `STAFF_GRANT_CAPABILITIES`, `STAFF_REVOKE_CAPABILITIES` (resolver/guard semantics; grant/revoke remain principal-only until D4SEC.1C.4).
* **Catalog only:** `FACILITY_CREATE`, `FACILITY_CONFIGURE`, `FACILITY_ACTIVATE`, `FACILITY_HEALTH_VIEW`, `STAFF_PROVISION`, `SECURITY_ACCESS_VIEW`, `SECURITY_MFA_RECOVERY`, `SECURITY_PRIVILEGED_ACTIONS`, `SECURITY_AUDIT_VIEW`, `COMPLIANCE_AUDIT_VIEW`, `COMPLIANCE_ROI_MONITOR`, `COMPLIANCE_EXPORT_MONITOR`, `COMPLIANCE_CONTROLS_MANAGE`, `BILLING_RCM_VIEW`, `BILLING_RCM_MANAGE`, `CATALOG_CONFIG_VIEW`, `CATALOG_CONFIG_MANAGE`, `SYSTEM_HEALTH_VIEW`, `SYSTEM_BACKUP_READINESS_VIEW`, `SYSTEM_GOLIVE_MONITOR`, `AUDIT_EXPORT`.
* **Deferred:** all clinical/PHI/support-access capabilities and staff personas. No chart/patient/encounter/note/medication/order/result capability is defined.

## High-risk follow-on policy

HIGH should require MFA enabled before grant activation; CRITICAL should require MFA enabled, recent verification, ticket/reference, and preferably dual approval. `STAFF_PROVISION`, grant/revoke, facility activation/create, MFA recovery, privileged security, compliance-control management, RCM management and audit export are strongest candidates. D4SEC.1C.3 stores risk and ticket fields but deliberately defers step-up/approval orchestration to D4SEC.1C.4.
