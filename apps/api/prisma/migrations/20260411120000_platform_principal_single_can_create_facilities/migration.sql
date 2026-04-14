-- Single platform principal: column kept for DB hygiene + partial unique index (at most one true).
-- API authorization uses fixed email (see apps/api/src/auth/platform-principal.ts).

UPDATE "User" SET "canCreateFacilities" = false;

UPDATE "User"
SET "canCreateFacilities" = true
WHERE LOWER(TRIM("email")) = 'atranchant@medora.local';

CREATE UNIQUE INDEX "User_unique_platform_principal_can_create_facilities"
ON "User" ((1))
WHERE "canCreateFacilities" = true;
