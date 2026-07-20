import { buildChartCertificationB2 } from "../chartCertificationB2/buildChartCertificationB2.js";
import {
  CertificationModule,
  ChartCertificationB1Authority,
  ChartCertificationCoverageStatus,
  ChartCertificationSourceAuthority,
  STAGE_B1_EVALUATED_MODULES,
  type ChartCertificationB1Result,
  type ModuleCertificationResult,
} from "../chartCertificationB1/types.js";
import { STAGE_B2_EVALUATED_MODULES } from "../chartCertificationB2/types.js";
import { dedupeChartCertificationB3Deficiencies } from "./dedupe.js";
import { evaluateInfusionsModule } from "./evaluators/infusions.js";
import { evaluateMarModule } from "./evaluators/mar.js";
import { evaluateMedicationOrdersModule } from "./evaluators/medicationOrders.js";
import { evaluateMedicationReconciliationModule } from "./evaluators/medicationReconciliation.js";
import { evaluateProceduresModule } from "./evaluators/procedures.js";
import { evaluateReassessmentModule } from "./evaluators/reassessment.js";
import {
  CHART_CERTIFICATION_B3_ID,
  CHART_CERTIFICATION_B3_STAGE,
  CHART_CERTIFICATION_B3_VERSION,
  STAGE_B3_EVALUATED_MODULES,
  STAGE_B3_UNEVALUATED_MODULES,
  type ChartCertificationB3Context,
} from "./types.js";

export type BuildChartCertificationB3Options = {
  forceEvaluationError?: { code: string; messageKey: string };
  forceB2EvaluationError?: { code: string; messageKey: string };
  forceB3EvaluationError?: { code: string; messageKey: string };
};

/**
 * Stage B3 merge: B1 + B2 + medication/MAR/infusion/procedure/reassessment evaluators.
 */
export function buildChartCertificationB3(
  context: ChartCertificationB3Context,
  options?: BuildChartCertificationB3Options
): ChartCertificationB1Result {
  const b2 = buildChartCertificationB2(context, {
    forceEvaluationError: options?.forceEvaluationError,
    forceB2EvaluationError: options?.forceB2EvaluationError,
  });

  const b3Errors = [
    ...(options?.forceB3EvaluationError ? [options.forceB3EvaluationError] : []),
    ...(context.medications.loadError
      ? [
          {
            code: context.medications.loadError.code,
            messageKey: context.medications.loadError.messageKey,
          },
        ]
      : []),
  ];

  const b3ModuleResults: ModuleCertificationResult[] = [];
  try {
    b3ModuleResults.push(evaluateMedicationOrdersModule(context));
    b3ModuleResults.push(evaluateMarModule(context));
    b3ModuleResults.push(evaluateInfusionsModule(context));
    b3ModuleResults.push(evaluateMedicationReconciliationModule(context));
    b3ModuleResults.push(evaluateProceduresModule(context));
    b3ModuleResults.push(evaluateReassessmentModule(context));
  } catch {
    b3Errors.push({
      code: "B3_EVALUATOR_THREW",
      messageKey: "edLifecycle.certification.b3.errors.evaluatorThrew",
    });
  }

  for (const m of b3ModuleResults) {
    b3Errors.push(...m.evaluationErrors.map((e) => ({ code: e.code, messageKey: e.messageKey })));
  }

  const hasFatal =
    b2.coverageStatus === ChartCertificationCoverageStatus.ERROR || b3Errors.length > 0;

  const rawDeficiencies = [...b2.deficiencies, ...b3ModuleResults.flatMap((m) => m.deficiencies)];
  const deficiencies = dedupeChartCertificationB3Deficiencies(rawDeficiencies);

  for (const d of deficiencies) {
    if (d.sourceAuthority !== ChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW) {
      d.effects.blocksClinicalClosure = false;
      d.effects.blocksDisposition = false;
      d.effects.blocksBilling = false;
    }
  }

  const byModule = new Map(b3ModuleResults.map((m) => [m.module, m]));

  const evaluatedReadiness = {
    ...b2.evaluatedReadiness,
    medicationOrdersReady: hasFatal
      ? null
      : byModule.get(CertificationModule.MEDICATION_ORDERS)?.ready ?? null,
    marReady: hasFatal ? null : byModule.get(CertificationModule.MAR)?.ready ?? null,
    infusionsReady: hasFatal ? null : byModule.get(CertificationModule.INFUSIONS)?.ready ?? null,
    medicationReconciliationReady: hasFatal
      ? null
      : byModule.get(CertificationModule.MEDICATION_RECONCILIATION)?.ready ?? null,
    proceduresReady: hasFatal ? null : byModule.get(CertificationModule.PROCEDURES)?.ready ?? null,
    reassessmentReady: hasFatal
      ? null
      : byModule.get(CertificationModule.FULL_REASSESSMENT)?.ready ?? null,
  };

  if (hasFatal) {
    evaluatedReadiness.registrationReady = null;
    evaluatedReadiness.triageReady = null;
    evaluatedReadiness.nursingReady = null;
    evaluatedReadiness.providerReady = null;
    evaluatedReadiness.dispositionDocumentationReady = null;
    evaluatedReadiness.ordersReady = null;
    evaluatedReadiness.laboratoryReady = null;
    evaluatedReadiness.imagingReady = null;
    evaluatedReadiness.ecgReady = null;
    evaluatedReadiness.resultReviewReady = null;
  }

  const moduleSummaries = [
    ...b2.moduleSummaries.map((s) => (hasFatal ? { ...s, ready: null as boolean | null } : s)),
    ...b3ModuleResults.map((m) => ({
      module: m.module,
      evaluated: m.evaluated,
      ready: hasFatal ? null : m.ready,
      authority: m.authority,
      deficiencyCount: m.deficiencies.length,
      warningCount: m.warnings.length,
      evaluationErrorCount: m.evaluationErrors.length,
      executionTimeMs: m.executionTimeMs,
      evaluatorVersion: CHART_CERTIFICATION_B3_VERSION,
    })),
  ];

  return {
    ...b2,
    certificationId: CHART_CERTIFICATION_B3_ID,
    certificationVersion: CHART_CERTIFICATION_B3_VERSION,
    certificationStage: CHART_CERTIFICATION_B3_STAGE,
    certificationAuthority: ChartCertificationB1Authority.ADVISORY,
    coverageStatus: hasFatal
      ? ChartCertificationCoverageStatus.ERROR
      : ChartCertificationCoverageStatus.PARTIAL,
    medicationProcedureRevision: context.medications.medicationProcedureRevision,
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
    warnings: [...b2.warnings, ...b3ModuleResults.flatMap((m) => m.warnings)],
    informationalItems: [
      ...b2.informationalItems,
      ...b3ModuleResults.flatMap((m) => m.informationalItems),
    ],
    evaluatedModules: [
      ...STAGE_B1_EVALUATED_MODULES,
      ...STAGE_B2_EVALUATED_MODULES,
      ...STAGE_B3_EVALUATED_MODULES,
    ],
    unevaluatedModules: [...STAGE_B3_UNEVALUATED_MODULES],
    sourceFreshness: [
      ...b2.sourceFreshness,
      ...b3ModuleResults.map((m) => m.sourceFreshness),
    ],
    evaluationErrors: [
      ...b2.evaluationErrors,
      ...b3Errors.map((e) => ({
        code: e.code,
        messageKey: e.messageKey,
      })),
    ],
  };
}

export function stageB3AdvisoryFindingsIndependentlyBlock(
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
