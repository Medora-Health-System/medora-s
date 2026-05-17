/**
 * Phase 15F-D.3.3 — Observation template CARE line lifecycle (read-model + UI gates).
 */

import { OBSERVATION_ORDER_TEMPLATE_ITEMS } from "./observationOrderTemplate.js";

export type ObservationTemplateLineLifecyclePhase =
  | "ORDERED"
  | "ACKNOWLEDGED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type ObservationTemplateCareOpsIndicators = {
  pendingAcknowledgementCount: number;
  careTasksPendingCount: number;
  monitoringActiveCount: number;
  careCompleteCount: number;
  totalOpenLines: number;
};

export function deriveObservationTemplateLineLifecyclePhase(input: {
  status: string;
  cancelled: boolean;
}): ObservationTemplateLineLifecyclePhase {
  if (input.cancelled || input.status.toUpperCase() === "CANCELLED") {
    return "CANCELLED";
  }
  const s = input.status.toUpperCase();
  if (s === "COMPLETED" || s === "REVIEWED") return "COMPLETED";
  if (s === "IN_PROGRESS") return "IN_PROGRESS";
  if (s === "ACKNOWLEDGED") return "ACKNOWLEDGED";
  return "ORDERED";
}

/** Monitoring / reassessment / disposition lines may use an explicit in-progress step. */
export function observationTemplateLineAllowsInProgressStart(templateItemId: string | null): boolean {
  if (!templateItemId) return false;
  const def = OBSERVATION_ORDER_TEMPLATE_ITEMS.find((i) => i.id === templateItemId);
  if (!def) return false;
  return (
    def.group === "monitoring" ||
    def.group === "nursing_reassessment" ||
    def.group === "disposition"
  );
}

export function deriveObservationTemplateCareOpsIndicators(
  rows: { lifecyclePhase: ObservationTemplateLineLifecyclePhase; templateItemId: string | null }[]
): ObservationTemplateCareOpsIndicators {
  let pendingAcknowledgementCount = 0;
  let careTasksPendingCount = 0;
  let monitoringActiveCount = 0;
  let careCompleteCount = 0;
  let totalOpenLines = 0;

  for (const row of rows) {
    if (row.lifecyclePhase === "CANCELLED") continue;
    totalOpenLines += 1;
    if (row.lifecyclePhase === "ORDERED") {
      pendingAcknowledgementCount += 1;
      careTasksPendingCount += 1;
      continue;
    }
    if (row.lifecyclePhase === "ACKNOWLEDGED" || row.lifecyclePhase === "IN_PROGRESS") {
      careTasksPendingCount += 1;
      if (
        row.lifecyclePhase === "IN_PROGRESS" &&
        observationTemplateLineAllowsInProgressStart(row.templateItemId)
      ) {
        monitoringActiveCount += 1;
      }
      continue;
    }
    if (row.lifecyclePhase === "COMPLETED") {
      careCompleteCount += 1;
    }
  }

  return {
    pendingAcknowledgementCount,
    careTasksPendingCount,
    monitoringActiveCount,
    careCompleteCount,
    totalOpenLines,
  };
}
