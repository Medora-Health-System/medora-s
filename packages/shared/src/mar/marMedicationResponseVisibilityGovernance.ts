/** MEDUI.ED.MAR.H9L — tiered medication response visibility (RECOMMENDED / OPTIONAL / HIDDEN). */

import { isFluidBolusOrder, isContinuousFluidOrder } from "../medication/continuousFluidOrder.js";
import { parseMedicationFrequencyCode } from "../medication/medicationFrequencyCatalog.js";
import {
  classifyMarPrnReasonGroup,
  isOpioidPainMedicationLabel,
  isPrnMedicationOrder,
  type MarPrnReasonGroup,
} from "./medicationAdministrationPrnGovernance.js";

export type MarMedicationResponseVisibilityTier = "RECOMMENDED" | "OPTIONAL" | "HIDDEN";

export type MarMedicationResponseVisibilityInput = {
  doseStatus?: string | null;
  secondaryText?: string | null;
  marAction?: string | null;
  frequencyCode?: string | null;
  directionsSig?: string | null;
  medicationLabel?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
  prnIndication?: string | null;
  isFluidBolus?: boolean | null;
  isContinuousFluid?: boolean | null;
  manualLabel?: string | null;
  manualSecondaryText?: string | null;
};

const HIDDEN_DOSE_STATUSES = new Set([
  "REFUSED",
  "HELD",
  "MISSED",
  "NOT_AVAILABLE",
  "NOT AVAILABLE",
  "CANCELED",
  "CANCELLED",
  "PENDING",
]);

const HIDDEN_SECONDARY_TEXT = new Set(["REFUSED", "HELD", "MISSED", "NOT AVAILABLE", "CANCELED"]);

const MAINTENANCE_FREQUENCY_CODES = new Set([
  "DAILY",
  "QD",
  "QAM",
  "QPM",
  "QHS",
  "BID",
  "TID",
  "QID",
  "QOD",
  "Q48H",
  "WEEKLY",
]);

const ANTIBIOTIC_TOKENS = [
  "amoxicillin",
  "ampicillin",
  "azithromycin",
  "cefazolin",
  "cefepime",
  "ceftriaxone",
  "cefuroxime",
  "ciprofloxacin",
  "clindamycin",
  "doxycycline",
  "levofloxacin",
  "metronidazole",
  "piperacillin",
  "vancomycin",
  "antibiotic",
  "antibiotique",
] as const;

const EMERGENCY_FREQUENCY_CODES = new Set(["STAT", "NOW"]);

const EMERGENCY_TOKENS = [
  "epinephrine",
  "adrenaline",
  "atropine",
  "naloxone",
  "narcan",
  "dextrose",
  "glucagon",
  "nitroglycerin",
  "nitroglycerine",
  "emergency",
  "urgence",
] as const;

const SEDATIVE_TOKENS = [
  "midazolam",
  "lorazepam",
  "diazepam",
  "alprazolam",
  "clonazepam",
  "zolpidem",
  "sedative",
  "benzodiazep",
] as const;

function normalizeText(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function combinedMedicationText(input: MarMedicationResponseVisibilityInput): string {
  return normalizeText(
    [
      input.medicationLabel,
      input.genericName,
      input.therapeuticClass,
      input.manualLabel,
      input.manualSecondaryText,
      input.prnIndication,
      input.directionsSig,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isHiddenTerminalStatus(input: MarMedicationResponseVisibilityInput): boolean {
  const status = input.doseStatus?.trim().toUpperCase() ?? "";
  if (HIDDEN_DOSE_STATUSES.has(status)) return true;
  const secondary = input.secondaryText?.trim().toUpperCase() ?? "";
  if (HIDDEN_SECONDARY_TEXT.has(secondary)) return true;
  const marAction = input.marAction?.trim().toLowerCase() ?? "";
  if (
    marAction === "refused" ||
    marAction === "held" ||
    marAction === "missed" ||
    marAction === "not_available" ||
    marAction === "canceled"
  ) {
    return true;
  }
  return false;
}

function prnReasonGroup(input: MarMedicationResponseVisibilityInput): MarPrnReasonGroup {
  return classifyMarPrnReasonGroup({
    medicationLabel: input.medicationLabel ?? input.manualLabel,
    genericName: input.genericName ?? input.manualSecondaryText,
    therapeuticClass: input.therapeuticClass,
    prnIndication: input.prnIndication,
  });
}

function isPainMedication(input: MarMedicationResponseVisibilityInput): boolean {
  if (prnReasonGroup(input) === "pain") return true;
  return isOpioidPainMedicationLabel(
    input.medicationLabel ?? input.manualLabel,
    input.genericName ?? input.manualSecondaryText
  );
}

function isAntiemeticMedication(input: MarMedicationResponseVisibilityInput): boolean {
  return prnReasonGroup(input) === "antiemetic";
}

function isRespiratoryMedication(input: MarMedicationResponseVisibilityInput): boolean {
  return prnReasonGroup(input) === "respiratory";
}

function isSedativeMedication(input: MarMedicationResponseVisibilityInput): boolean {
  if (prnReasonGroup(input) === "anxiety_sleep") return true;
  const text = combinedMedicationText(input);
  return SEDATIVE_TOKENS.some((token) => text.includes(token));
}

function isEmergencyMedication(input: MarMedicationResponseVisibilityInput): boolean {
  const parsed = parseMedicationFrequencyCode(input.frequencyCode ?? null);
  if (parsed && EMERGENCY_FREQUENCY_CODES.has(parsed)) return true;
  const text = combinedMedicationText(input);
  if (/\b(stat|now|asap)\b/.test(text)) return true;
  return EMERGENCY_TOKENS.some((token) => text.includes(token));
}

function isPrnMedication(input: MarMedicationResponseVisibilityInput): boolean {
  return isPrnMedicationOrder({
    frequencyCode: input.frequencyCode ?? null,
    directionsSig: input.directionsSig ?? null,
  });
}

function isAntibioticMedication(input: MarMedicationResponseVisibilityInput): boolean {
  const text = combinedMedicationText(input);
  const therapeutic = normalizeText(input.therapeuticClass);
  if (therapeutic.includes("antibiotic") || therapeutic.includes("antibiot")) return true;
  return ANTIBIOTIC_TOKENS.some((token) => text.includes(token));
}

function isIvFluidMedication(input: MarMedicationResponseVisibilityInput): boolean {
  if (input.isFluidBolus === true || input.isContinuousFluid === true) return true;
  const fluidInput = {
    manualLabel: input.manualLabel ?? input.medicationLabel,
    manualSecondaryText: input.manualSecondaryText ?? input.genericName,
    directionsSig: input.directionsSig,
    frequencyCode: input.frequencyCode,
  };
  return isFluidBolusOrder(fluidInput) || isContinuousFluidOrder(fluidInput);
}

function isMaintenanceMedication(input: MarMedicationResponseVisibilityInput): boolean {
  const parsed = parseMedicationFrequencyCode(input.frequencyCode ?? null);
  if (parsed && MAINTENANCE_FREQUENCY_CODES.has(parsed)) return true;
  const text = combinedMedicationText(input);
  return /\b(daily|bid|tid|qid|qhs|qam|qpm)\b/.test(text);
}

function isRecommendedMedication(input: MarMedicationResponseVisibilityInput): boolean {
  return (
    isPrnMedication(input) ||
    isPainMedication(input) ||
    isAntiemeticMedication(input) ||
    isRespiratoryMedication(input) ||
    isSedativeMedication(input) ||
    isEmergencyMedication(input)
  );
}

function isOptionalMedication(input: MarMedicationResponseVisibilityInput): boolean {
  return (
    isAntibioticMedication(input) ||
    isIvFluidMedication(input) ||
    isMaintenanceMedication(input)
  );
}

/**
 * Resolve response documentation visibility tier.
 * HIDDEN overrides all; RECOMMENDED overrides OPTIONAL.
 */
export function resolveMedicationResponseVisibilityTier(
  input: MarMedicationResponseVisibilityInput
): MarMedicationResponseVisibilityTier {
  if (isHiddenTerminalStatus(input)) return "HIDDEN";
  if (isRecommendedMedication(input)) return "RECOMMENDED";
  if (isOptionalMedication(input)) return "OPTIONAL";
  return "OPTIONAL";
}

/** Whether an administered/completed dose is eligible for response documentation UI. */
export function isMarMedicationResponseDocumentationEligible(input: {
  doseStatus?: string | null;
  secondaryText?: string | null;
  marAction?: string | null;
  administeredAt?: string | null;
}): boolean {
  if (resolveMedicationResponseVisibilityTier(input) === "HIDDEN") return false;
  const status = input.doseStatus?.trim().toUpperCase() ?? "";
  const administered =
    Boolean(input.administeredAt?.trim()) ||
    status === "COMPLETED" ||
    status === "DONE" ||
    status === "ADMINISTERED";
  return administered;
}
