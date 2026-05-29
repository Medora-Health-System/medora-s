import { describe, expect, it } from "vitest";
import {
  buildEnterpriseProcedureBillableReviewMetadata,
  evaluateEnterpriseProcedureBillableReviewEligibility,
  FORBIDDEN_ENTERPRISE_PROCEDURE_BILLABLE_REVIEW_METADATA_KEYS,
  isEnterpriseProcedureBillableReviewMetadata,
  parseEnterpriseProcedureBillableReviewEventSummary,
} from "./enterpriseProcedureBillableReview.js";
import { resolveProcedureBillingReadiness } from "./resolveProcedureBillingReadiness.js";

describe("enterpriseProcedureBillableReview (MEDPROC.6)", () => {
  it("readiness READY generates review eligibility", () => {
    const readiness = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "foley_catheter",
      orderItemStatus: "COMPLETED",
      facilityChargeMasterLinked: true,
      documentedProcedureTypes: ["FOLEY_CATHETER"],
      facilityBillingIdentityComplete: true,
    });
    expect(readiness.readinessStatus).toBe("READY");
    expect(
      evaluateEnterpriseProcedureBillableReviewEligibility({
        enterpriseProcedureId: "foley_catheter",
        readinessStatus: readiness.readinessStatus,
        orderCompleted: true,
        orderCancelled: false,
      })
    ).toBe(true);
  });

  it("NOT_READY does not generate eligibility", () => {
    expect(
      evaluateEnterpriseProcedureBillableReviewEligibility({
        enterpriseProcedureId: "custom_bedside_task",
        readinessStatus: "NOT_READY",
        orderCompleted: true,
        orderCancelled: false,
      })
    ).toBe(false);
  });

  it("missing enterpriseProcedureId does not generate eligibility", () => {
    expect(
      evaluateEnterpriseProcedureBillableReviewEligibility({
        enterpriseProcedureId: null,
        readinessStatus: "READY",
        orderCompleted: true,
        orderCancelled: false,
      })
    ).toBe(false);
  });

  it("REVIEW_REQUIRED still generates eligibility (coder review path)", () => {
    const readiness = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "chest_tube",
      orderItemStatus: "COMPLETED",
      facilityChargeMasterLinked: true,
      documentationCompleted: true,
    });
    expect(readiness.readinessStatus).toBe("REVIEW_REQUIRED");
    expect(
      evaluateEnterpriseProcedureBillableReviewEligibility({
        enterpriseProcedureId: "chest_tube",
        readinessStatus: readiness.readinessStatus,
        orderCompleted: true,
        orderCancelled: false,
      })
    ).toBe(true);
  });

  it("builds PHI-safe metadata without forbidden keys", () => {
    const readiness = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "endotracheal_intubation",
      orderItemStatus: "COMPLETED",
      facilityChargeMasterLinked: true,
      documentationCompleted: true,
    });
    const metadata = buildEnterpriseProcedureBillableReviewMetadata({
      enterpriseProcedureId: "endotracheal_intubation",
      orderItemId: "oi-1",
      encounterId: "e-1",
      readiness,
      documentationLinked: true,
      facilityChargeMasterLinked: true,
    });
    expect(metadata.sourceType).toBe("PROCEDURE_ORDER");
    expect(metadata.previewCodeCandidates[0]?.reviewRequired).toBe(true);
    for (const forbidden of FORBIDDEN_ENTERPRISE_PROCEDURE_BILLABLE_REVIEW_METADATA_KEYS) {
      expect(metadata).not.toHaveProperty(forbidden);
    }
  });

  it("parses billing event summary for revenue review", () => {
    const readiness = resolveProcedureBillingReadiness({
      enterpriseProcedureId: "endotracheal_intubation",
      orderItemStatus: "COMPLETED",
      documentationCompleted: false,
      facilityChargeMasterLinked: false,
    });
    const metadata = buildEnterpriseProcedureBillableReviewMetadata({
      enterpriseProcedureId: "endotracheal_intubation",
      orderItemId: "oi-1",
      encounterId: "e-1",
      readiness,
      documentationLinked: false,
      facilityChargeMasterLinked: false,
    });
    expect(isEnterpriseProcedureBillableReviewMetadata(metadata)).toBe(true);
    const summary = parseEnterpriseProcedureBillableReviewEventSummary({
      billingEventId: "be-1",
      orderItemId: "oi-1",
      metadata,
      reviewStatus: "CAPTURED",
      createdAt: "2026-05-28T12:00:00.000Z",
    });
    expect(summary?.requiresDocumentationReview).toBe(true);
    expect(summary?.reviewWarnings).toContain("DOCUMENTATION_REVIEW");
    expect(summary?.displayNameFr).toContain("Intubation");
  });
});
