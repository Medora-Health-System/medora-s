# Ops notes (DB)

## Facility creation (platform owner)

Users need `User.canCreateFacilities = true` to use **Ajouter un établissement** and `POST /admin/facilities`. The seed sets this only for `admin@medora.local`. For another account, run against your database (replace the email):

```sql
UPDATE "User"
SET "canCreateFacilities" = true
WHERE email = 'owner@example.com';
```

Re-login or refresh session so `/api/auth/me` picks up the flag.
