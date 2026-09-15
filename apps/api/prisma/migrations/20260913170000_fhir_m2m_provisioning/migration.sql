CREATE SCHEMA IF NOT EXISTS "interop";

CREATE TABLE IF NOT EXISTS "interop"."IntegrationClient" (
  "id" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "displayName" VARCHAR(160) NOT NULL,
  "sourceSystemIdentifier" VARCHAR(160),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "revokedAt" TIMESTAMP(3),
  "revokedById" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationClient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "interop"."IntegrationClientScope" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "capabilityCode" VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationClientScope_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "interop"."IntegrationClientCredential" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "keyId" VARCHAR(96) NOT NULL,
  "secretHash" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedById" TEXT,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "IntegrationClientCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "interop"."FhirIntegrationRateLimitBucket" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FhirIntegrationRateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationClient_integrationId_facilityId_key" ON "interop"."IntegrationClient"("integrationId", "facilityId");
CREATE INDEX IF NOT EXISTS "IntegrationClient_facilityId_active_idx" ON "interop"."IntegrationClient"("facilityId", "active");
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationClientScope_clientId_capabilityCode_key" ON "interop"."IntegrationClientScope"("clientId", "capabilityCode");
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationClientCredential_keyId_key" ON "interop"."IntegrationClientCredential"("keyId");
CREATE INDEX IF NOT EXISTS "IntegrationClientCredential_clientId_revokedAt_expiresAt_idx" ON "interop"."IntegrationClientCredential"("clientId", "revokedAt", "expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "FhirIntegrationRateLimitBucket_clientId_facilityId_windowStart_key" ON "interop"."FhirIntegrationRateLimitBucket"("clientId", "facilityId", "windowStart");

DO $$ BEGIN
  ALTER TABLE "interop"."IntegrationClient" ADD CONSTRAINT "IntegrationClient_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "public"."Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "interop"."IntegrationClient" ADD CONSTRAINT "IntegrationClient_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "interop"."IntegrationClientScope" ADD CONSTRAINT "IntegrationClientScope_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "interop"."IntegrationClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "interop"."IntegrationClientCredential" ADD CONSTRAINT "IntegrationClientCredential_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "interop"."IntegrationClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "interop"."FhirIntegrationRateLimitBucket" ADD CONSTRAINT "FhirIntegrationRateLimitBucket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "interop"."IntegrationClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
