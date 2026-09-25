import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { isClinicSetting } from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

function isChartDischarged(snapshot: EncounterAiSnapshot): boolean {
  return String(snapshot.disposition.dischargeStatus ?? "").trim().toUpperCase() === "DISCHARGED";
}

function isExecutionComplete(status: string | null | undefined): boolean {
  return /^(COMPLETED|COMPLETE|DONE|FINALIZED)$/i.test(String(status ?? "").trim());
}

/**
 * Reconciles authoritative nursing discharge execution with the encounter's
 * documented discharge state. It does not determine discharge readiness or
 * independently interpret the intended destination.
 */
export function rule20DischargeExecutionConsistency(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  if (isClinicSetting(snapshot.encounterContext.careSetting)) return [];
  const execution = snapshot.disposition.nursingDischargeExecution;
  if (!execution?.present) return [];

  if (execution.dispositionMismatchDetected === true) {
    return [buildCopiedSuggestion(ctx, {
      category: "DISCHARGE_SAFETY",
      priority: "HIGH",
      copyKey: "dischargeExecutionMismatch",
      evidence: [{
        sourceType: "DISPOSITION",
        label: "Nursing discharge disposition mismatch",
        value: true,
      }],
      recommendedActions: [{ actionType: "REVIEW", label: "Reconcile disposition and discharge execution" }],
    })];
  }

  if (isChartDischarged(snapshot) && !isExecutionComplete(execution.executionStatus) && !execution.completedAt) {
    return [buildCopiedSuggestion(ctx, {
      category: "DOCUMENTATION_GAP",
      priority: "MEDIUM",
      copyKey: "dischargeExecutionIncomplete",
      evidence: [
        { sourceType: "DISPOSITION", label: "Discharge status", value: snapshot.disposition.dischargeStatus ?? null },
        { sourceType: "DISPOSITION", label: "Nursing discharge execution status", value: execution.executionStatus ?? null },
      ],
      recommendedActions: [{ actionType: "REVIEW", label: "Review discharge execution documentation" }],
    })];
  }

  return [];
}
