import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

/**
 * Rule 6 — Order/MAR mismatch supported by structured snapshot data.
 *
 * Detects mismatches using only medication order IDs, orderItemId references,
 * order status/lifecycleState, and administration action. Does not invent or
 * compare dose timing, scheduled administrations, or infusion schedules.
 */
export function rule6OrderMarMismatch(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const suggestions = [];
  const medicationOrders = snapshot.treatments.medicationOrders ?? [];
  const administrations = snapshot.treatments.medicationAdministrations ?? [];

  const orderMap = new Map(medicationOrders.map((order) => [order.id, order]));

  // Orphan MAR rows: administration references an order item id that is not
  // present in the snapshot medication orders.
  for (const admin of administrations) {
    if (!admin.orderItemId) {
      continue;
    }
    if (!orderMap.has(admin.orderItemId)) {
      suggestions.push(
        buildAiSuggestion(ctx, {
          category: "CONTRADICTION",
          priority: "MEDIUM",
          title: "Medication administration references unknown order",
          summary: `Administration ${admin.id} references order item ${admin.orderItemId} not present in medication orders.`,
          reasoningSummary:
            "The snapshot medicationAdministrations contains an orderItemId that does not match any medicationOrders.id.",
          evidence: [
            {
              sourceType: "MEDICATION",
              sourceId: admin.id,
              label: "Administration action",
              value: admin.action ?? null,
            },
            {
              sourceType: "MEDICATION",
              sourceId: admin.orderItemId,
              label: "Referenced order item",
              value: admin.orderItemId,
            },
          ],
        })
      );
    }
  }

  // Active order with a non-administered action. We treat CANCELLED as the
  // only terminal state we can rely on from the snapshot without timing data.
  for (const order of medicationOrders) {
    const isCancelled =
      order.status === "CANCELLED" || order.lifecycleState === "CANCELLED";
    if (isCancelled) {
      continue;
    }

    const relatedAdmins = administrations.filter(
      (admin) => admin.orderItemId === order.id
    );
    for (const admin of relatedAdmins) {
      if (admin.action && admin.action !== "administered") {
        suggestions.push(
          buildAiSuggestion(ctx, {
            category: "CONTRADICTION",
            priority: "MEDIUM",
            title: "Medication administration action does not match active order",
            summary: `Order ${order.id} is active but administration ${admin.id} records action ${admin.action}.`,
            reasoningSummary:
              "The medication order status/lifecycleState is not CANCELLED and the MAR action is not administered.",
            evidence: [
              {
                sourceType: "MEDICATION",
                sourceId: order.id,
                label: "Order status",
                value: order.status ?? null,
              },
              {
                sourceType: "MEDICATION",
                sourceId: order.id,
                label: "Order lifecycle state",
                value: order.lifecycleState ?? null,
              },
              {
                sourceType: "MEDICATION",
                sourceId: admin.id,
                label: "Administration action",
                value: admin.action,
              },
            ],
          })
        );
      }
    }
  }

  return suggestions;
}
