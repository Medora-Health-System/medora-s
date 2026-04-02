-- CreateTable
CREATE TABLE "TriageVitalsReading" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "triageId" TEXT NOT NULL,
    "vitalsJson" JSONB NOT NULL,
    "triageCompleteAt" TIMESTAMP(3),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriageVitalsReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TriageVitalsReading_facilityId_idx" ON "TriageVitalsReading"("facilityId");

-- CreateIndex
CREATE INDEX "TriageVitalsReading_patientId_recordedAt_idx" ON "TriageVitalsReading"("patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "TriageVitalsReading_encounterId_idx" ON "TriageVitalsReading"("encounterId");

-- CreateIndex
CREATE INDEX "TriageVitalsReading_triageId_idx" ON "TriageVitalsReading"("triageId");

-- AddForeignKey
ALTER TABLE "TriageVitalsReading" ADD CONSTRAINT "TriageVitalsReading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageVitalsReading" ADD CONSTRAINT "TriageVitalsReading_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageVitalsReading" ADD CONSTRAINT "TriageVitalsReading_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "Triage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageVitalsReading" ADD CONSTRAINT "TriageVitalsReading_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
