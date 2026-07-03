-- CreateTable
CREATE TABLE "EnterpriseDocument" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "encounterId" TEXT,
    "facilityId" TEXT,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksumSha256" TEXT,
    "pageCount" INTEGER,
    "source" TEXT,
    "notes" TEXT,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnterpriseDocument_patientId_idx" ON "EnterpriseDocument"("patientId");

-- CreateIndex
CREATE INDEX "EnterpriseDocument_encounterId_idx" ON "EnterpriseDocument"("encounterId");

-- CreateIndex
CREATE INDEX "EnterpriseDocument_facilityId_idx" ON "EnterpriseDocument"("facilityId");

-- CreateIndex
CREATE INDEX "EnterpriseDocument_category_idx" ON "EnterpriseDocument"("category");

-- CreateIndex
CREATE INDEX "EnterpriseDocument_type_idx" ON "EnterpriseDocument"("type");

-- CreateIndex
CREATE INDEX "EnterpriseDocument_status_idx" ON "EnterpriseDocument"("status");

-- CreateIndex
CREATE INDEX "EnterpriseDocument_uploadedAt_idx" ON "EnterpriseDocument"("uploadedAt");

-- AddForeignKey
ALTER TABLE "EnterpriseDocument" ADD CONSTRAINT "EnterpriseDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseDocument" ADD CONSTRAINT "EnterpriseDocument_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseDocument" ADD CONSTRAINT "EnterpriseDocument_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseDocument" ADD CONSTRAINT "EnterpriseDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
