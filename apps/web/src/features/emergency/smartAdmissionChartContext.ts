/**
 * Build documented-only chart context for D4A.2 smart admission proposals.
 */

import type { SmartAdmissionChartContextV1 } from "@medora/shared";

export type EncounterLiteForSmartAdmission = {
  chiefComplaint?: string | null;
  visitReason?: string | null;
  providerNote?: string | null;
  treatmentPlan?: string | null;
  nursingAssessment?: unknown;
};

function trim(s: unknown): string {
  return String(s ?? "").trim();
}

function linesFromUnknownList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => trim(x)).filter(Boolean);
}

/**
 * Extracts only already-documented strings. Does not invent clinical facts.
 * Optional order/result lines may be passed by the caller when already loaded.
 */
export function buildSmartAdmissionChartContext(input: {
  encounter: EncounterLiteForSmartAdmission;
  primaryDiagnosisDisplay?: string | null;
  secondaryDiagnosisDisplays?: string[];
  abnormalResultLines?: string[];
  activeMedicationOrderLines?: string[];
  ivFluidOrderLines?: string[];
  dietOrderLines?: string[];
  oxygenOrderLines?: string[];
  monitoringOrderLines?: string[];
  consultOrderLines?: string[];
  labOrderLines?: string[];
  imagingOrderLines?: string[];
  procedureOrderLines?: string[];
  precautionLines?: string[];
  failedEdTherapyLines?: string[];
  continuedTreatmentNeeds?: string[];
  monitoringNeeds?: string[];
  consultantRecommendationLines?: string[];
}): SmartAdmissionChartContextV1 {
  const enc = input.encounter;
  const assessment = trim(enc.providerNote);
  const plan = trim(enc.treatmentPlan);
  return {
    chiefComplaint: trim(enc.chiefComplaint) || null,
    visitReason: trim(enc.visitReason) || null,
    providerAssessment: assessment || null,
    providerPlan: plan || null,
    primaryDiagnosisDisplay: trim(input.primaryDiagnosisDisplay) || null,
    secondaryDiagnosisDisplays: (input.secondaryDiagnosisDisplays ?? [])
      .map(trim)
      .filter(Boolean),
    abnormalResultLines: linesFromUnknownList(input.abnormalResultLines),
    failedEdTherapyLines: linesFromUnknownList(input.failedEdTherapyLines),
    continuedTreatmentNeeds: linesFromUnknownList(input.continuedTreatmentNeeds),
    monitoringNeeds: linesFromUnknownList(input.monitoringNeeds),
    consultantRecommendationLines: linesFromUnknownList(input.consultantRecommendationLines),
    activeMedicationOrderLines: linesFromUnknownList(input.activeMedicationOrderLines),
    ivFluidOrderLines: linesFromUnknownList(input.ivFluidOrderLines),
    dietOrderLines: linesFromUnknownList(input.dietOrderLines),
    oxygenOrderLines: linesFromUnknownList(input.oxygenOrderLines),
    monitoringOrderLines: linesFromUnknownList(input.monitoringOrderLines),
    consultOrderLines: linesFromUnknownList(input.consultOrderLines),
    labOrderLines: linesFromUnknownList(input.labOrderLines),
    imagingOrderLines: linesFromUnknownList(input.imagingOrderLines),
    procedureOrderLines: linesFromUnknownList(input.procedureOrderLines),
    precautionLines: linesFromUnknownList(input.precautionLines),
  };
}
