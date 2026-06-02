import {
  ENTERPRISE_WAVE2_BILLING_MANIFEST,
  ENTERPRISE_WAVE2_FORMULARY_MANIFEST,
  validateWave2MedicationBillingReadiness,
} from "@medora/shared";

describe("enterprise wave2 billing readiness (API)", () => {
  it("every manifest row passes billing readiness with full snapshot", () => {
    const failures: string[] = [];
    for (let i = 0; i < ENTERPRISE_WAVE2_FORMULARY_MANIFEST.length; i++) {
      const entry = ENTERPRISE_WAVE2_FORMULARY_MANIFEST[i]!;
      const billing = ENTERPRISE_WAVE2_BILLING_MANIFEST[i]!;
      const result = validateWave2MedicationBillingReadiness(entry.catalogCode, {
        catalogCode: entry.catalogCode,
        billingCodeDefault: billing.hcpcs,
        ndc11: billing.ndc11,
        packageNdc11: billing.ndc11,
        billingProfileHcpcs: billing.hcpcs,
        hasBillingProfile: true,
        isActive: false,
        governanceStatus: "REVIEW_REQUIRED",
      });
      if (!result.billingPass) {
        failures.push(`${entry.catalogCode}: ${result.failures.join(", ")}`);
      }
      if (!result.activationPass) {
        failures.push(`${entry.catalogCode}: activation not gated`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("manifest meets Wave 2 size target (75+)", () => {
    expect(ENTERPRISE_WAVE2_FORMULARY_MANIFEST.length).toBeGreaterThanOrEqual(75);
  });
});
