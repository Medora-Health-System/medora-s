-- Phase 1: facility-scoped RN lab result submission policy (freestanding ER workflows).
-- Additive boolean column on `Facility`. NOT NULL with default false preserves the current
-- safe behavior for every existing facility. RN remains blocked from PUT /orders/:id/result
-- unless the facility explicitly opts in by flipping this column to true.
ALTER TABLE "Facility" ADD COLUMN "allowRnLabResultSubmission" BOOLEAN NOT NULL DEFAULT false;
