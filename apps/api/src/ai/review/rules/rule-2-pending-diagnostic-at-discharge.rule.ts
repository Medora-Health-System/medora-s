import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

/**
 * Rule 2 — Critical/pending diagnostic test at discharge.
 *
 * Flags pending diagnostic order items and unacknowledged critical results when
 * the encounter appears to be discharged. Uses only the encounter status,
 * discharge status, disposition value, pendingTests list, and critical result
 * flags already present in the snapshot.
 */
export function rule2PendingDiagnosticAtDischarge(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const isDischarged =
    snapshot.encounterContext.status === "CLOSED" ||
    Boolean(snapshot.disposition.dischargeStatus) ||
    Boolean(snapshot.disposition.disposition);

  if (!isDischarged) {
    return [];
  }

  const suggestions = [];

  const orderItemMap = new Map<
    string,
    { displayLabel?: string | null; status?: string | null; lifecycleState?: string | null }
  >();
  for (const order of snapshot.diagnostics.orders ?? []) {
    for (const item of order.items ?? []) {
      orderItemMap.set(item.id, item);
    }
  }

  for (const itemId of snapshot.diagnostics.pendingTests ?? []) {
    const item = orderItemMap.get(itemId);
    suggestions.push(
      buildAiSuggestion(ctx, {
        category: "DISCHARGE_SAFETY",
        priority: "HIGH",
        title: "Pending diagnostic test at discharge",
        summary: `Order item ${itemId} is still pending at discharge.`,
        reasoningSummary:
          "The encounter is discharged and the snapshot lists this order item as a pending test.",
        evidence: [
          {
            sourceType: "ORDER",
            sourceId: itemId,
            label: "Pending test display label",
            value: item?.displayLabel ?? null,
          },
          {
            sourceType: "ORDER",
            sourceId: itemId,
            label: "Order item status",
            value: item?.status ?? null,
          },
          {
            sourceType: "ORDER",
            sourceId: itemId,
            label: "Order item lifecycle state",
            value: item?.lifecycleState ?? null,
          },
          {
            sourceType: "DISPOSITION",
            label: "Encounter status",
            value: snapshot.encounterContext.status,
          },
        ],
      })
    );
  }

  for (const result of snapshot.diagnostics.criticalResults ?? []) {
    if (result.acknowledgedByProviderAt) {
      continue;
    }

    suggestions.push(
      buildAiSuggestion(ctx, {
        category: "DISCHARGE_SAFETY",
        priority: "CRITICAL",
        title: "Unacknowledged critical result at discharge",
        summary: `Critical result ${result.id} is unacknowledged at discharge.`,
        reasoningSummary:
          "The encounter is discharged and a critical result lacks provider acknowledgement.",
        evidence: [
          {
            sourceType: "RESULT",
            sourceId: result.id,
            label: "Critical result",
            value: "present",
          },
          {
            sourceType: "RESULT",
            sourceId: result.id,
            label: "Acknowledged by provider at",
            value: result.acknowledgedByProviderAt ?? null,
          },
          {
            sourceType: "DISPOSITION",
            label: "Encounter status",
            value: snapshot.encounterContext.status,
          },
        ],
        recommendedActions: [
          { actionType: "ACKNOWLEDGE", label: "Acknowledge critical result" },
        ],
      })
    );
  }

  return suggestions;
}
