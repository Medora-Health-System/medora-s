import { Injectable, Logger } from "@nestjs/common";
import type { AiClinicalReviewOutput, AiSuggestion, EncounterAiSnapshot } from "@medora/shared";
import type { DeterministicRule } from "./review.types.js";
import { rule1UnacknowledgedCriticalResult } from "./rules/rule-1-unacknowledged-critical-result.rule.js";
import { rule2PendingDiagnosticAtDischarge } from "./rules/rule-2-pending-diagnostic-at-discharge.rule.js";
import { rule3MissingDisposition } from "./rules/rule-3-missing-disposition.rule.js";
import { rule4UnsignedProviderDocumentation } from "./rules/rule-4-unsigned-provider-documentation.rule.js";
import { rule5OpenFollowUp } from "./rules/rule-5-open-follow-up.rule.js";
import { rule6OrderMarMismatch } from "./rules/rule-6-order-mar-mismatch.rule.js";
import { rule7TransitionReassessment } from "./rules/rule-7-transition-reassessment.rule.js";
import { rule8TransitionDiagnosticContext } from "./rules/rule-8-transition-diagnostic-context.rule.js";
import { rule9PossibleDuplicateMedication } from "./rules/rule-9-possible-duplicate-medication.rule.js";
import { rule10PrimaryDiagnosisConsistency } from "./rules/rule-10-primary-diagnosis-consistency.rule.js";
import { rule11AdministrationTimestampIntegrity } from "./rules/rule-11-administration-timestamp-integrity.rule.js";
import { rule12DischargedSummaryCompleteness } from "./rules/rule-12-discharged-summary-completeness.rule.js";
import { rule13MdmCompleteness } from "./rules/rule-13-mdm-completeness.rule.js";
import { rule14EdMissingVitals } from "./rules/rule-14-ed-missing-vitals.rule.js";
import { rule15ResultsNotReconciledInMdm } from "./rules/rule-15-results-not-reconciled-in-mdm.rule.js";
import { rule16DuplicateDiagnosticOrders } from "./rules/rule-16-duplicate-diagnostic-orders.rule.js";
import { rule17CompletedDiagnosticMissingResult } from "./rules/rule-17-completed-diagnostic-missing-result.rule.js";

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
    rule9PossibleDuplicateMedication,
    rule10PrimaryDiagnosisConsistency,
    rule11AdministrationTimestampIntegrity,
    rule12DischargedSummaryCompleteness,
    rule13MdmCompleteness,
    rule14EdMissingVitals,
    rule15ResultsNotReconciledInMdm,
    rule16DuplicateDiagnosticOrders,
    rule17CompletedDiagnosticMissingResult,
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

    return { suggestions };
  }
}
