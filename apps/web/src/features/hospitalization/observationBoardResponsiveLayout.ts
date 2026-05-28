import type { CSSProperties } from "react";
import {
  CLINICAL_MIN_TOUCH_TARGET_PX,
  clinicalMinTouchTarget,
  clinicalObservationSnapshotGridStyle,
  clinicalTabletCardGridStyle,
  resolveClinicalViewportMode,
  type ClinicalViewportMode,
} from "@/lib/clinicalViewport";
import { clinicalTouchActionGroupStyle } from "@/lib/clinicalTouchNavigation";

export const OBSERVATION_BOARD_TOUCH_TARGET_MIN_PX = CLINICAL_MIN_TOUCH_TARGET_PX;

export type ObservationBoardLayoutMode = "compactStacked" | "tabletReadable" | "desktopDense";

export function resolveObservationBoardLayoutMode(viewportWidth: number): ObservationBoardLayoutMode {
  const mode = resolveClinicalViewportMode(viewportWidth);
  if (mode === "desktop") return "desktopDense";
  if (mode === "tablet") return "tabletReadable";
  return "compactStacked";
}

export function observationBoardUsesStackedCards(mode: ObservationBoardLayoutMode): boolean {
  return mode !== "desktopDense";
}

export function observationBoardPageInnerStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  return {
    maxWidth: mode === "desktopDense" ? 1152 : "none",
    margin: "0 auto",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    padding: mode === "tabletReadable" ? "0 12px" : undefined,
  };
}

export function observationBoardSnapshotGridStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  const viewportMode: ClinicalViewportMode =
    mode === "desktopDense" ? "desktop" : mode === "tabletReadable" ? "tablet" : "compact";
  return clinicalObservationSnapshotGridStyle(viewportMode);
}

export function observationBoardPatientListStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  if (mode === "tabletReadable" || mode === "compactStacked") {
    return {
      listStyle: "none",
      margin: 0,
      padding: 0,
      ...clinicalTabletCardGridStyle(),
    };
  }
  return {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
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

export function observationBoardTouchActionGroupStyle(mode: ObservationBoardLayoutMode): CSSProperties {
  return clinicalTouchActionGroupStyle(mode !== "desktopDense");
}
