import {
  applyBillingSafetyFlags,
  blocksAutoApproval,
  buildExactSourceTrace,
  buildPreservedRawJson,
  proposedCell,
  resolveExactSourceInventoryDescription,
} from "./formulary-source-preservation.util";

describe("formulary-source-preservation", () => {
  it("preserves exact medication name, route, and strength without trim or case change", () => {
    const row = {
      source_inventory_description: " Atorvastatin 40 mg tablet PO ",
      source_route_exact: " PO ",
      source_strength_exact: " 40 mg ",
      route: " PO ",
    };
    const trace = buildExactSourceTrace(row);
    expect(trace.exactSourceText).toBe(" Atorvastatin 40 mg tablet PO ");
    expect(trace.sourceRouteExact).toBe(" PO ");
    expect(trace.sourceStrengthExact).toBe(" 40 mg ");
    expect(resolveExactSourceInventoryDescription(row)).toBe(
      " Atorvastatin 40 mg tablet PO "
    );
    expect(proposedCell(row, "route")).toBe("PO");
  });

  it("does not substitute generic_name for source inventory description", () => {
    const row = { generic_name: "Atorvastatin" };
    expect(resolveExactSourceInventoryDescription(row)).toBe("");
  });

  it("stores exact fields in preserved rawJson without mutation", () => {
    const row = { source_inventory_description: "Epinephrine 1mg/mL IV", route: "IV" };
    const trace = buildExactSourceTrace(row);
    const json = buildPreservedRawJson(row, trace);
    expect(json.source_inventory_description).toBe("Epinephrine 1mg/mL IV");
    expect((json.__sourceTrace as { exactSourceText: string }).exactSourceText).toBe(
      "Epinephrine 1mg/mL IV"
    );
  });

  it("flags billing and NDC review when HCPCS or NDC missing — no guessing", () => {
    const augment = applyBillingSafetyFlags({
      row: { ndc11: "", hcpcs_j_code_suggested: "" },
      ndc11: null,
      hcpcsCodeSuggested: null,
      billingReviewStatus: null,
      reviewFlags: [],
    });
    expect(augment.reviewFlags).toContain("BILLING_REVIEW_REQUIRED");
    expect(augment.reviewFlags).toContain("NDC_REVIEW_REQUIRED");
    expect(augment.billingReviewStatus).toBe("pending");
    expect(augment.hcpcsCodeSuggested).toBeNull();
  });

  it("blocks auto-approval for OCR/manual review rows", () => {
    const trace = buildExactSourceTrace({
      source_inventory_description: "Line from PDF",
      source_review_status: "OCR_REVIEW_REQUIRED",
    });
    expect(blocksAutoApproval(trace, "approved")).toBe(true);
  });
});
