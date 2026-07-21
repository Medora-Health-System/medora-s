import { describe, expect, it } from "vitest";
import {
  assertHospitalCensusD3e6aBenchmark,
  buildHospitalCensusD3e6aBenchmarkCases,
} from "./hospitalCensusD3e6aBenchmark.js";

describe("D3E.6A unified hospital census benchmark", () => {
  it("includes at least 800 deterministic scenarios", () => {
    expect(buildHospitalCensusD3e6aBenchmarkCases().length).toBeGreaterThanOrEqual(800);
  });

  it("all scenarios pass", () => {
    const { total, failures } = assertHospitalCensusD3e6aBenchmark();
    expect(total).toBeGreaterThanOrEqual(800);
    expect(failures).toEqual([]);
  });

  it("covers required category floors", () => {
    const cases = buildHospitalCensusD3e6aBenchmarkCases();
    const count = (cat: string) => cases.filter((c) => c.category === cat).length;
    expect(count("CANONICAL_CENSUS")).toBeGreaterThanOrEqual(100);
    expect(count("HC_FLOOR_CONSISTENCY")).toBeGreaterThanOrEqual(100);
    expect(count("OBSERVATION")).toBeGreaterThanOrEqual(80);
    expect(count("INPATIENT")).toBeGreaterThanOrEqual(80);
    expect(count("OPERATIONAL_SNAPSHOT")).toBeGreaterThanOrEqual(80);
    expect(count("SEARCH_FILTER")).toBeGreaterThanOrEqual(80);
    expect(count("BED_SUMMARY")).toBeGreaterThanOrEqual(60);
    expect(count("FEATURE_FLAGS")).toBeGreaterThanOrEqual(60);
    expect(count("EMPTY_STATES")).toBeGreaterThanOrEqual(60);
    expect(count("AUTH_FACILITY")).toBeGreaterThanOrEqual(50);
    expect(count("PRESENTATION")).toBeGreaterThanOrEqual(50);
  });
});
