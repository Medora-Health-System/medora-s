import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildMarMedicationDoseDisplayFields } from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("MAR clinical dose display (MEDUI.MAR.CLINICAL_DOSE_DISPLAY_FINAL_FIX.1)", () => {
  it("potassium shows 20 mEq clinical dose, not quantity 1", () => {
    const fields = buildMarMedicationDoseDisplayFields({
      doseValue: "20",
      doseUnit: "mEq",
      quantity: "1",
      route: "PO",
      directionsSig: "2 tabs PO now",
    });

    expect(fields.doseLabel).toBe("20 mEq");
    expect(fields.doseLabel).not.toBe("1");
    expect(fields.quantityLabel).toBeNull();
    expect(fields.directionsLabel).toBe("2 tabs PO now");
  });

  it("adenosine shows 6 mg/2 mL clinical dose with quantity separate", () => {
    const fields = buildMarMedicationDoseDisplayFields({
      doseValue: "6 mg/2 mL",
      quantity: "2",
      route: "IV",
      fallbackDoseLabel: "6 mg/2 mL",
    });

    expect(fields.doseLabel).toBe("6 mg/2 mL");
    expect(fields.doseLabel).not.toBe("2");
    expect(fields.quantityLabel).toBe("2");
  });

  it("uses order strength when snapshot dose fields are missing", () => {
    const fields = buildMarMedicationDoseDisplayFields({
      quantity: "2",
      route: "IV",
      fallbackDoseLabel: "6 mg",
    });

    expect(fields.doseLabel).toBe("6 mg");
    expect(fields.quantityLabel).toBe("2");
  });

  it("timeline card shows quantity separately from dose", () => {
    const timeline = readSrc("components/encounters/FacilityMarShiftTimeline.tsx");
    expect(timeline).toContain('data-testid="mar-shift-timeline-quantity-label"');
    expect(timeline).toContain("item.doseDisplay?.quantityLabel");
  });

  it("drawer shows clinical dose and quantity separately", () => {
    const drawer = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
    expect(drawer).toContain('data-testid="mar-shift-timeline-drawer-quantity"');
    expect(drawer).toContain("doseEmphasis?.quantityLabel");
    expect(drawer).toContain('data-testid="mar-shift-timeline-drawer-dose-emphasis-amount"');
  });

  it("API projection does not fall back to quantity for clinical dose", () => {
    const service = readFileSync(
      join(webSrcRoot, "../../api/src/medication-dose/mar-shift-timeline.service.ts"),
      "utf8"
    );
    expect(service).toContain("strengthByOrderItemId");
    expect(service).toContain("fallbackDoseLabel: orderStrength");
    expect(service).not.toMatch(/orderedSnapshot\?\.quantity\?\.trim\(\)\s*\|\|\s*null/);
  });
});
