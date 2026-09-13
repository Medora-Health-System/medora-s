import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

const TERMINAL = new Set(["CANCELLED", "CANCELED", "DISCONTINUED", "COMPLETED", "VOIDED"]);

function isActive(status?: string | null, lifecycleState?: string | null) {
  return !TERMINAL.has((status ?? "").toUpperCase()) && !TERMINAL.has((lifecycleState ?? "").toUpperCase());
}

function normalizedLabel(label?: string | null) {
  return label?.trim().replace(/\s+/g, " ").toLocaleLowerCase() ?? "";
}

/**
 * Phase 2C — conservative possible duplicate medication review.
 *
 * This rule compares only structured medication-order facts already present
 * in the authorized encounter snapshot. Matching display labels are surfaced
 * for clinician review; they are never asserted to be an actual prescribing
 * error because dose/indication details are not available in this snapshot.
 */
export function rule9PossibleDuplicateMedication(snapshot: EncounterAiSnapshot, ctx: SuggestionContext) {
  const activeOrders = (snapshot.treatments.medicationOrders ?? []).filter((order) => isActive(order.status, order.lifecycleState));
  const groups = new Map<string, typeof activeOrders>();

  for (const order of activeOrders) {
    const key = normalizedLabel(order.displayLabel);
    if (!key) continue;
    const existing = groups.get(key) ?? [];
    existing.push(order);
    groups.set(key, existing);
  }

  return [...groups.values()].filter((orders) => orders.length > 1).map((orders) => {
    const label = orders[0]?.displayLabel ?? "Medication";
    return buildAiSuggestion(ctx, {
      category: "DUPLICATION",
      priority: "MEDIUM",
      title: "Possible duplicate medication orders",
      summary: `${orders.length} active medication orders share the display label ${label}. Review the orders to confirm whether both are intended.`,
      reasoningSummary: "Multiple non-terminal medication orders have the same normalized display label. The snapshot does not contain enough dose or indication detail to determine whether the duplication is intentional.",
      evidence: orders.map((order) => ({ sourceType: "MEDICATION" as const, sourceId: order.id, label: "Active medication order", value: order.displayLabel ?? null })),
    });
  });
}
