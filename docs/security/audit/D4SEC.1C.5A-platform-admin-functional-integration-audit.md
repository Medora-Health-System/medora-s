# D4SEC.1C.5A Platform Admin functional-integration audit

## Verdict and security boundary

**AUDIT PASS — implementation may proceed.** There is one authoritative staff system (`User` plus
`MedoraStaffProfile` and `PlatformCapabilityGrant`), one complete-principal resolver
(`resolvePlatformAuthority`), a session-bound TOTP step-up endpoint, and an immutable privileged-action
state machine. No P0 conflict exists. Existing platform capabilities, rather than email, facility
membership, `MEDORA_SUPER_ADMIN`, or `canCreateFacilities`, must gate every new platform projection.

The audit was performed before runtime changes using repository-wide route, controller, service, page,
schema, and test searches. The integration rule is: adapters may call existing authoritative services;
platform capability guards remain at the HTTP boundary; facility APIs retain their existing customer
administrator behavior; platform authority never implies clinical `RolesGuard` authority.

## Legacy-function inventory

### Facilities

`AdminFacilitiesController` exposes `POST /admin/facilities`, `GET /admin/facilities`,
`PATCH /admin/facilities/:id`, language and service-config patches, billing identity/workflow reads and
writes, and department reads. `AdminFacilitiesService` is authoritative for creation and lifecycle,
delegates billing identity to `BillingIdentityService`, workflow to `FacilityBillingWorkflowService`, and
derives service-line/care-profile capabilities with shared resolvers. Creation, language, activation and
service configuration are complete-principal-only in the service. Directory/billing/departments permit
the complete principal or a target-facility `ADMIN`; therefore direct reuse from platform staff is unsafe.
The existing `/platform/facilities` directory is a bounded global projection, capability-gated, but has
no mutation/detail adapter.

### Users, staff, and MFA

`AdminUsersController`/`AdminUsersService` are facility membership administration and are not a safe
eligible-user source globally. `PlatformStaffService` is authoritative for profiles, persona lifecycle,
explicit grants and bounded profile projections. A new bounded eligible-user query must be implemented
there, excluding secrets and inactive/existing staff. Principal-only direct provision/persona/grant routes
are retained for break-glass authority; delegated creation must use `PrivilegedActionService` operations
`STAFF_PROVISION` and `PLATFORM_CAPABILITY_GRANT`. Deactivation and revoke are authority-reducing,
capability-gated, recent-MFA operations. Account password/MFA-reset and session operations remain separate
security administration and are not projected in this slice.

`POST /auth/mfa/step-up` validates authenticator TOTP under the current JWT/session, rejects recovery
codes, and records server-side session assurance. Existing enrollment/challenge panels are pre-session
flows, not safely reusable as-is; the platform should share their input conventions but call the one
authoritative step-up endpoint and retry once without persisting the code or an assurance timestamp.

### Login, navigation, and brand

`apps/web/app/login/page.tsx` currently passes only `facilityRoles` and `msppRoles` to
`landingRoute.ts`; it cannot know effective platform authority. The safe minimal fix is to query
`GET /platform/context` after the authenticated session is issued: success establishes server-authoritative
entry; 403 preserves existing facility landing. Platform redirect strings are accepted only after that
success. The care shell likewise must query context before displaying a workspace switch.

The existing product brand treatment is the `Medora`/`-S` wordmark used on the login screen and main
shell header. No separate logo file/component exists. The platform must extract and reuse that exact
wordmark component, replacing its custom boxed `M`.

### Security and privileged actions

`PrivilegedActionController` supports create, list, detail, approve, reject, cancel, and execute under
`PlatformCapabilitiesGuard`. `PrivilegedActionService` enforces operation allowlisting, immutable scope,
expiry, requester/target/self-approval prohibitions, distinct approval, approval-session and execution-
session recent MFA, and one-time execution. Only `STAFF_PROVISION` and
`PLATFORM_CAPABILITY_GRANT` are executable. The UI must never call direct provision/grant for delegated
actors.

### System operations, compliance, billing, and catalogs

The legacy System Health, Backup Readiness, ROI Monitoring, Compliance, Export Monitoring, catalog audit,
and go-live controllers use `RolesGuard` and legacy role sets. Platform staff have capabilities but do not
receive clinical roles, explaining the legacy pages' failed API loads (and their app route gate additionally
expects `MEDORA_SUPER_ADMIN`). The real services are reusable only through capability-gated, bounded
platform adapters. Go-live is facility-scoped and requires explicit facility selection; the other listed
read models are aggregate operational projections. Retry/test-alert/mutations remain unprojected unless a
matching platform manage capability and risk policy exist.

ROI chart disclosure itself is **FACILITY-ONLY** and contains PHI. ROI monitoring summary is **NEEDS
PLATFORM PROJECTION**. Enterprise audit is **PLATFORM-SAFE NOW**. Export monitoring and compliance summary
are **NEEDS PLATFORM PROJECTION**. Billing governance summary is facility/clinical-role scoped and
**NEEDS PLATFORM PROJECTION**; claims/charts must not be globally fetched. Billing identity/workflow are
**FACILITY-ONLY through legacy API, adaptable through selected-facility platform configuration**. Medication
master, controlled import, procedure catalogs and enterprise clinical rules are real engines but legacy
role/facility gated; they require explicit facility context or a capability adapter and must not be linked
as though platform-native.

### Fixture cleanup

No production data was accessed. Test-like naming exists in e2e/seed helpers, but a name is evidence only,
never deletion authority. A dry-run candidate projection must count roles/users, encounters, patients,
orders, audit records, billing records, departments, configuration and restrictive references. Any audit
history or business/clinical reference yields `SAFE_TO_DEACTIVATE_ONLY` or `RETAIN`; `SAFE_TO_DELETE` is
possible only with every dependency count zero and still requires a separate explicitly authorized action.
This PR will not add or invoke destructive production cleanup.

## Complete function reuse matrix

| Platform function | Current `/platform` | Legacy UI | Existing API | Authoritative service | Current authorization | Target authorization | Decision | Slice |
|---|---|---|---|---|---|---|---|---|
| Landing/redirect | absent | login | auth login/me | Auth + capability resolver | facility/MSPP-derived UI | successful server platform context | ADAPT | A |
| Care workspace entry | absent | app shell | `/platform/context` | PlatformStaffService/resolver | none | real platform authority only | BUILD UI | A |
| Brand | custom `M` | login/main wordmark | n/a | shared web component | n/a | n/a | REUSE | A |
| Facility search/filter | list only | facilities admin | `GET /platform/facilities` | PlatformStaffService | any facility capability | same | BUILD UI | B |
| Create facility | missing | facility admin | `POST /admin/facilities` | AdminFacilitiesService | complete principal | `FACILITY_CREATE`, governed adapter | ADAPT | B |
| Facility detail | missing | facility admin | partial admin reads | AdminFacilitiesService | principal/target ADMIN | facility view/config capabilities | ADAPT | B |
| Language/service config | missing | facility admin | admin language/service patches | AdminFacilitiesService | complete principal | `FACILITY_CONFIGURE` + MFA | ADAPT | B |
| Billing identity/workflow config | missing | facility admin | admin billing reads/patches | BillingIdentity/FacilityBillingWorkflow | principal/target ADMIN | selected facility + `FACILITY_CONFIGURE` | ADAPT | B |
| Departments | missing | user admin | admin departments read | AdminFacilitiesService | principal/target ADMIN | bounded selected facility | ADAPT | B |
| Activate/deactivate | missing | facility admin | admin facility patch | AdminFacilitiesService | complete principal | `FACILITY_ACTIVATE` + high-risk/MFA | ADAPT | B |
| Facility health/go-live | placeholder | go-live | admin readiness | GoLiveReadinessService | legacy roles + facility header | health/go-live capability + explicit facility | ADAPT | B/F |
| Step-up | raw error | MFA panels | `POST /auth/mfa/step-up` | MFA service/session store | authenticated session | unchanged | REUSE | C |
| Staff list/search | list/persona filter | none | `GET /platform/staff` | PlatformStaffService | `STAFF_VIEW` + MFA | unchanged | ADAPT UI | D |
| Eligible-user search | missing | facility users (unsafe) | none safe | PlatformStaffService/Prisma | none | `STAFF_PROVISION` + MFA | BUILD projection | D |
| Staff detail/history | button inert | none | `GET /platform/staff/:id` | PlatformStaffService | `STAFF_VIEW` + MFA | unchanged | REUSE | D |
| Provision | link only | none | privileged request create | PrivilegedActionService | delegated capability + MFA | unchanged dual control | REUSE | D/E |
| Persona change | missing | none | direct principal route | PlatformStaffService | complete principal | retain principal path; delegated support deferred | REUSE | D |
| Grant capability | link only | none | privileged request create | PrivilegedActionService | capability + MFA + dual control | unchanged | REUSE | D/E |
| Revoke capability | missing | none | DELETE platform staff grant | PlatformStaffService | revoke capability + MFA | unchanged immediate reduction | REUSE | D |
| Staff activate/deactivate | missing | none | platform lifecycle endpoints | PlatformStaffService | principal / provision capability + MFA | unchanged | REUSE | D |
| Privileged create/view | explanatory only | none | platform request endpoints | PrivilegedActionService | certified capability guard | unchanged | REUSE | E |
| Approve/reject/cancel/execute | partial approve/execute | none | platform request endpoints | PrivilegedActionService | certified state machine + MFA | unchanged | REUSE | E |
| Enterprise audit | working | audit | `/platform/audit/events` | PlatformAuditService | audit capabilities | unchanged | REUSE | E/G |
| System health | legacy link | system health | `/admin/system-health` | SystemHealthService | legacy role | `SYSTEM_HEALTH_VIEW` projection | ADAPT | F |
| Backup readiness | legacy link | backup readiness | `/admin/backup-readiness` | BackupReadinessService | legacy role | `SYSTEM_BACKUP_READINESS_VIEW` projection | ADAPT | F |
| Go-live monitoring | legacy link | go-live | `/admin/go-live-readiness` | GoLiveReadinessService | legacy role + facility | `SYSTEM_GOLIVE_MONITOR`, explicit facility | ADAPT | F |
| ROI monitoring | placeholder | ROI monitoring | admin summary | Admin ROI service | platform operator role | `COMPLIANCE_ROI_MONITOR`, PHI-free projection | ADAPT | G |
| Chart disclosure/ROI | placeholder | facility ROI | ROI endpoints | ChartRoiService | facility clinical roles | facility-only; no global projection | REUSE only in care | G |
| Export monitoring | placeholder | exports | admin export monitoring | AdminExportMonitoringService | platform operator role | `COMPLIANCE_EXPORT_MONITOR`, bounded read | ADAPT | G |
| Compliance controls | placeholder | compliance | admin compliance | AdminComplianceService | platform operator role | appropriate compliance capabilities | ADAPT reads | G |
| Billing governance | placeholder | billing governance | admin summary | AdminBillingGovernanceService | facility billing/admin | `BILLING_RCM_VIEW`, aggregate/no charts | ADAPT | H |
| Billing facility config | missing | facility admin | facility billing endpoints | billing identity/workflow services | principal/target ADMIN | selected facility + billing manage/configure | ADAPT | H |
| External billing export | placeholder | billing workspace | billing export endpoints | ExternalBillingExportService | facility billing roles | remain facility-only | REUSE in care | H |
| Medication master | legacy link | medication master | medication master APIs | catalog services | legacy roles/facility | explicit facility and catalog capability | ADAPT selector | I |
| Catalog import | legacy link | catalog import | controlled import APIs | ControlledCatalogImport services | legacy roles | catalog-manage adapter required | ADAPT | I |
| Clinical rules | legacy link | enterprise rules | existing rules APIs | existing rules engine | legacy roles/facility | explicit facility + catalog capability | ADAPT selector | I |
| Fixture audit | absent | none | none | Prisma bounded counts | none | platform principal, dry-run only | BUILD | J |

## Initial implementation constraints (superseded where noted below)

No seed is required. Direct global chart access, destructive fixture cleanup, export retries, system test
alerts, MFA secret/recovery display, and global clinical catalog mutations remain prohibited. The completion
pass proved a narrow schema change was required to represent a Facility—not a User—as the immutable target
of the already-required CRITICAL activation workflow; that justification and exact migration are documented
in the addendum below.

## Completion-pass addendum

The completion pass re-audited the previous deferrals under the hard clinical freeze.

- Facility language, service/care profile, billing identity, billing workflow, and department projection all have reusable `AdminFacilitiesService` business logic. Platform adapters now call that logic only after `FACILITY_CONFIGURE` plus recent-MFA enforcement; legacy admin controllers still execute their original service authorization.
- `FACILITY_ACTIVATE` is catalogued as CRITICAL. A genuine persisted target gap existed because privileged requests previously required a User target. The additive `targetFacilityId` relation and `FACILITY_ACTIVATION_CHANGE` operation provide immutable facility/state scope, 15-minute expiry, distinct approval, fresh requester/approver sessions, authority revalidation, one-time claim, and reuse of the facility lifecycle mutation.
- `SECURITY_MFA_RECOVERY` is CRITICAL. `MFA_RESET` now uses the same dual-control state machine and the existing reset mutation, including session revocation and secret-field clearing; no secret or recovery code is projected.
- System Health, Backup Readiness, and Go-Live are facility-scoped authoritative services. Dedicated platform pages now render status, checks, details, and selected-facility context instead of JSON.
- ROI already had a PHI-free aggregate implementation in `AdminRoiMonitoringController`; the platform adapter reproduces only that existing count projection and audit event. Patient-specific ROI remains facility/purpose scoped.
- Compliance, export monitoring, catalog classification audit, billing governance, claims, and payments have real services. Read-only, explicitly selected-facility adapters now gate them with their matching platform view capability.

### Catalog classifications

| Function | Classification | Completion disposition |
|---|---|---|
| Catalog classification audit | A — GLOBAL PLATFORM-SAFE data with facility usage context | Native platform projection, explicit facility |
| Medication master/governance/RxNorm/high-risk review/inventory staging | B — FACILITY-SCOPED ADMIN or global engine with facility-role guard | Contextual link; existing role guard retained |
| Catalog and procedure import | B — FACILITY-SCOPED ADMIN | Contextual link to controlled dry-run/commit engine; existing guard retained |
| Enterprise clinical rules administration | B/C — FACILITY ADMIN over a clinical engine | Contextual link only; clinical engine untouched |
| Order-set and medical-exam analytics | B — FACILITY-SCOPED ADMIN | Contextual link only; existing guard retained |
| Patient order catalog and clinical execution | C — CLINICAL-ONLY | Not globalized |
| Medication/order/MAR clinical mutation | D — UNSAFE TO GLOBALIZE | Not integrated and not modified |

### Remaining unavoidable gaps

There are no `NOT YET AVAILABLE`, `Deferred`, or `configuration pending` states in `/platform`. Facility-user administration and mutation-heavy catalog tools remain contextual care-workspace links because no platform capability independently grants facility `ADMIN`/clinical RolesGuard authority. MSPP access remains independent; the existing MSPP administration route retains its own resolver and is not projected as platform capability authority. These are authority boundaries, not decorative placeholders.
