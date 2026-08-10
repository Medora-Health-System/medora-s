# D4SEC.1C.5 Enterprise Platform Admin Dashboard — audit

## Verdict

**Proceed with a dedicated `/platform` workspace, reusing the certified authorities without changing their decisions.** The audit found no existing platform UI. The existing `/app/admin` family mixes tenant administration, facility configuration, clinical governance, billing, and a few platform-principal tools; it must remain available while platform entry points are consolidated rather than moved in this phase.

## Existing web experience

- The authenticated `/app` shell loads `/api/auth/me`, supports facility switching, role-filtered sidebar groups, responsive navigation, safe bootstrap/recovery states, and reusable cards, tables, badges, modals, page headings, and MFA panels.
- `/app/admin`, `/app/admin/users`, `/app/admin/audit`, `/app/admin/mfa`, and facility configuration are customer/facility routes and remain tenant-only. `/app/admin/system-health`, `backup-readiness`, `go-live`, medication/catalog governance, and billing governance are preserved as guarded existing destinations; platform pages link rather than copy their engines.
- The existing navigation uses role strings and `canCreateFacilities`; those remain legacy facility-shell concerns and are not reused as platform presentation authority.
- The existing BFF `/api/backend/[...path]` forwards authenticated requests and is reused. Platform components do not directly contact Nest or infrastructure providers.
- Reusable conventions: AppShell visual density, semantic tables, status chips, loading skeletons, inline errors, empty states, native forms/controls, focus-visible navigation, responsive horizontal tables, and MFA challenge routes.

## Certified backend authority and endpoint mapping

| Authority | Existing endpoint | Finding |
|---|---|---|
| D4SEC.1A principal | server `resolvePlatformAuthority` | Complete override requires active user, capability flag, and active assignment; never email alone. |
| Staff/capability read | `GET /platform/staff`, `/platform/staff/:id`, `/platform/capabilities` | Available, MFA-step-up protected. |
| Staff lifecycle | `/platform/staff/:id/{provision,activate,deactivate,persona}` | Available; principal/capability and recent-MFA rules vary by certified policy. |
| Capability grants | `POST/DELETE /platform/staff/:id/capabilities...` | Available; high-risk grant has principal policy, revoke is delegated and MFA-bound. |
| Dual control | `/platform/privileged-action-requests` and `/:id/{approve,reject,cancel,execute}` | Available; immutable scope digest and session IDs stay server-side. Safe list projection omits both. |
| Enterprise audit | `GET /platform/audit/events` | Available, principal-authorized, paginated safe projection. Customer `/admin/audit/events` is prohibited here. |
| Facility administration | `/admin/facilities` | Existing list mixes platform-principal and facility-admin semantics; mutation endpoints are principal-authorized. A minimum platform read projection is justified. |

## Gaps

### Minimal backend additions

- `GET /platform/context`: bounded authoritative presentation context containing only principal decision, active staff persona/lifecycle, and explicit active capabilities. This prevents React from implementing a second resolver.
- `GET /platform/facilities`: bounded safe facility directory guarded by facility platform capabilities or principal override. It does not expose clinical data.

### UI-only gaps implemented

Dedicated identity/shell; capability navigation; landing, facilities, staff, security, compliance, billing, catalog, and system pages; safe loading/error/empty/deferred states; dual-control request list; and enterprise audit rendering.

### Deferred API gaps

No authoritative aggregate dashboard metrics, platform facility health/go-live state, global RCM controls/totals, platform ROI monitor, export monitor, compliance-control API, unified system health, backup readiness, or go-live monitoring projection exists. The UI labels these unavailable and never fabricates metrics. Facility create/configure/activate delegation is not part of the currently certified privileged-action operation catalog, so this UI does not invent that workflow.

## Boundaries and consolidation

- Platform-only: `/platform/**`, `/platform/context`, `/platform/facilities`, staff/capability/privileged-action APIs, and enterprise audit.
- Tenant/customer-only: `/app/admin/audit`, users, facility-local MFA administration, facility billing identity/workflow, and all clinical/patient workspaces.
- Preserve existing guarded catalog/system destinations. Links do not transfer authority; destination backend and application guards still decide.
- Duplicated “admin” concepts should eventually be labeled as facility administration versus platform operations. This phase avoids disruptive route moves.
- No patient endpoint, clinical list, raw metadata, email identity, secret, token, session ID, or scope digest is requested by the platform shell.

## Migration and seed

Prisma schema change: **none**. Migration required: **NO**. Seed required: **NO**.
