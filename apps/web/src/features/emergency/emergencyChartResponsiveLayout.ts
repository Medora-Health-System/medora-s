import type { CSSProperties } from "react";
import {
  CLINICAL_MIN_TOUCH_TARGET_PX,
  CLINICAL_VIEWPORT_DESKTOP_MIN,
  clinicalStickyPatientHeaderStyle,
  clinicalTouchTargetStyle,
  resolveClinicalViewportMode,
  type ClinicalViewportMode,
  type ClinicalVitalsDisplayMode,
} from "@/lib/clinicalViewport";

/** Desktop tile navigation (>=1200px). */
export const EMERGENCY_CHART_DESKTOP_NAV_MEDIA = `(min-width: ${CLINICAL_VIEWPORT_DESKTOP_MIN}px)`;

export const EMERGENCY_CHART_TOUCH_TARGET_MIN_PX = CLINICAL_MIN_TOUCH_TARGET_PX;

export type EmergencyChartLayoutMode = "mobileStacked" | "tabletFocused" | "desktopSplit";

/** @deprecated Use tabletFocused. */
export type EmergencyChartLayoutModeLegacy = "tabletStacked";

export function resolveEmergencyChartLayoutMode(viewportWidth: number): EmergencyChartLayoutMode {
  const mode = resolveClinicalViewportMode(viewportWidth);
  if (mode === "desktop") return "desktopSplit";
  if (mode === "tablet") return "tabletFocused";
  return "mobileStacked";
}

export function usesErDesktopTileNav(mode: EmergencyChartLayoutMode): boolean {
  return mode === "desktopSplit";
}

export function usesErFocusedWorkspace(mode: EmergencyChartLayoutMode): boolean {
  return mode === "mobileStacked" || mode === "tabletFocused";
}

export function emergencyChartUsesStickyPatientHeader(mode: EmergencyChartLayoutMode): boolean {
  return mode === "tabletFocused";
}

export function erDashboardTileGridStyle(): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(10, minmax(0, 1fr))",
    gap: 6,
    width: "100%",
    minWidth: 0,
  };
}

export function erDashboardChipRailStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "nowrap",
    gap: 8,
    overflowX: "auto",
    overflowY: "hidden",
    width: "100%",
    minWidth: 0,
    paddingBottom: 4,
    WebkitOverflowScrolling: "touch",
  };
}

export function erDashboardChipButtonStyle(
  selected: boolean,
  disabled: boolean,
  mode: EmergencyChartLayoutMode = "mobileStacked"
): CSSProperties {
  const tabletFocused = mode === "tabletFocused";
  return {
    flex: "0 0 auto",
    minHeight: EMERGENCY_CHART_TOUCH_TARGET_MIN_PX,
    minWidth: EMERGENCY_CHART_TOUCH_TARGET_MIN_PX,
    maxWidth: tabletFocused ? "min(320px, 85vw)" : "min(280px, 70vw)",
    padding: tabletFocused ? "12px 16px" : "10px 14px",
    borderRadius: 9999,
    border: selected ? "2px solid #2563eb" : "1px solid #e2e8f0",
    background: selected ? "#eff6ff" : "#fff",
    color: disabled ? "#94a3b8" : selected ? "#1d4ed8" : "#334155",
    fontSize: tabletFocused ? 15 : 13,
    fontWeight: selected ? 700 : 600,
    fontFamily: "inherit",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    textAlign: "center",
    lineHeight: 1.25,
    opacity: disabled ? 0.55 : 1,
  };
}

export function emergencyChartHeaderRailStyle(mode: EmergencyChartLayoutMode): CSSProperties {
  if (mode === "mobileStacked" || mode === "tabletFocused") {
    return {
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      gap: 8,
      flex: "1 1 100%",
      minWidth: 0,
      width: "100%",
      marginLeft: 0,
    };
  }
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
    flex: "0 1 auto",
    marginLeft: "auto",
    minWidth: 140,
  };
}

export function emergencyChartTouchLinkStyle(base: CSSProperties): CSSProperties {
  return clinicalTouchTargetStyle(base);
}

export function emergencyChartPageShellStyle(mode: EmergencyChartLayoutMode): CSSProperties {
  return {
    minHeight: "calc(100vh - 48px)",
    backgroundColor: "#f8fafc",
    padding: mode === "mobileStacked" ? "0 0 20px 0" : "0 0 24px 0",
    minWidth: 0,
    boxSizing: "border-box",
  };
}

export function emergencyChartPatientSummaryShellStyle(mode: EmergencyChartLayoutMode): CSSProperties {
  return clinicalStickyPatientHeaderStyle(emergencyChartUsesStickyPatientHeader(mode));
}

export function emergencyChartContentStackStyle(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    width: "100%",
    minWidth: 0,
  };
}

export function resolveEmergencyChartViewportMode(viewportWidth: number): ClinicalViewportMode {
  return resolveClinicalViewportMode(viewportWidth);
}

export function emergencyChartViewportModeFromLayout(mode: EmergencyChartLayoutMode): ClinicalViewportMode {
  if (mode === "desktopSplit") return "desktop";
  if (mode === "tabletFocused") return "tablet";
  return "compact";
}

export function emergencyChartVitalsDisplayMode(mode: EmergencyChartLayoutMode): ClinicalVitalsDisplayMode {
  if (mode === "desktopSplit") return "desktopDense";
  if (mode === "tabletFocused") return "tabletReadable";
  return "compactStack";
}
