import {
  applyDuplicateCodeFlags,
  detectDuplicateProposedCodes,
  validateWorkbookRow,
} from "./formulary-import-validation.util";

function minimalRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    workbook_row_id: "PRI_001",
    source_inventory_description: "Norepinephrine 4mg/4mL",
    generic_name: "Norepinephrine",
    display_name_fr: "Norépinéphrine",
    concentration_display: "4 mg/4 mL",
    route: "IV",
    dosage_form: "injectable",
    administration_type: "PUSH",
    package_type: "VIAL",
    package_description: "4 mL vial",
    reconciliation_status: "NEW_PRODUCT_REQUIRED",
    billing_unit_strategy: "PER_MG",
    wastage_billable: "no",
    billing_review_status: "approved",
    controlled_substance: "no",
    high_alert: "yes",
    lasa_risk: "none",
    safety_review_status: "approved",
    infusion_capable: "no",
    mar_workflow: "SINGLE_DOSE",
    bedside_administer: "yes",
    pharmacy_dispense: "no",
    default_fulfillment_intent: "ADMINISTER_CHART",
    formulary_category: "VASOPRESSOR",
    ed_formulary: "yes",
    unit_of_measure_stock: "vial",
    unit_of_measure_billing: "mg",
    import_gate_status: "READY",
    overall_status: "approved",
    pharmacy_signoff: "Pharmacy Lead",
    nursing_signoff: "Charge RN",
    ed_md_signoff: "ED MD",
    aliases: "levophed",
    ...overrides,
  };
}

describe("validateWorkbookRow", () => {
  it("accepts a minimal valid row", () => {
    const v = validateWorkbookRow(minimalRow(), 0);
    expect(v.isValid).toBe(true);
    expect(v.validationErrors).toHaveLength(0);
  });

  it("rejects invalid enum values", () => {
    const v = validateWorkbookRow(minimalRow({ route: "INVALID_ROUTE" }), 0);
    expect(v.isValid).toBe(false);
    expect(v.validationErrors.some((e) => e.field === "route")).toBe(true);
  });

  it("flags duplicate proposed codes in batch", () => {
    const a = validateWorkbookRow(
      minimalRow({ proposed_product_code: "NOREPINEPHRINE_IV", workbook_row_id: "A" }),
      0
    );
    const b = validateWorkbookRow(
      minimalRow({ proposed_product_code: "NOREPINEPHRINE_IV", workbook_row_id: "B" }),
      1
    );
    const dups = detectDuplicateProposedCodes([a, b]);
    const flagged = applyDuplicateCodeFlags([a, b], dups);
    expect(flagged.every((r) => r.importGateStatus === "BLOCKED")).toBe(true);
  });
});
