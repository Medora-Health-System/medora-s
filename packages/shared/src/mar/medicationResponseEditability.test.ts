import { describe, expect, it } from "vitest";
import {
  canDocumentMedicationResponse,
  canShowMedicationResponsePanel,
  isMedicationAdministrationCompleted,
  isMedicationResponseRequired,
  toMedicationResponseEditabilityInput,
} from "./medicationResponseEditability.js";
import {
  buildMarMedicationResponseNotes,
  parseMarMedicationResponseNotes,
} from "./marMedicationResponseGovernance.js";
import { resolveEnterprisePainReassessmentMarStatus } from "./enterprisePainReassessmentWorkflow.js";

const administeredBase = {
  doseStatus: "COMPLETED",
  secondaryText: "GIVEN",
  administeredAt: "2026-06-23T14:00:00.000Z",
  medicationAdministrationId: "admin-1",
  medicationLabel: "Ketorolac 30 mg IV",
};

describe("canDocumentMedicationResponse", () => {
  it("allows completed ketorolac response form", () => {
    expect(canDocumentMedicationResponse(administeredBase)).toBe(true);
  });

  it("allows completed opioid response form", () => {
    expect(
      canDocumentMedicationResponse({
        ...administeredBase,
        medicationLabel: "Morphine 2 mg IV",
      })
    ).toBe(true);
  });

  it("allows overdue response on completed cell", () => {
    expect(
      canDocumentMedicationResponse({
        ...administeredBase,
        secondaryText: "GIVEN",
        medicationResponseFollowUp: { status: "OVERDUE" },
      })
    ).toBe(true);
  });

  it("allows previous-shift completed response", () => {
    expect(
      canDocumentMedicationResponse({
        ...administeredBase,
        administeredAt: "2026-06-22T06:00:00.000Z",
        secondaryText: "GIVEN",
        medicationResponseFollowUp: { status: "OVERDUE" },
      })
    ).toBe(true);
  });

  it("returns false without medicationAdministrationId", () => {
    expect(
      canDocumentMedicationResponse({
        ...administeredBase,
        medicationAdministrationId: null,
      })
    ).toBe(false);
  });

  it("returns false for not-administered dose", () => {
    expect(
      canDocumentMedicationResponse({
        ...administeredBase,
        doseStatus: "PLANNED",
        secondaryText: "DUE",
        administeredAt: null,
      })
    ).toBe(false);
  });

  it("returns false for canceled dose", () => {
    expect(
      canDocumentMedicationResponse({
        ...administeredBase,
        doseStatus: "CANCELED",
        secondaryText: "CANCELED",
        administeredAt: null,
      })
    ).toBe(false);
  });

  it("allows additional response after reassessment completed", () => {
    expect(
      canDocumentMedicationResponse({
        ...administeredBase,
        secondaryText: "REASSESSMENT_COMPLETED",
        medicationResponses: [{ responseCode: "EFFECTIVE", documentedAt: "2026-06-23T14:30:00.000Z" }],
      })
    ).toBe(true);
  });

  it("allows lidocaine patch overdue response", () => {
    expect(
      canDocumentMedicationResponse({
        ...administeredBase,
        medicationLabel: "Lidocaine 5% patch",
        medicationResponseFollowUp: { status: "OVERDUE" },
      })
    ).toBe(true);
  });

  it("allows gabapentin when pain response required", () => {
    expect(
      canDocumentMedicationResponse({
        ...administeredBase,
        medicationLabel: "Gabapentin 300 mg",
        orderPrnIndication: "neuropathic pain",
        secondaryText: "AWAITING_REASSESSMENT",
      })
    ).toBe(true);
  });
});

describe("canShowMedicationResponsePanel", () => {
  it("shows panel without admin id when recommended and administered", () => {
    expect(
      canShowMedicationResponsePanel({
        ...administeredBase,
        medicationAdministrationId: null,
        medicationResponseFollowUp: { status: "OVERDUE" },
      })
    ).toBe(true);
  });

  it("hides panel for canceled dose", () => {
    expect(
      canShowMedicationResponsePanel({
        ...administeredBase,
        doseStatus: "CANCELED",
        secondaryText: "CANCELED",
        administeredAt: null,
      })
    ).toBe(false);
  });
});

describe("isMedicationResponseRequired", () => {
  it("marks awaiting reassessment as required", () => {
    expect(
      isMedicationResponseRequired({
        secondaryText: "AWAITING_REASSESSMENT",
      })
    ).toBe(true);
  });
});

describe("toMedicationResponseEditabilityInput", () => {
  it("maps timeline cell fields", () => {
    const input = toMedicationResponseEditabilityInput({
      primaryText: "Toradol",
      doseStatus: "COMPLETED",
      secondaryText: "GIVEN",
      administeredAt: "2026-06-23T14:00:00.000Z",
      medicationAdministrationId: "admin-1",
      medicationResponseFollowUp: { status: "OVERDUE" },
    });
    expect(input.medicationLabel).toBe("Toradol");
    expect(canDocumentMedicationResponse(input)).toBe(true);
  });
});

describe("isMedicationAdministrationCompleted", () => {
  it("detects administered doses by administeredAt", () => {
    expect(
      isMedicationAdministrationCompleted({
        doseStatus: "COMPLETED",
        administeredAt: "2026-06-23T14:00:00.000Z",
        secondaryText: "GIVEN",
      })
    ).toBe(true);
  });
});

describe("medication response persistence fields", () => {
  it("persists responseTime separately from documentedAt", () => {
    const built = buildMarMedicationResponseNotes(null, {
      responseCode: "PAIN_REDUCED",
      responseTime: "2026-06-23T13:00:00.000Z",
      documentedAt: "2026-06-23T14:00:00.000Z",
      painBefore: 8,
      painAfter: 4,
    });
    expect(built.ok).toBe(true);
    const parsed = parseMarMedicationResponseNotes(built.notes);
    expect(parsed[0]?.responseTime).toBe("2026-06-23T13:00:00.000Z");
    expect(parsed[0]?.documentedAt).toBe("2026-06-23T14:00:00.000Z");
  });

  it("transitions timeline from awaiting to reassessment completed after response", () => {
    const notes = buildMarMedicationResponseNotes(null, {
      responseCode: "PAIN_REDUCED",
      documentedAt: "2026-06-23T14:30:00.000Z",
      painBefore: 7,
      painAfter: 3,
    }).notes;
    const status = resolveEnterprisePainReassessmentMarStatus({
      medicationLabel: "Ketorolac 30 mg IV",
      administeredAt: "2026-06-23T14:00:00.000Z",
      doseStatus: "COMPLETED",
      administrationNotes: notes,
    });
    expect(status).toBe("REASSESSMENT_COMPLETED");
  });
});
