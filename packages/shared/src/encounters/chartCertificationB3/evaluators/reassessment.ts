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

const ANALGESIC_HINT =
  /\b(morphine|fentanyl|hydromorphone|oxycodone|tramadol|ketorolac|ibuprofen|acetaminophen|tylenol|toradol|dilaudid|norco|percoket|percocet)\b/i;

function isAnalgesicLabel(label: string | null): boolean {
  return Boolean(label && ANALGESIC_HINT.test(label));
}

/**
 * Contextual reassessment — no universal interval; triggers only when evidence applies.
 */
export function evaluateReassessmentModule(
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
      module: CertificationModule.FULL_REASSESSMENT,
      messageKey: context.medications.loadError.messageKey,
    });
  }

  const reassessments = context.medications.reassessments;
  const completedFor = (kind: string, triggerId: string | null) =>
    reassessments.some(
      (r) =>
        (r.kind === kind || r.kind === "GENERIC") &&
        (triggerId == null || r.triggerEntityId === triggerId) &&
        (r.completed || r.unableOrRefused)
    );

  for (const order of context.medications.medicationOrders) {
    const category = classifyMedicationOrder(order);
    const admins = context.medications.marAdministrations.filter(
      (a) => a.orderItemId === order.orderItemId && !a.voided
    );
    const administered = admins.filter((a) => (a.marAction ?? "").toLowerCase() === "administered");

    if (category === NormalizedMedicationCategory.PRN_ORDER) {
      for (const a of administered) {
        if (!a.notesHasEffectivenessResponse && !completedFor("PRN_RESPONSE", a.id)) {
          deficiencies.push(
            makeB3Deficiency({
              stableCode: "PRN_EFFECTIVENESS_REASSESSMENT_MISSING",
              module: CertificationModule.FULL_REASSESSMENT,
              owner: ChartCertificationOwner.NURSING,
              effects: { suggestsNursingReview: true },
              remediation: { route: "nursing", section: "reassessment", requiredRole: "RN" },
              sourceEntityType: "MedicationAdministration",
              sourceEntityId: a.id,
              deduplicationKey: `PRN_EFFECTIVENESS_REASSESSMENT_MISSING::${order.orderItemId}`,
            })
          );
        }
      }
      continue;
    }

    if (administered.length === 0) continue;

    if (isAnalgesicLabel(order.medicationLabel)) {
      const anyCompleted =
        completedFor("PAIN", order.orderItemId) ||
        completedFor("POST_MEDICATION", order.orderItemId) ||
        reassessments.some(
          (r) =>
            (r.kind === "PAIN" || r.kind === "POST_MEDICATION") &&
            (r.completed || r.unableOrRefused)
        );
      if (!anyCompleted) {
        deficiencies.push(
          makeB3Deficiency({
            stableCode: "PAIN_REASSESSMENT_MISSING",
            module: CertificationModule.FULL_REASSESSMENT,
            owner: ChartCertificationOwner.NURSING,
            effects: { suggestsNursingReview: true },
            remediation: { route: "nursing", section: "pain-reassessment", requiredRole: "RN" },
            sourceEntityType: "OrderItem",
            sourceEntityId: order.orderItemId,
            deduplicationKey: `PAIN_REASSESSMENT_MISSING::${order.orderItemId}`,
          })
        );
      }
    }
  }

  for (const proc of context.medications.procedures) {
    if ((proc.performedClass ?? "").toUpperCase() !== "PROCEDURE_PERFORMED") continue;
    if (proc.postAssessmentPresent) continue;
    if (completedFor("POST_PROCEDURE", proc.orderItemId)) continue;
    if (
      reassessments.some(
        (r) =>
          r.kind === "POST_PROCEDURE" &&
          r.triggerEntityId === proc.orderItemId &&
          r.unableOrRefused
      )
    ) {
      continue;
    }
    deficiencies.push(
      makeB3Deficiency({
        stableCode: "POST_PROCEDURE_REASSESSMENT_MISSING",
        module: CertificationModule.FULL_REASSESSMENT,
        owner: ChartCertificationOwner.NURSING,
        effects: { suggestsNursingReview: true },
        remediation: { route: "nursing", section: "post-procedure", requiredRole: "RN" },
        sourceEntityType: "OrderItem",
        sourceEntityId: proc.orderItemId,
      })
    );
  }

  const hasFatal = evaluationErrors.length > 0;
  return {
    module: CertificationModule.FULL_REASSESSMENT,
    evaluated: true,
    ready: hasFatal ? null : deficiencies.length === 0,
    authority: ChartCertificationModuleAuthority.STAGE_B3_ADVISORY,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.FULL_REASSESSMENT,
      sourceUpdatedAt: context.medications.medicationProcedureRevision,
      encounterVersionAtLoad: context.encounterVersion,
      status: hasFatal ? "ERROR" : "CURRENT",
    },
    evaluationErrors,
    executionTimeMs: Date.now() - started,
  };
}
