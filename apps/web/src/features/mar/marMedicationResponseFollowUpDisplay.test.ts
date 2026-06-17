import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const panelSrc = readFileSync(
  join(process.cwd(), "src/components/mar/MedicationResponseDocumentationPanel.tsx"),
  "utf8"
);
const timelineSrc = readFileSync(
  join(process.cwd(), "src/components/encounters/FacilityMarShiftTimeline.tsx"),
  "utf8"
);

describe("marMedicationResponseFollowUpDisplay", () => {
  it("recommended display is non-blocking", () => {
    expect(panelSrc).toContain("mar-medication-response-follow-up-recommended");
    expect(panelSrc).not.toContain("disabled={followUp");
    expect(timelineSrc).toContain("mar-shift-timeline-response-follow-up");
    expect(timelineSrc).not.toContain("preventDefault");
  });

  it("overdue display is non-blocking", () => {
    expect(panelSrc).toContain("mar-medication-response-follow-up-overdue");
    expect(timelineSrc).toContain('responseFollowUp.status === "OVERDUE"');
  });
});
