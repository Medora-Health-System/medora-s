/** MEDUI.MEDICATION.ENTERPRISE_MEDICATION_ADMINISTRATION_SAFETY.1 — registry-driven follow-up classification. */

import { isEnterprisePulmonaryCatalogCode } from "../medication/pulmonaryMedicationCatalogRegistry.js";
import { isEnterpriseContinuousInfusionCatalogCode } from "../medication/continuousInfusionLifecycleGovernance.js";
import {
  classifyMarPrnReasonGroup,
  isOpioidPainMedicationLabel,
} from "./medicationAdministrationPrnGovernance.js";
import { requiresEnterprisePainReassessment } from "./enterprisePainReassessmentWorkflow.js";
import { resolveMedicationResponseVisibilityTier } from "./marMedicationResponseVisibilityGovernance.js";
import type { MedicationFollowUpType } from "./medicationFollowUpTypes.js";

export type MedicationFollowUpRegistryInput = {
  catalogCode?: string | null;
  medicationLabel?: string | null;
  genericName?: string | null;
  manualLabel?: string | null;
  manualSecondaryText?: string | null;
  route?: string | null;
  frequencyCode?: string | null;
  prnIndication?: string | null;
  directionsSig?: string | null;
  doseKind?: string | null;
  clinicalAction?: string | null;
  marAction?: string | null;
  doseStatus?: string | null;
};

const GLUCOSE_TOKENS = ["insulin", "glucagon", "d50", "dextrose 50"];
const COAGULATION_TOKENS = ["heparin", "enoxaparin", "warfarin", "anti-xa", "anti xa", "ptt"];
const NEURO_TOKENS = ["phenytoin", "levetiracetam", "keppra", "valproate", "depakote"];
const SEDATION_TOKENS = ["midazolam", "propofol", "dexmedetomidine", "precedex", "lorazepam"];
const LAB_TOKENS = ["vancomycin", "gentamicin", "amikacin", "therapeutic level"];

function normalizeHaystack(input: MedicationFollowUpRegistryInput): string {
  return [
    input.catalogCode,
    input.medicationLabel,
    input.genericName,
    input.manualLabel,
    input.manualSecondaryText,
    input.prnIndication,
    input.directionsSig,
  ]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function haystackIncludes(haystack: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => haystack.includes(token));
}

function isInfusionOnlyContext(input: MedicationFollowUpRegistryInput): boolean {
  const action = input.clinicalAction?.trim().toUpperCase() ?? "";
  if (action === "START_INFUSION" || action === "STOP_INFUSION") return true;
  const doseKind = input.doseKind?.trim().toUpperCase() ?? "";
  if (doseKind === "IVPB_SESSION" && input.marAction !== "administered") {
    const status = input.doseStatus?.trim().toUpperCase() ?? "";
    if (status === "IN_PROGRESS" || status === "PLANNED" || status === "DUE") return true;
  }
  return false;
}

/** Registry-driven follow-up type — no hardcoded medication names in consumers. */
export function resolveMedicationFollowUpType(
  input: MedicationFollowUpRegistryInput
): MedicationFollowUpType {
  if (isInfusionOnlyContext(input)) return "NONE";

  if (input.catalogCode && isEnterprisePulmonaryCatalogCode(input.catalogCode)) {
    return "RESPIRATORY";
  }

  const haystack = normalizeHaystack(input);
  if (!haystack) return "NONE";

  const prnGroup = classifyMarPrnReasonGroup({ medicationLabel: haystack });
  if (prnGroup === "respiratory") return "RESPIRATORY";

  if (haystackIncludes(haystack, GLUCOSE_TOKENS)) return "GLUCOSE";
  if (haystackIncludes(haystack, COAGULATION_TOKENS)) return "COAGULATION";
  if (haystackIncludes(haystack, NEURO_TOKENS)) return "NEURO";
  if (haystackIncludes(haystack, SEDATION_TOKENS)) return "SEDATION";
  if (haystackIncludes(haystack, LAB_TOKENS)) return "LAB";

  if (
    requiresEnterprisePainReassessment({
      medicationLabel: input.medicationLabel,
      genericName: input.genericName,
      prnIndication: input.prnIndication,
      directionsSig: input.directionsSig,
      frequencyCode: input.frequencyCode,
    }) ||
    isOpioidPainMedicationLabel(haystack) ||
    prnGroup === "pain"
  ) {
    return "PAIN";
  }

  const visibility = resolveMedicationResponseVisibilityTier({
    medicationLabel: input.medicationLabel,
    genericName: input.genericName,
    prnIndication: input.prnIndication,
    directionsSig: input.directionsSig,
    frequencyCode: input.frequencyCode,
    doseStatus: input.doseStatus,
  });
  if (visibility === "HIDDEN") return "NONE";
  if (visibility === "RECOMMENDED" || visibility === "OPTIONAL") {
    if (input.catalogCode && isEnterpriseContinuousInfusionCatalogCode(input.catalogCode)) {
      return "CUSTOM";
    }
    return "PAIN";
  }

  return "NONE";
}
