-- D4SEC.1C.2C.1: attributed audit rows retain their immutable User.id and Facility.id.
-- Nullable legacy/system rows remain nullable; this migration neither invents nor repairs identity.

-- Fail before changing constraints if the existing database is inconsistent. These checks use
-- immutable IDs only and intentionally never use mutable identity attributes or fabricate links.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "AuditLog" a
    LEFT JOIN "User" u ON u."id" = a."userId"
    WHERE a."userId" IS NOT NULL AND u."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'D4SEC.1C.2C.1: AuditLog contains an orphaned userId';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "AuditLog" a
    LEFT JOIN "Facility" f ON f."id" = a."facilityId"
    WHERE a."facilityId" IS NOT NULL AND f."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'D4SEC.1C.2C.1: AuditLog contains an orphaned facilityId';
  END IF;
END $$;

ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_facilityId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
