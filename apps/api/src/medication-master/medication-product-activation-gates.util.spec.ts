import {
  evaluateApproveFormularyGate,
  evaluateEnableBillingGate,
  evaluateEnableMarGate,
  evaluateEnableOrderSearchGate,
  evaluateProviderOrderSearchGate,
} from "./medication-product-activation-gates.util";
import { defaultProductRuntimeActivationMeta } from "./medication-product-runtime-activation.util";
import { defaultPriorityErGovernanceMeta } from "./priority-er-inventory-governance.util";

describe("medication-product-activation-gates.util", () => {
  const duplicateOk = { allowed: true, blockers: [] as import("./medication-product-activation-gates.util").ActivationGateBlockerCode[] };

  it("requires confirmations and note for formulary approval", () => {
    const gate = evaluateApproveFormularyGate({
      governanceStatus: "ACTIVATION_APPROVED",
      confirmExactSourcePreserved: false,
      confirmDuplicateGovernanceResolved: true,
      note: "",
      duplicateGate: duplicateOk,
      hasExactSourceFields: true,
      facilityFormularyExists: true,
    });
    expect(gate.allowed).toBe(false);
    expect(gate.blockers).toEqual(
      expect.arrayContaining(["CONFIRM_EXACT_SOURCE_REQUIRED", "NOTE_REQUIRED"])
    );
  });

  it("blocks order search when formulary not approved", () => {
    const gate = evaluateEnableOrderSearchGate({
      governanceStatus: "ACTIVATION_APPROVED",
      productIsActive: false,
      conceptIsActive: false,
      runtime: defaultProductRuntimeActivationMeta(),
      confirmExactSourcePreserved: true,
      confirmDuplicateGovernanceResolved: true,
      note: "ok",
      duplicateGate: duplicateOk,
      formularyOnFormulary: false,
      ndcReviewRequired: false,
    });
    expect(gate.blockers).toContain("FORMULARY_NOT_APPROVED");
  });

  it("requires order search before MAR", () => {
    const gate = evaluateEnableMarGate({
      runtime: defaultProductRuntimeActivationMeta(),
      administrationType: "ORAL",
      confirmExactSourcePreserved: true,
      confirmDuplicateGovernanceResolved: true,
      note: "ok",
      duplicateGate: duplicateOk,
    });
    expect(gate.blockers).toContain("ORDER_SEARCH_NOT_ENABLED");
  });

  it("requires reviewed billing code and unit", () => {
    const runtime = {
      ...defaultProductRuntimeActivationMeta(),
      orderSearchEnabled: true,
    };
    const gate = evaluateEnableBillingGate({
      runtime,
      reviewedBillingCode: "TBD",
      reviewedBillingUnit: "",
      reviewedByRole: "",
      confirmExactSourcePreserved: true,
      confirmDuplicateGovernanceResolved: true,
      note: "ok",
      duplicateGate: duplicateOk,
    });
    expect(gate.blockers).toEqual(
      expect.arrayContaining(["BILLING_CODE_REQUIRED", "BILLING_UNIT_REQUIRED", "BILLING_ROLE_REQUIRED"])
    );
  });

  it("provider search gate preserves legacy catalog when product inactive and order search disabled", () => {
    const gate = evaluateProviderOrderSearchGate({
      productIsActive: false,
      conceptIsActive: false,
      governanceStatus: "REVIEW_REQUIRED",
      formularyOnFormulary: false,
      facilityId: "fac-a",
      formularyFacilityId: "fac-a",
      runtime: defaultProductRuntimeActivationMeta(),
      stagingGovernance: null,
      reconciliationStatus: null,
      reviewFlags: [],
    });
    expect(gate.allowed).toBe(true);
    expect(gate.blockers).toEqual([]);
  });

  it("provider search gate blocks active product without order search enabled", () => {
    const gate = evaluateProviderOrderSearchGate({
      productIsActive: true,
      conceptIsActive: true,
      governanceStatus: "ACTIVATION_APPROVED",
      formularyOnFormulary: true,
      facilityId: "fac-a",
      formularyFacilityId: "fac-a",
      runtime: defaultProductRuntimeActivationMeta(),
      stagingGovernance: null,
      reconciliationStatus: null,
      reviewFlags: [],
    });
    expect(gate.allowed).toBe(false);
    expect(gate.blockers).toContain("ORDER_SEARCH_NOT_ENABLED");
  });

  it("provider search gate blocks legacy preservation when governance is BLOCKED", () => {
    const gate = evaluateProviderOrderSearchGate({
      productIsActive: false,
      conceptIsActive: false,
      governanceStatus: "BLOCKED",
      formularyOnFormulary: false,
      facilityId: "fac-a",
      formularyFacilityId: "fac-a",
      runtime: defaultProductRuntimeActivationMeta(),
      stagingGovernance: null,
      reconciliationStatus: null,
      reviewFlags: [],
    });
    expect(gate.allowed).toBe(false);
    expect(gate.blockers).toContain("PRODUCT_INACTIVE");
  });

  it("blocks unresolved duplicate governance", () => {
    const gov = {
      ...defaultPriorityErGovernanceMeta(),
      governanceDecision: "UNREVIEWED" as const,
      duplicateResolutionStatus: "UNREVIEWED" as const,
    };
    const gate = evaluateProviderOrderSearchGate({
      productIsActive: true,
      conceptIsActive: true,
      governanceStatus: "ACTIVATION_APPROVED",
      formularyOnFormulary: true,
      facilityId: "fac-a",
      formularyFacilityId: "fac-a",
      runtime: { ...defaultProductRuntimeActivationMeta(), orderSearchEnabled: true },
      stagingGovernance: gov,
      reconciliationStatus: "POSSIBLE_DUPLICATE",
      reviewFlags: [],
    });
    expect(gate.allowed).toBe(false);
    expect(gate.blockers).toContain("DUPLICATE_GOVERNANCE_UNRESOLVED");
  });
});
