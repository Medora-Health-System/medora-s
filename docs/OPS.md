# Ops notes (DB)

## Facility creation (platform owner)

Only **`atranchant@medora.local`** is the platform principal: `POST /admin/facilities`, listing inactive facilities, and facility language/activation toggles are enforced server-side by that fixed email (see `apps/api/src/auth/platform-principal.ts`). `/auth/me` exposes `canCreateFacilities: true` only for that account.

The seed creates that user with the same demo password as other seed accounts (`Admin123!`) and sets `User.canCreateFacilities = true` only for that row. A **partial unique index** on `User` ensures at most one row has `canCreateFacilities = true`.

Do **not** grant platform powers by flipping `canCreateFacilities` for other emails; it will not work (authorization is email-based). For a new environment, run migrations and seed, or create `atranchant@medora.local` with the correct password and role assignments, then rely on the migration/unique index for the flag.

Re-login or refresh the session so `/api/auth/me` reflects changes.
