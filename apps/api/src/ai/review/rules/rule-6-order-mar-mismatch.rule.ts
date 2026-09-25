import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import {
  isActiveMedicationOrder,
  isDischargeInProgress,
  isPrnMedicationOrder,
} from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

/**
 * Medication order/MAR linkage integrity.
 *
 * Surfaces a structured linkage problem when a MAR row references an order
 * item absent from the medication-order snapshot. A held, refused, omitted,
 * stopped, or other non-administered MAR action is not treated as a
 * contradiction with an active order. Unresolved active non-PRN orders are
 * surfaced only when discharge/finalization is in progress.
 */
export function rule6OrderMarMismatch(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const suggestions = [];
  const medicationOrders = snapshot.treatments.medicationOrders ?? [];
  const administrations = snapshot.treatments.medicationAdministrations ?? [];
  const orderIds = new Set(medicationOrders.map((order) => order.id));

  const orphaned = administrations.filter(
    (administration) =>
      Boolean(administration.orderItemId) &&
      !orderIds.has(administration.orderItemId as string)
  );

  if (orphaned.length > 0) {
    suggestions.push(
      buildCopiedSuggestion(ctx, {
        category: "MEDICATION_CONSIDERATION",
        priority: "MEDIUM",
        copyKey: "marUnknownOrder",
        evidence: orphaned.map((administration) => ({
          sourceType: "MEDICATION" as const,
          sourceId: administration.id,
          label: "MAR entry with unmatched order reference",
          value: administration.orderItemId ?? null,
        })),
        recommendedActions: [
          { actionType: "REVIEW", label: "Review medication administration record" },
        ],
      })
    );
  }

  if (!isDischargeInProgress(snapshot)) return suggestions;

  for (const order of medicationOrders) {
    if (!isActiveMedicationOrder(order) || isPrnMedicationOrder(order)) continue;
    const relatedAdmins = administrations.filter((admin) => admin.orderItemId === order.id);
    if (relatedAdmins.length > 0) continue;
    const medication = order.displayLabel?.trim();
    suggestions.push(
      buildCopiedSuggestion(ctx, {
        category: "MEDICATION_CONSIDERATION",
        priority: "MEDIUM",
        copyKey: medication ? "medicationReconciliationAtDischarge" : "marUnresolvedOrder",
        vars: medication ? { medication } : undefined,
        evidence: [
          {
            sourceType: "MEDICATION",
            sourceId: order.id,
            label: "Active medication order without matching administration record",
            value: medication ?? "Medication order",
          },
        ],
        recommendedActions: [
          { actionType: "REVIEW", label: "Reconcile medication before discharge" },
        ],
      })
    );
  }

  return suggestions;
}
