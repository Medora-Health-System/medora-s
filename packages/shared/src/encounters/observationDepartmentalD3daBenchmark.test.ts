import { describe, expect, it } from "vitest";
import {
  buildObservationDepartmentalD3daBenchmarkCases,
  observationDepartmentalD3daBenchmarkSummary,
} from "./observationDepartmentalD3daBenchmark.js";

describe("D3DA Observation departmental integration benchmark", () => {
  it("provides at least 300 deterministic scenarios", () => {
    expect(buildObservationDepartmentalD3daBenchmarkCases().length).toBeGreaterThanOrEqual(300);
  });

  it("passes the full D3DA benchmark", () => {
    const summary = observationDepartmentalD3daBenchmarkSummary();
    expect(summary.failed).toEqual([]);
    expect(summary.passed).toBe(summary.total);
  });

  it("meets minimum category counts", () => {
    const { byCategory } = observationDepartmentalD3daBenchmarkSummary();
    expect(byCategory.LABORATORY ?? 0).toBeGreaterThanOrEqual(50);
    expect(byCategory.RADIOLOGY ?? 0).toBeGreaterThanOrEqual(50);
    expect(byCategory.PHARMACY_MEDICATION ?? 0).toBeGreaterThanOrEqual(75);
    expect(byCategory.PROVIDER_DOCUMENTATION ?? 0).toBeGreaterThanOrEqual(40);
    expect(byCategory.NURSING_DOCUMENTATION ?? 0).toBeGreaterThanOrEqual(40);
    expect(byCategory.CHART_CERTIFICATION ?? 0).toBeGreaterThanOrEqual(20);
    expect(byCategory.SECURITY_CONCURRENCY ?? 0).toBeGreaterThanOrEqual(25);
  });
});
