import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMarPrnTimelineCellDisplay,
  MAR_SHIFT_TIMELINE_STATUS_COLORS,
  validatePrnAdministrationForMarCreate,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "..", "..");

function readSrc(fragment: string): string {
  return readFileSync(join(webSrcRoot, fragment), "utf8");
}

describe("marShiftTimelinePrnRow — dedicated PRN band (K.10B.8A)", () => {
  const timeline = readSrc("components/encounters/FacilityMarShiftTimeline.tsx");
  const drawer = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
  const marTab = readSrc("components/encounters/MedicationAdministrationTab.tsx");
  const display = readSrc("features/mar/marShiftTimelineDisplay.ts");

  it("timeline renders separate PRN row with yellow band styling", () => {
    expect(timeline).toContain('row.rowKind === "PRN"');
    expect(timeline).toContain("mar-shift-timeline-prn-row-");
    expect(timeline).toContain("mar-shift-timeline-prn-label");
    expect(timeline).toContain('t("marShiftTimeline.prnRowLabel")');
    expect(timeline).toContain("marShiftTimelinePrnRowStyle");
    expect(timeline).toContain("data-prn-band");
  });

  it("status colors follow MAR governance palette", () => {
    expect(MAR_SHIFT_TIMELINE_STATUS_COLORS.active.backgroundColor).toBe("#DCFCE7");
    expect(MAR_SHIFT_TIMELINE_STATUS_COLORS.administered.backgroundColor).toBe("#E5E7EB");
    expect(MAR_SHIFT_TIMELINE_STATUS_COLORS.refused.backgroundColor).toBe("#F3F4F6");
    expect(MAR_SHIFT_TIMELINE_STATUS_COLORS.held.backgroundColor).toBe("#FEF3C7");
    expect(MAR_SHIFT_TIMELINE_STATUS_COLORS.prnRow.backgroundColor).toBe("#FFFBE6");
    expect(display).toContain("MAR_SHIFT_TIMELINE_STATUS_COLORS");
    expect(display).toContain("resolveMarShiftTimelineStatusColorKey");
  });

  it("drawer shows Q6H PRN, PRN yes, last given, next eligible", () => {
    expect(drawer).toContain('"mar-shift-timeline-drawer-frequency"');
    expect(drawer).toContain('"mar-shift-timeline-drawer-prn-yes"');
    expect(drawer).toContain('"mar-shift-timeline-drawer-prn-last-given"');
    expect(drawer).toContain('"mar-shift-timeline-drawer-prn-next-eligible"');
    expect(drawer).toContain("formatMarPrnFrequencyLabel");
    expect(drawer).toContain('t("marShiftTimeline.drawer.prnYes")');
  });

  it("early PRN administration requires override reason in MAR modal", () => {
    expect(marTab).toContain("mar-prn-early-override-warning");
    expect(marTab).toContain("mar-prn-early-override-reason");
    expect(marTab).toContain("MAR_PRN_EARLY_OVERRIDE_NOTE_PREFIX");
    expect(
      validatePrnAdministrationForMarCreate({
        marAction: "administered",
        frequencyCode: "Q6H",
        directionsSig: "4 mg IVP q6h PRN nausea",
        prnReasonCode: "nausea",
        proposedAdministeredAt: "2026-06-12T11:00:00.000Z",
        lastAdministeredAt: "2026-06-12T09:15:00.000Z",
      })?.code
    ).toBe("prn_early_override_required");
  });

  it("PRN band cell format matches spec examples", () => {
    const zofran = buildMarPrnTimelineCellDisplay({
      medicationLabel: "Zofran",
      doseAmount: "4 mg",
      route: "IVP",
      frequencyCode: "Q6H",
      directionsSig: "4 mg IVP q6h PRN nausea",
      doseStatus: "DUE",
      facilityTimeZone: "UTC",
    });
    expect(zofran.primaryText).toBe("Zofran IVP");
    expect(zofran.secondaryText).toBe("4 mg IVP");
    expect(zofran.tertiaryText).toBe("PRN Q6H");
  });
});
