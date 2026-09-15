import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import {
  isActiveMedicationOrder,
  isDischargeInProgress,
  isPrnMedicationOrder,
} from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

/**
 * Rule 6 — Medication order / MAR reconciliation.
 *
 * Does not assume every active order must be administered. Unresolved active
 * orders are surfaced only when discharge/finalization is in progress and the
 * order is not PRN.
 */
export function rule6OrderMarMismatch(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const suggestions = [];
  const medicationOrders = snapshot.treatments.medicationOrders ?? [];
  const administrations = snapshot.treatments.medicationAdministrations ?? [];
  const orderMap = new Map(medicationOrders.map((order) => [order.id, order]));
  const discharging = isDischargeInProgress(snapshot);

  for (const admin of administrations) {
    if (!admin.orderItemId) continue;
    if (orderMap.has(admin.orderItemId)) continue;
    suggestions.push(
      buildCopiedSuggestion(ctx, {
        category: "CONTRADICTION",
        priority: "MEDIUM",
        copyKey: "marUnknownOrder",
        evidence: [
          {
            sourceType: "MEDICATION",
            sourceId: admin.id,
            label: "Administration without matching order",
            value: admin.action ?? null,
          },
        ],
      })
    );
  }

  for (const order of medicationOrders) {
    if (!isActiveMedicationOrder(order)) continue;
    const relatedAdmins = administrations.filter((admin) => admin.orderItemId === order.id);
    const hasMismatch = relatedAdmins.some(
      (admin) => admin.action && admin.action !== "administered"
    );
    if (hasMismatch) {
      suggestions.push(
        buildCopiedSuggestion(ctx, {
          category: "CONTRADICTION",
          priority: "MEDIUM",
          copyKey: "marActionMismatch",
          evidence: [
            {
              sourceType: "MEDICATION",
              sourceId: order.id,
              label: "Active order with non-administered MAR action",
              value: order.displayLabel ?? order.id,
            },
          ],
        })
      );
      continue;
    }

    if (!discharging || isPrnMedicationOrder(order)) continue;
    const hasAdministered = relatedAdmins.some((admin) => admin.action === "administered");
    if (hasAdministered || relatedAdmins.length > 0) continue;

    const medication = order.displayLabel?.trim();
    suggestions.push(
      buildCopiedSuggestion(ctx, {
        category: "MEDICATION_CONSIDERATION",
        priority: "MEDIUM",
        copyKey: medication ? "marUnresolvedNamed" : "marUnresolvedOrder",
        vars: medication ? { medication } : undefined,
        evidence: [
          {
            sourceType: "MEDICATION",
            sourceId: order.id,
            label: "Active medication order",
            value: medication ?? order.id,
          },
        ],
      })
    );
  }

  return suggestions;
}
