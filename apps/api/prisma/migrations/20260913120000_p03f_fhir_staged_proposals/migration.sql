CREATE TABLE interop."FhirInboundProposal" (
  "id" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "sourceSystem" VARCHAR(160) NOT NULL,
  "externalMessageId" VARCHAR(160) NOT NULL,
  "resourceType" VARCHAR(40) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING_REVIEW',
  "subjectPatientId" TEXT NOT NULL,
  "encounterId" TEXT,
  "requestFingerprint" CHAR(64) NOT NULL,
  "proposalJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "reviewDisposition" VARCHAR(32),
  "reviewReason" VARCHAR(500),
  CONSTRAINT "FhirInboundProposal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FhirInboundProposal_idempotency_key"
ON interop."FhirInboundProposal"("facilityId", "clientId", "sourceSystem", "externalMessageId", "resourceType");
CREATE INDEX "FhirInboundProposal_facility_status_createdAt_idx"
ON interop."FhirInboundProposal"("facilityId", "status", "createdAt");
CREATE INDEX "FhirInboundProposal_patient_createdAt_idx"
ON interop."FhirInboundProposal"("subjectPatientId", "createdAt");
CREATE INDEX "FhirInboundProposal_encounter_createdAt_idx"
ON interop."FhirInboundProposal"("encounterId", "createdAt");

ALTER TABLE interop."FhirInboundProposal"
  ADD CONSTRAINT "FhirInboundProposal_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES public."Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FhirInboundProposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES interop."IntegrationClient"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FhirInboundProposal_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES public."Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FhirInboundProposal_subjectPatientId_fkey" FOREIGN KEY ("subjectPatientId") REFERENCES public."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FhirInboundProposal_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES public."Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FhirInboundProposal_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES public."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
