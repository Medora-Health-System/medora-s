import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const drawerSrc = readFileSync(
  join(process.cwd(), "src/components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
  "utf8"
);
const tabSrc = readFileSync(
  join(process.cwd(), "src/components/encounters/MedicationAdministrationTab.tsx"),
  "utf8"
);
const fieldSrc = readFileSync(
  join(process.cwd(), "src/components/mar/MedicationClinicalDateTimeField.tsx"),
  "utf8"
);

describe("marClinicalTimePreSaveUiCertification (H9F.1)", () => {
  it("shared field supports datetime-local, Now, and timing reason", () => {
    expect(fieldSrc).toContain("MedicationClinicalDateTimeField");
    expect(fieldSrc).toContain('type="datetime-local"');
    expect(fieldSrc).toContain("MAR_MEDICATION_TIMING_OVERRIDE_REASON_CODES");
  });

  const preSaveMatrix: Array<{ action: string; source: string; patterns: string[] }> = [
    {
      action: "Administer",
      source: tabSrc,
      patterns: ["MedicationClinicalDateTimeField", '"ADMINISTER"', "mar-record-modal-clinical-time"],
    },
    {
      action: "PRN administer",
      source: tabSrc,
      patterns: ["PRN_ADMINISTER"],
    },
    {
      action: "Refuse",
      source: drawerSrc,
      patterns: ["MedicationClinicalDateTimeField", '"REFUSE"', "mar-shift-timeline-reason-time"],
    },
    {
      action: "Hold",
      source: drawerSrc,
      patterns: ['"HOLD"', "mar-shift-timeline-reason-time"],
    },
    {
      action: "Missed",
      source: drawerSrc,
      patterns: ['"MISSED"'],
    },
    {
      action: "Not available",
      source: tabSrc,
      patterns: ["NOT_AVAILABLE"],
    },
    {
      action: "MD changed",
      source: tabSrc,
      patterns: ["MD_CHANGED"],
    },
    {
      action: "IVPB start",
      source: drawerSrc,
      patterns: ["infusionStartActionType", "mar-shift-timeline-drawer-start-time"],
    },
    {
      action: "IVPB stop",
      source: drawerSrc,
      patterns: ["infusionStopActionType", "mar-shift-timeline-drawer-stop-time"],
    },
    {
      action: "Infusion start",
      source: drawerSrc,
      patterns: ["infusionStartActionType", "mar-shift-timeline-drawer-start-time"],
    },
    {
      action: "Infusion stop",
      source: drawerSrc,
      patterns: ["infusionStopActionType", "mar-shift-timeline-drawer-stop-time"],
    },
    {
      action: "Bolus start",
      source: drawerSrc,
      patterns: ["START_BOLUS", "mar-shift-timeline-drawer-start-time"],
    },
    {
      action: "Bolus complete",
      source: drawerSrc,
      patterns: ["COMPLETE_BOLUS", "mar-shift-timeline-drawer-stop-time"],
    },
    {
      action: "Fluid start",
      source: drawerSrc,
      patterns: ["START_FLUID", "mar-shift-timeline-drawer-start-time"],
    },
    {
      action: "Fluid stop",
      source: drawerSrc,
      patterns: ["STOP_FLUID", "mar-shift-timeline-drawer-stop-time"],
    },
  ];

  it.each(preSaveMatrix)("$action — clinical time field wired before save", ({ patterns, source }) => {
    for (const pattern of patterns) {
      expect(source).toContain(pattern);
    }
  });
});
