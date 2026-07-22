import { describe, expect, it } from "vitest";
import { CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID } from "../patients/patientSearchAndSelectV1.js";
import {
  assertConnectedInpatientAdmissionIntakeD4a0Benchmark,
  buildConnectedInpatientAdmissionIntakeD4a0BenchmarkCases,
} from "./connectedInpatientAdmissionIntakeD4a0Benchmark.js";

describe("D4A.0 connected inpatient admission intake benchmark", () => {
  it("includes at least 1800 deterministic scenarios", () => {
    expect(buildConnectedInpatientAdmissionIntakeD4a0BenchmarkCases().length).toBeGreaterThanOrEqual(
      1800
    );
  });

  it("all scenarios pass", () => {
    const { total, failures } = assertConnectedInpatientAdmissionIntakeD4a0Benchmark();
    expect(total).toBeGreaterThanOrEqual(1800);
    expect(failures).toEqual([]);
  });

  it("uses CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID", () => {
    const cases = buildConnectedInpatientAdmissionIntakeD4a0BenchmarkCases();
    const certCases = cases.filter(
      (c) =>
        c.expected === CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID ||
        c.actual === CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID
    );
    expect(certCases.length).toBeGreaterThan(0);
    expect(
      certCases.every(
        (c) =>
          c.expected === CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID &&
          c.actual === CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID
      )
    ).toBe(true);
  });

  it("covers required category floors", () => {
    const cases = buildConnectedInpatientAdmissionIntakeD4a0BenchmarkCases();
    const count = (cat: string) => cases.filter((c) => c.category === cat).length;
    expect(count("PATIENT_SEARCH")).toBeGreaterThanOrEqual(180);
    expect(count("PATIENT_SELECTION")).toBeGreaterThanOrEqual(120);
    expect(count("DEMOGRAPHIC_CONFIRMATION")).toBeGreaterThanOrEqual(100);
    expect(count("DUPLICATE_PATIENT_PREVENTION")).toBeGreaterThanOrEqual(120);
    expect(count("ADMISSION_SOURCE")).toBeGreaterThanOrEqual(120);
    expect(count("UNIT_BED_SELECTION")).toBeGreaterThanOrEqual(150);
    expect(count("ATOMIC_BED_ASSIGNMENT")).toBeGreaterThanOrEqual(180);
    expect(count("ADMISSION_CORRELATION")).toBeGreaterThanOrEqual(160);
    expect(count("EXISTING_ADMISSION_RESUME")).toBeGreaterThanOrEqual(100);
    expect(count("ED_DATA_PRELOAD")).toBeGreaterThanOrEqual(160);
    expect(count("BELONGINGS_VALUABLES")).toBeGreaterThanOrEqual(120);
    expect(count("WOUND_SKIN")).toBeGreaterThanOrEqual(120);
    expect(count("AUTHORIZATION_SECURITY")).toBeGreaterThanOrEqual(100);
    expect(count("CONCURRENCY")).toBeGreaterThanOrEqual(80);
    expect(count("I18N_UI_CONTRACT")).toBeGreaterThanOrEqual(70);
  });
});
