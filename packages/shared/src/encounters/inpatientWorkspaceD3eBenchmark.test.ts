import { describe, expect, it } from "vitest";
import {
  buildInpatientWorkspaceD3eBenchmarkCases,
  inpatientD3eBenchmarkCaseCount,
} from "./inpatientWorkspaceD3eBenchmark.js";

describe("D3E inpatient workspace benchmark", () => {
  it("includes at least 400 deterministic scenarios", () => {
    expect(inpatientD3eBenchmarkCaseCount()).toBeGreaterThanOrEqual(400);
  });

  it("all scenarios match expected === actual", () => {
    const cases = buildInpatientWorkspaceD3eBenchmarkCases();
    for (const c of cases) {
      expect(c.actual, `${c.id} [${c.category}] ${c.signal}`).toBe(c.expected);
    }
  });

  it("covers required clinical categories", () => {
    const cats = new Set(buildInpatientWorkspaceD3eBenchmarkCases().map((c) => c.category));
    for (const required of [
      "ADMISSION",
      "HISTORY_PHYSICAL",
      "DAILY_PROGRESS",
      "NURSING",
      "ORDERS",
      "LABORATORY",
      "RADIOLOGY",
      "PHARMACY",
      "MAR",
      "MEDICATION_CONTINUATION",
      "CONSULT",
      "CARE_PLAN",
      "DISCHARGE",
      "TIMELINE",
      "CERTIFICATION",
      "SECURITY",
      "CONCURRENCY",
      "INTEROPERABILITY",
      "READMISSION",
      "FEATURE_FLAGS",
    ]) {
      expect(cats.has(required), required).toBe(true);
    }
  });
});
