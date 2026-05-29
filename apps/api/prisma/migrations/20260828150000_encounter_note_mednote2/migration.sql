-- MEDNOTE.2 — encounter note amendments, voiding & cosign governance (additive only).

-- CreateEnum
CREATE TYPE "EncounterNoteVoidReasonCode" AS ENUM ('WRONG_PATIENT', 'DUPLICATE_ENTRY', 'ENTERED_IN_ERROR', 'TRAINING_RECORD', 'OTHER');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'ENCOUNTER_NOTE_AMENDED';
ALTER TYPE "AuditAction" ADD VALUE 'ENCOUNTER_NOTE_VOIDED';
ALTER TYPE "AuditAction" ADD VALUE 'ENCOUNTER_NOTE_COSIGNED';

-- AlterTable
ALTER TABLE "EncounterNote" ADD COLUMN "voidReasonCode" "EncounterNoteVoidReasonCode",
ADD COLUMN "isAmendment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "amendedFromNoteId" TEXT,
ADD COLUMN "amendmentReason" TEXT,
ADD COLUMN "requiresCosign" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "cosignedAt" TIMESTAMP(3),
ADD COLUMN "cosignedByUserId" TEXT,
ADD COLUMN "cosignRoleSnapshot" TEXT;

-- CreateIndex
CREATE INDEX "EncounterNote_amendedFromNoteId_idx" ON "EncounterNote"("amendedFromNoteId");

-- AddForeignKey
ALTER TABLE "EncounterNote" ADD CONSTRAINT "EncounterNote_amendedFromNoteId_fkey" FOREIGN KEY ("amendedFromNoteId") REFERENCES "EncounterNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterNote" ADD CONSTRAINT "EncounterNote_cosignedByUserId_fkey" FOREIGN KEY ("cosignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
