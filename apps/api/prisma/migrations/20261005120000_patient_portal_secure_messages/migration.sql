-- Patient portal secure messaging bounded domain.
-- Additive only: does not modify staff auth/RBAC, clinical records, or patient identity semantics.

CREATE TYPE "PatientPortalMessageCategory" AS ENUM (
  'GENERAL',
  'CLINICAL',
  'MEDICATION',
  'APPOINTMENT'
);

CREATE TYPE "PatientPortalMessageThreadStatus" AS ENUM (
  'OPEN',
  'CLOSED'
);

CREATE TYPE "PatientPortalMessageSenderType" AS ENUM (
  'PATIENT',
  'STAFF'
);

CREATE TABLE "PatientPortalMessageThread" (
  "id" TEXT NOT NULL,
  "portalAccountId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "category" "PatientPortalMessageCategory" NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "PatientPortalMessageThreadStatus" NOT NULL DEFAULT 'OPEN',
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "closedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientPortalMessageThread_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientPortalMessageThread_subject_length_check"
    CHECK (char_length(btrim("subject")) BETWEEN 1 AND 120),
  CONSTRAINT "PatientPortalMessageThread_closed_state_check"
    CHECK (
      ("status" = 'OPEN'::"PatientPortalMessageThreadStatus" AND "closedAt" IS NULL)
      OR
      ("status" = 'CLOSED'::"PatientPortalMessageThreadStatus" AND "closedAt" IS NOT NULL)
    )
);

CREATE INDEX "PatientPortalMessageThread_account_facility_patient_last_idx"
  ON "PatientPortalMessageThread"("portalAccountId", "facilityId", "patientId", "lastMessageAt" DESC);
CREATE INDEX "PatientPortalMessageThread_facility_status_last_idx"
  ON "PatientPortalMessageThread"("facilityId", "status", "lastMessageAt" DESC);
CREATE INDEX "PatientPortalMessageThread_patient_facility_last_idx"
  ON "PatientPortalMessageThread"("patientId", "facilityId", "lastMessageAt" DESC);

ALTER TABLE "PatientPortalMessageThread"
  ADD CONSTRAINT "PatientPortalMessageThread_portalAccountId_fkey"
  FOREIGN KEY ("portalAccountId") REFERENCES "PatientPortalAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalMessageThread"
  ADD CONSTRAINT "PatientPortalMessageThread_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalMessageThread"
  ADD CONSTRAINT "PatientPortalMessageThread_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalMessageThread"
  ADD CONSTRAINT "PatientPortalMessageThread_closedByUserId_fkey"
  FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PatientPortalMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "senderType" "PatientPortalMessageSenderType" NOT NULL,
  "senderPortalAccountId" TEXT,
  "senderUserId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientPortalMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientPortalMessage_body_length_check"
    CHECK (char_length(btrim("body")) BETWEEN 1 AND 4000),
  CONSTRAINT "PatientPortalMessage_sender_check"
    CHECK (
      ("senderType" = 'PATIENT'::"PatientPortalMessageSenderType"
        AND "senderPortalAccountId" IS NOT NULL
        AND "senderUserId" IS NULL)
      OR
      ("senderType" = 'STAFF'::"PatientPortalMessageSenderType"
        AND "senderPortalAccountId" IS NULL
        AND "senderUserId" IS NOT NULL)
    )
);

CREATE INDEX "PatientPortalMessage_thread_created_idx"
  ON "PatientPortalMessage"("threadId", "createdAt" ASC, "id" ASC);

ALTER TABLE "PatientPortalMessage"
  ADD CONSTRAINT "PatientPortalMessage_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "PatientPortalMessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientPortalMessage"
  ADD CONSTRAINT "PatientPortalMessage_senderPortalAccountId_fkey"
  FOREIGN KEY ("senderPortalAccountId") REFERENCES "PatientPortalAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalMessage"
  ADD CONSTRAINT "PatientPortalMessage_senderUserId_fkey"
  FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Defense in depth: a portal thread may only be created for an active portal account,
-- a verified account/patient/facility tuple, an active facility, and the patient's
-- authoritative facility.
CREATE OR REPLACE FUNCTION "enforcePatientPortalMessageThreadScope"()
RETURNS TRIGGER AS $$
DECLARE
  scope_is_valid BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM "PatientPortalLink" l
    INNER JOIN "PatientPortalAccount" a ON a."id" = l."portalAccountId"
    INNER JOIN "Patient" p ON p."id" = l."patientId"
    INNER JOIN "Facility" f ON f."id" = l."facilityId"
    WHERE l."portalAccountId" = NEW."portalAccountId"
      AND l."patientId" = NEW."patientId"
      AND l."facilityId" = NEW."facilityId"
      AND l."status" = 'VERIFIED'::"PatientPortalLinkStatus"
      AND l."revokedAt" IS NULL
      AND a."status" = 'ACTIVE'::"PatientPortalAccountStatus"
      AND p."facilityId" = NEW."facilityId"
      AND f."isActive" = TRUE
  ) INTO scope_is_valid;

  IF NOT scope_is_valid THEN
    RAISE EXCEPTION 'PatientPortalMessageThread requires an active verified patient portal scope';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PatientPortalMessageThread_scope_guard"
BEFORE INSERT OR UPDATE OF "portalAccountId", "patientId", "facilityId"
ON "PatientPortalMessageThread"
FOR EACH ROW
EXECUTE FUNCTION "enforcePatientPortalMessageThreadScope"();

-- Defense in depth: patient-authored messages must come from the thread owner, and no
-- message can be appended after staff closes the thread. Staff authorization remains
-- enforced by the existing JWT + RolesGuard application boundary.
CREATE OR REPLACE FUNCTION "enforcePatientPortalMessageInsert"()
RETURNS TRIGGER AS $$
DECLARE
  thread_account_id TEXT;
  thread_status "PatientPortalMessageThreadStatus";
BEGIN
  SELECT "portalAccountId", "status"
    INTO thread_account_id, thread_status
    FROM "PatientPortalMessageThread"
    WHERE "id" = NEW."threadId";

  IF thread_account_id IS NULL THEN
    RAISE EXCEPTION 'PatientPortalMessage thread does not exist';
  END IF;

  IF thread_status <> 'OPEN'::"PatientPortalMessageThreadStatus" THEN
    RAISE EXCEPTION 'PatientPortalMessage thread is closed';
  END IF;

  IF NEW."senderType" = 'PATIENT'::"PatientPortalMessageSenderType"
     AND NEW."senderPortalAccountId" <> thread_account_id THEN
    RAISE EXCEPTION 'PatientPortalMessage patient sender does not own thread';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PatientPortalMessage_insert_guard"
BEFORE INSERT ON "PatientPortalMessage"
FOR EACH ROW
EXECUTE FUNCTION "enforcePatientPortalMessageInsert"();

CREATE OR REPLACE FUNCTION "touchPatientPortalMessageThread"()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "PatientPortalMessageThread"
  SET "lastMessageAt" = NEW."createdAt",
      "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = NEW."threadId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PatientPortalMessage_touch_thread"
AFTER INSERT ON "PatientPortalMessage"
FOR EACH ROW
EXECUTE FUNCTION "touchPatientPortalMessageThread"();
