import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataReadOnly (MEDUI.ED.CLINICAL_DATA)", () => {
  const hub = readSrc("features/clinical-documentation/ClinicalDocumentationHub.tsx");
  const panel = readSrc("features/emergency/EmergencyClinicalDataPanel.tsx");
  const nursing = readSrc("features/emergency/EmergencyNursingReassessmentPanel.tsx");
  const activeView = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");

  it("6 — Open label in hub uses per-card access mode", () => {
    expect(hub).toContain("cardIsReviewMode");
    expect(hub).toContain("clinicalDocumentation.actionReview");
    expect(hub).toContain("clinicalDocumentation.actionOpen");
    expect(hub).toContain("resolveClinicalDataAccessMode");
  });

  it("7 — review mode shows preview panel not editable forms", () => {
    expect(hub).toContain("clinical-documentation-review-preview");
    expect(hub).toContain("!cardIsReviewMode(c) && expandedCardId");
  });

  it("8 — read-only banner removed from Clinical Data workspace", () => {
    expect(panel).toContain('workspaceContext="clinicalData"');
    expect(hub).toContain('workspaceContext !== "clinicalData"');
    expect(panel).not.toContain("emergencyClinicalData.readOnlyBanner");
  });

  it("9 — long subtitle removed from Clinical Data panel", () => {
    expect(panel).not.toContain("emergencyClinicalData.subtitle");
  });

  it("Nursing Assessment retains Open action", () => {
    expect(hub).toContain("clinicalDocumentation.actionOpen");
    expect(nursing).toContain("<ClinicalDocumentationHub");
  });

  it("Clinical Data panel does not call createClinicalDocumentationEntry", () => {
    expect(panel).not.toContain("createClinicalDocumentationEntry");
    expect(panel).not.toContain("createClinicalDocumentationEntryWithWitness");
  });

  it("EmergencyClinicalDataPanel has clinical summary projection", () => {
    const summary = readSrc("features/emergency/EmergencyClinicalDataSummary.tsx");
    expect(summary).toContain("emergency-clinical-data-summary");
    expect(panel).toContain("EmergencyClinicalDataSummary");
  });

  it("Clinical Data section does not render nursing reassessment editor", () => {
    const clinicalDataBlock = activeView.slice(
      activeView.indexOf('activeSection === "clinicalData"'),
      activeView.indexOf('activeSection === "notes"')
    );
    expect(clinicalDataBlock).toContain("EmergencyClinicalDataPanel");
    expect(clinicalDataBlock).not.toContain("EmergencyNursingReassessmentPanel");
  });
});
