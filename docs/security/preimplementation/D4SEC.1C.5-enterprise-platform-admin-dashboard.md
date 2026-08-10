# D4SEC.1C.5 preimplementation plan

## Information architecture

`/platform` owns Overview, Facilities, Medora Staff, Security, Compliance, Billing / RCM, Catalog / Configuration, and System Operations. It is outside `/app` so global Medora work cannot be confused with a selected customer facility.

## Authorization plan

The route first calls `GET /platform/context`. Until it succeeds, privileged content and downstream requests remain unmounted. A 401 returns to login; 403 returns to the safe care workspace. The response is refreshed after authoritative mutations. Platform-principal authority exposes every area; otherwise explicit capabilities expose areas/actions. Persona only changes explanatory emphasis and ordering, never access.

| Navigation | Any explicit capability |
|---|---|
| Facilities | `FACILITY_CREATE`, `FACILITY_CONFIGURE`, `FACILITY_ACTIVATE`, `FACILITY_HEALTH_VIEW` |
| Medora Staff | `STAFF_VIEW`, `STAFF_PROVISION`, `STAFF_GRANT_CAPABILITIES`, `STAFF_REVOKE_CAPABILITIES` |
| Security | `SECURITY_ACCESS_VIEW`, `SECURITY_MFA_RECOVERY`, `SECURITY_PRIVILEGED_ACTIONS`, `SECURITY_AUDIT_VIEW`, `PRIVILEGED_ACTION_APPROVE` |
| Compliance | `COMPLIANCE_AUDIT_VIEW`, `COMPLIANCE_EXPORT_MONITOR`, `COMPLIANCE_ROI_MONITOR`, `COMPLIANCE_CONTROLS_MANAGE` |
| Billing | `BILLING_RCM_VIEW`, `BILLING_RCM_MANAGE` |
| Catalog | `CATALOG_CONFIG_VIEW`, `CATALOG_CONFIG_MANAGE` |
| System | `SYSTEM_HEALTH_VIEW`, `SYSTEM_BACKUP_READINESS_VIEW`, `SYSTEM_GOLIVE_MONITOR` |

## Persona presentation matrix

Implementation emphasizes facilities/catalog/go-live; Support emphasizes facility/staff/system health; Billing Operations emphasizes billing; Compliance/Security emphasizes security/compliance/audit; Platform Operations emphasizes facilities/system. Explicit capability intersection always wins. Platform principal sees all domains.

## Privileged-action design

Request and decision screens describe exact operation, target, capability/persona, reason, ticket, requester, expiry, and status. Only the safe backend projection is rendered. Approval is visually high-risk. Backend denial is displayed verbatim when it is a stable policy code; recent-MFA denial maps to step-up guidance. React does not reproduce transition, self-approval, replay, expiry, or scope-integrity policy.

## Data minimization and availability

No global counts are computed from downloaded lists. No patient data is called. Missing monitoring/control APIs render “Not yet available.” No schema or seed is planned.
