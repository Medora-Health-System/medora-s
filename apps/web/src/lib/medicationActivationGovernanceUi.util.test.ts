import { describe, expect, it } from "vitest";
import type { ActivationCandidateRow } from "./medicationActivationGovernanceApi";
import {
  formatActivationApiErrorMessage,
  getActivationCandidateUiState,
  isGovernanceActivationApproved,
  parseActivationApiError,
} from "./medicationActivationGovernanceUi.util";

const t = (key: string) => {
  const map: Record<string, string> = {
    "medicationGovernanceActivation.governanceReviewRequired":
      "Governance review required before formulary activation.",
    "medicationGovernanceActivation.blocker.GOVERNANCE_REVIEW_REQUIRED":
      "Governance review required before formulary activation.",
    "medicationGovernanceActivation.errorAction": "Action failed.",
  };
  return map[key] ?? key;
};

function baseRow(overrides: Partial<ActivationCandidateRow> = {}): ActivationCandidateRow {
  return {
    productId: "p1",
    conceptId: "c1",
    facilityId: "f1",
    productCode: "PROD-1",
    exactSourceText: "Acetaminophen 500mg Tablet",
    medicationDisplayName: "Acetaminophen",
    governanceStatus: "REVIEW_REQUIRED",
    productIsActive: false,
    conceptIsActive: false,
    activationState: "FORMULARY_REVIEW",
    runtime: {
      formularyApprovedInactive: false,
      orderSearchEnabled: false,
      marEnabled: false,
      billingReviewRequired: false,
      billingEnabled: false,
      reviewedBillingCode: null,
      reviewedBillingUnit: null,
    },
    exactSourceMedication: "Acetaminophen",
    exactSourceDose: "500mg",
    exactSourceFormRoute: "Tablet",
    duplicateGovernanceStatus: "CREATE_NEW_APPROVED",
    duplicateGovernanceResolved: true,
    formularyOnFormulary: false,
    facilityFormularyItemId: "ffi-1",
    packageId: "pkg-1",
    legacyCatalogMedicationId: null,
    blockerReasons: ["GOVERNANCE_REVIEW_REQUIRED"],
    ...overrides,
  };
}

describe("medicationActivationGovernanceUi.util (19G.2B)", () => {
  it("parses API 400 blockers JSON", () => {
    const parsed = parseActivationApiError(
      JSON.stringify({
        message: "Activation bloquée par les garde-fous de gouvernance.",
        blockers: ["GOVERNANCE_REVIEW_REQUIRED"],
      }),
      400
    );
    expect(parsed.blockers).toEqual(["GOVERNANCE_REVIEW_REQUIRED"]);
    expect(parsed.httpStatus).toBe(400);
  });

  it("disables forward steps when GOVERNANCE_REVIEW_REQUIRED", () => {
    const ui = getActivationCandidateUiState(baseRow(), t);
    expect(ui.governanceReviewRequired).toBe(true);
    expect(ui.forwardStepsDisabled).toBe(true);
    expect(ui.canDisableRuntime).toBe(false);
    expect(ui.blockerMessages[0]).toContain("Governance review required");
  });

  it("allows forward steps when ACTIVATION_APPROVED and no blockers", () => {
    const ui = getActivationCandidateUiState(
      baseRow({
        governanceStatus: "ACTIVATION_APPROVED",
        blockerReasons: [],
      }),
      t
    );
    expect(isGovernanceActivationApproved("ACTIVATION_APPROVED")).toBe(true);
    expect(ui.forwardStepsDisabled).toBe(false);
  });

  it("formats API error from blockers not generic message", () => {
    const msg = formatActivationApiErrorMessage(
      {
        httpStatus: 400,
        message: "Activation bloquée",
        blockers: ["GOVERNANCE_REVIEW_REQUIRED"],
      },
      t
    );
    expect(msg).toContain("Governance review required");
    expect(msg).not.toBe("Something went wrong.");
  });
});
