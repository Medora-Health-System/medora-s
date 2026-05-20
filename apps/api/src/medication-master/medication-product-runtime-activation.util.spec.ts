import {
  deriveRuntimeActivationState,
  mergeProductRuntimeActivation,
  parseProductRuntimeActivation,
} from "./medication-product-runtime-activation.util";

describe("medication-product-runtime-activation.util", () => {
  it("defaults to inactive runtime flags", () => {
    const meta = parseProductRuntimeActivation(null);
    expect(meta.orderSearchEnabled).toBe(false);
    expect(meta.marEnabled).toBe(false);
    expect(meta.billingEnabled).toBe(false);
  });

  it("round-trips runtime activation block in governanceNotes", () => {
    const merged = mergeProductRuntimeActivation("Pharmacy reviewed.", {
      formularyApprovedInactive: true,
      formularyApprovedAt: "2026-05-19T00:00:00.000Z",
    });
    const parsed = parseProductRuntimeActivation(merged);
    expect(parsed.formularyApprovedInactive).toBe(true);
    expect(merged).toContain("Pharmacy reviewed.");
  });

  it("derives ORDER_SEARCH_ENABLED when flags set", () => {
    const state = deriveRuntimeActivationState({
      productIsActive: true,
      conceptIsActive: true,
      governanceStatus: "ACTIVATION_APPROVED",
      formularyOnFormulary: true,
      runtime: {
        ...parseProductRuntimeActivation(null),
        orderSearchEnabled: true,
      },
    });
    expect(state).toBe("ORDER_SEARCH_ENABLED");
  });
});
