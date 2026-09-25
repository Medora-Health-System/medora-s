import type { AiSuggestion, EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { isClinicSetting, isDischargeInProgress, parseIsoMs } from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

function hasLaterReassessment(snapshot: EncounterAiSnapshot, after: string): boolean {
  const afterMs = parseIsoMs(after);
  if (afterMs === null) return false;
  return (snapshot.clinicalDocumentation.reassessments ?? []).some((entry) => {
    const time = parseIsoMs(entry.documentedAt);
    return time !== null && time > afterMs && !entry.voidedAt;
  });
}

/** Conservative treatment-documentation reconciliation using authoritative
 * procedure and IV event projections. No treatment appropriateness inference. */
export function rule21TreatmentResponseDocumentation(snapshot: EncounterAiSnapshot, ctx: SuggestionContext): AiSuggestion[] {
  const suggestions: AiSuggestion[] = [];
  if (!isClinicSetting(snapshot.encounterContext.careSetting)) {
    for (const event of snapshot.treatments.procedureEvents ?? []) {
      const performedAt = event.performedAt ?? event.documentedAt;
      if (!performedAt || hasLaterReassessment(snapshot, performedAt)) continue;
      const procedure = event.procedureType?.trim() || "A procedure";
      suggestions.push(buildCopiedSuggestion(ctx, {
        category: "REASSESSMENT_GAP", priority: "MEDIUM", copyKey: "procedureWithoutReassessment", vars: { procedure },
        evidence: [{ sourceType: "PROCEDURE", sourceId: event.id, label: "Documented procedure", value: procedure }],
        recommendedActions: [{ actionType: "REVIEW", label: "Review response after procedure" }],
      }));
    }
  }

  if (isDischargeInProgress(snapshot)) {
    for (const event of snapshot.treatments.ivAccessEvents ?? []) {
      if (event.eventType !== "IV_REMOVED") continue;
      if (event.removedAt && event.reason?.trim()) continue;
      suggestions.push(buildCopiedSuggestion(ctx, {
        category: "DOCUMENTATION_GAP", priority: "MEDIUM", copyKey: "ivRemovalDocumentationIncomplete",
        evidence: [{ sourceType: "PROCEDURE", sourceId: event.id, label: "IV removal documentation", value: event.site ?? "IV access" }],
        recommendedActions: [{ actionType: "REVIEW", label: "Review IV removal documentation" }],
      }));
    }
  }

  return suggestions.slice(0, 5);
}
