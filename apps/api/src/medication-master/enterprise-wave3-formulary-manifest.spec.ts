import {
  ENTERPRISE_WAVE3_FORMULARY_MANIFEST,
  assertEnterpriseWave3FormularyManifest,
  countWave3GovernanceMarkers,
} from "@medora/shared";

describe("M1.7B — Enterprise Wave 3 formulary manifest (API import)", () => {
  it("loads manifest from @medora/shared and passes validation", () => {
    expect(() => assertEnterpriseWave3FormularyManifest()).not.toThrow();
    expect(ENTERPRISE_WAVE3_FORMULARY_MANIFEST.length).toBeGreaterThanOrEqual(100);
  });

  it("exposes governance counts for staging audits", () => {
    const counts = countWave3GovernanceMarkers();
    expect(counts.biologicCount).toBeGreaterThanOrEqual(2);
    expect(counts.dmardCount).toBeGreaterThanOrEqual(5);
  });
});
