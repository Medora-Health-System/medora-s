import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { isActiveMedicationOrder, normalizeMedicationKey } from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

/**
 * Rule 9 — Duplicate active medication orders with a named clinician sentence.
 */
export function rule9DuplicateActiveMedication(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const groups = new Map<string, { label: string; ids: string[] }>();

  for (const order of snapshot.treatments.medicationOrders ?? []) {
    if (!isActiveMedicationOrder(order)) continue;
    const label = order.displayLabel?.trim();
    const key = normalizeMedicationKey(label);
    if (!key || !label) continue;
    const group = groups.get(key) ?? { label, ids: [] };
    group.ids.push(order.id);
    groups.set(key, group);
  }

  const suggestions = [];
  for (const group of groups.values()) {
    if (group.ids.length < 2) continue;
    suggestions.push(
      buildCopiedSuggestion(ctx, {
        category: "DUPLICATION",
        priority: "MEDIUM",
        copyKey: "duplicateMedication",
        vars: { medication: group.label },
        evidence: [
          {
            sourceType: "MEDICATION",
            sourceId: group.ids[0],
            label: "Duplicate active orders",
            value: group.ids.length,
          },
        ],
      })
    );
  }
  return suggestions;
}
