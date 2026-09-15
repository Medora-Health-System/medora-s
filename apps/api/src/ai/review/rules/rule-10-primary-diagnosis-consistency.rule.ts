import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

export function rule10PrimaryDiagnosisConsistency(snapshot: EncounterAiSnapshot, ctx: SuggestionContext) {
  const entries = (snapshot.diagnoses.documentedDiagnoses ?? []).filter(
    (item) => item.isPrimary === true && item.status !== "REMOVED"
  );

  if (entries.length <= 1) return [];

  return [buildAiSuggestion(ctx, {
    category: "CONTRADICTION",
    priority: "MEDIUM",
    title: "Multiple diagnoses are marked primary",
    summary: "More than one active documented diagnosis is marked as primary. Review the diagnosis list and reconcile the primary designation if needed.",
    reasoningSummary: "This finding compares only structured primary-designation fields and does not determine which diagnosis is correct.",
    evidence: entries.map((item) => ({
      sourceType: "DIAGNOSIS" as const,
      sourceId: item.id,
      label: "Primary diagnosis entry",
      value: item.display ?? item.code ?? item.id,
    })),
    recommendedActions: [{ actionType: "NAVIGATE", targetSection: "diagnoses", label: "Review diagnosis list" }],
  })];
}
