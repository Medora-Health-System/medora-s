/**
 * Phase 19M.7 — ancillary worklist responsive layout (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ANCILLARY_TOUCH_TARGET_MIN_PX,
  ancillaryTouchControlStyle,
  ancillaryWorklistQueueListStyle,
  resolveAncillaryLayoutMode,
} from "../features/ancillary/ancillaryResponsiveLayout";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("ancillaryResponsiveLayout (19M.7)", () => {
  it("resolves layout mode by viewport width", () => {
    expect(resolveAncillaryLayoutMode(390)).toBe("mobileCard");
    expect(resolveAncillaryLayoutMode(767)).toBe("mobileCard");
    expect(resolveAncillaryLayoutMode(768)).toBe("tabletCard");
    expect(resolveAncillaryLayoutMode(1023)).toBe("tabletCard");
    expect(resolveAncillaryLayoutMode(1024)).toBe("desktopDense");
  });

  it("uses single-column card list on mobile", () => {
    const style = ancillaryWorklistQueueListStyle("mobileCard");
    expect(style.display).toBe("flex");
    expect(style.flexDirection).toBe("column");
    expect(style.minWidth).toBe(0);
  });

  it("uses two-column safe grid on tablet", () => {
    const style = ancillaryWorklistQueueListStyle("tabletCard");
    expect(style.display).toBe("grid");
    expect(style.gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
  });

  it("preserves desktop dense single-column list", () => {
    const style = ancillaryWorklistQueueListStyle("desktopDense");
    expect(style.display).toBe("flex");
    expect(style.flexDirection).toBe("column");
  });

  it("defines touch-friendly minimum target size", () => {
    expect(ANCILLARY_TOUCH_TARGET_MIN_PX).toBeGreaterThanOrEqual(44);
    const touched = ancillaryTouchControlStyle({ padding: "4px 8px" }, "mobileCard");
    expect(touched.minHeight).toBeGreaterThanOrEqual(44);
    expect(ancillaryTouchControlStyle({ padding: "4px 8px" }, "desktopDense").minHeight).toBeUndefined();
  });
});

describe("Pharmacy worklist responsive wiring (19M.7)", () => {
  const pharmacySource = readWebSource("app/app/pharmacy-worklist/page.tsx");

  it("uses MedoraCard layout instead of bare wide table", () => {
    expect(pharmacySource).toContain("resolveAncillaryLayoutMode");
    expect(pharmacySource).toContain('data-testid="pharmacy-worklist-layout"');
    expect(pharmacySource).toContain("MedoraCard");
    expect(pharmacySource).toContain("MedoraCardActionsMediaStyle");
    expect(pharmacySource).not.toContain("<table");
  });

  it("preserves order workflow handlers without lifecycle changes", () => {
    expect(pharmacySource).toContain("/orders/items/${itemId}/acknowledge");
    expect(pharmacySource).toContain("/orders/items/${itemId}/start");
    expect(pharmacySource).toContain("/orders/items/${itemId}/complete");
    expect(pharmacySource).toContain("/pharmacy/dispenses/record-order");
    expect(pharmacySource).toContain("printRx");
    expect(pharmacySource).toContain('item.status === "PLACED"');
    expect(pharmacySource).toContain('item.status === "ACKNOWLEDGED"');
    expect(pharmacySource).toContain('item.status === "IN_PROGRESS"');
  });

  it("shows critical fields on cards", () => {
    expect(pharmacySource).toContain("fullPatientName");
    expect(pharmacySource).toContain("medicationLabel");
    expect(pharmacySource).toContain("tOrderItemStatusForWorklist");
    expect(pharmacySource).toContain("tOrderPriority");
    expect(pharmacySource).toContain("formatEncounterChromeDateTime");
    expect(pharmacySource).toContain("ancillaryTouchControlStyle");
  });
});

describe("Lab and radiology worklist responsive safety (19M.7)", () => {
  const labSource = readWebSource("app/app/lab-worklist/page.tsx");
  const radSource = readWebSource("app/app/rad-worklist/page.tsx");
  const toolbarSource = readWebSource("src/components/worklists/LabRadiologyWorklistOperationalToolbar.tsx");

  it("lab worklist uses responsive layout hook and card list styles", () => {
    expect(labSource).toContain("resolveAncillaryLayoutMode");
    expect(labSource).toContain('data-testid="lab-worklist-layout"');
    expect(labSource).toContain("ancillaryWorklistQueueListStyle");
    expect(labSource).toContain("MedoraCardActionsMediaStyle");
    expect(labSource).not.toContain("<table");
  });

  it("radiology worklist uses responsive layout hook and card list styles", () => {
    expect(radSource).toContain("resolveAncillaryLayoutMode");
    expect(radSource).toContain('data-testid="rad-worklist-layout"');
    expect(radSource).toContain("ancillaryWorklistQueueListStyle");
    expect(radSource).toContain("MedoraCardActionsMediaStyle");
    expect(radSource).not.toContain("<table");
  });

  it("operational toolbar wraps filters and supports touch layout mode", () => {
    expect(toolbarSource).toContain("flexWrap: \"wrap\"");
    expect(toolbarSource).toContain("layoutMode");
    expect(toolbarSource).toContain("ancillaryTouchControlStyle");
  });

  it("preserves lab/radiology workflow action handlers", () => {
    expect(labSource).toContain("handleAcknowledge");
    expect(labSource).toContain("handleStart");
    expect(labSource).toContain("handleComplete");
    expect(radSource).toContain("handleAcknowledge");
    expect(radSource).toContain("handleStart");
    expect(radSource).toContain("handleComplete");
    expect(labSource).toContain("worklistItemNeedsAcknowledge");
  });
});

describe("19M.7 regression — prior responsive phases remain", () => {
  it("19M.1 audit anchors still present", () => {
    expect(readWebSource("src/lib/mobileTabletResponsivenessAudit19M1.test.ts")).toContain("19M.1");
  });

  it("19M.3–19M.6 layout tests still present", () => {
    expect(readWebSource("src/lib/erTrackboardResponsiveLayout19M3.test.ts")).toContain("19M.3");
    expect(readWebSource("src/lib/emergencyChartResponsiveLayout19M4.test.ts")).toContain("19M.4");
    expect(readWebSource("src/lib/providerDocumentationWorkspaceLayout19M5.test.ts")).toContain("19M.5");
    expect(readWebSource("src/lib/edDispositionResponsiveLayout19M6.test.ts")).toContain("19M.6");
  });
});
