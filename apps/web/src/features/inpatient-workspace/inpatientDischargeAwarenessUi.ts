/**
 * INP.DIS.1H — presentation helpers for inpatient discharge awareness badges.
 */

import type { CSSProperties } from "react";
import type { InpatientDischargeAwarenessV1 } from "@medora/shared";

export function inpatientDischargeWorkspaceHref(
  encounterId: string,
  roles: string[] | null | undefined
): string {
  const section = "dischargePlanning";
  const list = roles ?? [];
  if (list.includes("PROVIDER") && !list.includes("RN")) {
    return `/app/hospitalisation/inpatient/active/${encodeURIComponent(encounterId)}/provider?section=${section}`;
  }
  if (list.includes("RN") && !list.includes("PROVIDER")) {
    return `/app/hospitalisation/inpatient/active/${encodeURIComponent(encounterId)}/nursing?section=${section}`;
  }
  return `/app/hospitalisation/inpatient/active/${encodeURIComponent(encounterId)}?section=${section}`;
}

export function formatInpatientDischargeAwarenessBadgeLabel(
  awareness: InpatientDischargeAwarenessV1,
  t: (key: string) => string
): string {
  const code = (awareness.badgeKey ?? awareness.dispositionCode ?? "OTHER").toUpperCase();
  const key = `inpatientDischargeAwarenessInpDis1h.badge.${code}`;
  let label = t(key);
  if (label === key) {
    label = t("inpatientDischargeAwarenessInpDis1h.badge.fallback");
  }
  if (awareness.destinationName?.trim()) {
    if (code === "TRANSFER_ACUTE_CARE") {
      return `${label} → ${awareness.destinationName.trim()}`;
    }
    if (
      code === "HOME_WITH_HOME_HEALTH" ||
      code === "SKILLED_NURSING_FACILITY" ||
      code === "CORRECTIONAL_FACILITY"
    ) {
      return `${label} · ${awareness.destinationName.trim()}`;
    }
  }
  return label;
}

export function formatInpatientDischargeAwarenessSubstatusLabel(
  awareness: InpatientDischargeAwarenessV1,
  t: (key: string) => string
): string | null {
  if (awareness.substatus === "NONE") return null;
  const key = `inpatientDischargeAwarenessInpDis1h.substatus.${awareness.substatus}`;
  const label = t(key);
  return label === key ? null : label;
}

export function inpatientDischargeAwarenessBadgeStyle(
  tone: InpatientDischargeAwarenessV1["tone"]
): CSSProperties {
  switch (tone) {
    case "ordinary":
      return {
        background: "#dcfce7",
        color: "#166534",
        border: "1px solid #86efac",
      };
    case "transfer":
      return {
        background: "#ccfbf1",
        color: "#0f766e",
        border: "1px solid #5eead4",
      };
    case "ama":
      return {
        background: "#ffedd5",
        color: "#c2410c",
        border: "1px solid #fdba74",
      };
    case "eloped":
      return {
        background: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fcd34d",
      };
    case "deceased":
      return {
        background: "#f1f5f9",
        color: "#334155",
        border: "1px solid #cbd5e1",
      };
    default:
      return {
        background: "#e0f2fe",
        color: "#075985",
        border: "1px solid #7dd3fc",
      };
  }
}

export function inpatientDischargeAwarenessRowAccent(
  tone: InpatientDischargeAwarenessV1["tone"]
): CSSProperties {
  if (tone === "ordinary") {
    return { background: "#f0fdf4" };
  }
  if (tone === "transfer") {
    return { background: "#f0fdfa" };
  }
  if (tone === "ama" || tone === "eloped") {
    return { background: "#fffbeb" };
  }
  if (tone === "deceased") {
    return { background: "#f8fafc" };
  }
  return {};
}
