import { describe, expect, it } from "vitest";
import { buildEnterpriseProcedureBillableReviewMetadata } from "./enterpriseProcedureBillableReview.js";
import {
  appendProcedureRevenueReviewDecision,
  classifyProcedureBillingSideReview,
  deriveInitialProcedureRevenueReviewStatus,
  FORBIDDEN_PROCEDURE_REVENUE_REVIEW_KEYS,
  mapProcedureRevenueDecisionToReviewStatus,
  recommendProcedureRevenueReviewDecision,
  resolveProcedureRevenueReviewStatus,
} from "./enterpriseProcedureRevenueReview.js";
import { resolveProcedureBillingReadiness } from "./resolveProcedureBillingReadiness.js";

function baseMeta(enterpriseProcedureId: string) {
  const readiness = resolveProcedureBillingReadiness({
    enterpriseProcedureId,
    orderItemStatus: "COMPLETED",
    facilityChargeMasterLinked: true,
    documentedProcedureTypes: [],
  });
  return buildEnterpriseProcedureBillableReviewMetadata({
    enterpriseProcedureId,
    orderItemId: "oi-1",
    encounterId: "e-1",
    readiness,
    documentationLinked: !readiness.requiresDocumentationReview,
    facilityChargeMasterLinked: true,
  });
}

describe("enterpriseProcedureRevenueReview (MEDPROC.7)", () => {
  it("maps documentation missing to HOLD_FOR_DOCUMENTATION recommendation", () => {
    const readiness = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "laceration_repair",
      orderItemStatus: "COMPLETED",
      facilityChargeMasterLinked: true,
      documentedProcedureTypes: [],
    });
    expect(recommendProcedureRevenueReviewDecision(readiness)).toBe("HOLD_FOR_DOCUMENTATION");
    expect(deriveInitialProcedureRevenueReviewStatus(readiness)).toBe("NEEDS_DOCUMENTATION");
  });

  it("maps charge master missing to HOLD_FOR_CHARGE_MASTER recommendation", () => {
    const readiness = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "foley_catheter",
      orderItemStatus: "COMPLETED",
      facilityChargeMasterLinked: false,
      documentedProcedureTypes: ["FOLEY_CATHETER"],
    });
    expect(recommendProcedureRevenueReviewDecision(readiness)).toBe("HOLD_FOR_CHARGE_MASTER");
  });

  it("classifies professional/facility review side", () => {
    expect(
      classifyProcedureBillingSideReview({
        enterpriseProcedureId: "endotracheal_intubation",
        billingClassification: "EMERGENCY_DEPARTMENT",
      })
    ).toBe("BOTH_REVIEW_REQUIRED");
    expect(
      classifyProcedureBillingSideReview({
        enterpriseProcedureId: "foley_catheter",
        billingClassification: "URGENT_CARE",
      })
    ).toBe("FACILITY");
  });

  it("appends immutable decision history", () => {
    const meta = baseMeta("endotracheal_intubation");
    const updated = appendProcedureRevenueReviewDecision(meta, {
      decision: "APPROVE_FOR_EXPORT_REVIEW",
      reasonCode: "OTHER_REVIEW_REQUIRED",
      decidedAt: "2026-05-28T12:00:00.000Z",
      decidedByUserId: "u1",
      reviewStatusBefore: "CAPTURED",
      reviewStatusAfter: "APPROVED_FOR_EXPORT",
    });
    expect(updated.decisionHistory).toHaveLength(1);
    expect(updated.revenueReviewStatus).toBe("APPROVED_FOR_EXPORT");
    expect(mapProcedureRevenueDecisionToReviewStatus("REJECT_NOT_BILLABLE")).toBe(
      "REJECTED_NOT_BILLABLE"
    );
  });

  it("output contains no PHI keys", () => {
    const meta = baseMeta("chest_tube");
    const status = resolveProcedureRevenueReviewStatus(meta, "CAPTURED");
    const payload = { ...meta, revenueReviewStatus: status };
    for (const forbidden of FORBIDDEN_PROCEDURE_REVENUE_REVIEW_KEYS) {
      expect(payload).not.toHaveProperty(forbidden);
    }
  });
});
