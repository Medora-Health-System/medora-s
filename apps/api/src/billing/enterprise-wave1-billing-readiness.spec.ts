import {
  ENTERPRISE_WAVE1_BILLING_MANIFEST,
  ENTERPRISE_WAVE1_FORMULARY_MANIFEST,
  validateWave1MedicationBillingReadiness,
} from "@medora/shared";

describe("enterprise wave1 billing readiness (API)", () => {
  it("every manifest row passes billing readiness with full snapshot", () => {
    const failures: string[] = [];
    for (let i = 0; i < ENTERPRISE_WAVE1_FORMULARY_MANIFEST.length; i++) {
      const entry = ENTERPRISE_WAVE1_FORMULARY_MANIFEST[i]!;
      const billing = ENTERPRISE_WAVE1_BILLING_MANIFEST[i]!;
      const result = validateWave1MedicationBillingReadiness(entry.catalogCode, {
        catalogCode: entry.catalogCode,
        billingCodeDefault: billing.hcpcs,
        ndc11: billing.ndc11,
        packageNdc11: billing.ndc11,
        billingProfileHcpcs: billing.hcpcs,
        hasBillingProfile: true,
      });
      if (!result.billingPass) {
        failures.push(`${entry.catalogCode}: ${result.failures.join(", ")}`);
      }
      if (entry.bucket === "VACCINE") {
        expect(billing.administrationCpt?.trim()).toBeTruthy();
        expect(billing.cvxCode?.trim()).toBeTruthy();
      }
    }
    expect(failures).toEqual([]);
  });
});
