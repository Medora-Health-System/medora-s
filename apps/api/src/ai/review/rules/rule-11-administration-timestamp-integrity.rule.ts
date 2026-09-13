import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

function isAdministeredAction(action?: string | null): boolean {
  return String(action ?? "").trim().toLowerCase() === "administered";
}

/**
 * Phase 2E — medication administration documentation integrity.
 *
 * Uses only structured MAR facts already present in the authorized snapshot.
 * A row explicitly marked administered without an administration timestamp is
 * surfaced as a documentation inconsistency. It does not infer whether the
 * medication was or was not actually given.
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
      category: "DOCUMENTATION_GAP",
      priority: "MEDIUM",
      title: "Medication administration timestamp missing",
      summary:
        "One or more MAR entries are marked as administered but do not contain an administration timestamp. Review the medication administration record for documentation completeness.",
      reasoningSummary:
        "This finding compares only the structured MAR action and timestamp fields. It does not determine whether the medication was actually given.",
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
