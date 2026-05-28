import type { CSSProperties } from "react";
import {
  CLINICAL_VIEWPORT_DESKTOP_MIN,
  CLINICAL_VIEWPORT_TABLET_MIN,
  clinicalMinTouchTarget,
  clinicalTabletCardGridStyle,
  type ClinicalWorkspaceDensity,
} from "@/lib/clinicalViewport";
import { clinicalTouchActionGroupStyle } from "@/lib/clinicalTouchNavigation";

/** @deprecated Use CLINICAL_VIEWPORT_TABLET_MIN from clinicalViewport. */
export const ER_TRACKBOARD_MOBILE_LAYOUT_MEDIA = `(max-width: ${CLINICAL_VIEWPORT_TABLET_MIN - 0.02}px)`;

/** @deprecated Use clinical viewport tablet range. */
export const ER_TRACKBOARD_TABLET_LAYOUT_MEDIA = `(min-width: ${CLINICAL_VIEWPORT_TABLET_MIN}px) and (max-width: ${CLINICAL_VIEWPORT_DESKTOP_MIN - 0.02}px)`;

/** Desktop dense rows (>=1200px). */
export const ER_TRACKBOARD_DESKTOP_LAYOUT_MEDIA = `(min-width: ${CLINICAL_VIEWPORT_DESKTOP_MIN}px)`;

export const ER_TRACKBOARD_TOUCH_TARGET_MIN_PX = clinicalMinTouchTarget.minHeight as number;

/** Expanded tablet card inner padding (MEDUI.1 readable mode — reference only). */
export const ER_TRACKBOARD_TABLET_READABLE_CARD_PADDING_PX = 16;

/** Compact tablet board card inner padding (MEDUI.2B). */
export const ER_TRACKBOARD_TABLET_COMPACT_CARD_PADDING = "10px 12px";

/** Compact tablet board list gap between patient cards. */
export const ER_TRACKBOARD_TABLET_COMPACT_LIST_GAP_PX = 6;

export type ErTrackboardLayoutMode = "compactStacked" | "tabletCompactBoard" | "desktopDense";

/** @deprecated Use compactStacked. */
export type ErTrackboardLayoutModeLegacy = "mobileCard" | "tabletCard" | "desktopDense";

/** @deprecated MEDUI.1 alias — observation board still uses ClinicalWorkspaceDensity.tabletReadable. */
export type ErTrackboardLayoutModeClinicalAlias = ClinicalWorkspaceDensity;

export function resolveErTrackboardLayoutMode(viewportWidth: number): ErTrackboardLayoutMode {
  if (viewportWidth >= CLINICAL_VIEWPORT_DESKTOP_MIN) return "desktopDense";
  if (viewportWidth >= CLINICAL_VIEWPORT_TABLET_MIN) return "tabletCompactBoard";
  return "compactStacked";
}

export function erTrackboardUsesStackedCardLayout(mode: ErTrackboardLayoutMode): boolean {
  return mode === "compactStacked";
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
    padding: mode === "tabletCompactBoard" ? "0 12px" : undefined,
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
  if (mode === "tabletCompactBoard") {
    return {
      ...base,
      display: "flex",
      flexDirection: "column",
      gap: ER_TRACKBOARD_TABLET_COMPACT_LIST_GAP_PX,
    };
  }
  if (mode === "compactStacked") {
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

export function erTrackboardCardInnerStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  const compact = mode === "tabletCompactBoard";
  return {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: compact ? 6 : 16,
    padding: compact ? ER_TRACKBOARD_TABLET_COMPACT_CARD_PADDING : 16,
    alignItems: "stretch",
    justifyContent: "space-between",
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
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

export function erTrackboardPrimaryBadgeRowStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  return {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mode === "tabletCompactBoard" ? 4 : mode === "compactStacked" ? 6 : 4,
    justifyContent: mode === "desktopDense" ? "flex-end" : "flex-start",
    width: "100%",
    minWidth: 0,
  };
}

/** @deprecated Use erTrackboardPrimaryBadgeRowStyle. */
export function erTrackboardChipRowStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  return erTrackboardPrimaryBadgeRowStyle(mode);
}

export function erTrackboardSecondaryBadgeRowStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  return {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mode === "tabletCompactBoard" ? 3 : 4,
    alignItems: "center",
    width: "100%",
    minWidth: 0,
  };
}

export function erTrackboardOpsRegionStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  const compact = mode === "tabletCompactBoard";
  return {
    marginTop: compact ? 0 : 6,
    paddingTop: compact ? 4 : 6,
    borderTop: "1px solid #f1f5f9",
    display: "flex",
    flexWrap: "wrap",
    gap: compact ? 3 : 4,
    alignItems: "center",
    width: "100%",
    minWidth: 0,
    flexBasis: "100%",
  };
}

export function erTrackboardPersonnelBlockStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  const compact = mode === "tabletCompactBoard";
  return {
    display: "flex",
    flexDirection: "column",
    gap: compact ? 0 : 2,
    padding: compact ? "2px 6px" : "4px 8px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    backgroundColor: "#fff",
    minWidth: 0,
    width: compact ? "auto" : "100%",
    maxWidth: compact ? 200 : undefined,
  };
}

export function erTrackboardPersonnelLineStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  const stacked = mode === "compactStacked";
  const compact = mode === "tabletCompactBoard";
  return {
    margin: 0,
    fontSize: compact ? 10 : 11,
    fontWeight: 500,
    color: "#475569",
    lineHeight: compact ? 1.2 : 1.25,
    overflow: stacked ? "visible" : "hidden",
    textOverflow: stacked ? "clip" : "ellipsis",
    whiteSpace: stacked ? "normal" : "nowrap",
    wordBreak: "break-word",
  };
}

export function erTrackboardTouchActionGroupStyle(mode: ErTrackboardLayoutMode): CSSProperties {
  if (mode === "desktopDense") {
    return clinicalTouchActionGroupStyle(false);
  }
  if (mode === "tabletCompactBoard") {
    return {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      alignItems: "center",
      justifyContent: "flex-end",
      width: "100%",
      minWidth: 0,
    };
  }
  return clinicalTouchActionGroupStyle(true);
}

export function erTrackboardRightColumnMaxWidth(mode: ErTrackboardLayoutMode): number {
  if (mode === "tabletCompactBoard") return 300;
  if (mode === "compactStacked") return 240;
  return 240;
}
