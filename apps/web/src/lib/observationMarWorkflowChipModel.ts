import type { ObservationMarEncounterSummary } from "@/lib/observationMarEncounterSummary";

export type ObservationMarWorkflowChipTone = "loading" | "alert" | "caution" | "ok" | "idle";

export type ObservationMarWorkflowChipModel = {
  tone: ObservationMarWorkflowChipTone;
  /** i18n key under `encounterChrome.observationWorkflow.marChip.*` */
  labelKey: string;
  /** Replacement for `{count}` when labelKey expects it */
  count?: number;
};

/**
 * Read-only presentation for compact MAR status (no clinical writes).
 */
export function observationMarWorkflowChipModel(
  summary: ObservationMarEncounterSummary | null,
  loading: boolean
): ObservationMarWorkflowChipModel {
  if (loading) {
    return { tone: "loading", labelKey: "encounterChrome.observationWorkflow.marChip.loading" };
  }
  if (!summary) {
    return { tone: "idle", labelKey: "encounterChrome.observationWorkflow.marChip.unavailable" };
  }
  if (summary.overdueMedicationLines > 0) {
    return {
      tone: "alert",
      labelKey: "encounterChrome.observationWorkflow.marChip.overdue",
      count: summary.overdueMedicationLines,
    };
  }
  if (summary.activeInfusionSessions > 0) {
    return {
      tone: "caution",
      labelKey: "encounterChrome.observationWorkflow.marChip.infusionActive",
      count: summary.activeInfusionSessions,
    };
  }
  if (summary.pendingMedicationLines > 0) {
    return {
      tone: "caution",
      labelKey: "encounterChrome.observationWorkflow.marChip.activeLines",
      count: summary.pendingMedicationLines,
    };
  }
  return { tone: "ok", labelKey: "encounterChrome.observationWorkflow.marChip.clear" };
}
