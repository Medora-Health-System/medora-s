import { describe, expect, it } from "vitest";
import {
  buildObservationWorkspaceD3dBenchmarkCases,
  observationWorkspaceD3dBenchmarkSummary,
} from "./observationWorkspaceD3dBenchmark.js";
import { observationWorkspaceEnabled } from "./observationWorkspaceFeatureFlag.js";

describe("D3D Observation workspace benchmark", () => {
  it("keeps observation workspace feature flag OFF by default", () => {
    expect(observationWorkspaceEnabled({})).toBe(false);
    expect(observationWorkspaceEnabled(undefined)).toBe(false);
  });

  it("provides at least 200 deterministic scenarios", () => {
    const cases = buildObservationWorkspaceD3dBenchmarkCases();
    expect(cases.length).toBeGreaterThanOrEqual(200);
  });

  it("passes the full D3D benchmark suite", () => {
    const summary = observationWorkspaceD3dBenchmarkSummary();
    expect(summary.failed).toEqual([]);
    expect(summary.passed).toBe(summary.total);
    expect(summary.total).toBeGreaterThanOrEqual(200);
  });

  it("covers required clinical categories", () => {
    const categories = new Set(buildObservationWorkspaceD3dBenchmarkCases().map((c) => c.category));
    for (const required of [
      "OBSERVATION_ADMISSION",
      "OBSERVATION_DISCHARGE",
      "OBSERVATION_CONVERSION",
      "OBSERVATION_AMA",
      "OBSERVATION_TRANSFER",
      "MEDICATION_CONTINUATION",
      "REASSESSMENT",
      "BILLING_BOUNDARY",
      "TIMELINE",
      "CERTIFICATION",
      "PROVIDER_DOCUMENTATION",
      "NURSING",
      "ORDERS",
    ]) {
      expect(categories.has(required)).toBe(true);
    }
  });
});
