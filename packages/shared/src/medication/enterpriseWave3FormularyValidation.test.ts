import { describe, expect, it } from "vitest";
import { ENTERPRISE_WAVE3_FORMULARY_MANIFEST } from "./enterpriseWave3FormularyManifest.js";
import {
  assertEnterpriseWave3FormularyManifest,
  countWave3GovernanceMarkers,
  validateEnterpriseWave3FormularyManifest,
} from "./enterpriseWave3FormularyValidation.js";

describe("M1.7B — Enterprise Wave 3 formulary manifest", () => {
  it("manifest passes strict localization and billing validation", () => {
    expect(validateEnterpriseWave3FormularyManifest()).toEqual([]);
    expect(() => assertEnterpriseWave3FormularyManifest()).not.toThrow();
  });

  it("meets Wave 3 size target (100–150)", () => {
    expect(ENTERPRISE_WAVE3_FORMULARY_MANIFEST.length).toBeGreaterThanOrEqual(100);
    expect(ENTERPRISE_WAVE3_FORMULARY_MANIFEST.length).toBeLessThanOrEqual(150);
  });

  it("reports governance specialty counts", () => {
    const counts = countWave3GovernanceMarkers();
    expect(counts.highAlertCount).toBeGreaterThan(0);
    expect(counts.byBucket.NEPHROLOGY).toBeGreaterThan(0);
    expect(counts.byBucket.DERMATOLOGY).toBeGreaterThan(0);
  });
});
