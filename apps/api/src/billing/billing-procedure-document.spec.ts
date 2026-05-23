import { getAutoBillDecision } from "./billing.service";
import { isProviderProcedureDocumentationForBilling } from "@medora/shared";
import type { BillingExportRowDto } from "./dto/billing-readiness.dto";

describe("billing procedure documentation (19M.2 / 19M.3)", () => {
  it("never auto-bills documented procedures — review only", () => {
    const row: BillingExportRowDto = {
      orderItemId: "proc-doc_evt-1",
      medoraCode: "PROCEDURE_LACERATION_REPAIR",
      category: "CARE",
      displayName: "Suture de lacération (documentée)",
      billingStatus: "pending_license",
      billingCodeDefault: null,
      quantity: null,
      unit: null,
      notes: "review",
      evidenceSource: "CPT_PENDING_LICENSE",
      reviewAnchorType: "PROCEDURE_DOCUMENTED",
      procedureClinicalEventId: "evt-1",
    };
    const decision = getAutoBillDecision(row);
    expect(decision.canAutoBill).toBe(false);
    expect(decision.requiredReview).toBe(true);
    expect(decision.reviewAnchorType).toBe("PROCEDURE_DOCUMENTED");
  });

  it("excludes nursing-only procedure documentation from billing bridge eligibility", () => {
    expect(
      isProviderProcedureDocumentationForBilling({
        procedureType: "NURSING_PROCEDURE_ASSIST",
        documentationRole: "NURSING",
        assistedProcedureType: "PROCEDURAL_SEDATION",
      })
    ).toBe(false);
    expect(
      isProviderProcedureDocumentationForBilling({
        procedureType: "GLUCOSE_CHECK",
        documentationRole: "NURSING",
      })
    ).toBe(false);
  });
});
