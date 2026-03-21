# Login and authentication (Medora-S)

## Routing

- **Single login page:** `/login` is the only login route. All users (admin, provider, nurse, pharmacy, etc.) use the same page.
- **No `/admin/login`:** There is no separate admin login route. The app does not reference `/admin/login`; a request to `/admin/login` returns 404 because no such route exists. This is intentional for MVP.

## Request/response contract

- **Frontend** POSTs to **`/api/auth/login`** with body: `{ username, password }`. The field can be email or identifier; the proxy forwards it as `username`.
- **Next.js API route** (`/api/auth/login`) forwards to **backend `POST ${API_URL}/auth/login`** with `{ username, password }`.
- **Backend** expects `username` (or `email` in shared schema) and `password`; it looks up user by **email** (username is normalized to email).
- **Backend success response:** `{ accessToken, refreshToken, user }` where `user` includes `facilityRoles: [{ facilityId, role }]`.
- **Cookies set by API route on success:** `accessToken`, `refreshToken`, `facilityId`, `medora_facility_id` (first facility in `user.facilityRoles`).
- **Redirect:** On success, frontend redirects to `/app`.

## Development credentials (seed)

After running `pnpm prisma db seed` (or equivalent) in `apps/api`, these users exist. Password is the same for all:

| Email | Password | Role |
|-------|----------|------|
| admin@medora.local | Admin123! | ADMIN |
| provider@medora.local | Admin123! | PROVIDER |
| rn@medora.local | Admin123! | RN |
| pharmacy@medora.local | Admin123! | PHARMACY |

Use **email** as the login identifier on the `/login` page. The backend treats the identifier as email (case-insensitive).

## Environment

- **API base URL:** Set `API_URL` or `MEDORA_API_URL` for the web app (e.g. `http://localhost:3001`). If the API is unreachable, the login page shows a French message: "Service indisponible. Vérifiez que le serveur est démarré ou contactez l'administrateur."

## User-facing error messages (French)

All login error messages shown in the UI are in French, including:

- Identifiant et mot de passe requis.
- Identifiants incorrects.
- Service indisponible. Vérifiez que le serveur est démarré ou contactez l'administrateur.
- Réponse du serveur invalide. Réessayez plus tard.
- Échec de la connexion. Réessayez.
- Échec de la connexion. Vérifiez votre connexion et réessayez.
