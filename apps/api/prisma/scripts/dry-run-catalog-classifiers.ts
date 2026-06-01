/**
 * 3C-B1E — imaging classifier backfill dry-run (read-only; no FK or audit writes).
 *
 *   pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/dry-run-catalog-classifiers.ts
 *   pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/dry-run-catalog-classifiers.ts -- --haiti-44-only
 */
import { PrismaClient } from "@prisma/client";
import { HAITI_IMAGING_CATALOG } from "../data/haiti-imaging-studies";
import { runImagingClassifierBackfillDryRun } from "../../src/terminology/catalog-classifier-backfill.service";
import {
  HAITI_IMAGING_DRY_RUN_EXPECTED,
  validateHaitiImagingDryRunCounts,
} from "../../src/terminology/catalog-classifier-backfill-dry-run-validation.util";

const MR_CONTRAST_CODES = [
  "CT_HEAD",
  "CT_ABD",
  "CT_CHEST_ABDOMEN_PELVIS_TRAUMA",
  "MRI_SPINE",
] as const;

async function main() {
  const haitiOnly = process.argv.includes("--haiti-44-only");
  const prisma = new PrismaClient();

  try {
    const catalogCodes = haitiOnly
      ? HAITI_IMAGING_CATALOG.map((r) => r.code)
      : undefined;

    const first = await runImagingClassifierBackfillDryRun(prisma, { catalogCodes });
    const second = await runImagingClassifierBackfillDryRun(prisma, { catalogCodes });

    const contrastMr = first.imagingAudits.filter(
      (a) =>
        a.fieldName === "contrastTypeClassifierId" && a.status === "MANUAL_REVIEW"
    );

    const ctaModality = first.imagingAudits.filter(
      (a) =>
        a.catalogCode.startsWith("CTA_") &&
        a.fieldName === "modalityClassifierId" &&
        a.classifierCode === "MODALITY_CTA"
    );

    const run1Validation = validateHaitiImagingDryRunCounts({
      applied: first.applied,
      unchanged: first.unchanged,
      skipped: first.skipped,
      manualReview: first.manualReview,
    });
    const run2Validation = validateHaitiImagingDryRunCounts({
      applied: second.applied,
      unchanged: second.unchanged,
      skipped: second.skipped,
      manualReview: second.manualReview,
    });

    const report = {
      scope: haitiOnly ? "haiti-44" : "all-catalog-imaging-rows",
      expected: HAITI_IMAGING_DRY_RUN_EXPECTED,
      run1: {
        applied: first.applied,
        unchanged: first.unchanged,
        skipped: first.skipped,
        manualReview: first.manualReview,
        resolvedSlots: run1Validation.resolvedSlots,
        totalSlots: run1Validation.totalSlots,
        imagingSlotCount: first.imagingSlotCount,
        baselineProfile: run1Validation.baselineProfile,
      },
      run2: {
        applied: second.applied,
        unchanged: second.unchanged,
        skipped: second.skipped,
        manualReview: second.manualReview,
        resolvedSlots: run2Validation.resolvedSlots,
        baselineProfile: run2Validation.baselineProfile,
      },
      idempotent:
        first.applied === second.applied &&
        first.unchanged === second.unchanged &&
        first.skipped === second.skipped &&
        first.manualReview === second.manualReview,
      contrastManualReview: contrastMr.map((a) => ({
        code: a.catalogCode,
        status: a.status,
        classifierId: a.classifierId,
        message: a.message,
      })),
      ctaModalityApply: ctaModality.map((a) => ({
        code: a.catalogCode,
        status: a.status,
        classifierCode: a.classifierCode,
      })),
      countsMatchExpected: run1Validation.countsMatchExpected,
      validationFailures: run1Validation.failures,
    };

    console.log(JSON.stringify(report, null, 2));

    if (!report.idempotent) {
      console.error("[dry-run-catalog-classifiers] idempotency check FAILED");
      process.exitCode = 1;
    }
    if (haitiOnly && !report.countsMatchExpected) {
      console.error(
        "[dry-run-catalog-classifiers] Haiti 44 slot counts do not match mapping-44 design:",
        run1Validation.failures.join("; ")
      );
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
