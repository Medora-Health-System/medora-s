import {
  ENTERPRISE_WAVE1_BILLING_MANIFEST,
  ENTERPRISE_WAVE1_FORMULARY_MANIFEST,
} from "@medora/shared";
import {
  evaluateEnterpriseWave1ActivationBillingGate,
  productHasEnterpriseWave1LinkageMarker,
} from "./enterprise-wave1-billing-gate.util";
import { ENTERPRISE_M16B_WAVE1_LINKAGE_MARKER } from "./enterprise-wave1.constants";

describe("enterprise wave1 billing activation gate", () => {
  const sample = ENTERPRISE_WAVE1_FORMULARY_MANIFEST[0]!;
  const billing = ENTERPRISE_WAVE1_BILLING_MANIFEST[0]!;

  it("detects wave1 linkage marker in governance notes", () => {
    expect(
      productHasEnterpriseWave1LinkageMarker(`prefix\n${ENTERPRISE_M16B_WAVE1_LINKAGE_MARKER}`)
    ).toBe(true);
    expect(productHasEnterpriseWave1LinkageMarker("HAITI_M15E_ONLY")).toBe(false);
  });

  it("allows activation when billing chain complete", () => {
    const gate = evaluateEnterpriseWave1ActivationBillingGate({
      governanceNotes: ENTERPRISE_M16B_WAVE1_LINKAGE_MARKER,
      snapshot: {
        catalogCode: sample.catalogCode,
        billingCodeDefault: billing.hcpcs,
        ndc11: billing.ndc11,
        packageNdc11: billing.ndc11,
        billingProfileHcpcs: billing.hcpcs,
        hasBillingProfile: true,
      },
    });
    expect(gate.allowed).toBe(true);
    expect(gate.blockers).toEqual([]);
  });

  it("blocks activation without billing profile for wave1 products", () => {
    const gate = evaluateEnterpriseWave1ActivationBillingGate({
      governanceNotes: ENTERPRISE_M16B_WAVE1_LINKAGE_MARKER,
      snapshot: {
        catalogCode: sample.catalogCode,
        hasBillingProfile: false,
      },
    });
    expect(gate.allowed).toBe(false);
    expect(gate.blockers).toContain("BILLING_REVIEW_REQUIRED");
  });

  it("ignores non-wave1 products", () => {
    const gate = evaluateEnterpriseWave1ActivationBillingGate({
      governanceNotes: "HAITI_M15E_LINKAGE_ONLY",
      snapshot: { catalogCode: sample.catalogCode, hasBillingProfile: false },
    });
    expect(gate.allowed).toBe(true);
  });
});
