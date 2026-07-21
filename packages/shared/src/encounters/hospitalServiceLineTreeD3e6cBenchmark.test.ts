import { describe, expect, it } from "vitest";
import {
  assertHospitalServiceLineTreeD3e6cBenchmark,
  buildHospitalServiceLineTreeD3e6cBenchmarkCases,
} from "./hospitalServiceLineTreeD3e6cBenchmark.js";

describe("D3E.6C graphical hospital unit tree benchmark", () => {
  it("includes at least 1100 deterministic scenarios", () => {
    expect(buildHospitalServiceLineTreeD3e6cBenchmarkCases().length).toBeGreaterThanOrEqual(1100);
  });

  it("all scenarios pass", () => {
    const { total, failures } = assertHospitalServiceLineTreeD3e6cBenchmark();
    expect(total).toBeGreaterThanOrEqual(1100);
    expect(failures).toEqual([]);
  });

  it("covers required category floors", () => {
    const cases = buildHospitalServiceLineTreeD3e6cBenchmarkCases();
    const count = (cat: string) => cases.filter((c) => c.category === cat).length;
    expect(count("TREE_CONTRACT")).toBeGreaterThanOrEqual(100);
    expect(count("SERVICE_LINE_GROUP")).toBeGreaterThanOrEqual(100);
    expect(count("NODE_RENDER")).toBeGreaterThanOrEqual(100);
    expect(count("COLOR_A11Y")).toBeGreaterThanOrEqual(100);
    expect(count("ROUTE_NAV")).toBeGreaterThanOrEqual(100);
    expect(count("UNIT_BOARD")).toBeGreaterThanOrEqual(120);
    expect(count("BOARD_PROFILE")).toBeGreaterThanOrEqual(100);
    expect(count("PATIENT_WORKSPACE")).toBeGreaterThanOrEqual(80);
    expect(count("UNIT_MOVEMENT")).toBeGreaterThanOrEqual(80);
    expect(count("PLACEMENT_OFF")).toBeGreaterThanOrEqual(80);
    expect(count("FACILITY_CONFIG")).toBeGreaterThanOrEqual(60);
    expect(count("AUTH")).toBeGreaterThanOrEqual(50);
    expect(count("RESPONSIVE")).toBeGreaterThanOrEqual(50);
    expect(count("BED_MGMT")).toBeGreaterThanOrEqual(30);
    expect(count("REGRESSION")).toBeGreaterThanOrEqual(50);
  });
});
