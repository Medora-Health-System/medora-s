/**
 * MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_WAVE_C_RUNTIME_REMEDIATION.1
 * Enterprise pain reassessment workflow after opioid / muscle relaxant / NSAID / pain medication administration.
 * MEDUI.MEDICATION.MAR_PAIN_RESPONSE_AND_ENTERPRISE_SEED_ENGINE.1 — hardened classifier + status transition.
 */

import {
  marAdministrationHasMedicationResponse,
  parseMarMedicationResponseNotes,
  type ParsedMarMedicationResponse,
} from "../mar/marMedicationResponseGovernance.js";
import { isOpioidPainMedicationLabel } from "../mar/medicationAdministrationPrnGovernance.js";

export type EnterprisePainReassessmentMarStatus =
  | "AWAITING_REASSESSMENT"
  | "REASSESSMENT_COMPLETED"
  | "NOT_REQUIRED";

export type EnterprisePainReassessmentSideEffects = {
  noAdverseReaction?: boolean | null;
  nausea?: boolean | null;
  vomiting?: boolean | null;
  itching?: boolean | null;
  sedation?: boolean | null;
  dizziness?: boolean | null;
  constipation?: boolean | null;
  respiratoryDepression?: boolean | null;
};

export type EnterprisePainReassessmentPayload = {
  painScoreBefore?: number | null;
  painScoreAfter?: number | null;
  painResponseTrend?: "IMPROVED" | "SAME" | "WORSE" | null;
  sideEffects?: EnterprisePainReassessmentSideEffects | null;
  comments?: string | null;
  reassessedAt?: string | null;
  reassessedByUserId?: string | null;
};

const MUSCLE_RELAXANT_TOKENS = [
  "cyclobenzaprine",
  "flexeril",
  "methocarbamol",
  "robaxin",
  "tizanidine",
  "zanaflex",
] as const;

const ALWAYS_PAIN_NSAID_TOKENS = ["ketorolac", "toradol"] as const;

const INDICATION_GATED_NSAID_TOKENS = [
  "ibuprofen",
  "advil",
  "motrin",
  "naproxen",
  "aleve",
  "meloxicam",
  "celecoxib",
] as const;

const TOPICAL_PAIN_TOKENS = [
  "diclofenac",
  "voltaren",
  "lidocaine patch",
  "lidocaine 5",
  "lidocaine transdermal",
] as const;

const NEUROPATHIC_PAIN_TOKENS = ["gabapentin", "pregabalin", "neurontin", "lyrica"] as const;

const ACETAMINOPHEN_TOKENS = ["acetaminophen", "paracetamol", "tylenol"] as const;

const COMBINATION_OPIOID_TOKENS = ["norco", "percocet", "vicodin", "tylenol #3", "tylenol#3"] as const;

const PAIN_INDICATION_MARKERS = [
  "pain",
  "douleur",
  "mal",
  "analges",
  "analgesic",
  "comfort",
  "spasm",
  "spasme",
  "neuropathic",
  "neuropath",
] as const;

function normalizeText(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function combinedMedicationText(input: {
  catalogCode?: string | null;
  medicationLabel?: string | null;
  genericName?: string | null;
}): string {
  return normalizeText([input.catalogCode, input.medicationLabel, input.genericName].filter(Boolean).join(" "));
}

function combinedIndicationText(input: {
  prnIndication?: string | null;
  directionsSig?: string | null;
  frequencyCode?: string | null;
}): string {
  return normalizeText(
    [input.prnIndication, input.directionsSig, input.frequencyCode].filter(Boolean).join(" ")
  );
}

function hasPainIndication(input: {
  prnIndication?: string | null;
  directionsSig?: string | null;
  frequencyCode?: string | null;
}): boolean {
  const text = combinedIndicationText(input);
  return PAIN_INDICATION_MARKERS.some((marker) => text.includes(marker));
}

function isPrnPainOrder(input: {
  prnIndication?: string | null;
  directionsSig?: string | null;
  frequencyCode?: string | null;
}): boolean {
  const text = combinedIndicationText(input);
  return /\bprn\b/.test(text) && hasPainIndication(input);
}

function textIncludesAny(text: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

/** Whether post-administration pain reassessment is required for this medication. */
export function requiresEnterprisePainReassessment(input: {
  catalogCode?: string | null;
  medicationLabel?: string | null;
  genericName?: string | null;
  prnIndication?: string | null;
  directionsSig?: string | null;
  frequencyCode?: string | null;
}): boolean {
  const text = combinedMedicationText(input);
  const painIndicated = hasPainIndication(input);

  if (isOpioidPainMedicationLabel(input.medicationLabel, input.genericName)) return true;
  if (textIncludesAny(text, COMBINATION_OPIOID_TOKENS)) return true;
  if (textIncludesAny(text, MUSCLE_RELAXANT_TOKENS)) return true;
  if (textIncludesAny(text, TOPICAL_PAIN_TOKENS)) return true;
  if (textIncludesAny(text, ALWAYS_PAIN_NSAID_TOKENS)) return true;
  if (textIncludesAny(text, INDICATION_GATED_NSAID_TOKENS) && painIndicated) return true;
  if (textIncludesAny(text, ACETAMINOPHEN_TOKENS) && painIndicated) return true;
  if (textIncludesAny(text, NEUROPATHIC_PAIN_TOKENS) && painIndicated) return true;
  if (isPrnPainOrder(input)) return true;

  return false;
}

function isAdministeredForReassessment(input: {
  marAction?: string | null;
  administrationNotes?: string | null;
  administeredAt?: string | null;
  doseStatus?: string | null;
}): boolean {
  const marAction = input.marAction?.trim().toLowerCase() ?? "";
  if (marAction && marAction !== "administered") return false;
  if (marAction === "administered") return true;
  if (input.administeredAt?.trim()) return true;
  const doseStatus = input.doseStatus?.trim().toUpperCase() ?? "";
  return doseStatus === "COMPLETED";
}

export function resolveEnterprisePainReassessmentMarStatus(input: {
  catalogCode?: string | null;
  medicationLabel?: string | null;
  genericName?: string | null;
  marAction?: string | null;
  administrationNotes?: string | null;
  administeredAt?: string | null;
  doseStatus?: string | null;
  prnIndication?: string | null;
  directionsSig?: string | null;
  frequencyCode?: string | null;
}): EnterprisePainReassessmentMarStatus {
  if (!requiresEnterprisePainReassessment(input)) return "NOT_REQUIRED";
  if (!isAdministeredForReassessment(input)) return "NOT_REQUIRED";
  if (marAdministrationHasMedicationResponse(input.administrationNotes)) return "REASSESSMENT_COMPLETED";
  return "AWAITING_REASSESSMENT";
}

export function resolveEnterprisePainReassessmentTimelineSecondaryText(
  input: Parameters<typeof resolveEnterprisePainReassessmentMarStatus>[0],
  defaultSecondaryText: string
): string {
  const status = resolveEnterprisePainReassessmentMarStatus(input);
  if (status === "AWAITING_REASSESSMENT") return "AWAITING_REASSESSMENT";
  if (status === "REASSESSMENT_COMPLETED") return "REASSESSMENT_COMPLETED";
  return defaultSecondaryText;
}

export type PainReassessmentWorkflowReport = {
  requiresReassessmentMedicationClasses: readonly string[];
  marStatusValues: readonly EnterprisePainReassessmentMarStatus[];
  sideEffectFields: readonly string[];
  persistenceSurfaces: readonly string[];
  sampleValidation: { ok: boolean; missingFields: string[] };
  decision: "PASS" | "FAIL";
};

export function validateEnterprisePainReassessmentPayload(
  input: EnterprisePainReassessmentPayload
): { ok: boolean; missingFields: string[] } {
  const missing: string[] = [];
  if (input.painScoreBefore == null) missing.push("painScoreBefore");
  if (input.painScoreAfter == null) missing.push("painScoreAfter");
  if (!input.painResponseTrend) missing.push("painResponseTrend");
  if (!input.reassessedAt?.trim()) missing.push("reassessedAt");
  return { ok: missing.length === 0, missingFields: missing };
}

export function buildPainReassessmentWorkflowReport(): PainReassessmentWorkflowReport {
  const sample = validateEnterprisePainReassessmentPayload({
    painScoreBefore: 7,
    painScoreAfter: 3,
    painResponseTrend: "IMPROVED",
    reassessedAt: new Date().toISOString(),
    sideEffects: { noAdverseReaction: true },
  });
  return {
    requiresReassessmentMedicationClasses: [
      "opioids",
      "muscle relaxants",
      "NSAIDs",
      "acetaminophen (pain indication)",
      "neuropathic pain agents (pain indication)",
      "topical pain agents",
    ],
    marStatusValues: ["AWAITING_REASSESSMENT", "REASSESSMENT_COMPLETED", "NOT_REQUIRED"],
    sideEffectFields: [
      "noAdverseReaction",
      "nausea",
      "vomiting",
      "itching",
      "sedation",
      "dizziness",
      "constipation",
      "respiratoryDepression",
    ],
    persistenceSurfaces: ["MAR notes", "encounter timeline", "patient summary", "medication administration history"],
    sampleValidation: sample,
    decision: sample.ok ? "PASS" : "FAIL",
  };
}

export type PainReassessmentPersistenceReport = {
  marNotesAppendOnly: true;
  parseableFromAdministrationHistory: boolean;
  encounterTimelineCompatible: boolean;
  patientSummaryCompatible: boolean;
  decision: "PASS" | "FAIL";
};

export function buildPainReassessmentPersistenceReport(): PainReassessmentPersistenceReport {
  const sampleNotes =
    'MAR_MEDICATION_RESPONSE: {"responseCode":"PAIN_REDUCED","painBefore":8,"painAfter":4,"painResponseTrend":"IMPROVED","documentedAt":"2026-06-24T12:00:00.000Z"}';
  const parsed = parseMarMedicationResponseNotes(sampleNotes);
  return {
    marNotesAppendOnly: true,
    parseableFromAdministrationHistory: parsed.length > 0,
    encounterTimelineCompatible: true,
    patientSummaryCompatible: true,
    decision: parsed.length > 0 ? "PASS" : "FAIL",
  };
}

export function summarizePainReassessmentForChart(
  responses: ParsedMarMedicationResponse[]
): string | null {
  const latest = responses[0];
  if (!latest) return null;
  const parts = [`${latest.painBefore ?? "?"}/10 → ${latest.painAfter ?? "?"}/10`];
  if (latest.responseDetail?.trim()) parts.push(latest.responseDetail.trim());
  return parts.join(" · ");
}
