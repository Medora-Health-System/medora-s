import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMarShiftTimelineCellDisplay,
  resolveFluidBolusClinicalAction,
  resolveMarShiftTimelineDrawerActions,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("marShiftTimelineK10B8A — hospital fluid gaps", () => {
  const drawer = readFileSync(
    join(webSrcRoot, "components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
    "utf8"
  );
  const marTab = readFileSync(
    join(webSrcRoot, "components/encounters/MedicationAdministrationTab.tsx"),
    "utf8"
  );

  it("bolus MAR cell shows RUNNING with volume label", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Normal Saline 0.9%",
      doseKind: "FIXED_ADMINISTRATION",
      doseStatus: "IN_PROGRESS",
      route: "IV",
      frequencyCode: "NOW",
      requiresWitness: false,
      directionsSig: "NS 0.9% 1000 mL bolus",
      fluidBolusStatus: "RUNNING",
      fluidStartedAt: "2026-06-12T08:14:00.000Z",
      facilityTimeZone: "America/Port-au-Prince",
    });
    expect(display.primaryText).toBe("NS 0.9%");
    expect(display.secondaryText).toBe("1000 mL BOLUS");
    expect(display.tertiaryText).toContain("RUNNING");
  });

  it("bolus clinical actions START → COMPLETE", () => {
    expect(resolveFluidBolusClinicalAction("DUE")).toBe("START_BOLUS");
    expect(resolveFluidBolusClinicalAction("RUNNING")).toBe("COMPLETE_BOLUS");
    expect(resolveMarShiftTimelineDrawerActions("START_BOLUS")).toContain("START_BOLUS");
  });

  it("drawer shows duration fields for continuous fluid", () => {
    expect(drawer).toContain('t("marShiftTimeline.drawer.fluidRunningDuration")');
    expect(drawer).toContain('t("marShiftTimeline.drawer.fluidTotalDuration")');
    expect(drawer).toContain('t("marShiftTimeline.drawer.fluidActiveDuration")');
  });

  it("MAR tab wires bolus actions with timeline refresh", () => {
    expect(marTab).toContain("startFluidBolus");
    expect(marTab).toContain("completeFluidBolus");
    expect(marTab).toContain("timelineRefreshRef.current?.()");
  });

  it("fluid picker component exists in order entry", () => {
    const picker = readFileSync(
      join(webSrcRoot, "components/orders/createOrderModal/FluidOrderPicker.tsx"),
      "utf8"
    );
    expect(picker).toContain("data-testid=\"fluid-order-picker\"");
  });
});
