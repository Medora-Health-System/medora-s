import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

function hasProviderWork(snapshot: EncounterAiSnapshot): boolean {
  const doc = snapshot.clinicalDocumentation;
  return Boolean(
    doc.providerDocumentationStatus ||
      doc.providerNote?.text?.trim() ||
      doc.treatmentPlan?.text?.trim() ||
      (doc.structuredEntries?.length ?? 0) > 0 ||
      (doc.reassessments?.length ?? 0) > 0
  );
}

/**
 * Phase 2J — emergency safety completeness.
 *
 * Once provider work has started in an ED encounter, surface the absence of a
 * captured vital-sign set. This is a chart-review signal only; it does not
 * claim bedside vitals were never obtained.
 */
export function rule14EdMissingVitals(snapshot: EncounterAiSnapshot, ctx: SuggestionContext) {
  if (snapshot.encounterContext.careSetting !== "EMERGENCY_DEPARTMENT") return [];
  if (!hasProviderWork(snapshot)) return [];
  if (snapshot.presentation.latestVitals || (snapshot.presentation.vitalTrend?.length ?? 0) > 0) return [];

  return [
    buildAiSuggestion(ctx, {
      category: "CLINICAL_SAFETY",
      priority: "HIGH",
      title: "No vital signs are documented for this emergency encounter",
      summary:
        "Provider documentation has started, but the chart does not contain a recorded vital-sign set. Confirm whether vitals were obtained and document the current values if available.",
      reasoningSummary:
        "This finding identifies missing structured vital-sign documentation after provider work has begun. It does not assume that vitals were not measured at the bedside.",
      evidence: [],
      recommendedActions: [],
    }),
  ];
}
