import { Injectable, Logger } from "@nestjs/common";
import type { AiClinicalReviewOutput, AiSuggestion, EncounterAiSnapshot } from "@medora/shared";
import type { DeterministicRule } from "./review.types.js";
import { isDischargeInProgress } from "./clinical-facts.js";
import { buildCopiedSuggestion } from "./review.utils.js";
import { rule1UnacknowledgedCriticalResult } from "./rules/rule-1-unacknowledged-critical-result.rule.js";
import { rule2PendingDiagnosticAtDischarge } from "./rules/rule-2-pending-diagnostic-at-discharge.rule.js";
import { rule3MissingDisposition } from "./rules/rule-3-missing-disposition.rule.js";
import { rule4UnsignedProviderDocumentation } from "./rules/rule-4-unsigned-provider-documentation.rule.js";
import { rule5OpenFollowUp } from "./rules/rule-5-open-follow-up.rule.js";
import { rule6OrderMarMismatch } from "./rules/rule-6-order-mar-mismatch.rule.js";
import { rule7TransitionReassessment } from "./rules/rule-7-transition-reassessment.rule.js";
import { rule8TransitionDiagnosticContext } from "./rules/rule-8-transition-diagnostic-context.rule.js";
import { rule8AbnormalVitalWithoutReassessment } from "./rules/rule-8-abnormal-vital-without-reassessment.rule.js";
import { rule9PossibleDuplicateMedication } from "./rules/rule-9-possible-duplicate-medication.rule.js";
import { rule10PrimaryDiagnosisConsistency } from "./rules/rule-10-primary-diagnosis-consistency.rule.js";
import { rule10TreatmentWithoutReassessment } from "./rules/rule-10-treatment-without-reassessment.rule.js";
import { rule11AdministrationTimestampIntegrity } from "./rules/rule-11-administration-timestamp-integrity.rule.js";
import { rule11MissingFollowUpAtDischarge } from "./rules/rule-11-missing-follow-up-at-discharge.rule.js";
import { rule12DischargedSummaryCompleteness } from "./rules/rule-12-discharged-summary-completeness.rule.js";
import { rule12ClinicTransferIncomplete } from "./rules/rule-12-clinic-transfer-incomplete.rule.js";
import { rule13MdmCompleteness } from "./rules/rule-13-mdm-completeness.rule.js";
import { rule14EdMissingVitals } from "./rules/rule-14-ed-missing-vitals.rule.js";
import { rule15ResultsNotReconciledInMdm } from "./rules/rule-15-results-not-reconciled-in-mdm.rule.js";
import { rule16DuplicateDiagnosticOrders } from "./rules/rule-16-duplicate-diagnostic-orders.rule.js";
import { rule17CompletedDiagnosticMissingResult } from "./rules/rule-17-completed-diagnostic-missing-result.rule.js";
import { rule18CompletedDiagnosticMissingResultAtDischarge } from "./rules/rule-18-completed-diagnostic-missing-result-at-discharge.rule.js";
import { rule19DispositionConsistency } from "./rules/rule-19-disposition-consistency.rule.js";

const PRIORITY_RANK: Record<AiSuggestion["priority"], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/**
 * Deterministic clinical review engine.
 *
 * Runs a fixed set of rules against an EncounterAiSnapshot. Each rule is
 * isolated: a rule failure is logged and does not crash the overall review.
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
    rule7TransitionReassessment,
    rule8TransitionDiagnosticContext,
    rule8AbnormalVitalWithoutReassessment,
    rule9PossibleDuplicateMedication,
    rule10PrimaryDiagnosisConsistency,
    rule10TreatmentWithoutReassessment,
    rule11AdministrationTimestampIntegrity,
    rule11MissingFollowUpAtDischarge,
    rule12DischargedSummaryCompleteness,
    rule12ClinicTransferIncomplete,
    rule13MdmCompleteness,
    rule14EdMissingVitals,
    rule15ResultsNotReconciledInMdm,
    rule16DuplicateDiagnosticOrders,
    rule17CompletedDiagnosticMissingResult,
    rule18CompletedDiagnosticMissingResultAtDischarge,
  ];

  run(snapshot: EncounterAiSnapshot): AiClinicalReviewOutput {
    const generatedAt = new Date().toISOString();
    const ctx = { generatedAt, snapshotVersion: snapshot.snapshotVersion };
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

    const finalized = this.finalize(suggestions);
    const dispositionReview = rule19DispositionConsistency(snapshot, ctx, finalized);
    const withDispositionReview = this.finalize([...finalized, ...dispositionReview]);
    return { suggestions: this.finalize([...withDispositionReview, ...this.preDischargeSummary(snapshot, ctx, finalized)]) };
  }

  private preDischargeSummary(
    snapshot: EncounterAiSnapshot,
    ctx: { generatedAt: string; snapshotVersion: string },
    suggestions: AiSuggestion[]
  ): AiSuggestion[] {
    if (!isDischargeInProgress(snapshot)) return [];
    const categories = new Set([
      "DISCHARGE_SAFETY",
      "MEDICATION_CONSIDERATION",
      "REASSESSMENT_GAP",
      "FOLLOW_UP_GAP",
      "DOCUMENTATION_GAP",
      "RESULT_FOLLOWUP",
    ]);
    const unresolved = suggestions.filter((item) => categories.has(item.category));
    if (unresolved.length < 2) return [];

    return [buildCopiedSuggestion(ctx, {
      category: "DISCHARGE_SAFETY",
      priority: unresolved.some((item) => item.priority === "CRITICAL" || item.priority === "HIGH") ? "HIGH" : "MEDIUM",
      copyKey: "preDischargeUnresolvedItems",
      vars: { count: String(unresolved.length) },
      evidence: [],
      recommendedActions: [{ actionType: "REVIEW", label: "Review pre-discharge findings" }],
    })];
  }

  private finalize(suggestions: AiSuggestion[]): AiSuggestion[] {
    const seen = new Set<string>();
    const unique: AiSuggestion[] = [];
    for (const suggestion of suggestions) {
      const key = `${suggestion.category}:${suggestion.title.trim().toLowerCase()}:${suggestion.summary.trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(suggestion);
    }
    unique.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    return unique;
  }
}
