import { describe, expect, it } from "vitest";
import {
  buildHospitalCareOperationalActivationD3e6BenchmarkCases,
  hospitalCareD3e6BenchmarkCaseCount,
} from "./hospitalCareOperationalActivationD3e6Benchmark.js";
import { buildHospitalCareDashboardSummary } from "./hospitalCareDashboardSummaryV1.js";
import { hospitalCareProductionDefaultsAreOff } from "./hospitalCareActivationFlags.js";

describe("D3E.6 Hospital Care operational activation", () => {
  it("includes at least 600 deterministic scenarios", () => {
    expect(hospitalCareD3e6BenchmarkCaseCount()).toBeGreaterThanOrEqual(600);
  });

  it("all scenarios match expected === actual", () => {
    for (const c of buildHospitalCareOperationalActivationD3e6BenchmarkCases()) {
      expect(c.actual, `${c.id} [${c.category}] ${c.signal}`).toBe(c.expected);
    }
  });

  it("empty facility yields zero counts without inventing census", () => {
    const s = buildHospitalCareDashboardSummary({
      facilityId: "fac-1",
      placementAvailability: "ENABLED",
      rows: [],
      capabilities: {
        emergencyDepartment: true,
        observation: true,
        inpatient: true,
        directAdmission: true,
        bedManagement: true,
        transfers: false,
        placementWorkflow: true,
        receivingEncounters: true,
      },
    });
    expect(s.counts.activeInpatient).toBe(0);
    expect(s.counts.activeObservation).toBe(0);
    expect(s.emptyGuidance.observationOptional).toBe(true);
  });

  it("keeps production activation defaults OFF", () => {
    expect(hospitalCareProductionDefaultsAreOff({})).toBe(true);
  });
});
