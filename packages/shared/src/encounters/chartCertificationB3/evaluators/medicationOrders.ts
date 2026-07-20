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
import {
  classifyMedicationOrder,
  NormalizedMedicationCategory,
} from "../classifyMedication.js";
import { makeB3Deficiency } from "../deficiency.js";
import type { ChartCertificationB3Context } from "../types.js";

const EXCLUDED_FROM_COMPLETENESS = new Set<NormalizedMedicationCategory>([
  NormalizedMedicationCategory.DISCHARGE_PRESCRIPTION,
  NormalizedMedicationCategory.HOME_MEDICATION,
  NormalizedMedicationCategory.FUTURE_OUTPATIENT_ORDER,
  NormalizedMedicationCategory.CANCELLED,
  NormalizedMedicationCategory.DISCONTINUED,
  NormalizedMedicationCategory.ENTERED_IN_ERROR,
  NormalizedMedicationCategory.SUPERSEDED,
  NormalizedMedicationCategory.EXTERNAL,
  NormalizedMedicationCategory.ADMISSION_CONTINUATION_ORDER,
  NormalizedMedicationCategory.TRANSFER_CONTINUATION_ORDER,
]);

/**
 * Medication order completeness / status reasons (advisory).
 */
export function evaluateMedicationOrdersModule(
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
      module: CertificationModule.MEDICATION_ORDERS,
      messageKey: context.medications.loadError.messageKey,
    });
  }

  for (const order of context.medications.medicationOrders) {
    const category = classifyMedicationOrder(order);

    if (order.statusConflict) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "MEDICATION_ORDER_STATUS_CONFLICT",
          module: CertificationModule.MEDICATION_ORDERS,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: { route: "orders", section: "medication", requiredRole: "PROVIDER" },
          sourceEntityType: "OrderItem",
          sourceEntityId: order.orderItemId,
        })
      );
    }

    if (category === NormalizedMedicationCategory.UNKNOWN) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "MEDICATION_ORDER_UNKNOWN_CLASSIFICATION",
          module: CertificationModule.MEDICATION_ORDERS,
          owner: ChartCertificationOwner.SYSTEM,
          effects: { suggestsDocumentationReview: true },
          remediation: { route: "orders", section: "medication", requiredRole: "PROVIDER" },
          sourceEntityType: "OrderItem",
          sourceEntityId: order.orderItemId,
        })
      );
      continue;
    }

    if (category === NormalizedMedicationCategory.HELD && !(order.heldReason ?? "").trim()) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "MEDICATION_ORDER_HOLD_REASON_MISSING",
          module: CertificationModule.MEDICATION_ORDERS,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: { route: "orders", section: "hold", requiredRole: "PROVIDER" },
          sourceEntityType: "OrderItem",
          sourceEntityId: order.orderItemId,
        })
      );
    }

    if (
      category === NormalizedMedicationCategory.DISCONTINUED &&
      !(order.discontinueReason ?? "").trim()
    ) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "MEDICATION_ORDER_DISCONTINUE_REASON_MISSING",
          module: CertificationModule.MEDICATION_ORDERS,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: { route: "orders", section: "discontinue", requiredRole: "PROVIDER" },
          sourceEntityType: "OrderItem",
          sourceEntityId: order.orderItemId,
        })
      );
    }

    if (category === NormalizedMedicationCategory.PRN_ORDER && !(order.prnIndication ?? "").trim()) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "MEDICATION_ORDER_PRN_INDICATION_MISSING",
          module: CertificationModule.MEDICATION_ORDERS,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: { route: "orders", section: "prn", requiredRole: "PROVIDER" },
          sourceEntityType: "OrderItem",
          sourceEntityId: order.orderItemId,
          deduplicationKey: `PRN_INDICATION_MISSING::${order.orderItemId}`,
        })
      );
    }

    if (EXCLUDED_FROM_COMPLETENESS.has(category)) {
      continue;
    }

    if (category !== NormalizedMedicationCategory.ED_ADMINISTRATION_REQUIRED) {
      continue;
    }

    if (!(order.doseValue ?? "").trim()) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "MEDICATION_ORDER_DOSE_MISSING",
          module: CertificationModule.MEDICATION_ORDERS,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: { route: "orders", section: "dose", requiredRole: "PROVIDER" },
          sourceEntityType: "OrderItem",
          sourceEntityId: order.orderItemId,
        })
      );
    }
    if (!(order.doseUnit ?? "").trim()) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "MEDICATION_ORDER_UNIT_MISSING",
          module: CertificationModule.MEDICATION_ORDERS,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: { route: "orders", section: "dose", requiredRole: "PROVIDER" },
          sourceEntityType: "OrderItem",
          sourceEntityId: order.orderItemId,
        })
      );
    }
    if (!(order.route ?? "").trim()) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "MEDICATION_ORDER_ROUTE_MISSING",
          module: CertificationModule.MEDICATION_ORDERS,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: { route: "orders", section: "route", requiredRole: "PROVIDER" },
          sourceEntityType: "OrderItem",
          sourceEntityId: order.orderItemId,
        })
      );
    }
    if (!(order.frequencyCode ?? "").trim()) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "MEDICATION_ORDER_FREQUENCY_MISSING",
          module: CertificationModule.MEDICATION_ORDERS,
          owner: ChartCertificationOwner.PROVIDER,
          effects: { suggestsProviderReview: true },
          remediation: { route: "orders", section: "frequency", requiredRole: "PROVIDER" },
          sourceEntityType: "OrderItem",
          sourceEntityId: order.orderItemId,
        })
      );
    }
  }

  const hasFatal = evaluationErrors.length > 0;
  return {
    module: CertificationModule.MEDICATION_ORDERS,
    evaluated: true,
    ready: hasFatal ? null : deficiencies.length === 0,
    authority: ChartCertificationModuleAuthority.STAGE_B3_ADVISORY,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.MEDICATION_ORDERS,
      sourceUpdatedAt: context.medications.medicationProcedureRevision,
      encounterVersionAtLoad: context.encounterVersion,
      status: hasFatal ? "ERROR" : "CURRENT",
    },
    evaluationErrors,
    executionTimeMs: Date.now() - started,
  };
}
