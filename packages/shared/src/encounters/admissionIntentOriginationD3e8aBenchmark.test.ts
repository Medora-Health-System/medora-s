import { describe, expect, it } from "vitest";
import {
  assertAdmissionIntentOriginationD3e8aBenchmark,
  buildAdmissionIntentOriginationD3e8aBenchmarkCases,
  countAdmissionIntentOriginationD3e8aCasesByCategory,
} from "./admissionIntentOriginationD3e8aBenchmark.js";

describe("D3E.8A admission intent origination benchmark", () => {
  it("includes at least 1500 deterministic scenarios", () => {
    expect(buildAdmissionIntentOriginationD3e8aBenchmarkCases().length).toBeGreaterThanOrEqual(1500);
  });

  it("all scenarios pass", () => {
    const { total, failures } = assertAdmissionIntentOriginationD3e8aBenchmark();
    expect(total).toBeGreaterThanOrEqual(1500);
    expect(failures).toEqual([]);
  });

  it("covers required category floors", () => {
    const counts = countAdmissionIntentOriginationD3e8aCasesByCategory();
    expect(counts.ED_INTENT ?? 0).toBeGreaterThanOrEqual(150);
    expect(counts.PLACEMENT_ATTACH ?? 0).toBeGreaterThanOrEqual(120);
    expect(counts.INTENT_IDEMPOTENCY ?? 0).toBeGreaterThanOrEqual(100);
    expect(counts.VERSION_CONCURRENCY ?? 0).toBeGreaterThanOrEqual(150);
    expect(counts.OBS_CONVERSION ?? 0).toBeGreaterThanOrEqual(180);
    expect(counts.CANCELLATION ?? 0).toBeGreaterThanOrEqual(120);
    expect(counts.ORPHAN_PREVENTION ?? 0).toBeGreaterThanOrEqual(100);
    expect(counts.LEGACY ?? 0).toBeGreaterThanOrEqual(150);
    expect(counts.JOURNEY_UI ?? 0).toBeGreaterThanOrEqual(100);
    expect(counts.DIRECT_SCHEDULED_TRANSFER ?? 0).toBeGreaterThanOrEqual(100);
    expect(counts.HOSPITAL_EPISODE ?? 0).toBeGreaterThanOrEqual(100);
    expect(counts.AUTH_SECURITY ?? 0).toBeGreaterThanOrEqual(80);
    expect(counts.FEATURE_FLAGS ?? 0).toBeGreaterThanOrEqual(50);
    expect(counts.REQUIRED ?? 0).toBeGreaterThanOrEqual(16);
  });
});
