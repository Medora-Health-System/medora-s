import type { CSSProperties } from "react";

/** Compact phones / narrow portrait (<768px). */
export const CLINICAL_VIEWPORT_COMPACT_MAX = 767;

/** Tablet / iPad / bedside devices (768–1199px). */
export const CLINICAL_VIEWPORT_TABLET_MIN = 768;
export const CLINICAL_VIEWPORT_TABLET_MAX = 1199;

/** Desktop clinical density (>=1200px). */
export const CLINICAL_VIEWPORT_DESKTOP_MIN = 1200;

export const CLINICAL_MIN_TOUCH_TARGET_PX = 44;

export type ClinicalViewportMode = "compact" | "tablet" | "desktop";

export type ClinicalWorkspaceDensity = "compactStacked" | "tabletReadable" | "desktopDense";

export type ClinicalVitalsDisplayMode = "compactStack" | "tabletReadable" | "tabletCompactDense" | "desktopDense";

export function resolveClinicalViewportMode(width: number): ClinicalViewportMode {
  if (width >= CLINICAL_VIEWPORT_DESKTOP_MIN) return "desktop";
  if (width >= CLINICAL_VIEWPORT_TABLET_MIN) return "tablet";
  return "compact";
}

export function resolveClinicalWorkspaceDensity(width: number): ClinicalWorkspaceDensity {
  const mode = resolveClinicalViewportMode(width);
  if (mode === "desktop") return "desktopDense";
  if (mode === "tablet") return "tabletReadable";
  return "compactStacked";
}

export function resolveClinicalVitalsDisplayMode(width: number): ClinicalVitalsDisplayMode {
  const mode = resolveClinicalViewportMode(width);
  if (mode === "desktop") return "desktopDense";
  if (mode === "tablet") return "tabletReadable";
  return "compactStack";
}

export function isTouchOptimized(mode: ClinicalViewportMode): boolean {
  return mode === "compact" || mode === "tablet";
}

export function isClinicalTablet(mode: ClinicalViewportMode): boolean {
  return mode === "tablet";
}

export function shouldCollapseSidebar(mode: ClinicalViewportMode): boolean {
  return mode === "compact" || mode === "tablet";
}

export function shouldUseFocusedWorkspace(mode: ClinicalViewportMode): boolean {
  return mode === "compact" || mode === "tablet";
}

export function shouldUseReadableVitals(mode: ClinicalViewportMode): boolean {
  return mode === "compact" || mode === "tablet";
}

export const clinicalMinTouchTarget: CSSProperties = {
  minHeight: CLINICAL_MIN_TOUCH_TARGET_PX,
  minWidth: CLINICAL_MIN_TOUCH_TARGET_PX,
};

export const clinicalReadableText: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.45,
};

export const clinicalReadableBadgeWrap: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
  minWidth: 0,
  width: "100%",
};

export const clinicalTabletPanelPadding: CSSProperties = {
  padding: "14px 16px",
};

export const clinicalTabletSectionGap: CSSProperties = {
  gap: 14,
};

export function clinicalTouchTargetStyle(base: CSSProperties = {}): CSSProperties {
  return {
    ...base,
    ...clinicalMinTouchTarget,
    display: base.display ?? "inline-flex",
    alignItems: base.alignItems ?? "center",
    justifyContent: base.justifyContent ?? "center",
  };
}

export function clinicalTabletCardGridStyle(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: "100%",
    minWidth: 0,
  };
}

export function clinicalStickyPatientHeaderStyle(enabled: boolean): CSSProperties {
  if (!enabled) return {};
  return {
    position: "sticky",
    top: 0,
    zIndex: 20,
    backgroundColor: "#f8fafc",
    paddingBottom: 8,
    marginBottom: 8,
    boxShadow: "0 1px 0 rgba(226, 232, 240, 0.9)",
  };
}

export function clinicalVitalsLabelStyle(mode: ClinicalVitalsDisplayMode): CSSProperties {
  if (mode === "desktopDense") {
    return { fontSize: 11, color: "#64748b", fontWeight: 600, flexShrink: 0 };
  }
  if (mode === "tabletCompactDense") {
    return { fontSize: 12, color: "#64748b", fontWeight: 600, flexShrink: 0 };
  }
  return { fontSize: 13, color: "#64748b", fontWeight: 600, flexShrink: 0 };
}

export function clinicalVitalsValueStyle(mode: ClinicalVitalsDisplayMode): CSSProperties {
  if (mode === "desktopDense") {
    return { fontSize: 12, color: "#0f172a", fontWeight: 700, wordBreak: "break-word" };
  }
  if (mode === "tabletCompactDense") {
    return { fontSize: 14, color: "#0f172a", fontWeight: 700, wordBreak: "break-word" };
  }
  return { fontSize: 16, color: "#0f172a", fontWeight: 700, wordBreak: "break-word" };
}

export function clinicalVitalsGridStyle(mode: ClinicalVitalsDisplayMode): CSSProperties {
  if (mode === "compactStack") {
    return {
      marginTop: 8,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      alignItems: "stretch",
      minWidth: 0,
      width: "100%",
    };
  }
  if (mode === "tabletCompactDense") {
    return {
      marginTop: 4,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "4px 8px",
      alignItems: "baseline",
      minWidth: 0,
      width: "100%",
    };
  }
  return {
    marginTop: 8,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px 14px",
    alignItems: "baseline",
    minWidth: 0,
    width: "100%",
  };
}

export function clinicalVitalsShellStyle(mode: ClinicalVitalsDisplayMode, interactive: boolean): CSSProperties {
  const base: CSSProperties = {
    padding:
      mode === "desktopDense" ? "8px 10px" : mode === "tabletCompactDense" ? "8px 10px" : "12px 14px",
    borderRadius: 10,
    border: interactive ? "1px solid #bae6fd" : "1px solid #e2e8f0",
    backgroundColor: interactive ? "#f8fafc" : "#fff",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    cursor: interactive ? "pointer" : "default",
  };
  if (mode === "desktopDense") {
    return { ...base, flex: "1 1 160px" };
  }
  if (mode === "tabletCompactDense") {
    return { ...base, flex: "1 1 100%", width: "100%", minHeight: 0 };
  }
  return { ...base, flex: "1 1 100%", width: "100%" };
}

export function clinicalPatientSummaryStackStyle(mode: ClinicalViewportMode): CSSProperties {
  if (mode === "desktop") {
    return {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "flex-start",
      gap: "10px 12px",
      width: "100%",
    };
  }
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: mode === "tablet" ? 14 : 12,
    width: "100%",
    minWidth: 0,
  };
}

export function clinicalObservationSnapshotGridStyle(mode: ClinicalViewportMode): CSSProperties {
  if (mode === "desktop") {
    return {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 8,
      alignItems: "stretch",
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
