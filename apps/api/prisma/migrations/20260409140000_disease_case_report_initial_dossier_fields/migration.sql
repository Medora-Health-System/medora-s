DO $$ BEGIN
    CREATE TYPE "MsppLabEvidenceType" AS ENUM ('NONE', 'PCR', 'RAPID_ANTIGEN', 'CULTURE', 'SEROLOGY', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MsppCaseClassification" AS ENUM ('SUSPECT', 'PROBABLE', 'CONFIRMED', 'NOT_A_CASE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable: champs dossier initial (établissement) pour la chaîne MSPP — pas de champs de décision département/central.
ALTER TABLE "DiseaseCaseReport" ADD COLUMN "feverReported" BOOLEAN,
ADD COLUMN "symptomDuration" VARCHAR(256),
ADD COLUMN "hospitalized" BOOLEAN,
ADD COLUMN "outcomeStatus" VARCHAR(128),
ADD COLUMN "labConfirmed" BOOLEAN,
ADD COLUMN "labEvidenceType" "MsppLabEvidenceType",
ADD COLUMN "epiLinkedCase" BOOLEAN,
ADD COLUMN "travelOrExposureContext" TEXT,
ADD COLUMN "clinicalSummary" TEXT,
ADD COLUMN "provisionalCaseClassification" "MsppCaseClassification";
