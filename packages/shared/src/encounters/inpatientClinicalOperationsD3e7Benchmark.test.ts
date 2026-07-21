import { describe, expect, it } from "vitest";
import {
  assertInpatientClinicalOperationsD3e7Benchmark,
  buildInpatientClinicalOperationsD3e7BenchmarkCases,
} from "./inpatientClinicalOperationsD3e7Benchmark.js";

describe("D3E.7 Inpatient clinical operations benchmark", () => {
  it("includes at least 900 deterministic scenarios", () => {
    const cases = buildInpatientClinicalOperationsD3e7BenchmarkCases();
    expect(cases.length).toBeGreaterThanOrEqual(900);
  });

  it("all scenarios pass", () => {
    const { total, failures } = assertInpatientClinicalOperationsD3e7Benchmark();
    expect(total).toBeGreaterThanOrEqual(900);
    expect(failures).toEqual([]);
  });

  it("covers required category floors", () => {
    const cases = buildInpatientClinicalOperationsD3e7BenchmarkCases();
    const count = (cat: string) => cases.filter((c) => c.category === cat).length;
    expect(count("ADMISSION_ACTIONS")).toBeGreaterThanOrEqual(100);
    expect(count("PLACEMENT_ACTIONS")).toBeGreaterThanOrEqual(80);
    expect(count("DIRECT_ADMISSION")).toBeGreaterThanOrEqual(80);
    expect(count("HP_PROGRESS")).toBeGreaterThanOrEqual(100);
    expect(count("NURSING")).toBeGreaterThanOrEqual(120);
    expect(count("ASSIGNMENTS")).toBeGreaterThanOrEqual(60);
    expect(count("CODE_ISOLATION")).toBeGreaterThanOrEqual(50);
    expect(count("CONSULTS")).toBeGreaterThanOrEqual(70);
    expect(count("CARE_PLAN")).toBeGreaterThanOrEqual(60);
    expect(count("DISCHARGE")).toBeGreaterThanOrEqual(80);
    expect(count("MED_RECON")).toBeGreaterThanOrEqual(50);
    expect(count("DEPARTMENTAL")).toBeGreaterThanOrEqual(50);
    expect(count("SECURITY_CONCURRENCY")).toBeGreaterThanOrEqual(50);
    expect(count("FEATURE_SCHEMA")).toBeGreaterThanOrEqual(50);
  });
});
