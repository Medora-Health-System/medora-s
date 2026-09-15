import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { normalizeMedicationKey } from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

const TERMINAL = new Set(["CANCELLED", "CANCELED", "DISCONTINUED", "COMPLETED", "VOIDED"]);
const GENERIC_TOKENS = new Set([
  "medication",
  "tablet",
  "capsule",
  "solution",
  "normal",
  "sodium",
  "chloride",
  "injection",
  "liquid",
  "syrup",
]);

function isActive(status?: string | null, lifecycleState?: string | null) {
  return !TERMINAL.has((status ?? "").toUpperCase()) && !TERMINAL.has((lifecycleState ?? "").toUpperCase());
}

function normalizedLabel(label?: string | null) {
  return label?.trim().replace(/\s+/g, " ").toLocaleLowerCase() ?? "";
}

function groupKey(label?: string | null): string | null {
  const exact = normalizedLabel(label);
  if (!exact) return null;
  const token = normalizeMedicationKey(label);
  if (token && !GENERIC_TOKENS.has(token)) return `token:${token}`;
  return `exact:${exact}`;
}

/**
 * Conservative possible duplicate medication review.
 *
 * Groups active orders by a non-generic medication token when available,
 * otherwise by the exact normalized display label. Never asserts a prescribing error.
 */
export function rule9PossibleDuplicateMedication(snapshot: EncounterAiSnapshot, ctx: SuggestionContext) {
  const activeOrders = (snapshot.treatments.medicationOrders ?? []).filter((order) =>
    isActive(order.status, order.lifecycleState)
  );
  const groups = new Map<string, typeof activeOrders>();

  for (const order of activeOrders) {
    const key = groupKey(order.displayLabel);
    if (!key) continue;
    const existing = groups.get(key) ?? [];
    existing.push(order);
    groups.set(key, existing);
  }

  return [...groups.values()]
    .filter((orders) => orders.length > 1)
    .map((orders) => {
      const label = orders[0]?.displayLabel?.trim() || "medication";
      return buildCopiedSuggestion(ctx, {
        category: "DUPLICATION",
        priority: "MEDIUM",
        copyKey: "duplicateMedication",
        vars: { medication: label },
        evidence: orders.map((order) => ({
          sourceType: "MEDICATION" as const,
          sourceId: order.id,
          label: "Active medication order",
          value: order.displayLabel ?? null,
        })),
        recommendedActions: [],
      });
    });
}
