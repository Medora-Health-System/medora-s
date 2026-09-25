import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

const TERMINAL = new Set(["CANCELLED", "CANCELED", "DISCONTINUED", "COMPLETED", "VOIDED"]);

function isDiagnosticType(value?: string | null): boolean {
  const normalized = String(value ?? "").trim().toUpperCase();
  return /(LAB|IMAG|RAD|DIAGNOSTIC|PATHOLOGY|MICROBIOLOGY)/.test(normalized);
}

function normalize(value?: string | null): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function rule16DuplicateDiagnosticOrders(snapshot: EncounterAiSnapshot, ctx: SuggestionContext) {
  const activeItems = (snapshot.diagnostics.orders ?? []).flatMap((order) => order.items ?? []).filter((item) => {
    const state = String(item.lifecycleState ?? item.status ?? "").toUpperCase();
    return isDiagnosticType(item.catalogItemType) && !TERMINAL.has(state) && normalize(item.displayLabel).length > 0;
  });

  const groups = new Map<string, typeof activeItems>();
  for (const item of activeItems) {
    const key = normalize(item.displayLabel);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.values()].filter((items) => items.length > 1).map((items) => {
    const label = items[0]?.displayLabel?.trim() || "diagnostic study";
    return buildAiSuggestion(ctx, {
      category: "ORDER_CONSIDERATION",
      priority: "MEDIUM",
      title: "Possible duplicate diagnostic orders",
      summary: `${items.length} active diagnostic orders have the same display name (${label}). Confirm whether each order is intentional before additional testing proceeds.`,
      reasoningSummary: "Medora Assist identified active diagnostic orders with the same name. This does not determine whether repeat testing is clinically inappropriate.",
      evidence: [],
      recommendedActions: [{ actionType: "NAVIGATE", targetSection: "orders", label: "Review diagnostic orders" }],
    });
  });
}
