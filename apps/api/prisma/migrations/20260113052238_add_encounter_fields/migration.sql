/*
  Warnings:

  - You are about to drop the column `endAt` on the `Encounter` table. All the data in the column will be lost.
  - You are about to drop the column `startAt` on the `Encounter` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Encounter_startAt_idx";

-- DropIndex
DROP INDEX "Encounter_status_idx";

-- AlterTable
ALTER TABLE "Encounter" DROP COLUMN "endAt",
DROP COLUMN "startAt",
ADD COLUMN     "chiefComplaint" TEXT,
ADD COLUMN     "triageAcuity" INTEGER,
ADD COLUMN     "vitals" JSONB;
