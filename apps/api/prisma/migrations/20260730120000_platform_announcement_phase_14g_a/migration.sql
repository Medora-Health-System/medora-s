-- Phase 14G-A — Platform announcements & acknowledgements (additive only).
-- PHI-free operational notices; acknowledgements are per-user, server-side.

ALTER TYPE "AuditAction" ADD VALUE 'PLATFORM_ANNOUNCEMENT_ACKNOWLEDGED';

CREATE TABLE "PlatformAnnouncement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" TEXT,
    "versionKey" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformAnnouncement_versionKey_key" ON "PlatformAnnouncement"("versionKey");

CREATE INDEX "PlatformAnnouncement_isActive_startsAt_expiresAt_createdAt_idx" ON "PlatformAnnouncement"("isActive", "startsAt", "expiresAt", "createdAt");

CREATE TABLE "PlatformAnnouncementAcknowledgement" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAnnouncementAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformAnnouncementAcknowledgement_announcementId_userId_key" ON "PlatformAnnouncementAcknowledgement"("announcementId", "userId");

CREATE INDEX "PlatformAnnouncementAcknowledgement_userId_idx" ON "PlatformAnnouncementAcknowledgement"("userId");

ALTER TABLE "PlatformAnnouncement" ADD CONSTRAINT "PlatformAnnouncement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformAnnouncementAcknowledgement" ADD CONSTRAINT "PlatformAnnouncementAcknowledgement_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "PlatformAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformAnnouncementAcknowledgement" ADD CONSTRAINT "PlatformAnnouncementAcknowledgement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
