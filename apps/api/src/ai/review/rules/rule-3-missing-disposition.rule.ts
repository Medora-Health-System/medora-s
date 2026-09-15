import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { isClinicSetting } from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

/**
 * Rule 3 — Missing disposition / clinic checkout on a closed encounter.
 * Clinic uses ambulatory checkout; ED/inpatient use disposition.
 */
export function rule3MissingDisposition(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  if (snapshot.encounterContext.status !== "CLOSED") return [];

  if (isClinicSetting(snapshot.encounterContext.careSetting)) {
    if (String(snapshot.disposition.checkoutState ?? "").trim()) return [];
    return [
      buildCopiedSuggestion(ctx, {
        category: "DISPOSITION_GAP",
        priority: "HIGH",
        copyKey: "missingCheckout",
        evidence: [
          {
            sourceType: "DISPOSITION",
            label: "Clinic checkout destination",
            value: snapshot.disposition.checkoutState ?? null,
          },
        ],
      }),
    ];
  }

  if (String(snapshot.disposition.disposition ?? "").trim()) return [];

  return [
    buildCopiedSuggestion(ctx, {
      category: "DISPOSITION_GAP",
      priority: "HIGH",
      copyKey: "missingDisposition",
      evidence: [
        {
          sourceType: "DISPOSITION",
          label: "Disposition",
          value: snapshot.disposition.disposition ?? null,
        },
      ],
    }),
  ];
}
