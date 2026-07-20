import {
  CertificationModule,
  ChartCertificationModuleAuthority,
  ChartCertificationOwner,
  ChartCertificationSourceAuthority,
  type CertificationEvaluationError,
  type ChartCertificationDeficiency,
  type ChartCertificationInformation,
  type ChartCertificationWarning,
  type ModuleCertificationResult,
} from "../../chartCertificationB1/types.js";
import { makeB3Deficiency } from "../deficiency.js";
import type { ChartCertificationB3Context } from "../types.js";

/**
 * Procedure evidence evaluator — supply/billing alone never prove performance.
 */
export function evaluateProceduresModule(
  context: ChartCertificationB3Context
): ModuleCertificationResult {
  const started = Date.now();
  const deficiencies: ChartCertificationDeficiency[] = [];
  const warnings: ChartCertificationWarning[] = [];
  const informationalItems: ChartCertificationInformation[] = [];
  const evaluationErrors: CertificationEvaluationError[] = [];

  if (context.medications.loadError) {
    evaluationErrors.push({
      code: context.medications.loadError.code,
      module: CertificationModule.PROCEDURES,
      messageKey: context.medications.loadError.messageKey,
    });
  }

  for (const proc of context.medications.procedures) {
    if (proc.supplyOrChargeOnly) {
      informationalItems.push({
        stableCode: "PROCEDURE_SUPPLY_CHARGE_INSUFFICIENT_EVIDENCE",
        module: CertificationModule.PROCEDURES,
        titleKey:
          "edLifecycle.certification.b3.codes.PROCEDURE_SUPPLY_CHARGE_INSUFFICIENT_EVIDENCE.title",
        descriptionKey:
          "edLifecycle.certification.b3.codes.PROCEDURE_SUPPLY_CHARGE_INSUFFICIENT_EVIDENCE.description",
      });
      continue;
    }

    const cls = (proc.performedClass ?? "").toUpperCase();
    if (
      cls === "PROCEDURE_CANCELLED" ||
      cls === "PROCEDURE_REFUSED" ||
      cls === "PROCEDURE_ENTERED_IN_ERROR" ||
      cls === "PROCEDURE_PLANNED_NOT_PERFORMED"
    ) {
      continue;
    }

    if (cls !== "PROCEDURE_PERFORMED") {
      if (cls === "PROCEDURE_STATUS_UNKNOWN") {
        warnings.push({
          stableCode: "PROCEDURE_STATUS_CONFLICT",
          module: CertificationModule.PROCEDURES,
          titleKey: "edLifecycle.certification.b3.codes.PROCEDURE_STATUS_CONFLICT.title",
          descriptionKey: "edLifecycle.certification.b3.codes.PROCEDURE_STATUS_CONFLICT.description",
          sourceAuthority: ChartCertificationSourceAuthority.STAGE_B3_EVALUATED,
        });
      }
      continue;
    }

    if (!proc.hasDocumentationEvent && !proc.hasSignedDocumentation) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "PROCEDURE_DOCUMENTATION_MISSING",
          module: CertificationModule.PROCEDURES,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true, suggestsDocumentationReview: true },
          remediation: { route: "provider", section: "procedure", requiredRole: "PROVIDER" },
          sourceEntityType: "OrderItem",
          sourceEntityId: proc.orderItemId,
        })
      );
      continue;
    }

    if (proc.hasDocumentationEvent && !proc.hasSignedDocumentation) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "PROCEDURE_NOTE_UNSIGNED",
          module: CertificationModule.PROCEDURES,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: { route: "provider", section: "procedure-sign", requiredRole: "PROVIDER" },
          sourceEntityType: "OrderItem",
          sourceEntityId: proc.orderItemId,
          deduplicationKey: `PROCEDURE_NOTE_UNSIGNED::${proc.orderItemId}`,
        })
      );
    }

    if (!proc.consentPresent) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "PROCEDURE_CONSENT_MISSING",
          module: CertificationModule.PROCEDURES,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: { route: "provider", section: "procedure-consent", requiredRole: "PROVIDER" },
          sourceEntityType: "OrderItem",
          sourceEntityId: proc.orderItemId,
        })
      );
    }
    if (!proc.timeoutPresent) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "PROCEDURE_TIMEOUT_MISSING",
          module: CertificationModule.PROCEDURES,
          owner: ChartCertificationOwner.NURSING,
          effects: { suggestsNursingReview: true },
          remediation: { route: "nursing", section: "procedure-timeout", requiredRole: "RN" },
          sourceEntityType: "OrderItem",
          sourceEntityId: proc.orderItemId,
        })
      );
    }
  }

  const hasFatal = evaluationErrors.length > 0;
  return {
    module: CertificationModule.PROCEDURES,
    evaluated: true,
    ready: hasFatal ? null : deficiencies.length === 0,
    authority: ChartCertificationModuleAuthority.STAGE_B3_ADVISORY,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.PROCEDURES,
      sourceUpdatedAt: context.medications.medicationProcedureRevision,
      encounterVersionAtLoad: context.encounterVersion,
      status: hasFatal ? "ERROR" : "CURRENT",
    },
    evaluationErrors,
    executionTimeMs: Date.now() - started,
  };
}
