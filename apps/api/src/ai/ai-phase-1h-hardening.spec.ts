import { GUARDS_METADATA } from "@nestjs/common/constants";
import { RoleCode } from "@prisma/client";
import { AiChartReviewController } from "./ai-chart-review.controller.js";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { PLATFORM_PRINCIPAL_FACILITY_CONTEXT_KEY } from "../common/guards/roles.decorators.js";
import { externalClinicalReviewSchema } from "./review/external-clinical-review.contract.js";

describe("AI Phase 1H hardening regressions", () => {
  it("keeps authentication ahead of role authorization on the AI controller", () => {
    const guards = (Reflect.getMetadata(GUARDS_METADATA, AiChartReviewController) ?? []) as unknown[];

    expect(guards).toHaveLength(2);
    expect(guards[0]).not.toBe(RolesGuard);
    expect(guards[1]).toBe(RolesGuard);
  });

  it("limits chart review and feedback to Provider, Admin, and Medora Super Admin", () => {
    const expectedRoles = [RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN];
    const reviewHandler = AiChartReviewController.prototype.getChartReview;
    const feedbackHandler = AiChartReviewController.prototype.submitSuggestionFeedback;

    expect(Reflect.getMetadata("roles", reviewHandler)).toEqual(expectedRoles);
    expect(Reflect.getMetadata("roles", feedbackHandler)).toEqual(expectedRoles);
  });

  it("requires explicit facility context for platform-principal AI access", () => {
    const reviewHandler = AiChartReviewController.prototype.getChartReview;
    const feedbackHandler = AiChartReviewController.prototype.submitSuggestionFeedback;

    expect(Reflect.getMetadata(PLATFORM_PRINCIPAL_FACILITY_CONTEXT_KEY, reviewHandler)).toBe(true);
    expect(Reflect.getMetadata(PLATFORM_PRINCIPAL_FACILITY_CONTEXT_KEY, feedbackHandler)).toBe(true);
  });

  it("rejects autonomous model actions such as placing an order", () => {
    const parsed = externalClinicalReviewSchema.safeParse({
      suggestions: [
        {
          category: "ORDER_CONSIDERATION",
          priority: "HIGH",
          title: "Place medication order",
          summary: "Unsafe autonomous action",
          reasoningSummary: "Unsafe autonomous action",
          evidence: [],
          recommendedActions: [
            {
              actionType: "PLACE_ORDER",
              targetSection: "orders",
              label: "Place order",
            },
          ],
          clinicalDisclaimer: "Provider review required.",
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects coding and reimbursement categories from the clinical AI contract", () => {
    const parsed = externalClinicalReviewSchema.safeParse({
      suggestions: [
        {
          category: "CODING_RECOMMENDATION",
          priority: "MEDIUM",
          title: "Select a billing code",
          summary: "Clinical AI must not provide coding advice.",
          reasoningSummary: "Clinical and coding engines remain separated.",
          evidence: [],
          recommendedActions: [],
          clinicalDisclaimer: "Provider review required.",
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts only advisory review/navigation actions", () => {
    const parsed = externalClinicalReviewSchema.safeParse({
      suggestions: [
        {
          category: "RESULT_FOLLOWUP",
          priority: "MEDIUM",
          title: "Review pending result",
          summary: "A result needs clinician review.",
          reasoningSummary: "Based only on supplied encounter facts.",
          evidence: [],
          recommendedActions: [
            {
              actionType: "REVIEW",
              targetSection: "results",
              label: "Review results",
            },
            {
              actionType: "NAVIGATE",
              targetSection: "results",
              label: "Open results",
            },
          ],
          clinicalDisclaimer: "Clinical decision-making remains with the treating clinician.",
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });
});
