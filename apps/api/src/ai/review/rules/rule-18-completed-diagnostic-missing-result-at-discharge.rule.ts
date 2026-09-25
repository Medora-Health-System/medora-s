import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { isDischargeInProgress } from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

function isDiagnosticType(value?: string | null): boolean {
  return /(LAB|IMAG|RAD|DIAGNOSTIC|PATHOLOGY|MICROBIOLOGY)/.test(String(value ?? "").trim().toUpperCase());
}

function isCompleted(item: { status?: string | null; lifecycleState?: string | null; completedAt?: string | null }): boolean {
  const state = String(item.lifecycleState ?? item.status ?? "").trim().toUpperCase();
  return state === "COMPLETED" || Boolean(item.completedAt);
}

/**
 * Discharge reconciliation: a diagnostic study is documented as completed,
 * but its result is not available in the authoritative result projection.
 * This is a review/follow-up prompt only; it does not infer the study outcome.
 */
export function rule18CompletedDiagnosticMissingResultAtDischarge(snapshot: EncounterAiSnapshot, ctx: SuggestionContext) {
  if (!isDischargeInProgress(snapshot)) return [];
  const resultOrderItemIds = new Set((snapshot.diagnostics.results ?? []).map((result) => result.orderItemId).filter(Boolean));
  const missing = (snapshot.diagnostics.orders ?? []).flatMap((order) => order.items ?? []).filter((item) =>
    isDiagnosticType(item.catalogItemType) && isCompleted(item) && !resultOrderItemIds.has(item.id)
  );
  if (missing.length === 0) return [];

  return missing.slice(0, 5).map((item) => {
    const study = item.displayLabel?.trim() || "A diagnostic study";
    return buildCopiedSuggestion(ctx, {
      category: "DISCHARGE_SAFETY",
      priority: "HIGH",
      copyKey: "completedDiagnosticMissingResultAtDischarge",
      vars: { study },
      evidence: [{ sourceType: "ORDER", sourceId: item.id, label: "Completed diagnostic study without available result", value: study }],
      recommendedActions: [{ actionType: "NAVIGATE", targetSection: "results", label: "Review result status" }],
    });
  });
}
