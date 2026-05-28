import type { CSSProperties } from "react";
import {
  CLINICAL_MIN_TOUCH_TARGET_PX,
  CLINICAL_VIEWPORT_DESKTOP_MIN,
  CLINICAL_VIEWPORT_TABLET_MIN,
} from "./clinicalViewport";

export type ClinicalTabletPanelDensityMode = "compact" | "default";

export function resolveClinicalTabletPanelDensityMode(viewportWidth: number): ClinicalTabletPanelDensityMode {
  if (viewportWidth >= CLINICAL_VIEWPORT_DESKTOP_MIN) return "default";
  if (viewportWidth >= CLINICAL_VIEWPORT_TABLET_MIN) return "compact";
  return "default";
}

export function clinicalTabletUsesCompactPanel(density: ClinicalTabletPanelDensityMode): boolean {
  return density === "compact";
}

export const clinicalTabletCompactPanelPadding = "8px 10px";

export const clinicalTabletCompactRowGapPx = 6;

export function clinicalTabletCompactCardGridStyle(): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: clinicalTabletCompactRowGapPx,
  };
}

export const clinicalTabletCompactMetadataText: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.25,
};

export function clinicalTabletCompactActionRowStyle(): CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: clinicalTabletCompactRowGapPx,
    alignItems: "center",
    width: "100%",
    minWidth: 0,
  };
}

export function clinicalTabletCompactTouchButtonStyle(base: CSSProperties = {}): CSSProperties {
  return {
    ...base,
    minHeight: CLINICAL_MIN_TOUCH_TARGET_PX,
    display: base.display ?? "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  };
}

export function clinicalTabletCompactBannerStyle(base: CSSProperties = {}): CSSProperties {
  return {
    ...base,
    padding: clinicalTabletCompactPanelPadding,
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 1.35,
  };
}

export function clinicalTabletCompactMarCellStyle(base: CSSProperties = {}): CSSProperties {
  return {
    ...base,
    padding: "6px 6px",
    fontSize: 12,
  };
}

export function clinicalTabletCompactMarHeaderCellStyle(base: CSSProperties = {}): CSSProperties {
  return {
    ...base,
    padding: "6px 6px",
    fontSize: 11,
  };
}

export function clinicalTabletCompactHistoryItemStyle(base: CSSProperties = {}): CSSProperties {
  return {
    ...base,
    padding: clinicalTabletCompactPanelPadding,
    marginBottom: 6,
  };
}
