/**
 * 3C-B1G — Haiti 44 dry-run slot count acceptance (mapping-44 parity).
 * Accepts all-null, partially prefilled, or fully resolved FK baselines when
 * APPLIED + UNCHANGED = 199, MANUAL_REVIEW = 4, SKIPPED = 105, TOTAL = 308.
 */

export const HAITI_IMAGING_DRY_RUN_EXPECTED = {
  resolvedSlots: 199,
  manualReview: 4,
  skipped: 105,
  total: 308,
} as const;

export type ImagingDryRunCountInput = {
  applied: number;
  unchanged: number;
  skipped: number;
  manualReview: number;
};

export type ImagingDryRunBaselineProfile =
  | "all-null"
  | "partial-prefill"
  | "fully-resolved";

export type ImagingDryRunCountValidation = {
  countsMatchExpected: boolean;
  baselineProfile: ImagingDryRunBaselineProfile | null;
  resolvedSlots: number;
  totalSlots: number;
  failures: string[];
};

export function validateHaitiImagingDryRunCounts(
  counts: ImagingDryRunCountInput
): ImagingDryRunCountValidation {
  const { resolvedSlots: expectedResolved, manualReview, skipped, total } =
    HAITI_IMAGING_DRY_RUN_EXPECTED;

  const resolvedSlots = counts.applied + counts.unchanged;
  const totalSlots =
    counts.applied + counts.unchanged + counts.skipped + counts.manualReview;

  const failures: string[] = [];

  if (resolvedSlots !== expectedResolved) {
    failures.push(
      `resolvedSlots (applied+unchanged)=${resolvedSlots}, expected ${expectedResolved}`
    );
  }
  if (counts.manualReview !== manualReview) {
    failures.push(`manualReview=${counts.manualReview}, expected ${manualReview}`);
  }
  if (counts.skipped !== skipped) {
    failures.push(`skipped=${counts.skipped}, expected ${skipped}`);
  }
  if (totalSlots !== total) {
    failures.push(`total=${totalSlots}, expected ${total}`);
  }

  let baselineProfile: ImagingDryRunBaselineProfile | null = null;
  if (failures.length === 0) {
    if (counts.applied === expectedResolved && counts.unchanged === 0) {
      baselineProfile = "all-null";
    } else if (counts.applied === 0 && counts.unchanged === expectedResolved) {
      baselineProfile = "fully-resolved";
    } else {
      baselineProfile = "partial-prefill";
    }
  }

  return {
    countsMatchExpected: failures.length === 0,
    baselineProfile,
    resolvedSlots,
    totalSlots,
    failures,
  };
}
