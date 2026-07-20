import { describe, expect, it } from "vitest";
import {
  HOME_DISCHARGE_ENTERPRISE_BENCHMARK_CASES,
  evaluateHomeDischargeBenchmarkCase,
  runHomeDischargeEnterpriseBenchmark,
} from "./homeDischargeEnterpriseBenchmark.js";
import { isClosureFollowUpRowComplete } from "./closureDischargeReadiness.js";

describe("homeDischargeEnterpriseBenchmark (D2)", () => {
  it("includes at least 15 home-focused cases", () => {
    expect(HOME_DISCHARGE_ENTERPRISE_BENCHMARK_CASES.length).toBeGreaterThanOrEqual(15);
  });

  it("every case matches expected content/communication/follow-up signals", () => {
    for (const c of HOME_DISCHARGE_ENTERPRISE_BENCHMARK_CASES) {
      const result = evaluateHomeDischargeBenchmarkCase(c);
      expect(result.ok, `${c.id}: ${result.mismatches.join(",")}`).toBe(true);
    }
  });

  it("measures authority evidence without claiming clinical validation", () => {
    const metrics = runHomeDischargeEnterpriseBenchmark();
    expect(metrics.totalCases).toBe(HOME_DISCHARGE_ENTERPRISE_BENCHMARK_CASES.length);
    expect(metrics.exactSetMatchRate).toBe(1);
    expect(metrics.falsePositives).toBe(0);
    expect(metrics.falseNegatives).toBe(0);
    expect(metrics.precision).toBe(1);
    expect(metrics.recall).toBe(1);
    expect(metrics.contentCommunicationSeparationCases).toBeGreaterThan(0);
    expect(metrics.followUpAlignmentCases).toBeGreaterThan(0);
  });

  it("aligns follow-up completeness with closure policy (provider + scheduling)", () => {
    expect(
      isClosureFollowUpRowComplete({ providerOrFacility: "Clinic", timing: "" })
    ).toBe(false);
    expect(
      isClosureFollowUpRowComplete({ providerOrFacility: "Clinic", timing: "2d" })
    ).toBe(true);
  });
});
