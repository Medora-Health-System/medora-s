import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveMedicationResponsePanelState,
  shouldShowAddAdditionalResponseButton,
  shouldShowMedicationResponseForm,
} from "@medora/shared";

const panelSrc = readFileSync(
  join(process.cwd(), "src/components/mar/MedicationResponseDocumentationPanel.tsx"),
  "utf8"
);
const summarySrc = readFileSync(
  join(process.cwd(), "src/components/mar/MedicationResponseSummaryCard.tsx"),
  "utf8"
);

describe("MedicationResponseDocumentationPanel post-submit UX", () => {
  it("uses post-submit panel state model", () => {
    expect(panelSrc).toContain("resolveMedicationResponsePanelState");
    expect(panelSrc).toContain("data-panel-state");
    expect(panelSrc).toContain("shouldShowMedicationResponseForm");
  });

  it("collapses form and clears state after submit", () => {
    expect(panelSrc).toContain("setAddingAdditional(false)");
    expect(panelSrc).toContain("setExpanded(false)");
    expect(panelSrc).toContain("resetForm()");
    expect(panelSrc).toContain("await onSaved?.()");
  });

  it("hides submit when not in editing mode", () => {
    expect(panelSrc).toContain("showSubmitButton");
    expect(panelSrc).toContain("shouldShowMedicationResponseSubmitButton");
  });

  it("shows Add Additional Response after response exists", () => {
    expect(panelSrc).toContain("mar-medication-response-add-additional");
    expect(panelSrc).toContain("marMedicationResponse.panel.addAdditionalResponse");
    expect(panelSrc).toContain("handleAddAdditionalResponse");
  });

  it("guards duplicate submit with lock ref", () => {
    expect(panelSrc).toContain("submitLockRef");
    expect(panelSrc).toContain("if (submitLockRef.current || submitting || !showSubmitButton) return");
  });

  it("delegates response summary rendering to shared card", () => {
    expect(panelSrc).toContain("MedicationResponseSummaryCard");
    expect(summarySrc).toContain("buildMedicationResponseSummaryFields");
    expect(summarySrc).toContain("resolveMedicationResponseDocumentedByLabel");
  });

  it("shows nurse-friendly response count badge", () => {
    expect(panelSrc).toContain("resolveMarMedicationResponseBadgeLabelKey");
    expect(panelSrc).toContain("mar-medication-response-count-badge");
  });

  it("RESPONSE_SUBMITTED hides form but allows add additional", () => {
    expect(shouldShowMedicationResponseForm("RESPONSE_SUBMITTED")).toBe(false);
    expect(shouldShowAddAdditionalResponseButton("RESPONSE_SUBMITTED", true)).toBe(true);
  });

  it("late documentation still opens editing form when expanded", () => {
    expect(
      resolveMedicationResponsePanelState({ responseCount: 0, expanded: true, addingAdditional: false })
    ).toBe("EDITING_RESPONSE");
  });
});
