-- ER-3.2: explicit MAR outcome on MedicationAdministration (notes are no longer sole clinical truth).

-- CreateEnum
CREATE TYPE "MedicationMarAction" AS ENUM ('administered', 'refused', 'not_available', 'md_changed');

-- AlterTable
ALTER TABLE "MedicationAdministration" ADD COLUMN "marAction" "MedicationMarAction";
