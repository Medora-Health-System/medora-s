import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canDocumentMedicationResponse,
  toMedicationResponseEditabilityInput,
} from "@medora/shared";

const panelSrc = readFileSync(
  join(process.cwd(), "src/components/mar/MedicationResponseDocumentationPanel.tsx"),
  "utf8"
);

describe("MedicationResponseDocumentationPanel", () => {
  it("uses shared canDocumentMedicationResponse instead of drawer readOnly", () => {
    expect(panelSrc).toContain("canDocumentMedicationResponse");
    expect(panelSrc).not.toContain("responseReadOnly");
  });

  it("renders submit response button", () => {
    expect(panelSrc).toContain("mar-medication-response-submit");
    expect(panelSrc).toContain("marMedicationResponse.panel.submitResponse");
  });

  it("renders cancel button", () => {
    expect(panelSrc).toContain("mar-medication-response-cancel");
    expect(panelSrc).toContain("common.cancel");
  });

  it("shows missing administration message when submit blocked", () => {
    expect(panelSrc).toContain("mar-medication-response-missing-administration");
    expect(panelSrc).toContain("marMedicationResponse.panel.missingAdministrationId");
  });

  it("expands by default when response overdue", () => {
    expect(panelSrc).toContain('medicationResponseFollowUp?.status === "OVERDUE"');
  });

  it("completed overdue ketorolac remains editable via shared rule", () => {
    const input = toMedicationResponseEditabilityInput({
      primaryText: "Ketorolac 30 mg IV",
      doseStatus: "COMPLETED",
      secondaryText: "GIVEN",
      administeredAt: "2026-06-22T06:00:00.000Z",
      medicationAdministrationId: "admin-1",
      medicationResponseFollowUp: { status: "OVERDUE" },
    });
    expect(canDocumentMedicationResponse(input)).toBe(true);
  });
});
