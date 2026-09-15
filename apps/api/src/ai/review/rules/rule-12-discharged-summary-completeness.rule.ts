import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

function hasDischargeSummary(snapshot: EncounterAiSnapshot): boolean {
  const summary = snapshot.disposition.dischargeSummary;
  return Boolean(summary?.text?.trim());
}

/**
 * Phase 2F — discharge documentation completeness.
 *
 * Only evaluates encounters whose structured dischargeStatus is explicitly
 * DISCHARGED. Missing discharge-summary text is surfaced for clinician review;
 * this rule does not infer clinical readiness for discharge or modify the chart.
 */
export function rule12DischargedSummaryCompleteness(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const dischargeStatus = String(snapshot.disposition.dischargeStatus ?? "")
    .trim()
    .toUpperCase();

  if (dischargeStatus !== "DISCHARGED") return [];
  if (hasDischargeSummary(snapshot)) return [];

  return [
    buildAiSuggestion(ctx, {
      category: "DOCUMENTATION_GAP",
      priority: "MEDIUM",
      title: "Discharge summary documentation not found",
      summary:
        "The structured encounter status indicates discharge, but no discharge-summary text is present in the AI review snapshot. Review the discharge documentation for completeness.",
      reasoningSummary:
        "This finding uses only the structured discharge status and discharge-summary presence. It does not determine whether discharge was clinically appropriate.",
      evidence: [
        {
          sourceType: "DISPOSITION",
          label: "Discharge status",
          value: snapshot.disposition.dischargeStatus ?? null,
        },
        {
          sourceType: "NOTE",
          label: "Discharge summary present",
          value: false,
        },
      ],
      recommendedActions: [
        { actionType: "NAVIGATE", targetSection: "summary", label: "Review discharge documentation" },
      ],
    }),
  ];
}
