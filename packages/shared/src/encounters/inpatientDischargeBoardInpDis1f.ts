/**
 * INP.DIS.1F — Discharge planning summary projection for the enterprise board.
 * Planning ≠ provider final disposition.
 */

import {
  readInpatientClinicalOpsFromAdmissionSummary,
  type InpatientClinicalOpsV1,
} from "./inpatientClinicalOpsV1.js";

export type InpatientDischargePlanningSummary1F = {
  plannedDestination: string | null;
  homeHealth: string | null;
  transportPlan: string | null;
  specialNeedsEquipment: string | null;
  careTeamNotified: boolean | null;
  workflowState: string | null;
  anticipatedDischargeDate: string | null;
  barriers: string | null;
  differsFromProviderDisposition: boolean;
};

export function projectInpatientDischargePlanningSummary(input: {
  admissionSummaryJson?: unknown;
  ops?: InpatientClinicalOpsV1 | null;
  providerDispositionCode?: string | null;
}): InpatientDischargePlanningSummary1F {
  const ops =
    input.ops ??
    (input.admissionSummaryJson
      ? readInpatientClinicalOpsFromAdmissionSummary(input.admissionSummaryJson)
      : null);
  const plan = ops?.dischargePlanning ?? null;
  const planned = plan?.destination?.trim() || null;
  const provider = input.providerDispositionCode?.trim().toUpperCase() || null;
  const plannedNorm = planned?.toUpperCase() || null;
  const differs =
    Boolean(plannedNorm && provider && plannedNorm !== provider) &&
    !(plannedNorm === "HOME" && provider === "HOME");

  return {
    plannedDestination: planned,
    homeHealth: plan?.homeHealth?.trim() || null,
    transportPlan: plan?.transportation?.trim() || null,
    specialNeedsEquipment: plan?.specialNeedsEquipment?.trim() || null,
    careTeamNotified:
      typeof plan?.careTeamNotified === "boolean" ? plan.careTeamNotified : null,
    workflowState: plan?.workflowState ?? null,
    anticipatedDischargeDate: plan?.anticipatedDischargeDate ?? null,
    barriers: plan?.barriers?.trim() || null,
    differsFromProviderDisposition: differs,
  };
}
