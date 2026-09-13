CREATE TABLE "IntegrationClient" (
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

CREATE TABLE "IntegrationClientScope" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "capabilityCode" VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationClientScope_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationClientCredential" (
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

CREATE TABLE "FhirIntegrationRateLimitBucket" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FhirIntegrationRateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationClient_integrationId_facilityId_key" ON "IntegrationClient"("integrationId", "facilityId");
CREATE INDEX "IntegrationClient_facilityId_active_idx" ON "IntegrationClient"("facilityId", "active");
CREATE INDEX "IntegrationClient_integrationId_active_idx" ON "IntegrationClient"("integrationId", "active");
CREATE UNIQUE INDEX "IntegrationClientScope_clientId_capabilityCode_key" ON "IntegrationClientScope"("clientId", "capabilityCode");
CREATE INDEX "IntegrationClientScope_capabilityCode_idx" ON "IntegrationClientScope"("capabilityCode");
CREATE UNIQUE INDEX "IntegrationClientCredential_keyId_key" ON "IntegrationClientCredential"("keyId");
CREATE INDEX "IntegrationClientCredential_clientId_revokedAt_expiresAt_idx" ON "IntegrationClientCredential"("clientId", "revokedAt", "expiresAt");
CREATE UNIQUE INDEX "FhirIntegrationRateLimitBucket_clientId_facilityId_windowStart_key" ON "FhirIntegrationRateLimitBucket"("clientId", "facilityId", "windowStart");
CREATE INDEX "FhirIntegrationRateLimitBucket_windowStart_idx" ON "FhirIntegrationRateLimitBucket"("windowStart");

ALTER TABLE "IntegrationClient" ADD CONSTRAINT "IntegrationClient_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationClient" ADD CONSTRAINT "IntegrationClient_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationClient" ADD CONSTRAINT "IntegrationClient_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationClient" ADD CONSTRAINT "IntegrationClient_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationClient" ADD CONSTRAINT "IntegrationClient_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IntegrationClientScope" ADD CONSTRAINT "IntegrationClientScope_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "IntegrationClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationClientCredential" ADD CONSTRAINT "IntegrationClientCredential_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "IntegrationClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationClientCredential" ADD CONSTRAINT "IntegrationClientCredential_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationClientCredential" ADD CONSTRAINT "IntegrationClientCredential_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FhirIntegrationRateLimitBucket" ADD CONSTRAINT "FhirIntegrationRateLimitBucket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "IntegrationClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FhirIntegrationRateLimitBucket" ADD CONSTRAINT "FhirIntegrationRateLimitBucket_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
