import { Injectable, Logger } from "@nestjs/common";
import type { AiClinicalReviewOutput, AiSuggestion, EncounterAiSnapshot } from "@medora/shared";
import type { DeterministicRule } from "./review.types.js";
import { rule1UnacknowledgedCriticalResult } from "./rules/rule-1-unacknowledged-critical-result.rule.js";
import { rule2PendingDiagnosticAtDischarge } from "./rules/rule-2-pending-diagnostic-at-discharge.rule.js";
import { rule3MissingDisposition } from "./rules/rule-3-missing-disposition.rule.js";
import { rule4UnsignedProviderDocumentation } from "./rules/rule-4-unsigned-provider-documentation.rule.js";
import { rule5OpenFollowUp } from "./rules/rule-5-open-follow-up.rule.js";
import { rule6OrderMarMismatch } from "./rules/rule-6-order-mar-mismatch.rule.js";

/**
 * Deterministic clinical review engine.
 *
 * Runs a fixed set of rules against an EncounterAiSnapshot and returns a
 * structured AiClinicalReviewOutput. Each rule is isolated: a rule failure
 * is logged and does not crash the overall review.
 *
 * The engine performs no LLM calls, no database writes, no chart mutation,
 * and no reimbursement/coding logic.
 */
@Injectable()
export class DeterministicReviewEngine {
  private readonly logger = new Logger(DeterministicReviewEngine.name);

  private readonly rules: DeterministicRule[] = [
    rule1UnacknowledgedCriticalResult,
    rule2PendingDiagnosticAtDischarge,
    rule3MissingDisposition,
    rule4UnsignedProviderDocumentation,
    rule5OpenFollowUp,
    rule6OrderMarMismatch,
  ];

  run(snapshot: EncounterAiSnapshot): AiClinicalReviewOutput {
    const generatedAt = new Date().toISOString();
    const ctx = {
      generatedAt,
      snapshotVersion: snapshot.snapshotVersion,
    };

    const suggestions: AiSuggestion[] = [];

    for (const rule of this.rules) {
      try {
        suggestions.push(...rule(snapshot, ctx));
      } catch (err) {
        this.logger.error({
          message: "Deterministic review rule failed",
          rule: rule.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      suggestions,
    };
  }
}
