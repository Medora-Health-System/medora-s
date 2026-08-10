# D4SEC.1C.5 implementation record

## Delivered routes

- `/platform`: authority-aware overview, accessible-domain summary, operational workspace cards, quick actions, and explicit absence of uncertified aggregate signals.
- `/platform/facilities`: safe directory (name, server-generated code, type, country/timezone, lifecycle); deferred health/go-live state.
- `/platform/staff`: persona filters, identity, lifecycle, classification date, authority-sensitive high-risk entry points.
- `/platform/security`: access/MFA guidance, complete privileged-request status filtering and one-time approval/execution controls, plus enterprise audit.
- `/platform/compliance`: audit entry and explicit deferred ROI/export/control modules.
- `/platform/billing`: bounded configuration-pending shell without financial totals or clinical authority.
- `/platform/catalog`: guarded links to existing catalog engines.
- `/platform/system`: guarded links to existing health/readiness/go-live workspaces and an explicit deferred aggregate.

## API layer

`src/lib/platform/api.ts` centralizes typed context, facilities, staff, capability, privileged-action, and audit clients through the existing same-origin BFF. Backend additions are `GET /platform/context` and `GET /platform/facilities`; both use `AuthGuard`, `PlatformCapabilitiesGuard`, explicit capability metadata, and the existing principal override.

## Security behavior

The provider mounts no platform child page until context authority is confirmed. Navigation and buttons are UX filtering only. APIs retain final control. Capability refresh replaces context rather than merging it, so revocation removes presentation access. Inactive staff and revoked/expired sessions are rejected by existing resolvers/JWT strategy. The audit reader uses only `/platform/audit/events`. Privileged rows omit session IDs and digest by contract.

## UX

The visual language uses a dark enterprise rail, restrained teal/gold risk accents, dense tables, consistent badges, skeleton loading, safe retry errors, deferred and empty states, native keyboard controls, responsive rails/grids, overflow-safe tables, and reduced-motion support.

## Persistence

No Prisma model changed. Migration required: **NO**. Migration command: not applicable. Production migration command: not applicable. Seed required: **NO**.
