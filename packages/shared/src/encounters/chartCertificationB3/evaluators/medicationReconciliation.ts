import {
  CertificationModule,
  ChartCertificationModuleAuthority,
  type ModuleCertificationResult,
} from "../../chartCertificationB1/types.js";
import type { ChartCertificationB3Context } from "../types.js";

/**
 * Medication reconciliation is NOT durably modeled in Medora — keep PARTIALLY_EVALUATED.
 * Do not infer completion from medication-list presence.
 */
export function evaluateMedicationReconciliationModule(
  context: ChartCertificationB3Context
): ModuleCertificationResult {
  const started = Date.now();
  return {
    module: CertificationModule.MEDICATION_RECONCILIATION,
    evaluated: true,
    ready: null,
    authority: ChartCertificationModuleAuthority.PARTIALLY_EVALUATED,
    deficiencies: [],
    warnings: [],
    informationalItems: [
      {
        stableCode: "MEDICATION_RECONCILIATION_MODEL_NOT_DURABLE",
        module: CertificationModule.MEDICATION_RECONCILIATION,
        titleKey:
          "edLifecycle.certification.b3.codes.MEDICATION_RECONCILIATION_MODEL_NOT_DURABLE.title",
        descriptionKey:
          "edLifecycle.certification.b3.codes.MEDICATION_RECONCILIATION_MODEL_NOT_DURABLE.description",
      },
    ],
    sourceFreshness: {
      module: CertificationModule.MEDICATION_RECONCILIATION,
      sourceUpdatedAt: context.medications.medicationProcedureRevision,
      encounterVersionAtLoad: context.encounterVersion,
      status: "UNKNOWN",
    },
    evaluationErrors: [],
    executionTimeMs: Date.now() - started,
  };
}
