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
    title: "Completed diagnostic study has no result available in the chart",
    summary: labels.length
      ? `${labels.join(", ")}${suffix} is documented as completed, but a result is not available in the chart. Confirm the result status and document review when available.`
      : "One or more diagnostic studies are documented as completed, but a result is not available in the chart. Confirm the result status and document review when available.",
    reasoningSummary: "The study is documented as completed, but Medora Assist did not identify a corresponding result in the chart. This does not mean the study was not performed or that the result is abnormal.",
    evidence: [],
    recommendedActions: [{ actionType: "NAVIGATE", targetSection: "results", label: "Review results" }],
  })];
}
