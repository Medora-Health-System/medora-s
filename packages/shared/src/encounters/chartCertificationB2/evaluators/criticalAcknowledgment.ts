import {
  CertificationModule,
  ChartCertificationModuleAuthority,
  ChartCertificationOwner,
  type CertificationEvaluationError,
  type ChartCertificationDeficiency,
  type ChartCertificationInformation,
  type ChartCertificationWarning,
  type ModuleCertificationResult,
} from "../../chartCertificationB1/types.js";
import { makeB2Deficiency } from "../deficiency.js";
import { type ChartCertificationB2Context } from "../types.js";
import { isB2IncludedCategory, normalizeAllDiagnosticItems } from "../lifecycle.js";

/**
 * Critical-result acknowledgment — uses Result.criticalValue + acknowledgedByProviderAt.
 * Provider review / verify alone does not satisfy acknowledgment when criticalValue is true.
 */
export function evaluateCriticalAcknowledgmentModule(
  context: ChartCertificationB2Context
): ModuleCertificationResult {
  const started = Date.now();
  const deficiencies: ChartCertificationDeficiency[] = [];
  const warnings: ChartCertificationWarning[] = [];
  const informationalItems: ChartCertificationInformation[] = [];
  const evaluationErrors: CertificationEvaluationError[] = [];

  informationalItems.push({
    stableCode: "CRITICAL_ACK_NOT_FROM_REVIEW_ALONE",
    module: CertificationModule.RESULT_ACKNOWLEDGMENT,
    titleKey: "edLifecycle.certification.b2.codes.CRITICAL_ACK_NOT_FROM_REVIEW_ALONE.title",
    descriptionKey:
      "edLifecycle.certification.b2.codes.CRITICAL_ACK_NOT_FROM_REVIEW_ALONE.description",
  });

  const normalized = normalizeAllDiagnosticItems(context.diagnostics.orderItems).filter((n) =>
    isB2IncludedCategory(n.category)
  );

  let unresolved = 0;

  for (const n of normalized) {
    const result = n.snapshot.result;
    if (!result?.criticalValue) continue;
    if (result.acknowledgedByProviderAt) continue;

    unresolved += 1;
    deficiencies.push(
      makeB2Deficiency({
        stableCode: "CRITICAL_RESULT_ACKNOWLEDGMENT_MISSING",
        module: CertificationModule.RESULT_ACKNOWLEDGMENT,
        owner: ChartCertificationOwner.PROVIDER,
        effects: { suggestsProviderReview: true },
        remediation: {
          route: "results",
          tab: "critical",
          section: "acknowledge",
          requiredRole: "PROVIDER",
        },
        sourceEntityType: "Result",
        sourceEntityId: result.id,
        deduplicationKey: `CRITICAL_ACK::${result.id}`,
        evidence: {
          structuredField: "criticalValue",
          status: "UNACKNOWLEDGED",
          timestamp: result.updatedAt ?? undefined,
        },
      })
    );
  }

  const hasFatal = evaluationErrors.length > 0;
  return {
    module: CertificationModule.RESULT_ACKNOWLEDGMENT,
    evaluated: true,
    ready: hasFatal ? null : unresolved === 0,
    authority: ChartCertificationModuleAuthority.STAGE_B2_ADVISORY,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.RESULT_ACKNOWLEDGMENT,
      sourceUpdatedAt: context.diagnostics.diagnosticRevision,
      encounterVersionAtLoad: context.encounterVersion,
      status: "CURRENT",
    },
    evaluationErrors,
    executionTimeMs: Date.now() - started,
  };
}
