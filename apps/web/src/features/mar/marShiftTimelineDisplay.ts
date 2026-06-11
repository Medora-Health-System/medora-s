import type { CSSProperties } from "react";
import type {
  MarShiftTimelineCellItem,
  MarShiftTimelineDrawerAction,
} from "@/lib/marShiftTimelineApi";

export const MAR_SHIFT_TIMELINE_MUTATION_ACTIONS = new Set<MarShiftTimelineDrawerAction>([
  "ADMINISTER",
  "START_INFUSION",
  "STOP_INFUSION",
  "REFUSE",
  "HOLD",
]);

export function isMarShiftTimelineMutationAction(action: MarShiftTimelineDrawerAction): boolean {
  return MAR_SHIFT_TIMELINE_MUTATION_ACTIONS.has(action);
}

export function buildMarShiftTimelineItemHoverTitle(item: MarShiftTimelineCellItem): string {
  const lines = [
    item.hover.title,
    item.hover.due ? `Due: ${item.hover.due}` : null,
    item.hover.dose ? `Dose: ${item.hover.dose}` : null,
    item.hover.route ? `Route: ${item.hover.route}` : null,
    item.hover.witness ? `Witness: ${item.hover.witness}` : null,
    item.hover.status ? `Status: ${item.hover.status}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function marShiftTimelineItemStatusStyle(doseStatus: string): CSSProperties {
  const status = doseStatus.trim().toUpperCase();
  if (status === "COMPLETED") {
    return { backgroundColor: "#f1f5f9", borderColor: "#cbd5e1", color: "#475569" };
  }
  if (status === "OVERDUE") {
    return { backgroundColor: "#fff7ed", borderColor: "#fdba74", color: "#9a3412" };
  }
  if (status === "DUE" || status === "PLANNED") {
    return { backgroundColor: "#f8fafc", borderColor: "#e2e8f0", color: "#0f172a" };
  }
  if (status === "IN_PROGRESS") {
    return { backgroundColor: "#eff6ff", borderColor: "#93c5fd", color: "#1e40af" };
  }
  if (status === "HELD" || status === "MISSED") {
    return { backgroundColor: "#fafafa", borderColor: "#d4d4d4", color: "#525252" };
  }
  return { backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a" };
}
