-- Optimistic locking for concurrent encounter edits (JSON fields, etc.)
ALTER TABLE "Encounter" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
