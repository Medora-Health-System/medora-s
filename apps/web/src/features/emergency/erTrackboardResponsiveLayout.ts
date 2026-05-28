import type { CSSProperties } from "react";
import {
  CLINICAL_VIEWPORT_DESKTOP_MIN,
  CLINICAL_VIEWPORT_TABLET_MIN,
  clinicalMinTouchTarget,
  clinicalTabletCardGridStyle,
  resolveClinicalWorkspaceDensity,
  type ClinicalWorkspaceDensity,
} from "@/lib/clinicalViewport";

/** @deprecated Use CLINICAL_VIEWPORT_TABLET_MIN from clinicalViewport. */
export const ER_TRACKBOARD_MOBILE_LAYOUT_MEDIA = `(max-width: ${CLINICAL_VIEWPORT_TABLET_MIN - 0.02}px)`;

/** @deprecated Use clinical viewport tablet range. */
export const ER_TRACKBOARD_TABLET_LAYOUT_MEDIA = `(min-width: ${CLINICAL_VIEWPORT_TABLET_MIN}px) and (max-width: ${CLINICAL_VIEWPORT_DESKTOP_MIN - 0.02}px)`;

/** Desktop dense rows (>=1200px). */
export const ER_TRACKBOARD_DESKTOP_LAYOUT_MEDIA = `(min-width: ${CLINICAL_VIEWPORT_DESKTOP_MIN}px)`;

export const ER_TRACKBOARD_TOUCH_TARGET_MIN_PX = clinicalMinTouchTarget.minHeight as number;

export type ErTrackboardLayoutMode = ClinicalWorkspaceDensity;

/** @deprecated Use compactStacked. */
export type ErTrackboardLayoutModeLegacy = "mobileCard" | "tabletCard" | "desktopDense";

export function resolveErTrackboardLayoutMode(viewportWidth: number): ErTrackboardLayoutMode {
  return resolveClinicalWorkspaceDensity(viewportWidth);
}

export function erTrackboardUsesStackedCardLayout(mode: ErTrackboardLayoutMode): boolean {
  return mode !== "desktopDense";
}

export function erTrackboardPageShellStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  return {
    minHeight: "calc(100vh - 48px)",
    backgroundColor: "#f8fafc",
    padding: mode === "compactStacked" ? "0 0 12px 0" : "0 0 8px 0",
    minWidth: 0,
    boxSizing: "border-box",
  };
}

export function erTrackboardPageInnerStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  return {
    maxWidth: mode === "desktopDense" ? 1152 : "none",
    margin: "0 auto",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    padding: mode === "tabletReadable" ? "0 12px" : undefined,
  };
}

export function erTrackboardFiltersRowStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  return {
    display: "flex",
    flexDirection: mode === "compactStacked" ? "column" : "row",
    flexWrap: "wrap",
    alignItems: mode === "compactStacked" ? "stretch" : "flex-end",
    gap: mode === "compactStacked" ? 12 : 10,
    marginBottom: mode === "compactStacked" ? 20 : 28,
    width: "100%",
    minWidth: 0,
  };
}

export function erTrackboardSearchFieldStyle(): CSSProperties {
  return {
    flex: "1 1 220px",
    minWidth: 0,
    width: "100%",
  };
}

export function erTrackboardFilterActionsStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginLeft: mode === "compactStacked" ? 0 : "auto",
    width: mode === "compactStacked" ? "100%" : "auto",
  };
}

export function erTrackboardPatientListStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  const base: CSSProperties = {
    listStyle: "none",
    margin: 0,
    padding: 0,
    width: "100%",
    minWidth: 0,
  };
  if (mode === "tabletReadable" || mode === "compactStacked") {
    return {
      ...base,
      ...clinicalTabletCardGridStyle(),
    };
  }
  return {
    ...base,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };
}

export function erTrackboardTouchControlStyle(
  base: CSSProperties,
  mode: ErTrackboardLayoutMode
): CSSProperties {
  if (mode === "desktopDense") return base;
  return {
    ...base,
    minHeight: ER_TRACKBOARD_TOUCH_TARGET_MIN_PX,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

export function erTrackboardChipRowStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  return {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mode === "tabletReadable" ? 6 : 4,
    justifyContent: mode === "desktopDense" ? "flex-end" : "flex-start",
    width: "100%",
    minWidth: 0,
  };
}

export function erTrackboardOpsRegionStyle(): CSSProperties {
  return {
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1px solid #f1f5f9",
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
    width: "100%",
    minWidth: 0,
  };
}
