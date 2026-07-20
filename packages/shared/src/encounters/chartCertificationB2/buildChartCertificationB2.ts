import { buildChartCertificationB1 } from "../chartCertificationB1/buildChartCertificationB1.js";
import {
  CertificationModule,
  ChartCertificationB1Authority,
  ChartCertificationCoverageStatus,
  ChartCertificationSourceAuthority,
  STAGE_B1_EVALUATED_MODULES,
  type ChartCertificationB1Result,
  type ModuleCertificationResult,
} from "../chartCertificationB1/types.js";
import { dedupeChartCertificationB2Deficiencies } from "./dedupe.js";
import { evaluateCriticalAcknowledgmentModule } from "./evaluators/criticalAcknowledgment.js";
import { evaluateEcgModule } from "./evaluators/ecg.js";
import { evaluateImagingModule } from "./evaluators/imaging.js";
import { evaluateLaboratoryModule } from "./evaluators/laboratory.js";
import { evaluateOrdersModule } from "./evaluators/orders.js";
import { evaluateResultReviewModule } from "./evaluators/resultReview.js";
import {
  CHART_CERTIFICATION_B2_ID,
  CHART_CERTIFICATION_B2_STAGE,
  CHART_CERTIFICATION_B2_VERSION,
  STAGE_B2_EVALUATED_MODULES,
  STAGE_B2_UNEVALUATED_MODULES,
  type ChartCertificationB2Context,
} from "./types.js";

export type BuildChartCertificationB2Options = {
  forceEvaluationError?: { code: string; messageKey: string };
  forceB2EvaluationError?: { code: string; messageKey: string };
};

function mergeResultAckModules(
  review: ModuleCertificationResult,
  critical: ModuleCertificationResult
): ModuleCertificationResult {
  const evaluationErrors = [...review.evaluationErrors, ...critical.evaluationErrors];
  const ready =
    evaluationErrors.length > 0
      ? null
      : review.ready === true && critical.ready === true
        ? true
        : review.ready === false || critical.ready === false
          ? false
          : null;
  return {
    module: CertificationModule.RESULT_ACKNOWLEDGMENT,
    evaluated: true,
    ready,
    authority: critical.authority,
    deficiencies: [...review.deficiencies, ...critical.deficiencies],
    warnings: [...review.warnings, ...critical.warnings],
    informationalItems: [...review.informationalItems, ...critical.informationalItems],
    sourceFreshness: critical.sourceFreshness,
    evaluationErrors,
    executionTimeMs: review.executionTimeMs + critical.executionTimeMs,
  };
}

/**
 * Stage B2 merge: runs B1 foundation + B2 diagnostic evaluators into one payload.
 */
export function buildChartCertificationB2(
  context: ChartCertificationB2Context,
  options?: BuildChartCertificationB2Options
): ChartCertificationB1Result {
  const b1 = buildChartCertificationB1(context, {
    forceEvaluationError: options?.forceEvaluationError,
  });

  const b2Errors = [
    ...(options?.forceB2EvaluationError ? [options.forceB2EvaluationError] : []),
    ...(context.diagnostics.loadError
      ? [
          {
            code: context.diagnostics.loadError.code,
            messageKey: context.diagnostics.loadError.messageKey,
          },
        ]
      : []),
  ];

  const b2ModuleResults: ModuleCertificationResult[] = [];
  try {
    b2ModuleResults.push(evaluateOrdersModule(context));
    b2ModuleResults.push(evaluateLaboratoryModule(context));
    b2ModuleResults.push(evaluateImagingModule(context));
    b2ModuleResults.push(evaluateEcgModule(context));
    b2ModuleResults.push(
      mergeResultAckModules(
        evaluateResultReviewModule(context),
        evaluateCriticalAcknowledgmentModule(context)
      )
    );
  } catch {
    b2Errors.push({
      code: "B2_EVALUATOR_THREW",
      messageKey: "edLifecycle.certification.b2.errors.evaluatorThrew",
    });
  }

  for (const m of b2ModuleResults) {
    b2Errors.push(...m.evaluationErrors.map((e) => ({ code: e.code, messageKey: e.messageKey })));
  }

  const hasFatal =
    b1.coverageStatus === ChartCertificationCoverageStatus.ERROR || b2Errors.length > 0;

  const rawDeficiencies = [...b1.deficiencies, ...b2ModuleResults.flatMap((m) => m.deficiencies)];
  const deficiencies = dedupeChartCertificationB2Deficiencies(rawDeficiencies);

  for (const d of deficiencies) {
    if (d.sourceAuthority !== ChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW) {
      d.effects.blocksClinicalClosure = false;
      d.effects.blocksDisposition = false;
      d.effects.blocksBilling = false;
    }
  }

  const byModule = new Map(b2ModuleResults.map((m) => [m.module, m]));

  const evaluatedReadiness = {
    ...b1.evaluatedReadiness,
    ordersReady: hasFatal ? null : byModule.get(CertificationModule.ORDERS)?.ready ?? null,
    laboratoryReady: hasFatal ? null : byModule.get(CertificationModule.LAB_RESULTS)?.ready ?? null,
    imagingReady: hasFatal ? null : byModule.get(CertificationModule.IMAGING)?.ready ?? null,
    ecgReady: hasFatal ? null : byModule.get(CertificationModule.ECG)?.ready ?? null,
    resultReviewReady: hasFatal
      ? null
      : byModule.get(CertificationModule.RESULT_ACKNOWLEDGMENT)?.ready ?? null,
  };

  if (hasFatal) {
    evaluatedReadiness.registrationReady = null;
    evaluatedReadiness.triageReady = null;
    evaluatedReadiness.nursingReady = null;
    evaluatedReadiness.providerReady = null;
    evaluatedReadiness.dispositionDocumentationReady = null;
  }

  const moduleSummaries = [
    ...b1.moduleSummaries.map((s) =>
      hasFatal ? { ...s, ready: null as boolean | null } : s
    ),
    ...b2ModuleResults.map((m) => ({
      module: m.module,
      evaluated: m.evaluated,
      ready: hasFatal ? null : m.ready,
      authority: m.authority,
      deficiencyCount: m.deficiencies.length,
      warningCount: m.warnings.length,
      evaluationErrorCount: m.evaluationErrors.length,
      executionTimeMs: m.executionTimeMs,
      evaluatorVersion: CHART_CERTIFICATION_B2_VERSION,
    })),
  ];

  return {
    ...b1,
    certificationId: CHART_CERTIFICATION_B2_ID,
    certificationVersion: CHART_CERTIFICATION_B2_VERSION,
    certificationStage: CHART_CERTIFICATION_B2_STAGE,
    certificationAuthority: ChartCertificationB1Authority.ADVISORY,
    coverageStatus: hasFatal
      ? ChartCertificationCoverageStatus.ERROR
      : ChartCertificationCoverageStatus.PARTIAL,
    diagnosticRevision: context.diagnostics.diagnosticRevision,
    evaluatedReadiness,
    advisoryReadiness: {
      documentationReviewSuggested: deficiencies.some((d) => d.effects.suggestsDocumentationReview),
      providerReviewSuggested: deficiencies.some((d) => d.effects.suggestsProviderReview),
      nursingReviewSuggested: deficiencies.some((d) => d.effects.suggestsNursingReview),
      registrationReviewSuggested: deficiencies.some((d) => d.module === "REGISTRATION"),
      triageReviewSuggested: deficiencies.some((d) => d.module === "TRIAGE"),
    },
    moduleSummaries,
    deficiencies,
    warnings: [...b1.warnings, ...b2ModuleResults.flatMap((m) => m.warnings)],
    informationalItems: [
      ...b1.informationalItems,
      ...b2ModuleResults.flatMap((m) => m.informationalItems),
    ],
    evaluatedModules: [...STAGE_B1_EVALUATED_MODULES, ...STAGE_B2_EVALUATED_MODULES],
    unevaluatedModules: [...STAGE_B2_UNEVALUATED_MODULES],
    sourceFreshness: [
      ...b1.sourceFreshness,
      ...b2ModuleResults.map((m) => m.sourceFreshness),
    ],
    evaluationErrors: [
      ...b1.evaluationErrors,
      ...b2Errors.map((e) => ({
        code: e.code,
        messageKey: e.messageKey,
      })),
    ],
  };
}

export function stageB2AdvisoryFindingsIndependentlyBlock(
  result: ChartCertificationB1Result
): boolean {
  return result.deficiencies.some(
    (d) =>
      d.sourceAuthority !== ChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW &&
      (d.effects.blocksClinicalClosure ||
        d.effects.blocksDisposition ||
        d.effects.blocksBilling)
  );
}
