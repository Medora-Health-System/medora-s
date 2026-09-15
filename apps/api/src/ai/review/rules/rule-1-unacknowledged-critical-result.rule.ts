import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { resultStudyLabel } from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

/**
 * Rule 1 — Critical result without documented reconciliation.
 *
 * Uses only the snapshot criticalValue flag and acknowledgement timestamp.
 * Never infers abnormality from free text or invented reference ranges.
 * The action is navigation-only. Medora Assist never acknowledges a result.
 */
export function rule1UnacknowledgedCriticalResult(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const suggestions = [];

  for (const result of snapshot.diagnostics.criticalResults ?? []) {
    if (result.acknowledgedByProviderAt) continue;
    if (result.criticalValue !== true) continue;

    const study = resultStudyLabel(snapshot, result);
    suggestions.push(
      buildCopiedSuggestion(ctx, {
        category: "CLINICAL_SAFETY",
        priority: "CRITICAL",
        copyKey: study ? "criticalResultNamed" : "criticalResultUnacknowledged",
        vars: study ? { study } : undefined,
        evidence: [
          {
            sourceType: "RESULT",
            sourceId: result.id,
            label: "Critical result",
            value: study ?? "present",
          },
        ],
        recommendedActions: [
          {
            actionType: "NAVIGATE",
            targetSection: "results",
            label: "Review critical result",
          },
        ],
      })
    );
  }

  return suggestions;
}
