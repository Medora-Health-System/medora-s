import type { CSSProperties } from "react";

/** Desktop tile navigation (>=1024px). */
export const EMERGENCY_CHART_DESKTOP_NAV_MEDIA = "(min-width: 1024px)";

export const EMERGENCY_CHART_TOUCH_TARGET_MIN_PX = 44;

export type EmergencyChartLayoutMode = "mobileStacked" | "tabletStacked" | "desktopSplit";

export function resolveEmergencyChartLayoutMode(viewportWidth: number): EmergencyChartLayoutMode {
  if (viewportWidth >= 1280) return "desktopSplit";
  if (viewportWidth >= 1024) return "tabletStacked";
  return "mobileStacked";
}

export function usesErDesktopTileNav(mode: EmergencyChartLayoutMode): boolean {
  return mode !== "mobileStacked";
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

export function erDashboardChipButtonStyle(selected: boolean, disabled: boolean): CSSProperties {
  return {
    flex: "0 0 auto",
    minHeight: EMERGENCY_CHART_TOUCH_TARGET_MIN_PX,
    minWidth: 44,
    maxWidth: "min(280px, 70vw)",
    padding: "10px 14px",
    borderRadius: 9999,
    border: selected ? "2px solid #2563eb" : "1px solid #e2e8f0",
    background: selected ? "#eff6ff" : "#fff",
    color: disabled ? "#94a3b8" : selected ? "#1d4ed8" : "#334155",
    fontSize: 13,
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
  if (mode === "mobileStacked") {
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
  return {
    ...base,
    minHeight: EMERGENCY_CHART_TOUCH_TARGET_MIN_PX,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
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

export function emergencyChartContentStackStyle(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    width: "100%",
    minWidth: 0,
  };
}
