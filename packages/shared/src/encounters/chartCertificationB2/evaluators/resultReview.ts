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
import {
  DiagnosticCategory,
  DiagnosticLifecycleState,
  type ChartCertificationB2Context,
} from "../types.js";
import { isB2IncludedCategory, normalizeAllDiagnosticItems } from "../lifecycle.js";

/**
 * Generic result-review evaluator.
 * Prefer modality-specific unreviewed codes; emit RESULT_REVIEW_REQUIRED only when
 * a verified result lacks review and modality evaluators would not already cover it.
 * Display of a result is never accepted as review.
 */
export function evaluateResultReviewModule(
  context: ChartCertificationB2Context
): ModuleCertificationResult {
  const started = Date.now();
  const deficiencies: ChartCertificationDeficiency[] = [];
  const warnings: ChartCertificationWarning[] = [];
  const informationalItems: ChartCertificationInformation[] = [];
  const evaluationErrors: CertificationEvaluationError[] = [];

  informationalItems.push({
    stableCode: "RESULT_REVIEW_NOT_FROM_DISPLAY",
    module: CertificationModule.RESULT_ACKNOWLEDGMENT,
    titleKey: "edLifecycle.certification.b2.codes.RESULT_REVIEW_NOT_FROM_DISPLAY.title",
    descriptionKey:
      "edLifecycle.certification.b2.codes.RESULT_REVIEW_NOT_FROM_DISPLAY.description",
  });

  const normalized = normalizeAllDiagnosticItems(context.diagnostics.orderItems).filter(
    (n) => isB2IncludedCategory(n.category) && n.category !== DiagnosticCategory.ECG
  );

  let unresolved = 0;

  for (const n of normalized) {
    if (
      n.normalizedLifecycle === DiagnosticLifecycleState.CANCELLED_VALID ||
      n.normalizedLifecycle === DiagnosticLifecycleState.REFUSED_VALID ||
      n.normalizedLifecycle === DiagnosticLifecycleState.NOT_PERFORMED_VALID ||
      n.normalizedLifecycle === DiagnosticLifecycleState.ENTERED_IN_ERROR ||
      n.normalizedLifecycle === DiagnosticLifecycleState.DUPLICATE_SUPERSEDED ||
      n.normalizedLifecycle === DiagnosticLifecycleState.EXTERNAL_FOLLOW_UP ||
      n.normalizedLifecycle === DiagnosticLifecycleState.PENDING_ACCEPTABLE
    ) {
      continue;
    }

    const result = n.snapshot.result;
    if (!result?.verifiedAt || !result.hasResultPayload) continue;

    const life = (n.snapshot.lifecycleState ?? "").toUpperCase();
    const status = (n.snapshot.itemStatus ?? "").toUpperCase();
    const reviewed =
      status === "VERIFIED" || life === "REVIEWED" || Boolean(result.acknowledgedByProviderAt);

    if (!reviewed) {
      // Modality evaluators emit specific codes; keep generic only as secondary with same key family.
      unresolved += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "RESULT_REVIEW_REQUIRED",
          module: CertificationModule.RESULT_ACKNOWLEDGMENT,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: {
            route: "results",
            tab: "review",
            section: "providerReview",
            requiredRole: "PROVIDER",
          },
          sourceEntityType: "Result",
          sourceEntityId: result.id,
          // Same family as lab/imaging unreviewed so dedupe prefers specific codes.
          deduplicationKey:
            n.category === DiagnosticCategory.LABORATORY
              ? `LAB_RESULT_UNREVIEWED::${result.id}`
              : n.category === DiagnosticCategory.IMAGING
                ? `IMAGING_FINAL_REPORT_UNREVIEWED::${result.id}`
                : `RESULT_REVIEW_REQUIRED::${result.id}`,
        })
      );
    }
  }

  const hasFatal = evaluationErrors.length > 0;
  return {
    module: CertificationModule.RESULT_ACKNOWLEDGMENT,
    evaluated: true,
    ready: hasFatal ? null : unresolved === 0,
    // Authority for review+critical is reported via this module; critical evaluator merges in.
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
