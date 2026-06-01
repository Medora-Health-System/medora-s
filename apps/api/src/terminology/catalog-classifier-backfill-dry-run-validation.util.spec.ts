import {
  HAITI_IMAGING_DRY_RUN_EXPECTED,
  validateHaitiImagingDryRunCounts,
} from "./catalog-classifier-backfill-dry-run-validation.util";

describe("validateHaitiImagingDryRunCounts (3C-B1G)", () => {
  const { resolvedSlots, manualReview, skipped, total } = HAITI_IMAGING_DRY_RUN_EXPECTED;

  it("accepts all-null baseline (APPLIED 199)", () => {
    const result = validateHaitiImagingDryRunCounts({
      applied: resolvedSlots,
      unchanged: 0,
      manualReview,
      skipped,
    });

    expect(result.countsMatchExpected).toBe(true);
    expect(result.baselineProfile).toBe("all-null");
    expect(result.resolvedSlots).toBe(199);
    expect(result.totalSlots).toBe(total);
    expect(result.failures).toEqual([]);
  });

  it("accepts partially prefilled baseline (APPLIED + UNCHANGED = 199)", () => {
    const result = validateHaitiImagingDryRunCounts({
      applied: 109,
      unchanged: 90,
      manualReview,
      skipped,
    });

    expect(result.countsMatchExpected).toBe(true);
    expect(result.baselineProfile).toBe("partial-prefill");
    expect(result.resolvedSlots).toBe(199);
    expect(result.totalSlots).toBe(total);
  });

  it("accepts fully resolved / idempotent baseline (UNCHANGED 199)", () => {
    const result = validateHaitiImagingDryRunCounts({
      applied: 0,
      unchanged: resolvedSlots,
      manualReview,
      skipped,
    });

    expect(result.countsMatchExpected).toBe(true);
    expect(result.baselineProfile).toBe("fully-resolved");
    expect(result.resolvedSlots).toBe(199);
  });

  it("rejects when resolved slots do not sum to 199", () => {
    const result = validateHaitiImagingDryRunCounts({
      applied: 100,
      unchanged: 50,
      manualReview,
      skipped,
    });

    expect(result.countsMatchExpected).toBe(false);
    expect(result.baselineProfile).toBeNull();
    expect(result.failures.some((f) => f.includes("resolvedSlots"))).toBe(true);
  });
});
