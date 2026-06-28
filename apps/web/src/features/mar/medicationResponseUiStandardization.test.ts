import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const panelSrc = readFileSync(
  join(process.cwd(), "src/components/mar/MedicationResponseDocumentationPanel.tsx"),
  "utf8"
);
const summarySrc = readFileSync(
  join(process.cwd(), "src/components/mar/MedicationResponseSummaryCard.tsx"),
  "utf8"
);
const timelineSrc = readFileSync(
  join(process.cwd(), "src/components/encounters/FacilityMarShiftTimeline.tsx"),
  "utf8"
);
const displaySrc = readFileSync(
  join(process.cwd(), "src/features/mar/marShiftTimelineDisplay.ts"),
  "utf8"
);
const frSrc = readFileSync(join(process.cwd(), "src/i18n/messages/fr.ts"), "utf8");
const enSrc = readFileSync(join(process.cwd(), "src/i18n/messages/en.ts"), "utf8");

describe("medication response UI standardization", () => {
  it("uses unified MedicationResponseSummaryCard in panel", () => {
    expect(panelSrc).toContain("MedicationResponseSummaryCard");
    expect(summarySrc).toContain("buildMedicationResponseSummaryFieldsFromParsed");
    expect(summarySrc).toContain("documentedByUnknown");
  });

  it("collapses form after submit and shows Add Additional Response", () => {
    expect(panelSrc).toContain("setExpanded(false)");
    expect(panelSrc).toContain("mar-medication-response-add-additional");
    expect(panelSrc).toContain("submitLockRef");
  });

  it("localizes internal timeline secondary text", () => {
    expect(timelineSrc).toContain("localizeMarShiftTimelineSecondaryText");
    expect(displaySrc).toContain("localizeMarShiftTimelineSecondaryText");
    expect(displaySrc).toContain("resolveMarShiftTimelineClinicalActionLabelKey");
  });

  it("does not render AWAITING_REASSESSMENT or REASSESSMENT_COMPLETED to nurses in timeline source", () => {
    expect(timelineSrc).toContain("localizeMarShiftTimelineSecondaryText");
    expect(timelineSrc).toContain("localizedSecondary");
    expect(timelineSrc).not.toContain("AWAITING_REASSESSMENT");
    expect(timelineSrc).not.toContain("REASSESSMENT_COMPLETED");
  });

  it("includes EN/FR nurse-friendly timeline labels", () => {
    for (const src of [frSrc, enSrc]) {
      expect(src).toContain("timeline:");
      expect(src).toContain("completed:");
      expect(src).toContain("recommended:");
      expect(src).toContain("documentedByUnknown:");
      expect(src).toContain("addAdditionalResponse:");
    }
  });
});
