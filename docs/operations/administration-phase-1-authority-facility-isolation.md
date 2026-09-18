# Administration Phase 1 — authority, facility isolation, and functional architecture

Status: implementation baseline for the administration production program.

## Scope

This phase is the authority and tenant-isolation foundation for Hospital Operations, Facility Administration, and Medora Platform Operations. Internal Medora billing is explicitly excluded.

## Authoritative scope classes

| Surface | Route | Scope | Authority source |
| --- | --- | --- | --- |
| Users & access | `/app/admin/users` | FACILITY | active facility membership; service must authorize the actor against the selected facility |
| Operations audit | `/app/admin/audit` | FACILITY | active facility membership; query must constrain `AuditLog.facilityId` |
| ED operational reports | `/app/reports/**` | FACILITY | active facility membership; report query must constrain facility |
| Go-live readiness | `/app/admin/go-live` | FACILITY | active facility membership; readiness snapshot is generated for one facility |
| Enterprise workflow | `/app/admin/enterprise-workflow` | FACILITY | authenticated clinical facility; workflow/encounter data may not cross it |
| Clinical rules | `/app/admin/enterprise-clinical-rules` | FACILITY | authenticated clinical facility; rule catalog and mutations belong to one facility |
| Revenue Cycle | `/app/admin/revenue-cycle/**` | FACILITY | authenticated facility; operational RCM only in this production program |
| Integrations | `/app/admin/integrations/**` | PLATFORM_WITH_FACILITY_BINDINGS | database-backed Medora platform authority; integrations may bind one or more facilities |
| Facility configuration | `/app/admin` facility console | FACILITY | selected facility plus facility-admin authorization |
| Medora Platform Operations | `/platform/**` | PLATFORM | platform principal/capabilities; facility ADMIN alone never grants platform authority |

## Facility-context contract

1. A facility-scoped request MUST fail closed when no facility context exists.
2. A client-supplied facility selector is not authorization. Services that expose facility administration MUST validate the actor's active authority for that facility adjacent to the data query/mutation.
3. A facility-scoped data query MUST include the authorized facility in its database predicate, or load an owning object through a facility-constrained relation.
4. Cross-facility identifiers supplied in route/body/query data MUST NOT override the authorized facility.
5. Facility A ADMIN -> Facility A is allowed only when active authority exists. Facility A ADMIN -> Facility B is denied.
6. MEDORA_SUPER_ADMIN/platform identity does not implicitly turn a facility endpoint into an enterprise reader. Platform-wide reads use `/platform/**` and platform capabilities.
7. Integration administration remains platform-only. Facility bindings are resources governed by the integration, not permission for facility ADMIN to administer platform credentials.
8. Clinical workflow and clinical-rule routes use the authenticated clinical facility from JWT. They MUST NOT accept an arbitrary browser facility header as a substitute for clinical context.
9. Mutations with security, clinical, export, configuration, or revenue significance must retain an auditable actor and facility/resource scope.
10. UI route visibility is convenience only. Backend authorization is authoritative.

## Phase 1 inventory findings

### Already strong

- Admin users call `assertFacilityAdminFacilityScope` before facility reads/creates and use mutation-boundary checks for target-user changes.
- Customer operations audit validates the active facility, calls `assertFacilityAdminFacilityScope`, and constrains `AuditLog.facilityId`.
- Go-live readiness is requested for a facility and the controller requires facility context.
- ED reports pass a facility into report services and CSV export audit records include the facility.
- Revenue Cycle clients explicitly pass `facilityId`.
- Integration administration uses `PlatformIntegrationAdminGuard`, backed by `resolvePlatformAuthority`.
- Enterprise workflow and clinical rules take clinical facility context from JWT rather than browser-selected headers.

### Phase 1 hardening requirements

- Administration controllers currently repeat facility extraction. Repeated extraction is acceptable only when paired with service-level authority. Later phases should converge on a shared fail-closed facility-authority helper rather than treating `x-facility-id` as proof.
- ED report controllers currently select facility context but the controller itself does not establish active facility-admin membership adjacent to the report call. Phase 3 must certify that authorization at the service/query boundary and add cross-facility E2E coverage.
- Go-live controller selection is not itself authorization; Phase 4 must certify service-level active-facility authority and every readiness dependency.
- Workflow/rules APIs intentionally use JWT facility context. Platform operators must enter an explicit clinical/facility context before using these engines; platform authority alone must not bypass clinical tenancy.
- Administration landing currently composes facility configuration, the facility control panel, and a legacy dashboard. Phase 7 should remove semantic duplication after route ownership is certified.
- Integration facility assignment must continue to use the platform facility directory and must never be widened to ordinary facility ADMIN.
- Internal billing remains out of scope. Revenue Cycle operational surfaces are in scope, but this program does not redesign Medora internal billing.

## Required isolation test matrix

Every facility-scoped administration service must ultimately demonstrate:

| Actor/context | Target A | Target B |
| --- | --- | --- |
| Facility A ADMIN, active A | ALLOW | DENY |
| Facility B ADMIN, active B | DENY | ALLOW |
| inactive/revoked facility assignment | DENY | DENY |
| authenticated user without ADMIN authority | DENY | DENY |
| platform operator without selected clinical/facility context | no implicit facility read | no implicit facility read |

Platform operations must separately demonstrate that facility `ADMIN` cannot acquire platform capabilities, enterprise audit, integration credentials, global facility administration, or privileged actions.

## Exit criteria

Phase 1 is complete when this scope contract is repository-visible, protected by automated architecture tests, and the eight production phases use it as the review baseline. Functional gaps identified above are assigned to their owning hardening phases; no later phase may weaken these boundaries.
