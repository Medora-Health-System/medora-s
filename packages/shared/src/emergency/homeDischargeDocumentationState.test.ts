import { describe, expect, it } from "vitest";
import { resolveHomeDischargeDocumentationState } from "./homeDischargeDocumentationState.js";

const screenshotEquivalent = {
  dischargeMode: "Domicile",
  dischargeDiagnosisSummary: "Chest pain evaluation",
  dischargeInstructions: "Rest as needed.",
  medicationInstructions: "Take medications as prescribed.",
  returnPrecautions: "Return for worsening chest pain.",
  workSchoolNote: "May return in 2 days.",
  providerDischargeFollowUps: [
    {
      specialty: "PRIMARY_CARE",
      providerOrFacility: "Dr. Mauramcebaum",
      timing: "within 1-2 days",
      phone: "468-890-2345",
    },
  ],
};

describe("resolveHomeDischargeDocumentationState", () => {
  it("separates content, follow-up, and communication for screenshot-equivalent chart", () => {
    const state = resolveHomeDischargeDocumentationState(screenshotEquivalent, {
      hasMedicationOrders: false,
    });
    expect(state.instructionContentAdequate).toBe(true);
    expect(state.planning.followUpPresent).toBe(true);
    expect(state.planning.followUpComponents).toEqual({
      typePresent: true,
      providerPresent: true,
      timeframePresent: true,
      contactPresent: true,
    });
    expect(state.communication.instructionsCommunicated).toBe("UNKNOWN");
    expect(state.delivery.printedOrElectronicDelivery).toBe("NOT_MODELED");
    expect(state.communication.understandingDocumented).toBe("NOT_APPLICABLE");
  });

  it("marks communication YES when patientInstructionsGiven is true", () => {
    const state = resolveHomeDischargeDocumentationState({
      ...screenshotEquivalent,
      patientInstructionsGiven: true,
    });
    expect(state.communication.instructionsCommunicated).toBe("YES");
  });

  it("does not invent follow-up when empty", () => {
    const state = resolveHomeDischargeDocumentationState({
      dischargeMode: "Domicile",
      dischargeInstructions: "Rest",
      dischargeDiagnosisSummary: "Bronchitis",
    });
    expect(state.planning.followUpPresent).toBe(false);
  });
});
