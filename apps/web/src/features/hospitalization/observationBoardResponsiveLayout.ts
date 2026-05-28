import type { CSSProperties } from "react";
import {
  CLINICAL_MIN_TOUCH_TARGET_PX,
  CLINICAL_VIEWPORT_DESKTOP_MIN,
  CLINICAL_VIEWPORT_TABLET_MIN,
  clinicalMinTouchTarget,
  clinicalTabletCardGridStyle,
} from "@/lib/clinicalViewport";
import { clinicalTouchActionGroupStyle } from "@/lib/clinicalTouchNavigation";

export const OBSERVATION_BOARD_TOUCH_TARGET_MIN_PX = CLINICAL_MIN_TOUCH_TARGET_PX;

/** Compact tablet census card inner padding (MEDUI.2D extension). */
export const OBSERVATION_BOARD_TABLET_COMPACT_CARD_PADDING = "10px 12px";

/** Compact tablet census list gap between patient cards. */
export const OBSERVATION_BOARD_TABLET_COMPACT_LIST_GAP_PX = 6;

/** Tablet census action button min touch height. */
export const OBSERVATION_BOARD_CENSUS_ACTION_MIN_PX = 40;

/** Approximate target tablet census card height ceiling (documentation/test anchor). */
export const OBSERVATION_BOARD_CENSUS_CARD_TARGET_MAX_HEIGHT_PX = 170;

export type ObservationBoardLayoutMode = "compactStacked" | "tabletCompactBoard" | "desktopDense";

/** @deprecated MEDUI.1 alias */
export type ObservationBoardLayoutModeLegacy = "compactStacked" | "tabletReadable" | "desktopDense";

export function resolveObservationBoardLayoutMode(viewportWidth: number): ObservationBoardLayoutMode {
  if (viewportWidth >= CLINICAL_VIEWPORT_DESKTOP_MIN) return "desktopDense";
  if (viewportWidth >= CLINICAL_VIEWPORT_TABLET_MIN) return "tabletCompactBoard";
  return "compactStacked";
}

export function observationBoardUsesStackedCards(mode: ObservationBoardLayoutMode): boolean {
  return mode === "compactStacked";
}

export function observationBoardUsesCompactCensus(mode: ObservationBoardLayoutMode): boolean {
  return mode === "tabletCompactBoard";
}

export function observationBoardPageInnerStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  return {
    maxWidth: mode === "desktopDense" ? 1152 : "none",
    margin: "0 auto",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    padding: mode === "tabletCompactBoard" ? "0 12px" : undefined,
  };
}

export function observationBoardSnapshotSectionStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  const compact = mode === "tabletCompactBoard";
  return {
    marginBottom: compact ? 12 : 16,
    padding: compact ? "8px 10px" : "12px 14px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    backgroundColor: "#fff",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
  };
}

export function observationBoardSnapshotTitleStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  const compact = mode === "tabletCompactBoard";
  return {
    fontSize: compact ? 12 : 13,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: compact ? 6 : 8,
  };
}

export function observationBoardSnapshotGridStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  if (mode === "desktopDense") {
    return {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 8,
      alignItems: "stretch",
    };
  }
  if (mode === "tabletCompactBoard") {
    return {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 4,
      marginBottom: 6,
      alignItems: "stretch",
      width: "100%",
      minWidth: 0,
    };
  }
  return {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
    marginBottom: 8,
    alignItems: "stretch",
    width: "100%",
    minWidth: 0,
  };
}

export function observationBoardStatChipShellStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  const compact = mode === "tabletCompactBoard";
  return {
    display: "inline-flex",
    flexDirection: "column",
    minWidth: compact ? 48 : 54,
    padding: compact ? "4px 6px" : "6px 8px",
    borderRadius: compact ? 6 : 8,
    border: "1px solid #e2e8f0",
    backgroundColor: "#fafafa",
  };
}

export function observationBoardStatChipLabelStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  const compact = mode === "tabletCompactBoard";
  return {
    fontSize: compact ? 8 : 9,
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    lineHeight: 1.2,
  };
}

export function observationBoardStatChipValueStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  const compact = mode === "tabletCompactBoard";
  return {
    fontSize: compact ? 13 : 15,
    fontWeight: 700,
    color: "#0f172a",
    lineHeight: 1.2,
  };
}

export function observationBoardPatientListStyle(mode: ObservationBoardLayoutMode): CSSProperties {
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
      gap: OBSERVATION_BOARD_TABLET_COMPACT_LIST_GAP_PX,
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

export function observationBoardCardInnerStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  const compact = mode === "tabletCompactBoard";
  return {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: compact ? 6 : 16,
    padding: compact ? OBSERVATION_BOARD_TABLET_COMPACT_CARD_PADDING : 16,
    alignItems: "stretch",
    justifyContent: "space-between",
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
  };
}

export function observationBoardTouchControlStyle(
  base: CSSProperties,
  mode: ObservationBoardLayoutMode
): CSSProperties {
  if (mode === "desktopDense") return base;
  return {
    ...base,
    ...clinicalMinTouchTarget,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

export function observationBoardFilterRowStyle(mode: ObservationBoardLayoutMode): CSSProperties {
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

export function observationBoardPrimaryBadgeRowStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  return {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mode === "tabletCompactBoard" ? 3 : mode === "compactStacked" ? 6 : 4,
    justifyContent: mode === "desktopDense" ? "flex-end" : "flex-start",
    width: "100%",
    minWidth: 0,
  };
}

export function observationBoardOpsChipRowStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  const compact = mode === "tabletCompactBoard";
  return {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: compact ? 3 : 4,
    justifyContent: "flex-end",
    marginTop: compact ? 0 : 4,
    maxWidth: compact ? "100%" : 320,
    width: "100%",
    minWidth: 0,
  };
}

export function observationBoardPersonnelBlockStyle(mode: ObservationBoardLayoutMode): CSSProperties {
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

export function observationBoardPersonnelLineStyle(mode: ObservationBoardLayoutMode): CSSProperties {
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

export function observationBoardTouchActionGroupStyle(mode: ObservationBoardLayoutMode): CSSProperties {
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

export function observationBoardRightColumnMaxWidth(mode: ObservationBoardLayoutMode): number {
  if (mode === "tabletCompactBoard") return 320;
  if (mode === "compactStacked") return 320;
  return 320;
}

export function observationBoardCensusActionButtonStyle(
  base: CSSProperties,
  mode: ObservationBoardLayoutMode
): CSSProperties {
  if (mode === "desktopDense") return base;
  if (mode === "tabletCompactBoard") {
    return {
      ...base,
      minHeight: OBSERVATION_BOARD_CENSUS_ACTION_MIN_PX,
      paddingTop: 0,
      paddingBottom: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    };
  }
  return {
    ...base,
    minHeight: OBSERVATION_BOARD_TOUCH_TARGET_MIN_PX,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

export function observationBoardIdentityTitleStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  return {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
    lineHeight: mode === "tabletCompactBoard" ? 1.15 : 1.2,
  };
}

export function observationBoardIdentityLineStyle(
  mode: ObservationBoardLayoutMode,
  base: CSSProperties
): CSSProperties {
  const compact = mode === "tabletCompactBoard";
  return {
    ...base,
    margin: compact ? "1px 0 0 0" : "2px 0 0 0",
    lineHeight: compact ? 1.25 : 1.3,
  };
}
