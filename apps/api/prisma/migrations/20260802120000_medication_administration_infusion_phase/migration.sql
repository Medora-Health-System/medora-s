-- Phase 15F-B.1: real MAR row at infusion START (clock + effective time) linked to session key

CREATE TYPE "MedicationAdministrationInfusionPhase" AS ENUM ('INFUSION_START', 'INFUSION_STOP');

ALTER TABLE "MedicationAdministration"
ADD COLUMN "infusionPhase" "MedicationAdministrationInfusionPhase",
ADD COLUMN "infusionSessionKey" VARCHAR(64);

CREATE INDEX "MedicationAdministration_infusionSessionKey_idx" ON "MedicationAdministration"("infusionSessionKey");
