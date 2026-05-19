import { validateWorkbookRow } from "./formulary-import-validation.util";

function minimalRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    workbook_row_id: "PRI_001",
    source_inventory_description: "Atorvastatin 40 mg tablet PO",
    generic_name: "Atorvastatin",
    display_name_fr: "Atorvastatine 40 mg comprimé PO",
    concentration_display: "40 mg",
    route: "PO",
    dosage_form: "tablet",
    administration_type: "ORAL",
    package_type: "TABLET_BOTTLE",
    package_description: "tablet",
    reconciliation_status: "NEW_PRODUCT_REQUIRED",
    billing_unit_strategy: "PER_EACH",
    wastage_billable: "no",
    billing_review_status: "approved",
    controlled_substance: "no",
    high_alert: "no",
    lasa_risk: "none",
    safety_review_status: "approved",
    infusion_capable: "no",
    mar_workflow: "SINGLE_DOSE",
    bedside_administer: "yes",
    pharmacy_dispense: "no",
    default_fulfillment_intent: "ADMINISTER_CHART",
    formulary_category: "OTHER",
    ed_formulary: "yes",
    unit_of_measure_stock: "tablet",
    unit_of_measure_billing: "each",
    import_gate_status: "READY",
    overall_status: "approved",
    pharmacy_signoff: "Pharmacy Lead",
    nursing_signoff: "Charge RN",
    ed_md_signoff: "ED MD",
    ...overrides,
  };
}

describe("validateWorkbookRow — exact source preservation (19E.0)", () => {
  it("stores exact source text in sourceInventoryDescription and preservedRawJson", () => {
    const row = minimalRow({
      source_inventory_description: " Atorvastatin 40 mg tablet PO ",
      route: " PO ",
    });
    const v = validateWorkbookRow(row, 0);
    expect(v.sourceInventoryDescription).toBe(" Atorvastatin 40 mg tablet PO ");
    expect(v.exactSource.exactSourceText).toBe(" Atorvastatin 40 mg tablet PO ");
    expect(v.preservedRawJson.source_inventory_description).toBe(" Atorvastatin 40 mg tablet PO ");
    expect(v.raw.route).toBe(" PO ");
  });

  it("rejects missing exact source even when generic_name is present", () => {
    const v = validateWorkbookRow(
      minimalRow({ source_inventory_description: "", generic_name: "Atorvastatin" }),
      0
    );
    expect(v.isValid).toBe(false);
    expect(v.validationErrors.some((e) => e.code === "SOURCE_EXACT_TEXT_REQUIRED")).toBe(true);
    expect(v.sourceInventoryDescription).toBe("");
  });

  it("blocks READY gate for OCR_REVIEW_REQUIRED rows", () => {
    const v = validateWorkbookRow(
      minimalRow({
        source_review_status: "OCR_REVIEW_REQUIRED",
        overall_status: "approved",
      }),
      0
    );
    expect(v.importGateStatus).toBe("BLOCKED");
    expect(v.overallStatus).toBe("draft");
    expect(v.reviewFlags).toContain("OCR_REVIEW_REQUIRED");
  });

  it("adds BILLING_REVIEW_REQUIRED when HCPCS missing", () => {
    const v = validateWorkbookRow(
      minimalRow({
        hcpcs_j_code_suggested: "",
        ndc11: "",
        billing_review_status: "",
        review_flags: "",
      }),
      0
    );
    expect(v.reviewFlags).toContain("BILLING_REVIEW_REQUIRED");
    expect(v.billingReviewStatus).toBe("pending");
  });
});
