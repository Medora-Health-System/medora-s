import { describe, expect, it } from "vitest";
import {
  resolveMedicationResponsePanelState,
  shouldDefaultExpandMedicationResponsePanel,
  shouldShowAddAdditionalResponseButton,
  shouldShowMedicationResponseForm,
  shouldShowMedicationResponseSubmitButton,
} from "./medicationResponsePostSubmitState.js";

describe("medicationResponsePostSubmitState", () => {
  it("starts in NEEDS_RESPONSE when no response and collapsed", () => {
    expect(
      resolveMedicationResponsePanelState({ responseCount: 0, expanded: false, addingAdditional: false })
    ).toBe("NEEDS_RESPONSE");
  });

  it("uses EDITING_RESPONSE when no response and expanded", () => {
    expect(
      resolveMedicationResponsePanelState({ responseCount: 0, expanded: true, addingAdditional: false })
    ).toBe("EDITING_RESPONSE");
    expect(shouldShowMedicationResponseForm("EDITING_RESPONSE")).toBe(true);
    expect(shouldShowMedicationResponseSubmitButton("EDITING_RESPONSE")).toBe(true);
  });

  it("hides form after response submitted", () => {
    expect(
      resolveMedicationResponsePanelState({ responseCount: 1, expanded: false, addingAdditional: false })
    ).toBe("RESPONSE_SUBMITTED");
    expect(shouldShowMedicationResponseForm("RESPONSE_SUBMITTED")).toBe(false);
    expect(shouldShowMedicationResponseSubmitButton("RESPONSE_SUBMITTED")).toBe(false);
  });

  it("shows Add Additional Response after response exists", () => {
    expect(shouldShowAddAdditionalResponseButton("RESPONSE_SUBMITTED", true)).toBe(true);
    expect(shouldShowAddAdditionalResponseButton("EDITING_RESPONSE", true)).toBe(false);
  });

  it("opens blank form only via Add Additional Response", () => {
    expect(
      resolveMedicationResponsePanelState({ responseCount: 2, expanded: true, addingAdditional: true })
    ).toBe("ADDING_ADDITIONAL_RESPONSE");
    expect(shouldShowMedicationResponseForm("ADDING_ADDITIONAL_RESPONSE")).toBe(true);
  });

  it("does not default expand when responses already exist", () => {
    expect(
      shouldDefaultExpandMedicationResponsePanel({
        responseCount: 1,
        visibilityRecommended: true,
        awaitingReassessment: true,
        responseOverdue: true,
      })
    ).toBe(false);
  });
});
