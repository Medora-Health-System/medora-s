import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

/**
 * Medication order/MAR linkage integrity.
 *
 * Only surfaces a structured linkage problem: a MAR row references an order
 * item that is absent from the medication-order snapshot. A held, refused,
 * omitted, stopped, or other non-administered MAR action is not treated as a
 * contradiction with an active order because those can be legitimate clinical
 * workflow states. No dose, indication, timing, or appropriateness is inferred.
 */
export function rule6OrderMarMismatch(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const medicationOrders = snapshot.treatments.medicationOrders ?? [];
  const administrations = snapshot.treatments.medicationAdministrations ?? [];
  const orderIds = new Set(medicationOrders.map((order) => order.id));

  const orphaned = administrations.filter(
    (administration) =>
      Boolean(administration.orderItemId) &&
      !orderIds.has(administration.orderItemId as string)
  );

  if (orphaned.length === 0) return [];

  return [
    buildAiSuggestion(ctx, {
      category: "MEDICATION_CONSIDERATION",
      priority: "MEDIUM",
      title: "Medication administration is not linked to a medication order",
      summary:
        "One or more MAR entries reference an order item that is not present in the medication-order snapshot. Confirm the medication record linkage when appropriate.",
      reasoningSummary:
        "This finding compares only structured MAR orderItemId values with medication-order IDs. It does not infer whether a medication was appropriate, administered correctly, or clinically indicated.",
      evidence: orphaned.map((administration) => ({
        sourceType: "MEDICATION" as const,
        sourceId: administration.id,
        label: "MAR entry with unmatched order reference",
        value: administration.orderItemId ?? null,
      })),
      recommendedActions: [
        { actionType: "REVIEW", label: "Review medication administration record" },
      ],
    }),
  ];
}
