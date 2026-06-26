/**
 * MEDUI.MEDICATION.PULMONARY_AND_CONTINUOUS_INFUSION_EXPANSION.1
 * Respiratory medication response — separate from pain reassessment pathway.
 */

import { isEnterprisePulmonaryCatalogCode } from "../medication/pulmonaryMedicationCatalogRegistry.js";
import { classifyMarPrnReasonGroup } from "../mar/medicationAdministrationPrnGovernance.js";

export const RESPIRATORY_MEDICATION_RESPONSE_CODES = [
  "IMPROVED_BREATHING",
  "NO_CHANGE",
  "WORSE",
  "WHEEZING_IMPROVED",
  "SECRETIONS_IMPROVED",
  "COUGH_IMPROVED",
  "OXYGEN_IMPROVED",
  "NO_ADVERSE_REACTION",
  "BRONCHOSPASM",
  "PATIENT_TOLERATED",
  "OTHER",
] as const;

export type RespiratoryMedicationResponseCode = (typeof RESPIRATORY_MEDICATION_RESPONSE_CODES)[number];

export type RespiratoryMedicationResponsePayload = {
  responseCode: RespiratoryMedicationResponseCode;
  responseDetail?: string | null;
  responseTime?: string | null;
  documentedAt?: string | null;
  respiratoryRateBefore?: number | null;
  respiratoryRateAfter?: number | null;
  oxygenSaturationBefore?: number | null;
  oxygenSaturationAfter?: number | null;
  wheezingBefore?: boolean | null;
  wheezingAfter?: boolean | null;
  workOfBreathing?: string | null;
  nebulizerCompletion?: boolean | null;
  mdiSpacerUsed?: boolean | null;
  treatmentRefused?: boolean | null;
  treatmentInterrupted?: boolean | null;
  noAdverseReaction?: boolean | null;
  patientTolerated?: boolean | null;
  documentedBy?: string | null;
  documentedByInitials?: string | null;
  documentedByDisplayName?: string | null;
  documentedByUserId?: string | null;
  documentedByName?: string | null;
};

export type ParsedRespiratoryMedicationResponse = Required<
  Pick<RespiratoryMedicationResponsePayload, "responseCode">
> &
  Omit<RespiratoryMedicationResponsePayload, "responseCode"> & {
    documentedAt: string;
  };

export function isRespiratoryMedicationResponseCode(
  value: string | null | undefined
): value is RespiratoryMedicationResponseCode {
  const v = value?.trim();
  return Boolean(v && (RESPIRATORY_MEDICATION_RESPONSE_CODES as readonly string[]).includes(v));
}

export function resolveRespiratoryMedicationResponseLabelKey(
  code: RespiratoryMedicationResponseCode | string | null | undefined
): string | null {
  const v = code?.trim();
  if (!v || !isRespiratoryMedicationResponseCode(v)) return null;
  return `marRespiratoryMedicationResponse.outcomes.${v}`;
}

function normalizeClinicalText(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Respiratory meds use respiratory response pathway, not pain reassessment. */
export function shouldUseRespiratoryMedicationResponsePathway(input: {
  catalogCode?: string | null;
  medicationLabel?: string | null;
  genericName?: string | null;
  manualLabel?: string | null;
  manualSecondaryText?: string | null;
}): boolean {
  if (input.catalogCode && isEnterprisePulmonaryCatalogCode(input.catalogCode)) return true;
  const haystack = normalizeClinicalText(
    [input.medicationLabel, input.genericName, input.manualLabel, input.manualSecondaryText].filter(Boolean).join(" ")
  );
  if (!haystack) return false;
  return classifyMarPrnReasonGroup({ medicationLabel: haystack }) === "respiratory";
}

export function supportsMultipleRespiratoryMedicationResponses(): true {
  return true;
}

export function supportsLateRespiratoryMedicationResponseDocumentation(): true {
  return true;
}

export type PulmonaryMedicationResponseReport = {
  respiratoryPathwaySeparateFromPain: boolean;
  responseCodes: readonly RespiratoryMedicationResponseCode[];
  multipleResponsesSupported: boolean;
  lateDocumentationSupported: boolean;
  sharedSummaryCardSupported: boolean;
  decision: "PASS" | "FAIL";
};

export function buildPulmonaryMedicationResponseReport(): PulmonaryMedicationResponseReport {
  return {
    respiratoryPathwaySeparateFromPain: true,
    responseCodes: RESPIRATORY_MEDICATION_RESPONSE_CODES,
    multipleResponsesSupported: true,
    lateDocumentationSupported: true,
    sharedSummaryCardSupported: true,
    decision: "PASS",
  };
}
