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
 * Order lifecycle router / fallback.
 * Prefer modality-specific deficiencies from lab/imaging/ECG evaluators.
 */
export function evaluateOrdersModule(
  context: ChartCertificationB2Context
): ModuleCertificationResult {
  const started = Date.now();
  const deficiencies: ChartCertificationDeficiency[] = [];
  const warnings: ChartCertificationWarning[] = [];
  const informationalItems: ChartCertificationInformation[] = [];
  const evaluationErrors: CertificationEvaluationError[] = [];

  if (context.diagnostics.loadError) {
    evaluationErrors.push({
      code: context.diagnostics.loadError.code,
      module: CertificationModule.ORDERS,
      messageKey: context.diagnostics.loadError.messageKey,
    });
  }

  const normalized = normalizeAllDiagnosticItems(context.diagnostics.orderItems);
  let medExcluded = 0;
  let procExcluded = 0;
  let unresolvedGeneric = 0;

  for (const n of normalized) {
    if (n.category === DiagnosticCategory.MEDICATION) {
      medExcluded += 1;
      continue;
    }
    if (n.category === DiagnosticCategory.PROCEDURE_NON_DIAGNOSTIC) {
      procExcluded += 1;
      continue;
    }
    if (n.normalizedLifecycle === DiagnosticLifecycleState.FUTURE_NOT_APPLICABLE) {
      informationalItems.push({
        stableCode: "DIAGNOSTIC_ORDER_FUTURE_EXCLUDED",
        module: CertificationModule.ORDERS,
        titleKey: "edLifecycle.certification.b2.codes.DIAGNOSTIC_ORDER_FUTURE_EXCLUDED.title",
        descriptionKey:
          "edLifecycle.certification.b2.codes.DIAGNOSTIC_ORDER_FUTURE_EXCLUDED.description",
      });
      continue;
    }

    if (!isB2IncludedCategory(n.category) && n.category === DiagnosticCategory.OTHER) {
      if (n.normalizedLifecycle === DiagnosticLifecycleState.UNKNOWN) {
        unresolvedGeneric += 1;
        deficiencies.push(
          makeB2Deficiency({
            stableCode: "DIAGNOSTIC_ORDER_STATUS_UNKNOWN",
            module: CertificationModule.ORDERS,
            owner: ChartCertificationOwner.SYSTEM,
            effects: { suggestsDocumentationReview: true },
            remediation: { route: "orders", section: "status", requiredRole: "PROVIDER" },
            sourceEntityType: "OrderItem",
            sourceEntityId: n.orderItemId,
          })
        );
      }
      continue;
    }

    // Refusal without documentation — only when refusal signal absent but status implies refused
    // (fixture: notPerformedDocumented false and special flag via cancellationReason)
    if (
      (n.snapshot.cancellationReason ?? "").toUpperCase() === "REFUSED" &&
      !n.snapshot.refusalDocumented &&
      n.normalizedLifecycle !== DiagnosticLifecycleState.REFUSED_VALID
    ) {
      unresolvedGeneric += 1;
      deficiencies.push(
        makeB2Deficiency({
          stableCode: "DIAGNOSTIC_ORDER_REFUSAL_UNDOCUMENTED",
          module: CertificationModule.ORDERS,
          owner: ChartCertificationOwner.NURSING,
          effects: { suggestsNursingReview: true },
          remediation: { route: "orders", section: "refusal", requiredRole: "RN" },
          sourceEntityType: "OrderItem",
          sourceEntityId: n.orderItemId,
        })
      );
    }
  }

  if (medExcluded > 0) {
    informationalItems.push({
      stableCode: "MEDICATION_ORDERS_EXCLUDED_FROM_B2",
      module: CertificationModule.ORDERS,
      titleKey: "edLifecycle.certification.b2.codes.MEDICATION_ORDERS_EXCLUDED_FROM_B2.title",
      descriptionKey:
        "edLifecycle.certification.b2.codes.MEDICATION_ORDERS_EXCLUDED_FROM_B2.description",
    });
  }
  if (procExcluded > 0) {
    informationalItems.push({
      stableCode: "PROCEDURE_ORDERS_EXCLUDED_FROM_B2",
      module: CertificationModule.ORDERS,
      titleKey: "edLifecycle.certification.b2.codes.PROCEDURE_ORDERS_EXCLUDED_FROM_B2.title",
      descriptionKey:
        "edLifecycle.certification.b2.codes.PROCEDURE_ORDERS_EXCLUDED_FROM_B2.description",
    });
  }

  const hasFatal = evaluationErrors.length > 0;
  return {
    module: CertificationModule.ORDERS,
    evaluated: true,
    ready: hasFatal ? null : unresolvedGeneric === 0,
    authority: ChartCertificationModuleAuthority.STAGE_B2_ADVISORY,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.ORDERS,
      sourceUpdatedAt: context.diagnostics.diagnosticRevision,
      encounterVersionAtLoad: context.encounterVersion,
      status: hasFatal ? "ERROR" : "CURRENT",
    },
    evaluationErrors,
    executionTimeMs: Date.now() - started,
  };
}
