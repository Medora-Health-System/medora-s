-- CreateTable
CREATE TABLE "EnterpriseDocumentPacketSource" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "packetType" TEXT NOT NULL,
    "packetVersion" TEXT NOT NULL DEFAULT '1.0',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "facilityId" TEXT,
    "patientId" TEXT,
    "encounterId" TEXT,
    "sourceJson" JSONB NOT NULL,
    "sourceHashSha256" TEXT,
    "renderedHashSha256" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "EnterpriseDocumentPacketSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseDocumentPacketSource_documentId_key" ON "EnterpriseDocumentPacketSource"("documentId");

-- CreateIndex
CREATE INDEX "EnterpriseDocumentPacketSource_packetType_idx" ON "EnterpriseDocumentPacketSource"("packetType");

-- CreateIndex
CREATE INDEX "EnterpriseDocumentPacketSource_patientId_idx" ON "EnterpriseDocumentPacketSource"("patientId");

-- CreateIndex
CREATE INDEX "EnterpriseDocumentPacketSource_facilityId_idx" ON "EnterpriseDocumentPacketSource"("facilityId");

-- CreateIndex
CREATE INDEX "EnterpriseDocumentPacketSource_generatedAt_idx" ON "EnterpriseDocumentPacketSource"("generatedAt");

-- AddForeignKey
ALTER TABLE "EnterpriseDocumentPacketSource" ADD CONSTRAINT "EnterpriseDocumentPacketSource_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EnterpriseDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseDocumentPacketSource" ADD CONSTRAINT "EnterpriseDocumentPacketSource_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseDocumentPacketSource" ADD CONSTRAINT "EnterpriseDocumentPacketSource_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseDocumentPacketSource" ADD CONSTRAINT "EnterpriseDocumentPacketSource_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseDocumentPacketSource" ADD CONSTRAINT "EnterpriseDocumentPacketSource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
