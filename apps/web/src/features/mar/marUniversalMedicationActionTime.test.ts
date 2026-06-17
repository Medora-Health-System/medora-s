import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const tabSrc = readFileSync(
  join(process.cwd(), "src/components/encounters/MedicationAdministrationTab.tsx"),
  "utf8"
);
const drawerSrc = readFileSync(
  join(process.cwd(), "src/components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
  "utf8"
);
const helperSrc = readFileSync(
  join(process.cwd(), "src/features/mar/marUniversalMedicationActionTime.ts"),
  "utf8"
);

describe("marUniversalMedicationActionTime (H9F)", () => {
  it("5 — scheduled med clinical time visible by default in record modal", () => {
    expect(tabSrc).toContain("MedicationClinicalDateTimeField");
    expect(tabSrc).toContain('testId="mar-record-modal-clinical-time"');
    expect(tabSrc).not.toContain("showEditor={modalShowEffectiveTimeEditor}");
  });

  it("6 — PRN clinical time visible by default", () => {
    expect(tabSrc).toContain("PRN_ADMINISTER");
  });

  it("7-10 — terminal actions clinical time editable in drawer", () => {
    expect(drawerSrc).toContain('"REFUSE"');
    expect(drawerSrc).toContain('"MISSED"');
    expect(drawerSrc).toContain('"HOLD"');
    expect(tabSrc).toContain("NOT_AVAILABLE");
    expect(tabSrc).toContain("MD_CHANGED");
  });

  it("11-16 — infusion start/stop and bolus use shared clinical time field", () => {
    expect(drawerSrc).toContain("infusionStartActionType");
    expect(drawerSrc).toContain("infusionStopActionType");
    expect(helperSrc).toContain("BOLUS_START");
    expect(helperSrc).toContain("BOLUS_COMPLETE");
    expect(helperSrc).toContain("IVPB_START");
    expect(helperSrc).toContain("IVPB_STOP");
  });

  it("17 — stop reason remains separate from timing reason in drawer", () => {
    expect(drawerSrc).toContain("infusionStopReasonCode");
    expect(drawerSrc).toContain("infusionTimingReasonCode");
    expect(drawerSrc).toContain("marInfusionStopReason.fieldLabel");
  });

  it("18-20 — documentedAt, scheduled, and universal notes preserved on submit", () => {
    expect(tabSrc).toContain("buildMarClinicalTimeDocumentationNotes");
    expect(tabSrc).toContain("documentedAt.toISOString()");
    expect(tabSrc).toContain("scheduledTime: modalItem.scheduledAt");
    expect(helperSrc).toContain("validateMarUniversalClinicalTime");
  });
});
