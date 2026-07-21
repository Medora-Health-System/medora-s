import { describe, expect, it } from "vitest";
import {
  assertHospitalUnitNavigationD3e6bBenchmark,
  buildHospitalUnitNavigationD3e6bBenchmarkCases,
} from "./hospitalUnitNavigationD3e6bBenchmark.js";

describe("D3E.6B unit-based hospital navigation benchmark", () => {
  it("includes at least 900 deterministic scenarios", () => {
    expect(buildHospitalUnitNavigationD3e6bBenchmarkCases().length).toBeGreaterThanOrEqual(900);
  });

  it("all scenarios pass", () => {
    const { total, failures } = assertHospitalUnitNavigationD3e6bBenchmark();
    expect(total).toBeGreaterThanOrEqual(900);
    expect(failures).toEqual([]);
  });

  it("covers required category floors", () => {
    const cases = buildHospitalUnitNavigationD3e6bBenchmarkCases();
    const count = (cat: string) => cases.filter((c) => c.category === cat).length;
    expect(count("UNIT_REGISTRY")).toBeGreaterThanOrEqual(100);
    expect(count("TREE_SELECTION")).toBeGreaterThanOrEqual(100);
    expect(count("UNIT_CENSUS")).toBeGreaterThanOrEqual(100);
    expect(count("ALL_UNITS_AGGREGATE")).toBeGreaterThanOrEqual(80);
    expect(count("ROOM_BED_NESTING")).toBeGreaterThanOrEqual(80);
    expect(count("PLACEMENT_DISABLED")).toBeGreaterThanOrEqual(80);
    expect(count("CHART_PROFILE")).toBeGreaterThanOrEqual(80);
    expect(count("UNIT_TRANSFER_FOUNDATION")).toBeGreaterThanOrEqual(70);
    expect(count("FACILITY_CONFIG")).toBeGreaterThanOrEqual(60);
    expect(count("AUTH")).toBeGreaterThanOrEqual(50);
    expect(count("A11Y_RESPONSIVE")).toBeGreaterThanOrEqual(50);
    expect(count("CONSISTENCY")).toBeGreaterThanOrEqual(50);
  });
});
