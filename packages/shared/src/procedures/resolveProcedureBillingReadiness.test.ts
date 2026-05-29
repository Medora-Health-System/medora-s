import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_PROCEDURE_BILLING_READINESS_KEYS,
  resolveEnterpriseProcedureFacilityChargeMasterLinked,
  resolveProcedureBillingReadiness,
} from "./resolveProcedureBillingReadiness.js";

describe("resolveProcedureBillingReadiness (MEDPROC.5)", () => {
  it("intubation returns suggested CPT candidate with reviewRequired", () => {
    const result = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "endotracheal_intubation",
      orderItemStatus: "COMPLETED",
      facilityChargeMasterLinked: true,
      documentationCompleted: true,
      facilityBillingIdentityComplete: true,
    });
    expect(result.previewOnly).toBe(true);
    expect(result.defaultCodeCandidates).toEqual([
      expect.objectContaining({
        codeSystem: "CPT",
        code: "31500",
        reviewRequired: true,
      }),
    ]);
    expect(result.requiresCoderReview).toBe(true);
    expect(result.readinessStatus).toBe("REVIEW_REQUIRED");
  });

  it("laceration requires coder review", () => {
    const result = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "laceration_repair",
      orderItemStatus: "COMPLETED",
      facilityChargeMasterLinked: true,
      documentationCompleted: true,
    });
    expect(result.requiresCoderReview).toBe(true);
    expect(result.reasons).toContain("CODER_REVIEW_REQUIRED");
    expect(result.readinessStatus).toBe("REVIEW_REQUIRED");
  });

  it("central line requires review", () => {
    const result = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "central_line_placement",
      orderItemStatus: "COMPLETED",
      facilityChargeMasterLinked: true,
      documentationCompleted: true,
    });
    expect(result.requiresCoderReview).toBe(true);
    expect(result.reasons).toContain("CODER_REVIEW_REQUIRED");
  });

  it("foley may be nursing/procedure review", () => {
    const withoutFacilityLink = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "foley_catheter",
      orderItemStatus: "COMPLETED",
      documentedProcedureTypes: ["FOLEY_CATHETER"],
    });
    expect(withoutFacilityLink.mappingStatus).toBe("READY_FOR_REVIEW");
    expect(withoutFacilityLink.requiresCoderReview).toBe(false);
    expect(withoutFacilityLink.reasons).toContain("FACILITY_CHARGE_MASTER_REQUIRED");

    const readyPreview = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "foley_catheter",
      orderItemStatus: "COMPLETED",
      facilityChargeMasterLinked: true,
      documentedProcedureTypes: ["FOLEY_CATHETER"],
      facilityBillingIdentityComplete: true,
    });
    expect(readyPreview.mappingStatus).toBe("CHARGE_MASTER_LINKED");
    expect(readyPreview.readinessStatus).toBe("READY");
  });

  it("unknown/custom care task returns NOT_MAPPED", () => {
    const result = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "custom_bedside_task",
      orderItemStatus: "COMPLETED",
    });
    expect(result.mappingStatus).toBe("NOT_MAPPED");
    expect(result.reasons).toContain("ENTERPRISE_PROCEDURE_NOT_MAPPED");
    expect(result.readinessStatus).toBe("NOT_READY");
  });

  it("missing enterpriseProcedureId returns NOT_APPLICABLE", () => {
    const result = resolveProcedureBillingReadiness({
      enterpriseProcedureId: null,
    });
    expect(result.readinessStatus).toBe("NOT_APPLICABLE");
    expect(result.reasons).toContain("MISSING_ENTERPRISE_PROCEDURE_ID");
  });

  it("missing documentation returns documentation review reason", () => {
    const result = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "laceration_repair",
      orderItemStatus: "COMPLETED",
      facilityChargeMasterLinked: true,
      documentedProcedureTypes: [],
    });
    expect(result.requiresDocumentationReview).toBe(true);
    expect(result.reasons).toContain("DOCUMENTATION_REQUIRED_FOR_BILLING_REVIEW");
  });

  it("facility charge master missing returns facility mapping reason", () => {
    const result = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "foley_catheter",
      orderItemStatus: "COMPLETED",
      facilityChargeMasterLinked: false,
      documentedProcedureTypes: ["FOLEY_CATHETER"],
    });
    expect(result.requiresFacilityChargeMaster).toBe(true);
    expect(result.reasons).toContain("FACILITY_CHARGE_MASTER_REQUIRED");
  });

  it("output contains no PHI keys", () => {
    const result = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "endotracheal_intubation",
      orderItemStatus: "COMPLETED",
    });
    for (const forbidden of FORBIDDEN_PROCEDURE_BILLING_READINESS_KEYS) {
      expect(result).not.toHaveProperty(forbidden);
    }
  });

  it("previewOnly is always true", () => {
    const result = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "endotracheal_intubation",
    });
    expect(result.previewOnly).toBe(true);
  });

  it("resolveEnterpriseProcedureFacilityChargeMasterLinked matches catalog external codes", () => {
    expect(
      resolveEnterpriseProcedureFacilityChargeMasterLinked("endotracheal_intubation", [
        "EKG",
        "endotracheal_intubation",
      ])
    ).toBe(true);
    expect(resolveEnterpriseProcedureFacilityChargeMasterLinked("endotracheal_intubation", ["EKG"])).toBe(
      false
    );
  });
});
