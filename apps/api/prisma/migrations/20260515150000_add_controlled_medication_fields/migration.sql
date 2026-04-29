ALTER TABLE "CatalogMedication"
ADD COLUMN "isControlled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "controlledSchedule" TEXT,
ADD COLUMN "requiresWitness" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "requiresDoubleSign" BOOLEAN NOT NULL DEFAULT false;
