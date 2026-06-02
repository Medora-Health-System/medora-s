import {
  ENTERPRISE_WAVE2_BILLING_MANIFEST,
  ENTERPRISE_WAVE2_FORMULARY_MANIFEST,
} from "@medora/shared";
import {
  evaluateEnterpriseWave2ActivationBillingGate,
  productHasEnterpriseWave2LinkageMarker,
} from "./enterprise-wave2-billing-gate.util";
import { ENTERPRISE_M16D_WAVE2_LINKAGE_MARKER } from "./enterprise-wave2.constants";

describe("enterprise wave2 billing activation gate", () => {
  const sample = ENTERPRISE_WAVE2_FORMULARY_MANIFEST[0]!;
  const billing = ENTERPRISE_WAVE2_BILLING_MANIFEST[0]!;

  it("detects wave2 linkage marker in governance notes", () => {
    expect(
      productHasEnterpriseWave2LinkageMarker(`prefix\n${ENTERPRISE_M16D_WAVE2_LINKAGE_MARKER}`)
    ).toBe(true);
    expect(productHasEnterpriseWave2LinkageMarker("HAITI_M15E_ONLY")).toBe(false);
  });

  it("allows activation when billing chain complete", () => {
    const gate = evaluateEnterpriseWave2ActivationBillingGate({
      governanceNotes: ENTERPRISE_M16D_WAVE2_LINKAGE_MARKER,
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

  it("blocks activation without billing profile for wave2 products", () => {
    const gate = evaluateEnterpriseWave2ActivationBillingGate({
      governanceNotes: ENTERPRISE_M16D_WAVE2_LINKAGE_MARKER,
      snapshot: {
        catalogCode: sample.catalogCode,
        hasBillingProfile: false,
      },
    });
    expect(gate.allowed).toBe(false);
    expect(gate.blockers).toContain("BILLING_REVIEW_REQUIRED");
  });

  it("ignores non-wave2 products", () => {
    const gate = evaluateEnterpriseWave2ActivationBillingGate({
      governanceNotes: "HAITI_M15E_LINKAGE_ONLY",
      snapshot: { catalogCode: sample.catalogCode, hasBillingProfile: false },
    });
    expect(gate.allowed).toBe(true);
  });
});
