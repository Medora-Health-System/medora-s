import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

/**
 * Rule 5 — Open/incomplete follow-up.
 *
 * Flags follow-up items whose status is not COMPLETED or CANCELLED. Uses only
 * the structured follow-up status and due date from the snapshot.
 */
export function rule5OpenFollowUp(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const suggestions = [];

  for (const followUp of snapshot.disposition.followUps ?? []) {
    if (followUp.status === "COMPLETED" || followUp.status === "CANCELLED") {
      continue;
    }

    suggestions.push(
      buildAiSuggestion(ctx, {
        category: "FOLLOW_UP_GAP",
        priority: "MEDIUM",
        title: "Open/incomplete follow-up",
        summary: `Follow-up ${followUp.id} has status ${followUp.status ?? "unknown"} and is not completed.`,
        reasoningSummary:
          "The snapshot contains a follow-up with a status other than COMPLETED or CANCELLED.",
        evidence: [
          {
            sourceType: "FOLLOW_UP",
            sourceId: followUp.id,
            label: "Follow-up status",
            value: followUp.status ?? null,
          },
          {
            sourceType: "FOLLOW_UP",
            sourceId: followUp.id,
            label: "Follow-up due date",
            value: followUp.dueDate ?? null,
          },
        ],
      })
    );
  }

  return suggestions;
}
