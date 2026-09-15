import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import {
  followUpExpected,
  hasFollowUpDocumentation,
  isDischargeInProgress,
} from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

/**
 * Rule 11 — Follow-up instructions missing when discharge/checkout expects them.
 */
export function rule11MissingFollowUpAtDischarge(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  if (!isDischargeInProgress(snapshot)) return [];
  if (!followUpExpected(snapshot)) return [];
  if (hasFollowUpDocumentation(snapshot)) return [];

  return [
    buildCopiedSuggestion(ctx, {
      category: "FOLLOW_UP_GAP",
      priority: "MEDIUM",
      copyKey: "missingFollowUp",
      evidence: [
        {
          sourceType: "FOLLOW_UP",
          label: "Follow-up documented",
          value: false,
        },
      ],
    }),
  ];
}
