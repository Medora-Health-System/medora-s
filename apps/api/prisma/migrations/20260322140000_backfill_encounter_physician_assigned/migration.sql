-- Récupère les anciennes lignes où seul providerId était renseigné (médecin / créateur) sans physicianAssignedUserId.
UPDATE "Encounter"
SET "physicianAssignedUserId" = "providerId"
WHERE "physicianAssignedUserId" IS NULL
  AND "providerId" IS NOT NULL;
