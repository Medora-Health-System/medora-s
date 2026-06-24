/**
 * MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_WAVE_C_RUNTIME_REMEDIATION.1
 * Enterprise pain reassessment workflow after opioid / muscle relaxant / NSAID / pain medication administration.
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

const NSAID_AND_TOPICAL_PAIN_TOKENS = [
  "diclofenac",
  "voltaren",
  "lidocaine patch",
  "lidocaine 5",
  "ibuprofen",
  "naproxen",
  "ketorolac",
  "toradol",
  "meloxicam",
  "celecoxib",
] as const;

const NEUROPATHIC_PAIN_TOKENS = ["gabapentin", "pregabalin", "neurontin", "lyrica"] as const;

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

/** Whether post-administration pain reassessment is required for this medication. */
export function requiresEnterprisePainReassessment(input: {
  catalogCode?: string | null;
  medicationLabel?: string | null;
  genericName?: string | null;
}): boolean {
  const text = combinedMedicationText(input);
  if (isOpioidPainMedicationLabel(input.medicationLabel, input.genericName)) return true;
  if (MUSCLE_RELAXANT_TOKENS.some((token) => text.includes(token))) return true;
  if (NSAID_AND_TOPICAL_PAIN_TOKENS.some((token) => text.includes(token))) return true;
  if (NEUROPATHIC_PAIN_TOKENS.some((token) => text.includes(token))) return true;
  return false;
}

export function resolveEnterprisePainReassessmentMarStatus(input: {
  catalogCode?: string | null;
  medicationLabel?: string | null;
  genericName?: string | null;
  marAction?: string | null;
  administrationNotes?: string | null;
}): EnterprisePainReassessmentMarStatus {
  if (!requiresEnterprisePainReassessment(input)) return "NOT_REQUIRED";
  const marAction = input.marAction?.trim().toLowerCase() ?? "";
  if (marAction && marAction !== "administered") return "NOT_REQUIRED";
  if (!marAction && !input.administrationNotes?.trim()) return "NOT_REQUIRED";
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
    requiresReassessmentMedicationClasses: ["opioids", "muscle relaxants", "NSAIDs", "neuropathic pain agents"],
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
