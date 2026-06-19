import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataReadOnly (MEDUI.ED.CLINICAL_DATA.1)", () => {
  const hub = readSrc("features/clinical-documentation/ClinicalDocumentationHub.tsx");
  const panel = readSrc("features/emergency/EmergencyClinicalDataPanel.tsx");
  const nursing = readSrc("features/emergency/EmergencyNursingReassessmentPanel.tsx");
  const activeView = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");

  it("read-only banner appears in review hub", () => {
    expect(hub).toContain("clinical-documentation-read-only-banner");
    expect(hub).toContain("emergencyClinicalData.readOnlyBanner");
  });

  it("Clinical Data uses Review label not Open", () => {
    expect(hub).toContain("clinicalDocumentation.actionReview");
    expect(hub).toContain("clinical-documentation-card-review-button");
  });

  it("review mode shows preview panel not editable forms", () => {
    expect(hub).toContain("clinical-documentation-review-preview");
    expect(hub).toContain("!isReviewMode && expandedCardId");
    expect(hub).toContain("emergencyClinicalData.reviewPreviewEmpty");
  });

  it("witness actions hidden in review mode", () => {
    expect(hub).toContain("showWitness && !isReviewMode");
  });

  it("Nursing Assessment retains Open action", () => {
    expect(hub).toContain("clinicalDocumentation.actionOpen");
    expect(nursing).toContain('data-testid="clinical-documentation-entry"');
  });

  it("saved entries section shows empty state when none saved", () => {
    expect(hub).toContain("clinicalDocumentation.savedEntriesEmpty");
  });

  it("saved entry row includes author role and timestamp meta", () => {
    expect(hub).toContain("clinicalDocumentation.entryMeta");
    expect(hub).toContain("authorDisplayName");
    expect(hub).toContain("authorRoleTitle");
    expect(hub).toContain("createdAt");
  });

  it("Clinical Data panel does not call createClinicalDocumentationEntry", () => {
    expect(panel).not.toContain("createClinicalDocumentationEntry");
    expect(panel).not.toContain("createClinicalDocumentationEntryWithWitness");
  });

  it("review hub does not mutate when accessMode review (no save path on card open)", () => {
    expect(hub).toContain('accessMode = "edit"');
    expect(hub).toContain("isReviewMode = accessMode === \"review\"");
  });

  it("EmergencyClinicalDataPanel has clinical summary projection", () => {
    const summary = readSrc("features/emergency/EmergencyClinicalDataSummary.tsx");
    expect(summary).toContain("emergency-clinical-data-summary");
    expect(panel).toContain("EmergencyClinicalDataSummary");
    expect(panel).not.toContain("emergencyClinicalData.summaryPlaceholder");
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
