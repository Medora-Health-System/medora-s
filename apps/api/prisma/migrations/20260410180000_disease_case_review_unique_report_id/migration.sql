-- Phase 9: At most one DiseaseCaseReview per linked DiseaseCaseReport.
--
-- Dedupe rule (non-null diseaseCaseReportId only): keep the row with the latest
-- workflow activity (updatedAt, then createdAt, then id). Deletes older/stale duplicates.
-- Rows with NULL diseaseCaseReportId are not deduped here and remain allowed in multiple
-- (PostgreSQL UNIQUE still permits multiple NULLs).
--
-- Idempotent: re-running the DELETE removes 0 rows once duplicates are gone.

DELETE FROM "DiseaseCaseReview"
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY "diseaseCaseReportId"
             ORDER BY "updatedAt" DESC, "createdAt" DESC, id DESC
           ) AS rn
    FROM "DiseaseCaseReview"
    WHERE "diseaseCaseReportId" IS NOT NULL
  ) dup
  WHERE dup.rn > 1
);

-- Replace plain index with unique index (matches Prisma @@unique).
DROP INDEX IF EXISTS "DiseaseCaseReview_diseaseCaseReportId_idx";

CREATE UNIQUE INDEX "DiseaseCaseReview_diseaseCaseReportId_key" ON "DiseaseCaseReview"("diseaseCaseReportId");
