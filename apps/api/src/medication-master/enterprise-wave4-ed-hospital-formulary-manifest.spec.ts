import {
  ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST,
  assertEnterpriseWave4EdHospitalFormularyManifest,
  countWave4GovernanceMarkers,
  validateWave4HydromorphoneDoubleRnPolicy,
} from "@medora/shared";

describe("M1.7C — Enterprise Wave 4 ED/Hospital formulary manifest (API import)", () => {
  it("loads manifest from @medora/shared and passes validation", () => {
    expect(() => assertEnterpriseWave4EdHospitalFormularyManifest()).not.toThrow();
    expect(ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.length).toBeGreaterThanOrEqual(150);
  });

  it("exposes governance counts for staging audits", () => {
    const counts = countWave4GovernanceMarkers();
    expect(counts.thrombolyticCount).toBeGreaterThanOrEqual(2);
    expect(counts.antidoteCount).toBeGreaterThan(0);
    expect(counts.byBucket.TOXICOLOGY).toBeGreaterThan(0);
  });

  it("hydromorphone regression guard via shared validation", () => {
    expect(validateWave4HydromorphoneDoubleRnPolicy()).toEqual([]);
  });
});
