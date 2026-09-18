CREATE TABLE "PatientPortalNotification" (
  "id" TEXT PRIMARY KEY,
  "portalAccountId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "entityId" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "PatientPortalNotification_type_check" CHECK ("type" IN ('MESSAGE','RESULT_RELEASED'))
);
CREATE INDEX "PatientPortalNotification_inbox_idx" ON "PatientPortalNotification" ("portalAccountId","patientId","facilityId","createdAt" DESC);
CREATE INDEX "PatientPortalNotification_unread_idx" ON "PatientPortalNotification" ("portalAccountId","patientId","facilityId","readAt");

CREATE TABLE "PatientPortalPushSubscription" (
  "id" TEXT PRIMARY KEY,
  "portalAccountId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "PatientPortalPushSubscription_platform_check" CHECK ("platform" IN ('ANDROID','IOS','WEB'))
);
CREATE INDEX "PatientPortalPushSubscription_account_idx" ON "PatientPortalPushSubscription" ("portalAccountId","patientId","facilityId","revokedAt");
