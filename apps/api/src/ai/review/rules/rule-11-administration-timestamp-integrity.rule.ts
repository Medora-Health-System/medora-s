import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

function isAdministeredAction(action?: string | null): boolean {
  return String(action ?? "").trim().toLowerCase() === "administered";
}

/**
 * Medication administration documentation integrity.
 *
 * Uses only structured MAR facts already present in the authorized snapshot.
 * A row explicitly marked administered without an administration timestamp is
 * surfaced in Treatment as a medication-record concern. It does not infer
 * whether the medication was or was not actually given.
 */
export function rule11AdministrationTimestampIntegrity(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const affected = (snapshot.treatments.medicationAdministrations ?? []).filter(
    (administration) =>
      isAdministeredAction(administration.action) && !administration.administeredAt
  );

  if (affected.length === 0) return [];

  return [
    buildAiSuggestion(ctx, {
      category: "MEDICATION_CONSIDERATION",
      priority: "MEDIUM",
      title: "Medication administration timestamp missing",
      summary:
        "One or more MAR entries are marked as administered but do not contain an administration timestamp. Confirm and complete the medication administration record when appropriate.",
      reasoningSummary:
        "The medication administration record shows an administered status without an administration time. This does not determine whether the medication was actually given.",
      evidence: affected.map((administration) => ({
        sourceType: "MEDICATION" as const,
        sourceId: administration.id,
        label: "MAR entry marked administered without timestamp",
        value: administration.orderItemId ?? administration.id,
      })),
      recommendedActions: [
        { actionType: "REVIEW", label: "Review medication administration record" },
      ],
    }),
  ];
}
