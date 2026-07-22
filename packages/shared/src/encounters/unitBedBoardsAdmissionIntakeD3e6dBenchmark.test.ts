import { describe, expect, it } from "vitest";
import {
  assertUnitBedBoardsAdmissionIntakeD3e6dBenchmark,
  buildUnitBedBoardsAdmissionIntakeD3e6dBenchmarkCases,
} from "./unitBedBoardsAdmissionIntakeD3e6dBenchmark.js";

describe("D3E.6D unit bed boards & admission intake benchmark", () => {
  it("includes at least 1300 deterministic scenarios", () => {
    expect(buildUnitBedBoardsAdmissionIntakeD3e6dBenchmarkCases().length).toBeGreaterThanOrEqual(
      1300
    );
  });

  it("all scenarios pass", () => {
    const { total, failures } = assertUnitBedBoardsAdmissionIntakeD3e6dBenchmark();
    expect(total).toBeGreaterThanOrEqual(1300);
    expect(failures).toEqual([]);
  });

  it("covers required category floors", () => {
    const cases = buildUnitBedBoardsAdmissionIntakeD3e6dBenchmarkCases();
    const count = (cat: string) => cases.filter((c) => c.category === cat).length;
    expect(count("UNIT_BED_BOARD")).toBeGreaterThanOrEqual(120);
    expect(count("FLOOR_BOARD_CONSISTENCY")).toBeGreaterThanOrEqual(100);
    expect(count("PATIENT_SEARCH")).toBeGreaterThanOrEqual(150);
    expect(count("ADMISSION_INTAKE")).toBeGreaterThanOrEqual(180);
    expect(count("CONCURRENT_ENCOUNTER")).toBeGreaterThanOrEqual(120);
    expect(count("IDEMPOTENCY")).toBeGreaterThanOrEqual(120);
    expect(count("ED_TO_INPATIENT")).toBeGreaterThanOrEqual(100);
    expect(count("NURSING_ADMISSION")).toBeGreaterThanOrEqual(120);
    expect(count("UNIT_CHART_PROFILE")).toBeGreaterThanOrEqual(100);
    expect(count("UNIT_TRANSITION")).toBeGreaterThanOrEqual(80);
    expect(count("AUTHORIZATION")).toBeGreaterThanOrEqual(60);
    expect(count("SECURITY")).toBeGreaterThanOrEqual(50);
  });
});
