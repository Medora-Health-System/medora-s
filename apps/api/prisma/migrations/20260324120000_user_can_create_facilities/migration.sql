-- Platform-level: only users explicitly flagged may create facilities (POST /admin/facilities).
ALTER TABLE "User" ADD COLUMN "canCreateFacilities" BOOLEAN NOT NULL DEFAULT false;
