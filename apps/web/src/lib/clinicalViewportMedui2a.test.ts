/**
 * Phase MEDUI.2A — compact tablet clinical header & scroll containment (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CLINICAL_TABLET_COMPACT_HEADER_MAX,
  emergencyChartUsesCompactTabletHeader,
  resolveTabletCompactClinicalHeaderMode,
} from "@/features/emergency/emergencyChartCompactTabletHeader";
import {
  emergencyChartUsesCompactStickyStrip,
  emergencyChartUsesStickyPatientHeader,
  emergencyChartVitalsDisplayMode,
} from "@/features/emergency/emergencyChartResponsiveLayout";
import { clinicalVitalsGridStyle } from "@/lib/clinicalViewport";

const webRoot = join(import.meta.dirname, "../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("MEDUI.2A compact tablet clinical header", () => {
  it("activates only on tablet widths 768–1180", () => {
    expect(resolveTabletCompactClinicalHeaderMode(767)).toBe(false);
    expect(resolveTabletCompactClinicalHeaderMode(768)).toBe(true);
    expect(resolveTabletCompactClinicalHeaderMode(1024)).toBe(true);
    expect(resolveTabletCompactClinicalHeaderMode(CLINICAL_TABLET_COMPACT_HEADER_MAX)).toBe(true);
    expect(resolveTabletCompactClinicalHeaderMode(1181)).toBe(false);
    expect(resolveTabletCompactClinicalHeaderMode(1200)).toBe(false);
  });

  it("requires tabletFocused layout mode", () => {
    expect(emergencyChartUsesCompactTabletHeader("tabletFocused", 1024)).toBe(true);
    expect(emergencyChartUsesCompactTabletHeader("mobileStacked", 1024)).toBe(false);
    expect(emergencyChartUsesCompactTabletHeader("desktopSplit", 1024)).toBe(false);
    expect(emergencyChartUsesCompactTabletHeader("tabletFocused", 390)).toBe(false);
  });

  it("uses reduced sticky strip instead of full-card sticky on compact tablet", () => {
    expect(emergencyChartUsesCompactStickyStrip("tabletFocused", 1024)).toBe(true);
    expect(emergencyChartUsesStickyPatientHeader("tabletFocused", 1024)).toBe(false);
    expect(emergencyChartUsesStickyPatientHeader("tabletFocused", 1181)).toBe(true);
    expect(emergencyChartUsesStickyPatientHeader("desktopSplit", 1024)).toBe(false);
    expect(emergencyChartUsesStickyPatientHeader("mobileStacked", 390)).toBe(false);
  });

  it("uses dense vitals layout in compact tablet mode", () => {
    expect(emergencyChartVitalsDisplayMode("tabletFocused", 1024)).toBe("tabletCompactDense");
    expect(emergencyChartVitalsDisplayMode("tabletFocused", 1181)).toBe("tabletReadable");
    expect(emergencyChartVitalsDisplayMode("desktopSplit", 1280)).toBe("desktopDense");
    expect(emergencyChartVitalsDisplayMode("mobileStacked", 390)).toBe("compactStack");
    const grid = clinicalVitalsGridStyle("tabletCompactDense");
    expect(grid.display).toBe("grid");
    expect(grid.gridTemplateColumns).toBe("1fr 1fr");
  });
});

describe("MEDUI.2A ED workspace wiring", () => {
  const active = () => readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
  const compact = () => readWebSource("src/features/emergency/EmergencyWorkspaceCompactTabletSummary.tsx");

  it("renders compact sticky strip and scroll body", () => {
    expect(active()).toContain("EmergencyWorkspaceCompactTabletSummary");
    expect(active()).toContain('data-compact-tablet-header={compactTabletHeader ? "true" : "false"}');
    expect(compact()).toContain('data-testid="emergency-workspace-compact-sticky-strip"');
    expect(compact()).toContain('data-testid="emergency-workspace-compact-scroll-body"');
    expect(compact()).toContain("BillingClassificationBadgeInteractive");
    expect(compact()).toContain("EmergencyWorkspaceAllergiesCard");
    expect(compact()).toContain("EmergencyWorkspaceVitalsCard");
  });

  it("applies workspace content containment to prevent overlap", () => {
    expect(active()).toContain("emergencyChartWorkspaceContentContainmentStyle");
    expect(readWebSource("src/features/emergency/emergencyChartCompactTabletHeader.ts")).toContain(
      "scrollMarginTop"
    );
  });

  it("preserves desktop and phone layout branches", () => {
    const src = active();
    expect(src).toContain("compactTabletHeader ? (");
    expect(src).toContain("<MedoraCardInner>");
    expect(src).toContain("clinicalPatientSummaryStackStyle");
  });

  it("keeps room badge and billing classification visible in compact strip", () => {
    const src = compact();
    expect(src).toContain("emergencyChartCompactRoomChipStyle");
    expect(src).toContain("BillingClassificationBadgeInteractive");
  });
});
