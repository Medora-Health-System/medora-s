import { evaluatePromotionEligibility } from "./promotion-eligibility.util";

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "st-1",
    facilityId: "fac-1",
    batchId: "batch-1",
    sourceRowId: "PRI_001",
    sourceInventorySku: null,
    sourceInventoryDescription: "Norepinephrine",
    rawJson: {
      generic_name: "Norepinephrine",
      display_name_fr: "Norépinéphrine",
      concentration_display: "4 mg/4 mL",
      infusion_capable: "no",
      controlled_substance: "no",
      high_alert: "yes",
      rsi_formulary: "no",
    },
    proposedConceptCode: "CONCEPT_NOREPINEPHRINE",
    proposedProductCode: "NOREPINEPHRINE_IV",
    proposedPackageCode: "NOREPINEPHRINE_IV_PKG",
    reconciliationStatus: "NEW_PRODUCT_REQUIRED",
    importGateStatus: "READY",
    overallStatus: "approved",
    reviewFlags: null,
    ndc11: null,
    hcpcsCodeSuggested: null,
    billingReviewStatus: "approved",
    safetyReviewStatus: "approved",
    infusionReviewStatus: null,
    pharmacySignoff: "Pharmacy Lead",
    nursingSignoff: null,
    edMdSignoff: null,
    complianceSignoff: null,
    validationErrors: null,
    importedAt: null,
    importedByUserId: null,
    promotionResultJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("evaluatePromotionEligibility", () => {
  it("allows approved READY row with signoffs", () => {
    expect(evaluatePromotionEligibility(baseRow() as never)).toEqual({ eligible: true });
  });

  it("blocks when gates incomplete", () => {
    const r = evaluatePromotionEligibility(
      baseRow({ importGateStatus: "BLOCKED", overallStatus: "draft" }) as never
    );
    expect(r.eligible).toBe(false);
    if (!r.eligible) {
      expect(r.reasons.some((x) => x.code === "IMPORT_GATE")).toBe(true);
    }
  });

  it("blocks when validation errors present", () => {
    const r = evaluatePromotionEligibility(
      baseRow({
        validationErrors: [{ code: "INVALID_ENUM", message: "bad route" }],
      }) as never
    );
    expect(r.eligible).toBe(false);
  });
});
