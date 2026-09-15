import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import {
  isDischargeInProgress,
  pendingDiagnosticItems,
  resultStudyLabel,
  studyLabel,
} from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

/**
 * Rule 2 — Pending diagnostic or unreconciled critical result while discharge
 * is being prepared. Clinic checkout, ED disposition, and inpatient discharge
 * are detected from structured snapshot fields only.
 */
export function rule2PendingDiagnosticAtDischarge(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  if (!isDischargeInProgress(snapshot)) return [];

  const suggestions = [];

  for (const item of pendingDiagnosticItems(snapshot)) {
    const study = studyLabel(item);
    suggestions.push(
      buildCopiedSuggestion(ctx, {
        category: "DISCHARGE_SAFETY",
        priority: "HIGH",
        copyKey: "pendingDiagnosticAtDischarge",
        vars: { study },
        evidence: [
          {
            sourceType: "ORDER",
            sourceId: item.id,
            label: "Pending diagnostic study",
            value: study,
          },
        ],
      })
    );
  }

  for (const result of snapshot.diagnostics.criticalResults ?? []) {
    if (result.acknowledgedByProviderAt) continue;
    if (result.criticalValue !== true) continue;

    const study = resultStudyLabel(snapshot, result);
    suggestions.push(
      buildCopiedSuggestion(ctx, {
        category: "DISCHARGE_SAFETY",
        priority: "CRITICAL",
        copyKey: study ? "criticalResultNamedAtDischarge" : "criticalResultAtDischarge",
        vars: study ? { study } : undefined,
        evidence: [
          {
            sourceType: "RESULT",
            sourceId: result.id,
            label: "Critical result before discharge",
            value: study ?? "present",
          },
        ],
        recommendedActions: [
          {
            actionType: "NAVIGATE",
            targetSection: "results",
            label: "Review critical result",
          },
        ],
      })
    );
  }

  return suggestions;
}
