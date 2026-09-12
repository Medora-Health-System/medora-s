import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

/**
 * Rule 3 — Missing disposition.
 *
 * Flags a closed encounter that has no documented disposition value. Uses
 * only the encounter status and the disposition string from the snapshot.
 */
export function rule3MissingDisposition(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const isClosed = snapshot.encounterContext.status === "CLOSED";
  if (!isClosed) {
    return [];
  }

  const disposition = snapshot.disposition.disposition;
  if (disposition && String(disposition).trim().length > 0) {
    return [];
  }

  return [
    buildAiSuggestion(ctx, {
      category: "DISPOSITION_GAP",
      priority: "HIGH",
      title: "Missing disposition",
      summary: "The encounter is closed but no disposition value is documented.",
      reasoningSummary:
        "The snapshot encounterContext.status is CLOSED and disposition.disposition is null or empty.",
      evidence: [
        {
          sourceType: "DISPOSITION",
          label: "Disposition",
          value: snapshot.disposition.disposition ?? null,
        },
        {
          sourceType: "ENCOUNTER",
          label: "Encounter status",
          value: snapshot.encounterContext.status,
        },
      ],
    }),
  ];
}
