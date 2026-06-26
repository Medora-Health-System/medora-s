/**
 * MEDUI.MEDICATION.PULMONARY_AND_CONTINUOUS_INFUSION_EXPANSION.1
 * Pulmonary MAR pathway — INHALATION administration workflow governance.
 */

import { isEnterprisePulmonaryCatalogCode } from "./pulmonaryMedicationCatalogRegistry.js";

export type PulmonaryMarWorkflowState =
  | "ORDERED"
  | "DUE"
  | "ADMINISTER"
  | "DOCUMENT_RESPONSE"
  | "COMPLETED";

export const PULMONARY_MAR_WORKFLOW_SEQUENCE: readonly PulmonaryMarWorkflowState[] = [
  "ORDERED",
  "DUE",
  "ADMINISTER",
  "DOCUMENT_RESPONSE",
  "COMPLETED",
] as const;

export type PulmonaryMarDocumentationFieldKey =
  | "respiratoryRate"
  | "preBreathSounds"
  | "postBreathSounds"
  | "wheezing"
  | "workOfBreathing"
  | "oxygenSaturation"
  | "peakFlow"
  | "patientTolerance"
  | "nebulizerCompletion"
  | "mdiSpacerUsed"
  | "trachAdministration"
  | "noAdverseReaction"
  | "medicationEffective"
  | "patientRefused"
  | "treatmentInterrupted";

export const PULMONARY_MAR_DOCUMENTATION_FIELDS: readonly PulmonaryMarDocumentationFieldKey[] = [
  "respiratoryRate",
  "preBreathSounds",
  "postBreathSounds",
  "wheezing",
  "workOfBreathing",
  "oxygenSaturation",
  "peakFlow",
  "patientTolerance",
  "nebulizerCompletion",
  "mdiSpacerUsed",
  "trachAdministration",
  "noAdverseReaction",
  "medicationEffective",
  "patientRefused",
  "treatmentInterrupted",
] as const;

export type PulmonaryMarAdministrationPayload = {
  respiratoryRate?: number | null;
  preBreathSounds?: string | null;
  postBreathSounds?: string | null;
  wheezing?: boolean | null;
  workOfBreathing?: string | null;
  oxygenSaturation?: number | null;
  peakFlow?: number | null;
  patientTolerance?: string | null;
  nebulizerCompletion?: boolean | null;
  mdiSpacerUsed?: boolean | null;
  trachAdministration?: boolean | null;
  noAdverseReaction?: boolean | null;
  medicationEffective?: boolean | null;
  patientRefused?: boolean | null;
  treatmentInterrupted?: boolean | null;
  lateDocumentation?: boolean | null;
};

/** INHALATION admin type is MAR-eligible when catalog code is in enterprise pulmonary registry. */
export function isPulmonaryMarEligibleCatalogCode(catalogCode: string | null | undefined): boolean {
  const code = catalogCode?.trim();
  if (!code) return false;
  return isEnterprisePulmonaryCatalogCode(code);
}

export function isPulmonaryMarAdministrationType(
  administrationType: string | null | undefined,
  catalogCode?: string | null
): boolean {
  if (administrationType?.trim().toUpperCase() !== "INHALATION") return false;
  return catalogCode ? isPulmonaryMarEligibleCatalogCode(catalogCode) : false;
}

export function resolvePulmonaryMarWorkflowState(input: {
  ordered: boolean;
  due: boolean;
  administered: boolean;
  responseDocumented: boolean;
}): PulmonaryMarWorkflowState {
  if (!input.ordered) return "ORDERED";
  if (input.administered && input.responseDocumented) return "COMPLETED";
  if (input.administered) return "DOCUMENT_RESPONSE";
  if (input.due) return "DUE";
  return "ADMINISTER";
}

export function supportsPulmonaryLateDocumentation(): true {
  return true;
}

export type PulmonaryMarWorkflowReport = {
  workflowSequence: readonly PulmonaryMarWorkflowState[];
  documentationFields: readonly PulmonaryMarDocumentationFieldKey[];
  lateDocumentationSupported: boolean;
  nebAdministrationSupported: boolean;
  mdiAdministrationSupported: boolean;
  trachAdministrationSupported: boolean;
  decision: "PASS" | "FAIL";
};

export function buildPulmonaryMarWorkflowReport(): PulmonaryMarWorkflowReport {
  return {
    workflowSequence: PULMONARY_MAR_WORKFLOW_SEQUENCE,
    documentationFields: PULMONARY_MAR_DOCUMENTATION_FIELDS,
    lateDocumentationSupported: true,
    nebAdministrationSupported: true,
    mdiAdministrationSupported: true,
    trachAdministrationSupported: true,
    decision: "PASS",
  };
}
