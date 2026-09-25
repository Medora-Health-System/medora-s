import type { AiSuggestion, EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { isClinicSetting, isDischargeInProgress } from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

const RECONCILIATION_CATEGORIES = new Set<AiSuggestion["category"]>([
  "DISCHARGE_SAFETY",
  "RESULT_FOLLOWUP",
  "MEDICATION_CONSIDERATION",
  "REASSESSMENT_GAP",
  "FOLLOW_UP_GAP",
  "DOCUMENTATION_GAP",
]);

function hasDocumentedDestination(snapshot: EncounterAiSnapshot): boolean {
  if (isClinicSetting(snapshot.encounterContext.careSetting)) {
    return Boolean(String(snapshot.disposition.checkoutState ?? "").trim());
  }
  return Boolean(
    String(snapshot.disposition.disposition ?? "").trim() ||
    String(snapshot.disposition.dischargeStatus ?? "").trim()
  );
}

/**
 * Cross-finding disposition reconciliation. This does not decide whether the
 * documented destination is clinically appropriate. It only surfaces that a
 * transition destination exists while other deterministic chart-review
 * findings remain unresolved for clinician review.
 */
export function rule19DispositionConsistency(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext,
  existingFindings: AiSuggestion[]
): AiSuggestion[] {
  if (!isDischargeInProgress(snapshot) || !hasDocumentedDestination(snapshot)) return [];

  const unresolved = existingFindings.filter((finding) => RECONCILIATION_CATEGORIES.has(finding.category));
  if (unresolved.length === 0) return [];

  return [buildCopiedSuggestion(ctx, {
    category: "DISPOSITION_GAP",
    priority: unresolved.some((finding) => finding.priority === "CRITICAL" || finding.priority === "HIGH") ? "HIGH" : "MEDIUM",
    copyKey: "dispositionNeedsReconciliation",
    vars: { count: String(unresolved.length) },
    evidence: [{
      sourceType: "DISPOSITION",
      label: "Documented transition destination",
      value: isClinicSetting(snapshot.encounterContext.careSetting)
        ? snapshot.disposition.checkoutState ?? null
        : snapshot.disposition.disposition ?? snapshot.disposition.dischargeStatus ?? null,
    }],
    recommendedActions: [{ actionType: "REVIEW", label: "Review disposition with unresolved findings" }],
  })];
}
