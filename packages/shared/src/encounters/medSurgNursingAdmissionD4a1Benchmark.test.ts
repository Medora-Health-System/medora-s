import { describe, expect, it } from "vitest";
import { MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID } from "./medSurgNursingAdmissionD4a1.js";
import {
  assertMedSurgNursingAdmissionD4a1Benchmark,
  buildMedSurgNursingAdmissionD4a1BenchmarkCases,
} from "./medSurgNursingAdmissionD4a1Benchmark.js";

describe("D4A.1 med/surg nursing admission benchmark", () => {
  it("includes at least 2500 deterministic scenarios", () => {
    expect(buildMedSurgNursingAdmissionD4a1BenchmarkCases().length).toBeGreaterThanOrEqual(2500);
  });

  it("all scenarios pass", () => {
    const { total, failures } = assertMedSurgNursingAdmissionD4a1Benchmark();
    expect(total).toBeGreaterThanOrEqual(2500);
    expect(failures).toEqual([]);
  });

  it("uses MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID", () => {
    const cases = buildMedSurgNursingAdmissionD4a1BenchmarkCases();
    const certCases = cases.filter(
      (c) =>
        c.expected === MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID ||
        c.actual === MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID
    );
    expect(certCases.length).toBeGreaterThan(0);
    expect(
      certCases.every(
        (c) =>
          c.expected === MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID &&
          c.actual === MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID
      )
    ).toBe(true);
  });

  it("covers required category floors", () => {
    const cases = buildMedSurgNursingAdmissionD4a1BenchmarkCases();
    const count = (cat: string) => cases.filter((c) => c.category === cat).length;
    expect(count("PRELOAD")).toBeGreaterThanOrEqual(200);
    expect(count("VERIFICATION")).toBeGreaterThanOrEqual(200);
    expect(count("PROVENANCE")).toBeGreaterThanOrEqual(150);
    expect(count("RECONCILIATION")).toBeGreaterThanOrEqual(150);
    expect(count("WOUND")).toBeGreaterThanOrEqual(120);
    expect(count("BELONGINGS")).toBeGreaterThanOrEqual(120);
    expect(count("VALUABLES_CASH")).toBeGreaterThanOrEqual(120);
    expect(count("SAVE_RESUME")).toBeGreaterThanOrEqual(150);
    expect(count("SIGNATURE")).toBeGreaterThanOrEqual(100);
    expect(count("LONGITUDINAL_REUSE")).toBeGreaterThanOrEqual(150);
    expect(count("HEAD_TO_TOE")).toBeGreaterThanOrEqual(150);
    expect(count("COMPLETION")).toBeGreaterThanOrEqual(120);
    expect(count("PROVIDER_HANDOFF")).toBeGreaterThanOrEqual(100);
    expect(count("CONCURRENCY")).toBeGreaterThanOrEqual(100);
    expect(count("SECURITY_INVARIANTS")).toBeGreaterThanOrEqual(100);
    expect(count("I18N_CONTRACT")).toBeGreaterThanOrEqual(80);
  });
});
