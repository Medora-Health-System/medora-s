import {
  resolveEdDispositionPath,
} from "../../edEncounterLifecycle.js";
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
import { classifyMedicationOrder, NormalizedMedicationCategory } from "../classifyMedication.js";
import { makeB3Deficiency } from "../deficiency.js";
import type { ChartCertificationB3Context } from "../types.js";

/**
 * Infusion lifecycle evaluator. Stop/handoff required — never infer completion from discontinue alone.
 */
export function evaluateInfusionsModule(
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
      module: CertificationModule.INFUSIONS,
      messageKey: context.medications.loadError.messageKey,
    });
  }

  const path = resolveEdDispositionPath({
    dischargeSummaryJson: context.encounter.dischargeSummaryJson,
    admissionSummaryJson: context.encounter.admissionSummaryJson,
    nursingAssessment: context.encounter.nursingAssessment,
  });

  const infusionOrderIds = new Set(
    context.medications.medicationOrders
      .filter((o) => classifyMedicationOrder(o) === NormalizedMedicationCategory.INFUSION)
      .map((o) => o.orderItemId)
  );

  for (const session of context.medications.infusionSessions) {
    const status = (session.status ?? "").toUpperCase();
    const startedOk = Boolean(session.startedAt);
    const stoppedOk = Boolean(session.stoppedAt) || status === "STOPPED" || status === "CANCELLED";

    if (status === "CANCELLED" || status === "STOPPED") {
      if (
        status === "STOPPED" &&
        !session.discontinuationReasonPresent &&
        !session.stoppedAt
      ) {
        deficiencies.push(
          makeB3Deficiency({
            stableCode: "INFUSION_DISCONTINUATION_REASON_MISSING",
            module: CertificationModule.INFUSIONS,
            owner: ChartCertificationOwner.NURSING,
            effects: { suggestsNursingReview: true },
            remediation: { route: "mar", section: "infusion", requiredRole: "RN" },
            sourceEntityType: "InfusionSession",
            sourceEntityId: session.id,
          })
        );
      }
      continue;
    }

    if (status === "IN_PROGRESS" || (startedOk && !stoppedOk)) {
      if ((path === "ADMISSION" || path === "TRANSFER") && session.handoffDocumented) {
        informationalItems.push({
          stableCode: "INFUSION_HANDOFF_DOCUMENTED",
          module: CertificationModule.INFUSIONS,
          titleKey: "edLifecycle.certification.b3.codes.INFUSION_HANDOFF_DOCUMENTED.title",
          descriptionKey:
            "edLifecycle.certification.b3.codes.INFUSION_HANDOFF_DOCUMENTED.description",
        });
        continue;
      }
      if (path === "HOME" || path === "AMA") {
        deficiencies.push(
          makeB3Deficiency({
            stableCode: "INFUSION_UNRESOLVED_AT_DISPOSITION",
            module: CertificationModule.INFUSIONS,
            owner: ChartCertificationOwner.NURSING,
            effects: { suggestsNursingReview: true },
            remediation: { route: "mar", section: "infusion", requiredRole: "RN" },
            sourceEntityType: "InfusionSession",
            sourceEntityId: session.id,
            deduplicationKey: `INFUSION_UNRESOLVED::${session.orderItemId}`,
          })
        );
      } else if (startedOk && !session.stoppedAt) {
        deficiencies.push(
          makeB3Deficiency({
            stableCode: "INFUSION_STOP_TIME_MISSING",
            module: CertificationModule.INFUSIONS,
            owner: ChartCertificationOwner.NURSING,
            effects: { suggestsNursingReview: true },
            remediation: { route: "mar", section: "infusion", requiredRole: "RN" },
            sourceEntityType: "InfusionSession",
            sourceEntityId: session.id,
            deduplicationKey: `INFUSION_UNRESOLVED::${session.orderItemId}`,
          })
        );
      }
    }

    if (!startedOk && infusionOrderIds.has(session.orderItemId) && path === "HOME") {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "INFUSION_NOT_STARTED",
          module: CertificationModule.INFUSIONS,
          owner: ChartCertificationOwner.NURSING,
          effects: { suggestsNursingReview: true },
          remediation: { route: "mar", section: "infusion", requiredRole: "RN" },
          sourceEntityType: "InfusionSession",
          sourceEntityId: session.id,
        })
      );
    }
  }

  // Infusion-classified orders with MAR start but no session stop (partial model)
  for (const orderItemId of infusionOrderIds) {
    if (context.medications.infusionSessions.some((s) => s.orderItemId === orderItemId)) {
      continue;
    }
    const starts = context.medications.marAdministrations.filter(
      (a) =>
        a.orderItemId === orderItemId &&
        !a.voided &&
        (a.infusionPhase ?? "").toUpperCase() === "INFUSION_START"
    );
    const stops = context.medications.marAdministrations.filter(
      (a) =>
        a.orderItemId === orderItemId &&
        !a.voided &&
        (a.infusionPhase ?? "").toUpperCase() === "INFUSION_STOP"
    );
    if (starts.length > 0 && stops.length === 0 && (path === "HOME" || path === "AMA")) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "INFUSION_UNRESOLVED_AT_DISPOSITION",
          module: CertificationModule.INFUSIONS,
          owner: ChartCertificationOwner.NURSING,
          effects: { suggestsNursingReview: true },
          remediation: { route: "mar", section: "infusion", requiredRole: "RN" },
          sourceEntityType: "OrderItem",
          sourceEntityId: orderItemId,
          deduplicationKey: `INFUSION_UNRESOLVED::${orderItemId}`,
        })
      );
    }
  }

  const hasFatal = evaluationErrors.length > 0;
  return {
    module: CertificationModule.INFUSIONS,
    evaluated: true,
    ready: hasFatal ? null : deficiencies.length === 0,
    authority: ChartCertificationModuleAuthority.STAGE_B3_ADVISORY,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.INFUSIONS,
      sourceUpdatedAt: context.medications.medicationProcedureRevision,
      encounterVersionAtLoad: context.encounterVersion,
      status: hasFatal ? "ERROR" : "CURRENT",
    },
    evaluationErrors,
    executionTimeMs: Date.now() - started,
  };
}
