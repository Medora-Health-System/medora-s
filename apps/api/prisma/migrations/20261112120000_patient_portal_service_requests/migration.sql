-- Patient portal service-request workflow.
-- Requests are intentionally separate from authoritative Appointment / Order / OrderItem records.
-- No trigger or FK action mutates clinical/scheduling authority.

CREATE TYPE "PatientPortalServiceRequestType" AS ENUM (
  'APPOINTMENT_NEW',
  'APPOINTMENT_CHANGE',
  'APPOINTMENT_CANCEL',
  'MEDICATION_REFILL'
);

CREATE TYPE "PatientPortalServiceRequestStatus" AS ENUM (
  'PENDING',
  'IN_REVIEW',
  'ACCEPTED',
  'DECLINED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TABLE "PatientPortalServiceRequest" (
  "id" TEXT NOT NULL,
  "portalAccountId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "type" "PatientPortalServiceRequestType" NOT NULL,
  "status" "PatientPortalServiceRequestStatus" NOT NULL DEFAULT 'PENDING',
  "appointmentId" TEXT,
  "medicationOrderItemId" TEXT,
  "preferredStartAt" TIMESTAMP(3),
  "reason" TEXT,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "resolutionCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientPortalServiceRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientPortalServiceRequest_reason_length_check"
    CHECK ("reason" IS NULL OR char_length(btrim("reason")) BETWEEN 1 AND 500),
  CONSTRAINT "PatientPortalServiceRequest_shape_check"
    CHECK (
      ("type" = 'APPOINTMENT_NEW'::"PatientPortalServiceRequestType"
        AND "appointmentId" IS NULL AND "medicationOrderItemId" IS NULL AND "preferredStartAt" IS NOT NULL)
      OR
      ("type" = 'APPOINTMENT_CHANGE'::"PatientPortalServiceRequestType"
        AND "appointmentId" IS NOT NULL AND "medicationOrderItemId" IS NULL AND "preferredStartAt" IS NOT NULL)
      OR
      ("type" = 'APPOINTMENT_CANCEL'::"PatientPortalServiceRequestType"
        AND "appointmentId" IS NOT NULL AND "medicationOrderItemId" IS NULL AND "preferredStartAt" IS NULL)
      OR
      ("type" = 'MEDICATION_REFILL'::"PatientPortalServiceRequestType"
        AND "appointmentId" IS NULL AND "medicationOrderItemId" IS NOT NULL AND "preferredStartAt" IS NULL)
    ),
  CONSTRAINT "PatientPortalServiceRequest_review_state_check"
    CHECK (
      ("status" IN ('PENDING','CANCELLED') AND "reviewedByUserId" IS NULL AND "reviewedAt" IS NULL)
      OR
      ("status" IN ('IN_REVIEW','ACCEPTED','DECLINED','COMPLETED') AND "reviewedByUserId" IS NOT NULL AND "reviewedAt" IS NOT NULL)
    )
);

CREATE INDEX "PatientPortalServiceRequest_patient_scope_idx"
  ON "PatientPortalServiceRequest"("portalAccountId", "facilityId", "patientId", "createdAt" DESC);
CREATE INDEX "PatientPortalServiceRequest_staff_queue_idx"
  ON "PatientPortalServiceRequest"("facilityId", "status", "createdAt" ASC);
CREATE INDEX "PatientPortalServiceRequest_appointment_idx"
  ON "PatientPortalServiceRequest"("appointmentId") WHERE "appointmentId" IS NOT NULL;
CREATE INDEX "PatientPortalServiceRequest_medication_idx"
  ON "PatientPortalServiceRequest"("medicationOrderItemId") WHERE "medicationOrderItemId" IS NOT NULL;

ALTER TABLE "PatientPortalServiceRequest"
  ADD CONSTRAINT "PatientPortalServiceRequest_portalAccountId_fkey"
  FOREIGN KEY ("portalAccountId") REFERENCES "PatientPortalAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalServiceRequest"
  ADD CONSTRAINT "PatientPortalServiceRequest_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalServiceRequest"
  ADD CONSTRAINT "PatientPortalServiceRequest_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalServiceRequest"
  ADD CONSTRAINT "PatientPortalServiceRequest_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalServiceRequest"
  ADD CONSTRAINT "PatientPortalServiceRequest_medicationOrderItemId_fkey"
  FOREIGN KEY ("medicationOrderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientPortalServiceRequest"
  ADD CONSTRAINT "PatientPortalServiceRequest_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Defense in depth: request owner/facility/patient scope must remain an active verified portal link.
-- Referenced appointment or medication must belong to the same patient/facility at insertion/update.
CREATE OR REPLACE FUNCTION "enforcePatientPortalServiceRequestScope"()
RETURNS TRIGGER AS $$
DECLARE
  scope_valid BOOLEAN;
  reference_valid BOOLEAN;
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
  ) INTO scope_valid;

  IF NOT scope_valid THEN
    RAISE EXCEPTION 'PatientPortalServiceRequest requires active verified portal scope';
  END IF;

  IF NEW."appointmentId" IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM "Appointment" ap
      WHERE ap."id" = NEW."appointmentId"
        AND ap."patientId" = NEW."patientId"
        AND ap."facilityId" = NEW."facilityId"
    ) INTO reference_valid;
    IF NOT reference_valid THEN
      RAISE EXCEPTION 'PatientPortalServiceRequest appointment scope mismatch';
    END IF;
  END IF;

  IF NEW."medicationOrderItemId" IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON o."id" = oi."orderId"
      WHERE oi."id" = NEW."medicationOrderItemId"
        AND oi."catalogItemType" = 'MEDICATION'
        AND oi."medicationFulfillmentIntent" = 'PHARMACY_DISPENSE'
        AND o."type" = 'MEDICATION'
        AND o."patientId" = NEW."patientId"
        AND o."facilityId" = NEW."facilityId"
    ) INTO reference_valid;
    IF NOT reference_valid THEN
      RAISE EXCEPTION 'PatientPortalServiceRequest medication scope mismatch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PatientPortalServiceRequest_scope_guard"
BEFORE INSERT OR UPDATE OF "portalAccountId", "patientId", "facilityId", "appointmentId", "medicationOrderItemId"
ON "PatientPortalServiceRequest"
FOR EACH ROW
EXECUTE FUNCTION "enforcePatientPortalServiceRequestScope"();
