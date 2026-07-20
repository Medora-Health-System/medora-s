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
  administrationRequired,
  classifyMedicationOrder,
  NormalizedMedicationCategory,
} from "../classifyMedication.js";
import { makeB3Deficiency } from "../deficiency.js";
import type { ChartCertificationB3Context, MarAdministrationSnapshot } from "../types.js";

const EXCLUDED_MAR = new Set<NormalizedMedicationCategory>([
  NormalizedMedicationCategory.DISCHARGE_PRESCRIPTION,
  NormalizedMedicationCategory.HOME_MEDICATION,
  NormalizedMedicationCategory.FUTURE_OUTPATIENT_ORDER,
  NormalizedMedicationCategory.CANCELLED,
  NormalizedMedicationCategory.DISCONTINUED,
  NormalizedMedicationCategory.HELD,
  NormalizedMedicationCategory.ENTERED_IN_ERROR,
  NormalizedMedicationCategory.SUPERSEDED,
  NormalizedMedicationCategory.EXTERNAL,
  NormalizedMedicationCategory.ADMISSION_CONTINUATION_ORDER,
  NormalizedMedicationCategory.TRANSFER_CONTINUATION_ORDER,
  NormalizedMedicationCategory.REFUSED,
]);

function activeMars(
  admins: MarAdministrationSnapshot[],
  orderItemId: string
): MarAdministrationSnapshot[] {
  return admins.filter((a) => a.orderItemId === orderItemId && !a.voided);
}

function resolvesDose(a: MarAdministrationSnapshot): boolean {
  const act = (a.marAction ?? "").toLowerCase();
  return (
    act === "administered" ||
    act === "refused" ||
    act === "not_available" ||
    act === "md_changed"
  );
}

/**
 * Lifecycle-aware MAR evaluator (advisory). Never infers administration from dispense/billing.
 */
export function evaluateMarModule(context: ChartCertificationB3Context): ModuleCertificationResult {
  const started = Date.now();
  const deficiencies: ChartCertificationDeficiency[] = [];
  const warnings: ChartCertificationWarning[] = [];
  const informationalItems: ChartCertificationInformation[] = [];
  const evaluationErrors: CertificationEvaluationError[] = [];

  if (context.medications.loadError) {
    evaluationErrors.push({
      code: context.medications.loadError.code,
      module: CertificationModule.MAR,
      messageKey: context.medications.loadError.messageKey,
    });
  }

  const admins = context.medications.marAdministrations;
  const doses = context.medications.doseInstances;

  for (const order of context.medications.medicationOrders) {
    const category = classifyMedicationOrder(order);
    const orderAdmins = activeMars(admins, order.orderItemId);

    for (const a of orderAdmins) {
      const act = (a.marAction ?? "").toLowerCase();
      if (act === "refused" && !a.notesHasRefusalReason) {
        deficiencies.push(
          makeB3Deficiency({
            stableCode: "MAR_REFUSAL_REASON_MISSING",
            module: CertificationModule.MAR,
            owner: ChartCertificationOwner.NURSING,
            effects: { suggestsNursingReview: true },
            remediation: { route: "mar", section: "refusal", requiredRole: "RN" },
            sourceEntityType: "MedicationAdministration",
            sourceEntityId: a.id,
            deduplicationKey: `MAR_REFUSAL_REASON_MISSING::${order.orderItemId}`,
          })
        );
      }
      if (act === "not_available" && !a.notesHasNotAvailableAction) {
        deficiencies.push(
          makeB3Deficiency({
            stableCode: "MAR_NOT_AVAILABLE_ACTION_MISSING",
            module: CertificationModule.MAR,
            owner: ChartCertificationOwner.NURSING,
            effects: { suggestsNursingReview: true },
            remediation: { route: "mar", section: "not-available", requiredRole: "RN" },
            sourceEntityType: "MedicationAdministration",
            sourceEntityId: a.id,
            deduplicationKey: `MAR_NOT_AVAILABLE_ACTION_MISSING::${order.orderItemId}`,
          })
        );
      }
      if (act === "administered" && !(a.administeredAt ?? "").trim()) {
        deficiencies.push(
          makeB3Deficiency({
            stableCode: "MAR_ADMINISTRATION_TIME_MISSING",
            module: CertificationModule.MAR,
            owner: ChartCertificationOwner.NURSING,
            effects: { suggestsNursingReview: true },
            remediation: { route: "mar", section: "time", requiredRole: "RN" },
            sourceEntityType: "MedicationAdministration",
            sourceEntityId: a.id,
          })
        );
      }
      if (a.controlledSubstance && a.wasteDocumented && !a.witnessCompleted) {
        deficiencies.push(
          makeB3Deficiency({
            stableCode: "CONTROLLED_SUBSTANCE_WITNESS_MISSING",
            module: CertificationModule.MAR,
            owner: ChartCertificationOwner.NURSING,
            effects: { suggestsNursingReview: true },
            remediation: { route: "mar", section: "waste", requiredRole: "RN" },
            sourceEntityType: "MedicationAdministration",
            sourceEntityId: a.id,
          })
        );
      }
      if (a.controlledSubstance && a.quantityMismatch) {
        deficiencies.push(
          makeB3Deficiency({
            stableCode: "CONTROLLED_SUBSTANCE_QUANTITY_MISMATCH",
            module: CertificationModule.MAR,
            owner: ChartCertificationOwner.PHARMACY,
            effects: { suggestsNursingReview: true, suggestsDocumentationReview: true },
            remediation: { route: "mar", section: "waste", requiredRole: "RN" },
            sourceEntityType: "MedicationAdministration",
            sourceEntityId: a.id,
          })
        );
      }
    }

    if (category === NormalizedMedicationCategory.PRN_ORDER) {
      const given = orderAdmins.filter((a) => (a.marAction ?? "").toLowerCase() === "administered");
      for (const a of given) {
        if (!a.notesHasPrnIndication && !(order.prnIndication ?? "").trim()) {
          deficiencies.push(
            makeB3Deficiency({
              stableCode: "PRN_ADMINISTRATION_REASON_MISSING",
              module: CertificationModule.MAR,
              owner: ChartCertificationOwner.NURSING,
              effects: { suggestsNursingReview: true },
              remediation: { route: "mar", section: "prn", requiredRole: "RN" },
              sourceEntityType: "MedicationAdministration",
              sourceEntityId: a.id,
            })
          );
        }
      }
      continue;
    }

    if (EXCLUDED_MAR.has(category) || !administrationRequired(category, order)) {
      continue;
    }

    const dueDoses = doses.filter(
      (d) =>
        d.orderItemId === order.orderItemId &&
        ["DUE", "OVERDUE", "PLANNED", "IN_PROGRESS"].includes((d.doseStatus ?? "").toUpperCase())
    );

    if (dueDoses.length > 0) {
      for (const dose of dueDoses) {
        const doseAdmins = orderAdmins.filter(
          (a) => a.doseInstanceId === dose.id || (!a.doseInstanceId && resolvesDose(a))
        );
        const resolved = doseAdmins.some(resolvesDose);
        const refusedNoReason = doseAdmins.some(
          (a) => (a.marAction ?? "").toLowerCase() === "refused" && !a.notesHasRefusalReason
        );
        if (!resolved && !refusedNoReason) {
          deficiencies.push(
            makeB3Deficiency({
              stableCode: "MAR_DOSE_UNRESOLVED",
              module: CertificationModule.MAR,
              owner: ChartCertificationOwner.NURSING,
              effects: { suggestsNursingReview: true },
              remediation: { route: "mar", section: "dose", requiredRole: "RN" },
              sourceEntityType: "MedicationDoseInstance",
              sourceEntityId: dose.id,
              deduplicationKey: `MAR_DOSE_UNRESOLVED::${dose.id}`,
            })
          );
        }
      }
    } else if (!orderAdmins.some(resolvesDose)) {
      deficiencies.push(
        makeB3Deficiency({
          stableCode: "MAR_DOSE_UNRESOLVED",
          module: CertificationModule.MAR,
          owner: ChartCertificationOwner.NURSING,
          effects: { suggestsNursingReview: true },
          remediation: { route: "mar", section: "dose", requiredRole: "RN" },
          sourceEntityType: "OrderItem",
          sourceEntityId: order.orderItemId,
          deduplicationKey: `MAR_DOSE_UNRESOLVED::${order.orderItemId}`,
        })
      );
    }
  }

  const hasFatal = evaluationErrors.length > 0;
  return {
    module: CertificationModule.MAR,
    evaluated: true,
    ready: hasFatal ? null : deficiencies.length === 0,
    authority: ChartCertificationModuleAuthority.STAGE_B3_ADVISORY,
    deficiencies,
    warnings,
    informationalItems,
    sourceFreshness: {
      module: CertificationModule.MAR,
      sourceUpdatedAt: context.medications.medicationProcedureRevision,
      encounterVersionAtLoad: context.encounterVersion,
      status: hasFatal ? "ERROR" : "CURRENT",
    },
    evaluationErrors,
    executionTimeMs: Date.now() - started,
  };
}
