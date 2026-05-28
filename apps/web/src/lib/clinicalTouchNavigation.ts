import type { CSSProperties } from "react";
import {
  CLINICAL_MIN_TOUCH_TARGET_PX,
  CLINICAL_VIEWPORT_DESKTOP_MIN,
  CLINICAL_VIEWPORT_TABLET_MIN,
  clinicalMinTouchTarget,
  resolveClinicalViewportMode,
} from "./clinicalViewport";

/** Visible height of the bottom clinical navigation rail. */
export const CLINICAL_BOTTOM_RAIL_HEIGHT_PX = 72;

/** Extra scroll padding so forms/buttons are not covered by the bottom rail. */
export const CLINICAL_BOTTOM_RAIL_SAFE_PADDING_PX = 88;

export type ClinicalTouchNavigationMode = "none" | "tabletBottomRail" | "compactBottomRail" | "desktopInline";

export function resolveClinicalTouchNavigationMode(width: number): ClinicalTouchNavigationMode {
  if (width >= CLINICAL_VIEWPORT_DESKTOP_MIN) return "desktopInline";
  if (width >= CLINICAL_VIEWPORT_TABLET_MIN) return "tabletBottomRail";
  return "compactBottomRail";
}

export function shouldUseBottomClinicalRail(width: number): boolean {
  const mode = resolveClinicalTouchNavigationMode(width);
  return mode === "tabletBottomRail" || mode === "compactBottomRail";
}

export function usesBottomClinicalRail(mode: ClinicalTouchNavigationMode): boolean {
  return mode === "tabletBottomRail" || mode === "compactBottomRail";
}

export function clinicalBottomRailStyle(mode: ClinicalTouchNavigationMode): CSSProperties {
  if (!usesBottomClinicalRail(mode)) {
    return { display: "none" };
  }
  const compact = mode === "compactBottomRail";
  return {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: compact ? 6 : 8,
    overflowX: "auto",
    overflowY: "hidden",
    alignItems: "stretch",
    padding: compact ? "8px 10px max(8px, env(safe-area-inset-bottom))" : "10px 12px max(10px, env(safe-area-inset-bottom))",
    minHeight: CLINICAL_BOTTOM_RAIL_HEIGHT_PX,
    boxSizing: "border-box",
    backgroundColor: "rgba(248, 250, 252, 0.97)",
    borderTop: "1px solid #e2e8f0",
    boxShadow: "0 -4px 16px rgba(15, 23, 42, 0.08)",
    WebkitOverflowScrolling: "touch",
    backdropFilter: "blur(6px)",
  };
}

export function clinicalBottomRailButtonStyle(active: boolean, disabled: boolean): CSSProperties {
  return {
    flex: "0 0 auto",
    minWidth: 72,
    maxWidth: 120,
    minHeight: CLINICAL_MIN_TOUCH_TARGET_PX,
    padding: "8px 10px",
    borderRadius: 12,
    border: active ? "2px solid #2563eb" : "1px solid #e2e8f0",
    background: active ? "#eff6ff" : "#fff",
    color: disabled ? "#94a3b8" : active ? "#1d4ed8" : "#334155",
    fontSize: 12,
    fontWeight: active ? 700 : 600,
    fontFamily: "inherit",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    textAlign: "center",
    lineHeight: 1.2,
    opacity: disabled ? 0.55 : 1,
    boxSizing: "border-box",
  };
}

export function clinicalStickyActionBarStyle(enabled: boolean): CSSProperties {
  if (!enabled) return {};
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    width: "100%",
    minWidth: 0,
    padding: "8px 0 4px",
    borderTop: "1px solid #f1f5f9",
    marginTop: 4,
  };
}

export function clinicalSafeScrollPaddingStyle(railVisible: boolean): CSSProperties {
  if (!railVisible) return {};
  return {
    paddingBottom: CLINICAL_BOTTOM_RAIL_SAFE_PADDING_PX,
    scrollPaddingBottom: CLINICAL_BOTTOM_RAIL_SAFE_PADDING_PX,
  };
}

export function clinicalThumbReachActionStyle(base: CSSProperties = {}): CSSProperties {
  return {
    ...base,
    ...clinicalMinTouchTarget,
    display: base.display ?? "inline-flex",
    alignItems: base.alignItems ?? "center",
    justifyContent: base.justifyContent ?? "center",
    padding: base.padding ?? "10px 14px",
    borderRadius: base.borderRadius ?? 12,
    fontSize: base.fontSize ?? 14,
    fontWeight: base.fontWeight ?? 600,
    boxSizing: "border-box",
  };
}

export function clinicalTouchActionGroupStyle(useTouchGrouping: boolean): CSSProperties {
  if (!useTouchGrouping) {
    return {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
      alignItems: "center",
      justifyContent: "flex-end",
      width: "100%",
      minWidth: 0,
    };
  }
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))",
    gap: 8,
    alignItems: "stretch",
    width: "100%",
    minWidth: 0,
  };
}

export function clinicalStickyPatientContextStyle(enabled: boolean): CSSProperties {
  if (!enabled) return {};
  return {
    position: "sticky",
    top: 0,
    zIndex: 25,
    backgroundColor: "#f8fafc",
    paddingBottom: 8,
    marginBottom: 8,
    boxShadow: "0 1px 0 rgba(226, 232, 240, 0.9)",
  };
}
