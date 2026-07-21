/**
 * D3E — Inpatient chart completeness certification (advisory until flags ON).
 */

export type InpatientCertDeficiencyCode =
  | "MISSING_HP"
  | "MISSING_PROGRESS_NOTE"
  | "MISSING_NURSING"
  | "MISSING_ORDERS_REVIEW"
  | "MISSING_MEDICATION_RECONCILIATION"
  | "MISSING_CONSULT_COMPLETION"
  | "MISSING_DISCHARGE_PLAN";

export type InpatientCertInput = {
  hasHistoryAndPhysical: boolean;
  hasProgressNote: boolean;
  hasNursingDocumentation: boolean;
  hasOrdersReview: boolean;
  hasMedicationReconciliation: boolean;
  openConsultCount: number;
  hasDischargePlan: boolean;
  dischargeInProgress: boolean;
};

export type InpatientCertResult = {
  complete: boolean;
  deficiencies: InpatientCertDeficiencyCode[];
};

export function evaluateInpatientChartCertification(
  input: InpatientCertInput
): InpatientCertResult {
  const deficiencies: InpatientCertDeficiencyCode[] = [];
  if (!input.hasHistoryAndPhysical) deficiencies.push("MISSING_HP");
  if (!input.hasProgressNote) deficiencies.push("MISSING_PROGRESS_NOTE");
  if (!input.hasNursingDocumentation) deficiencies.push("MISSING_NURSING");
  if (!input.hasOrdersReview) deficiencies.push("MISSING_ORDERS_REVIEW");
  if (!input.hasMedicationReconciliation) {
    deficiencies.push("MISSING_MEDICATION_RECONCILIATION");
  }
  if (input.openConsultCount > 0) deficiencies.push("MISSING_CONSULT_COMPLETION");
  if (input.dischargeInProgress && !input.hasDischargePlan) {
    deficiencies.push("MISSING_DISCHARGE_PLAN");
  }
  return { complete: deficiencies.length === 0, deficiencies };
}
