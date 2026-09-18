CREATE TABLE "PatientPortalPushDevice" (
  "id" TEXT NOT NULL,
  "portalAccountId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientPortalPushDevice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientPortalPushDevice_token_key" UNIQUE ("token"),
  CONSTRAINT "PatientPortalPushDevice_platform_check" CHECK ("platform" IN ('IOS','ANDROID','WEB')),
  CONSTRAINT "PatientPortalPushDevice_account_fkey" FOREIGN KEY ("portalAccountId") REFERENCES "PatientPortalAccount"("id") ON DELETE CASCADE,
  CONSTRAINT "PatientPortalPushDevice_patient_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE,
  CONSTRAINT "PatientPortalPushDevice_facility_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE
);
CREATE INDEX "PatientPortalPushDevice_scope_idx" ON "PatientPortalPushDevice" ("portalAccountId","patientId","facilityId","enabled");

CREATE TABLE "PatientPortalNotification" (
  "id" TEXT NOT NULL,
  "portalAccountId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientPortalNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientPortalNotification_kind_check" CHECK ("kind" IN ('MESSAGE','RESULT_RELEASED')),
  CONSTRAINT "PatientPortalNotification_dedupe_key" UNIQUE ("portalAccountId","kind","entityId"),
  CONSTRAINT "PatientPortalNotification_account_fkey" FOREIGN KEY ("portalAccountId") REFERENCES "PatientPortalAccount"("id") ON DELETE CASCADE,
  CONSTRAINT "PatientPortalNotification_patient_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE,
  CONSTRAINT "PatientPortalNotification_facility_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE
);
CREATE INDEX "PatientPortalNotification_inbox_idx" ON "PatientPortalNotification" ("portalAccountId","patientId","facilityId","createdAt" DESC);
