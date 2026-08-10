# D4SEC.1C.4B implementation

## Models

`MedoraStaffPersona` enumerates `IMPLEMENTATION`, `SUPPORT`, `BILLING_OPERATIONS`, `COMPLIANCE_SECURITY`, and `PLATFORM_OPERATIONS`. `MedoraStaffProfile.persona` is current classification (nullable only for historical 1C.3 rows). Current authority state remains `isActive`. `MedoraStaffLifecycleEvent` is append-only transition attribution. `PlatformCapabilityGrant.provenance` is `MANUAL` or `PERSONA`; a database constraint requires `managedPersona` exactly for persona grants.

## Operations

`POST /platform/staff/:id/provision`, `/activate`, `/deactivate`, and `/persona` validate strict Zod bodies and use `RequirePlatformPrincipal`, which also requires recent session-bound MFA. Provision requires an existing active immutable User ID. Activation reconciles. Deactivation leaves grants/history intact. Persona change only revokes obsolete persona-managed rows. Each operation writes exactly one required lifecycle audit event and one lifecycle-history row in its transaction; audit failure rolls back.

Safe list/detail projections contain staff identity IDs, names, activation/persona data, explicit grant history, and lifecycle attribution. They do not select credential/session secret material or clinical data.

## Deployment

Migration directory: `apps/api/prisma/migrations/20261103120000_d4sec_1c4b_staff_persona_lifecycle_foundation`.

Local: `npm exec --workspace=@medora/api -- prisma migrate deploy`

Production (report only; do not run here): `npm run migrate:deploy --workspace=@medora/api`

No seed was added or changed.
