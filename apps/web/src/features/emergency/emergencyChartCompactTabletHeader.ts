import type { CSSProperties } from "react";
import { CLINICAL_VIEWPORT_TABLET_MIN } from "@/lib/clinicalViewport";
import type { EmergencyChartLayoutMode } from "@/features/emergency/emergencyChartResponsiveLayout";

/** Upper bound for compact tablet clinical header (768–1180px). */
export const CLINICAL_TABLET_COMPACT_HEADER_MAX = 1180;

/** Estimated sticky strip height — used for scroll containment offsets. */
export const CLINICAL_TABLET_COMPACT_STICKY_STRIP_ESTIMATE_PX = 96;

export function resolveTabletCompactClinicalHeaderMode(width: number): boolean {
  return width >= CLINICAL_VIEWPORT_TABLET_MIN && width <= CLINICAL_TABLET_COMPACT_HEADER_MAX;
}

export function emergencyChartUsesCompactTabletHeader(
  layoutMode: EmergencyChartLayoutMode,
  width: number
): boolean {
  return layoutMode === "tabletFocused" && resolveTabletCompactClinicalHeaderMode(width);
}

export function emergencyChartCompactStickyStripStyle(): CSSProperties {
  return {
    position: "sticky",
    top: 0,
    zIndex: 25,
    backgroundColor: "#fff",
    paddingBottom: 6,
    marginBottom: 6,
    borderBottom: "1px solid #e2e8f0",
    boxShadow: "0 1px 0 rgba(226, 232, 240, 0.85)",
  };
}

export function emergencyChartCompactScrollBodyStyle(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
    width: "100%",
  };
}

export function emergencyChartCompactIdentityRowStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "6px 10px",
    minWidth: 0,
    width: "100%",
  };
}

export function emergencyChartCompactAvatarClusterStyle(): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  };
}

export function emergencyChartCompactAvatarCircleStyle(): CSSProperties {
  return {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: "50%",
    backgroundColor: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
    border: "1px solid #e2e8f0",
  };
}

export function emergencyChartCompactRoomChipStyle(): CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: 8,
    border: "1px solid #bae6fd",
    backgroundColor: "#f0f9ff",
    textAlign: "center",
    minWidth: 64,
    maxWidth: 100,
    boxSizing: "border-box",
    cursor: "pointer",
    flexShrink: 0,
  };
}

export function emergencyChartCompactBadgeRowStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
    width: "100%",
    minWidth: 0,
    marginTop: 4,
  };
}

export function emergencyChartCompactClinicalPairGridStyle(): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    alignItems: "stretch",
    minWidth: 0,
    width: "100%",
  };
}

export function emergencyChartCompactCardInnerPaddingStyle(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    padding: "10px 12px",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
  };
}

export function emergencyChartWorkspaceContentContainmentStyle(compactTabletHeader: boolean): CSSProperties {
  if (!compactTabletHeader) return {};
  return {
    scrollMarginTop: 8,
    paddingTop: 2,
    minWidth: 0,
  };
}

export function emergencyChartPatientSummaryOuterStyle(
  layoutMode: EmergencyChartLayoutMode,
  compactTabletHeader: boolean
): CSSProperties {
  if (compactTabletHeader) {
    return { marginBottom: 10 };
  }
  return { marginBottom: 16 };
}
