import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

/**
 * Rule 1 — Unacknowledged critical result.
 *
 * Flags any result in the snapshot whose criticalValue is true and whose
 * acknowledgedByProviderAt timestamp is absent. Uses only structured result
 * facts; never infers clinical meaning from free-text result text.
 */
export function rule1UnacknowledgedCriticalResult(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const suggestions = [];
  const criticalResults = snapshot.diagnostics.criticalResults ?? [];

  for (const result of criticalResults) {
    if (result.acknowledgedByProviderAt) {
      continue;
    }

    suggestions.push(
      buildAiSuggestion(ctx, {
        category: "CLINICAL_SAFETY",
        priority: "CRITICAL",
        title: "Unacknowledged critical result",
        summary: `Critical result ${result.id} has not been acknowledged by a provider.`,
        reasoningSummary:
          "The snapshot marks the result as critical and the acknowledgement timestamp is absent.",
        evidence: [
          {
            sourceType: "RESULT",
            sourceId: result.id,
            label: "Critical result",
            value: "present",
          },
          {
            sourceType: "RESULT",
            sourceId: result.id,
            label: "Acknowledged by provider at",
            value: result.acknowledgedByProviderAt ?? null,
          },
          {
            sourceType: "RESULT",
            sourceId: result.id,
            label: "Result verified at",
            value: result.verifiedAt ?? null,
          },
        ],
        recommendedActions: [
          { actionType: "ACKNOWLEDGE", label: "Acknowledge critical result" },
        ],
      })
    );
  }

  return suggestions;
}
