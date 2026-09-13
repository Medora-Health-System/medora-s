import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

function isDiagnosticType(value?: string | null): boolean {
  const normalized = String(value ?? "").trim().toUpperCase();
  return /(LAB|IMAG|RAD|DIAGNOSTIC|PATHOLOGY|MICROBIOLOGY)/.test(normalized);
}

function isCompleted(item: { status?: string | null; lifecycleState?: string | null; completedAt?: string | null }): boolean {
  const state = String(item.lifecycleState ?? item.status ?? "").trim().toUpperCase();
  return state === "COMPLETED" || Boolean(item.completedAt);
}

export function rule17CompletedDiagnosticMissingResult(snapshot: EncounterAiSnapshot, ctx: SuggestionContext) {
  const resultOrderItemIds = new Set((snapshot.diagnostics.results ?? []).map((result) => result.orderItemId).filter(Boolean));
  const missing = (snapshot.diagnostics.orders ?? []).flatMap((order) => order.items ?? []).filter((item) =>
    isDiagnosticType(item.catalogItemType) && isCompleted(item) && !resultOrderItemIds.has(item.id)
  );

  if (missing.length === 0) return [];
  const labels = missing.map((item) => item.displayLabel?.trim()).filter(Boolean).slice(0, 3);
  const suffix = missing.length > 3 ? ` and ${missing.length - 3} more` : "";
  return [buildAiSuggestion(ctx, {
    category: "RESULT_FOLLOWUP",
    priority: "MEDIUM",
    title: "Completed diagnostic order has no linked result",
    summary: labels.length
      ? `The chart marks ${labels.join(", ")}${suffix} as completed, but no linked result is present in the current encounter snapshot. Confirm result availability and reconciliation.`
      : "One or more diagnostic orders are marked completed, but no linked result is present in the current encounter snapshot. Confirm result availability and reconciliation.",
    reasoningSummary: "This finding compares only structured diagnostic order completion state with linked result records. It does not assume the test was not performed or that the result is clinically abnormal.",
    evidence: [],
    recommendedActions: [{ actionType: "NAVIGATE", targetSection: "results", label: "Review results" }],
  })];
}
