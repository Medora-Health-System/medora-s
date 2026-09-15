import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildCopiedSuggestion } from "../review.utils.js";

/**
 * Rule 5 — Follow-up item documented but not completed or cancelled.
 */
export function rule5OpenFollowUp(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const suggestions = [];

  for (const followUp of snapshot.disposition.followUps ?? []) {
    const status = String(followUp.status ?? "").trim().toUpperCase();
    if (status === "COMPLETED" || status === "CANCELLED") continue;

    suggestions.push(
      buildCopiedSuggestion(ctx, {
        category: "FOLLOW_UP_GAP",
        priority: "MEDIUM",
        copyKey: "openFollowUp",
        evidence: [
          {
            sourceType: "FOLLOW_UP",
            sourceId: followUp.id,
            label: "Follow-up status",
            value: followUp.status ?? null,
          },
        ],
      })
    );
  }

  return suggestions;
}
