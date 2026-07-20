import { dedupeChartCertificationB1Deficiencies } from "./dedupe.js";
import { evaluateDispositionDocumentationModule } from "./evaluators/dispositionDocumentation.js";
import { evaluateNursingModule } from "./evaluators/nursing.js";
import { evaluateProviderModule } from "./evaluators/provider.js";
import { evaluateRegistrationModule } from "./evaluators/registration.js";
import { evaluateTriageModule } from "./evaluators/triage.js";
import {
  CHART_CERTIFICATION_B1_ID,
  CHART_CERTIFICATION_B1_STAGE,
  CHART_CERTIFICATION_B1_VERSION,
  ChartCertificationB1Authority,
  ChartCertificationCoverageStatus,
  ChartCertificationSourceAuthority,
  STAGE_B1_EVALUATED_MODULES,
  STAGE_B1_UNEVALUATED_MODULES,
  type ChartCertificationB1Context,
  type ChartCertificationB1Result,
  type ModuleCertificationResult,
} from "./types.js";

export type BuildChartCertificationB1Options = {
  /** Injected for tests; default runs all B1 evaluators. */
  evaluators?: Array<(ctx: ChartCertificationB1Context) => ModuleCertificationResult>;
  /** Force evaluation error (tests). */
  forceEvaluationError?: { code: string; messageKey: string };
};

function defaultEvaluators(): Array<(ctx: ChartCertificationB1Context) => ModuleCertificationResult> {
  return [
    evaluateRegistrationModule,
    evaluateTriageModule,
    evaluateNursingModule,
    evaluateProviderModule,
    evaluateDispositionDocumentationModule,
  ];
}

/**
 * Pure Stage B1 merge — no I/O. Server loads context then calls this.
 * Evaluator failure → coverage ERROR and readiness nulls (never false READY).
 */
export function buildChartCertificationB1(
  context: ChartCertificationB1Context,
  options?: BuildChartCertificationB1Options
): ChartCertificationB1Result {
  const evaluationErrors = [...(options?.forceEvaluationError ? [options.forceEvaluationError] : [])];
  const moduleResults: ModuleCertificationResult[] = [];

  try {
    for (const evaluate of options?.evaluators ?? defaultEvaluators()) {
      try {
        moduleResults.push(evaluate(context));
      } catch {
        evaluationErrors.push({
          code: "EVALUATOR_THREW",
          messageKey: "edLifecycle.certification.b1.errors.evaluatorThrew",
        });
      }
    }
  } catch {
    evaluationErrors.push({
      code: "CERTIFICATION_MERGE_FAILED",
      messageKey: "edLifecycle.certification.b1.errors.mergeFailed",
    });
  }

  for (const result of moduleResults) {
    evaluationErrors.push(...result.evaluationErrors);
  }

  const hasFatalError =
    evaluationErrors.length > 0 ||
    context.established.dispositionLoadError ||
    context.established.closeCheckLoadError ||
    options?.forceEvaluationError != null;

  const rawDeficiencies = moduleResults.flatMap((m) => m.deficiencies);
  const deficiencies = dedupeChartCertificationB1Deficiencies(rawDeficiencies);
  const warnings = moduleResults.flatMap((m) => m.warnings);
  const informationalItems = moduleResults.flatMap((m) => m.informationalItems);
  const sourceFreshness = moduleResults.map((m) => m.sourceFreshness);

  const byModule = new Map(moduleResults.map((m) => [m.module, m]));

  const evaluatedReadiness = {
    registrationReady: hasFatalError ? null : byModule.get("REGISTRATION")?.ready ?? null,
    triageReady: hasFatalError ? null : byModule.get("TRIAGE")?.ready ?? null,
    nursingReady: hasFatalError ? null : byModule.get("NURSING")?.ready ?? null,
    providerReady: hasFatalError ? null : byModule.get("PROVIDER")?.ready ?? null,
    dispositionDocumentationReady: hasFatalError
      ? null
      : byModule.get("DISPOSITION_DOCUMENTATION")?.ready ?? null,
  };

  const billingSnapshot = context.encounter.billingReadinessSnapshot;
  const billingReadyFromSnapshot =
    billingSnapshot == null
      ? context.encounter.billingFinalizationStatus !== "NOT_READY"
      : billingSnapshot.isReady === true && billingSnapshot.requiresManualReview !== true;

  const dispositionReady =
    context.established.dispositionLoadError
      ? null
      : context.established.dispositionCanClose === true;

  const clinicalClosureReady =
    context.established.dispositionLoadError
      ? null
      : dispositionReady === true && context.established.physicalDepartureComplete;

  const authoritativeReadiness = {
    clinicalClosureReady,
    dispositionReady,
    billingReady: hasFatalError && context.established.dispositionLoadError ? null : billingReadyFromSnapshot,
    sourceStatus: context.established.dispositionLoadError
      ? ("ERROR" as const)
      : context.established.dispositionCanClose == null
        ? ("PARTIAL" as const)
        : ("COMPLETE" as const),
  };

  const advisoryReadiness = {
    documentationReviewSuggested: deficiencies.some((d) => d.effects.suggestsDocumentationReview),
    providerReviewSuggested: deficiencies.some((d) => d.effects.suggestsProviderReview),
    nursingReviewSuggested: deficiencies.some((d) => d.effects.suggestsNursingReview),
    registrationReviewSuggested: deficiencies.some((d) => d.module === "REGISTRATION"),
    triageReviewSuggested: deficiencies.some((d) => d.module === "TRIAGE"),
  };

  // Safety: Stage B1 evaluated findings never independently block.
  for (const d of deficiencies) {
    if (d.sourceAuthority !== ChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW) {
      d.effects.blocksClinicalClosure = false;
      d.effects.blocksDisposition = false;
      d.effects.blocksBilling = false;
    }
  }

  const moduleSummaries = moduleResults.map((m) => ({
    module: m.module,
    evaluated: m.evaluated,
    ready: hasFatalError ? null : m.ready,
    authority: m.authority,
    deficiencyCount: m.deficiencies.length,
    warningCount: m.warnings.length,
    evaluationErrorCount: m.evaluationErrors.length,
    executionTimeMs: m.executionTimeMs,
  }));

  return {
    encounterId: context.encounterId,
    facilityId: context.facilityId,
    certificationId: CHART_CERTIFICATION_B1_ID,
    certificationVersion: CHART_CERTIFICATION_B1_VERSION,
    certificationStage: CHART_CERTIFICATION_B1_STAGE,
    certificationAuthority: ChartCertificationB1Authority.ADVISORY,
    coverageStatus: hasFatalError
      ? ChartCertificationCoverageStatus.ERROR
      : ChartCertificationCoverageStatus.PARTIAL,
    evaluatedAt: context.evaluatedAt,
    encounterVersion: context.encounterVersion,
    authoritativeReadiness,
    evaluatedReadiness,
    advisoryReadiness,
    moduleSummaries,
    deficiencies,
    warnings,
    informationalItems,
    evaluatedModules: [...STAGE_B1_EVALUATED_MODULES],
    unevaluatedModules: [...STAGE_B1_UNEVALUATED_MODULES],
    sourceFreshness,
    evaluationErrors,
  };
}

/** True when any Stage B1 finding independently claims a workflow block (must stay false). */
export function stageB1AdvisoryFindingsIndependentlyBlock(
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
