import { describe, expect, it } from "vitest";
import {
  buildClinicalIdentityAdmissionPathwaysD3e5BenchmarkCases,
  clinicalIdentityD3e5BenchmarkCaseCount,
} from "./clinicalIdentityAdmissionPathwaysD3e5Benchmark.js";
import { resolveClinicalEncounterContext } from "./clinicalEncounterIdentity.js";

describe("D3E.5 clinical identity & admission pathways", () => {
  it("includes at least 450 deterministic scenarios", () => {
    expect(clinicalIdentityD3e5BenchmarkCaseCount()).toBeGreaterThanOrEqual(450);
  });

  it("all scenarios match expected === actual", () => {
    for (const c of buildClinicalIdentityAdmissionPathwaysD3e5BenchmarkCases()) {
      expect(c.actual, `${c.id} [${c.category}] ${c.signal}`).toBe(c.expected);
    }
  });

  it("never classifies OPEN Inpatient + admittedAt as Observation without explicit markers", () => {
    const ctx = resolveClinicalEncounterContext({
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: "2026-07-21T12:00:00.000Z",
      admissionSummaryJson: { admissionReason: "Direct admit" },
    });
    expect(ctx).toBe("INPATIENT");
  });

  it("keeps Observation over 24h as Observation until conversion markers", () => {
    const ctx = resolveClinicalEncounterContext({
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: "2026-07-19T12:00:00.000Z",
      admissionSummaryJson: { requestedEncounterType: "OBSERVATION", d3cReceiving: true },
      billingClassification: "OBSERVATION",
    });
    expect(ctx).toBe("OBSERVATION");
  });
});
