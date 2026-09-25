import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

const PROVIDER_DOCUMENTATION_NAMESPACE = "erprovidermsev1";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function providerDocumentation(snapshot: EncounterAiSnapshot): Record<string, unknown> | null {
  const entries = [
    ...(snapshot.clinicalDocumentation.structuredEntries ?? []),
    ...(snapshot.clinicalDocumentation.reassessments ?? []),
  ];
  const entry = entries.find(
    (candidate) => candidate.namespace.trim().toLowerCase() === PROVIDER_DOCUMENTATION_NAMESPACE
  );
  return asObject(entry?.payloadSummary);
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Phase 2J — diagnostic reconciliation.
 *
 * If diagnostic results are already available and structured provider MDM is
 * present, surface missing documentation of data review. This does not claim
 * the clinician failed to review the result; it checks whether that review is
 * represented in the chart.
 */
export function rule15ResultsNotReconciledInMdm(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const results = snapshot.diagnostics.results ?? [];
  if (results.length === 0) return [];

  const providerDoc = providerDocumentation(snapshot);
  if (!providerDoc) return [];
  if (hasText(providerDoc.mdmDataReviewed)) return [];

  return [
    buildAiSuggestion(ctx, {
      category: "RESULT_FOLLOWUP",
      priority: "MEDIUM",
      title: "Available diagnostic results are not documented as reviewed",
      summary:
        `The chart contains ${results.length} diagnostic result${results.length === 1 ? "" : "s"}, but the medical decision-making documentation does not indicate how the available results were reviewed. Document their review and clinical relevance when applicable.`,
      reasoningSummary:
        "This finding checks whether available diagnostic data are explicitly reconciled in the provider's medical decision-making documentation. It does not determine whether the clinical interpretation is correct.",
      evidence: [],
      recommendedActions: [],
    }),
  ];
}
