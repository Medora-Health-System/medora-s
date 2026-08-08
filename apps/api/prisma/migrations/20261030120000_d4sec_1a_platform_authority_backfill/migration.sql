-- D4SEC.1A deployment bridge.
--
-- `canCreateFacilities` was the pre-D4SEC.1A persisted platform capability and is protected by a
-- partial unique index.  Backfill the active MEDORA_SUPER_ADMIN assignment onto that same immutable
-- User.id.  Email is intentionally neither selected nor compared.
--
-- A facility is never invented: the deterministic target is the lexicographically first active
-- facility where the principal already has an active UserRole.  If that prerequisite is absent,
-- fail the deployment so operations can perform an explicitly approved User.id-based repair.

INSERT INTO "Role" ("id", "code", "name", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'MEDORA_SUPER_ADMIN', 'Medora platform operator', NOW(), NOW())
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name", "updatedAt" = NOW();

DO $$
DECLARE
  principal_id TEXT;
  target_facility_id TEXT;
  super_admin_role_id TEXT;
BEGIN
  SELECT u."id"
  INTO principal_id
  FROM "User" u
  WHERE u."canCreateFacilities" = true;

  -- Fresh installations may not yet have a principal. There is nothing to infer or create.
  IF principal_id IS NULL THEN
    RETURN;
  END IF;

  -- An existing active authoritative assignment is already upgrade-safe.
  IF EXISTS (
    SELECT 1
    FROM "UserRole" ur
    JOIN "Role" r ON r."id" = ur."roleId"
    WHERE ur."userId" = principal_id
      AND ur."isActive" = true
      AND r."code" = 'MEDORA_SUPER_ADMIN'
  ) THEN
    RETURN;
  END IF;

  SELECT ur."facilityId"
  INTO target_facility_id
  FROM "UserRole" ur
  JOIN "Facility" f ON f."id" = ur."facilityId"
  WHERE ur."userId" = principal_id
    AND ur."isActive" = true
    AND f."isActive" = true
  ORDER BY ur."facilityId" ASC
  LIMIT 1;

  IF target_facility_id IS NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'D4SEC.1A backfill blocked: canCreateFacilities principal has no active existing facility membership',
      HINT = 'Perform an approved User.id-based data repair; do not identify or authorize the principal by email.';
  END IF;

  SELECT r."id" INTO super_admin_role_id
  FROM "Role" r
  WHERE r."code" = 'MEDORA_SUPER_ADMIN';

  INSERT INTO "UserRole" (
    "id", "userId", "roleId", "facilityId", "departmentId", "isActive", "createdAt", "updatedAt"
  )
  VALUES (
    gen_random_uuid()::text,
    principal_id,
    super_admin_role_id,
    target_facility_id,
    NULL,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT ("userId", "roleId", "facilityId") DO UPDATE
  SET "isActive" = true, "departmentId" = NULL, "updatedAt" = NOW();
END $$;
