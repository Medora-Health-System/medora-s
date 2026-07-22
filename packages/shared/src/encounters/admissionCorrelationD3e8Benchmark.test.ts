import { describe, expect, it } from "vitest";
import {
  assertAdmissionCorrelationD3e8Benchmark,
  buildAdmissionCorrelationD3e8BenchmarkCases,
} from "./admissionCorrelationD3e8Benchmark.js";

describe("D3E.8 admission correlation benchmark", () => {
  it("includes at least 1200 deterministic scenarios", () => {
    expect(buildAdmissionCorrelationD3e8BenchmarkCases().length).toBeGreaterThanOrEqual(1200);
  });

  it("all scenarios pass", () => {
    const { total, failures } = assertAdmissionCorrelationD3e8Benchmark();
    expect(total).toBeGreaterThanOrEqual(1200);
    expect(failures).toEqual([]);
  });

  it("covers required category floors", () => {
    const cases = buildAdmissionCorrelationD3e8BenchmarkCases();
    const count = (cat: string) => cases.filter((c) => c.category === cat).length;
    expect(count("DOMAIN")).toBeGreaterThanOrEqual(100);
    expect(count("STORAGE_VERSION")).toBeGreaterThanOrEqual(100);
    expect(count("ED_PLACEMENT")).toBeGreaterThanOrEqual(120);
    expect(count("NURSE_INTAKE")).toBeGreaterThanOrEqual(120);
    expect(count("DIRECT_ADMISSION")).toBeGreaterThanOrEqual(100);
    expect(count("SCHEDULED_TRANSFER")).toBeGreaterThanOrEqual(80);
    expect(count("OBS_CONVERSION")).toBeGreaterThanOrEqual(80);
    expect(count("RECEIVING_RESOLUTION")).toBeGreaterThanOrEqual(160);
    expect(count("IDEMPOTENCY_CONCURRENCY")).toBeGreaterThanOrEqual(120);
    expect(count("HOSPITAL_EPISODE")).toBeGreaterThanOrEqual(80);
    expect(count("CANCELLATION")).toBeGreaterThanOrEqual(60);
    expect(count("LEGACY")).toBeGreaterThanOrEqual(50);
    expect(count("AUTH_SECURITY")).toBeGreaterThanOrEqual(50);
  });
});
