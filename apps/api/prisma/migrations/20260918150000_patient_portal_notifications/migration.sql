CREATE TABLE "PatientPortalNotification" (
  "id" TEXT PRIMARY KEY,
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
  CONSTRAINT "PatientPortalNotification_kind_check" CHECK ("kind" IN ('MESSAGE','RESULT_RELEASED')),
  CONSTRAINT "PatientPortalNotification_unique_event" UNIQUE ("portalAccountId","kind","entityId")
);
CREATE INDEX "PatientPortalNotification_inbox_idx" ON "PatientPortalNotification" ("portalAccountId","patientId","facilityId","createdAt" DESC);
CREATE INDEX "PatientPortalNotification_unread_idx" ON "PatientPortalNotification" ("portalAccountId","patientId","facilityId","readAt");

CREATE TABLE "PatientPortalPushDevice" (
  "id" TEXT PRIMARY KEY,
  "portalAccountId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "platform" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientPortalPushDevice_platform_check" CHECK ("platform" IN ('IOS','ANDROID','WEB'))
);
CREATE INDEX "PatientPortalPushDevice_delivery_idx" ON "PatientPortalPushDevice" ("portalAccountId","patientId","facilityId","enabled");
