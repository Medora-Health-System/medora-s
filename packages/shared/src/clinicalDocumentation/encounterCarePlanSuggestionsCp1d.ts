/**
 * MEDUI.CP.1D — Care Plan clinical intelligence (suggestions only).
 *
 * Detect / surface / suggest / remind. Never auto-activates plans, orders, MAR,
 * diagnoses, or lifecycle transitions. Pure projector over authoritative signals.
 */

import {
  MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
  MOBILITY_AMBULATION_ASSESSMENT_CARD_ID,
} from "./fallRiskSafetyDocumentationPayloads.js";
import { BRADEN_RISK_ASSESSMENT_CARD_ID } from "./skinWoundPressureInjuryDocumentationPayloads.js";
import { STROKE_SWALLOW_SCREEN_CARD_ID } from "./strokeDocumentationPayloads.js";

export const CARE_PLAN_SUGGESTION_TEMPLATE_IDS = [
  "fall_risk",
  "impaired_mobility",
  "pressure_injury_risk",
  "aspiration_risk",
] as const;

export type CarePlanSuggestionTemplateId = (typeof CARE_PLAN_SUGGESTION_TEMPLATE_IDS)[number];

export type CarePlanSuggestionKind = "SUGGEST_ACTIVATE" | "SUGGEST_REVIEW";

/** Clinician-facing reason keys — resolve via i18n; never expose rule IDs. */
export type CarePlanSuggestionReasonKey =
  | "fallRiskNursingAssessment"
  | "fallRiskMorseAssessment"
  | "mobilityAssessment"
  | "pressureInjuryBraden"
  | "aspirationSwallowFailed"
  | "activePlanReviewFallRisk"
  | "activePlanReviewPressureInjury"
  | "activePlanReviewMobility"
  | "activePlanReviewAspiration";

export type CarePlanSuggestionSourceKind =
  | "NURSING_ASSESSMENT"
  | "FALL_RISK_ASSESSMENT"
  | "MOBILITY_ASSESSMENT"
  | "SKIN_ASSESSMENT"
  | "SWALLOW_ASSESSMENT";

export type CarePlanSuggestionV1 = {
  templateId: CarePlanSuggestionTemplateId;
  kind: CarePlanSuggestionKind;
  reasonKey: CarePlanSuggestionReasonKey;
  sourceKind: CarePlanSuggestionSourceKind;
};

export type CarePlanSuggestionClinicalDocSignal = {
  cardId: string;
  payload: Record<string, unknown> | null | undefined;
  documentedAt?: string | Date | null;
  voidedAt?: string | Date | null;
};

export type CarePlanSuggestionNursingAssessmentSignal = {
  fallRiskLevel?: string | null;
  documentedAt?: string | Date | null;
};

export type CarePlanSuggestionActivePlan = {
  templateId?: string | null;
  status?: string | null;
};

export type SuggestEncounterCarePlansInput = {
  activePlans?: ReadonlyArray<CarePlanSuggestionActivePlan> | null;
  clinicalDocs?: ReadonlyArray<CarePlanSuggestionClinicalDocSignal> | null;
  nursingAssessment?: CarePlanSuggestionNursingAssessmentSignal | null;
  /** Session-only dismissals (no durable suggestion store in CP.1D). */
  dismissedTemplateIds?: ReadonlyArray<string> | null;
};

const CURRENT_STATUSES = new Set(["ACTIVE", "ON_HOLD", "UNDER_REVIEW", "DRAFT"]);

function isCurrentPlan(status: string | null | undefined): boolean {
  return CURRENT_STATUSES.has(String(status ?? "").toUpperCase());
}

function latestNonVoided(
  docs: ReadonlyArray<CarePlanSuggestionClinicalDocSignal>,
  cardId: string
): CarePlanSuggestionClinicalDocSignal | null {
  const matches = docs
    .filter((d) => d.cardId === cardId && !d.voidedAt)
    .slice()
    .sort((a, b) => {
      const ta = a.documentedAt ? new Date(a.documentedAt).getTime() : 0;
      const tb = b.documentedAt ? new Date(b.documentedAt).getTime() : 0;
      return tb - ta;
    });
  return matches[0] ?? null;
}

function asLevel(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function morseElevated(level: string): boolean {
  return level === "HIGH" || level === "MODERATE";
}

function nursingFallElevated(level: string): boolean {
  return level === "HIGH" || level === "MODERATE";
}

function bradenElevated(level: string): boolean {
  return level === "VERY_HIGH" || level === "HIGH" || level === "MODERATE";
}

function mobilityImpaired(payload: Record<string, unknown>): boolean {
  const level = asLevel(payload.mobilityLevel);
  const gait = asLevel(payload.gaitStability ?? payload.gait);
  if (
    level === "ONE_PERSON_ASSIST" ||
    level === "TWO_PERSON_ASSIST" ||
    level === "TOTAL_ASSIST"
  ) {
    return true;
  }
  return gait === "UNSTEADY" || gait === "SEVERELY_IMPAIRED";
}

function swallowFailed(payload: Record<string, unknown>): boolean {
  return asLevel(payload.result) === "FAILED";
}

/**
 * Project Care Plan suggestions from authoritative structured signals.
 * Does not mutate Care Plans. Does not invent diagnoses.
 */
export function suggestEncounterCarePlans(
  input: SuggestEncounterCarePlansInput
): CarePlanSuggestionV1[] {
  const docs = input.clinicalDocs ?? [];
  const dismissed = new Set(
    (input.dismissedTemplateIds ?? []).map((id) => String(id).trim()).filter(Boolean)
  );
  const currentByTemplate = new Map<string, CarePlanSuggestionActivePlan>();
  for (const plan of input.activePlans ?? []) {
    const tid = typeof plan.templateId === "string" ? plan.templateId : "";
    if (!tid || !isCurrentPlan(plan.status)) continue;
    if (!currentByTemplate.has(tid)) currentByTemplate.set(tid, plan);
  }

  const out: CarePlanSuggestionV1[] = [];

  const pushActivateOrReview = (
    templateId: CarePlanSuggestionTemplateId,
    activateReason: CarePlanSuggestionReasonKey,
    reviewReason: CarePlanSuggestionReasonKey,
    sourceKind: CarePlanSuggestionSourceKind
  ) => {
    if (dismissed.has(templateId)) return;
    if (currentByTemplate.has(templateId)) {
      out.push({
        templateId,
        kind: "SUGGEST_REVIEW",
        reasonKey: reviewReason,
        sourceKind,
      });
      return;
    }
    out.push({
      templateId,
      kind: "SUGGEST_ACTIVATE",
      reasonKey: activateReason,
      sourceKind,
    });
  };

  // Fall risk — prefer Morse; fallback to inpatient nursing assessment level.
  const morse = latestNonVoided(docs, MORSE_FALL_RISK_ASSESSMENT_CARD_ID);
  const morseLevel = morse?.payload ? asLevel(morse.payload.riskLevel) : "";
  const nursingLevel = asLevel(input.nursingAssessment?.fallRiskLevel);
  if (morse && morseElevated(morseLevel)) {
    pushActivateOrReview(
      "fall_risk",
      "fallRiskMorseAssessment",
      "activePlanReviewFallRisk",
      "FALL_RISK_ASSESSMENT"
    );
  } else if (!morse && nursingFallElevated(nursingLevel)) {
    // Stale/absent Morse: nursing assessment may still qualify.
    pushActivateOrReview(
      "fall_risk",
      "fallRiskNursingAssessment",
      "activePlanReviewFallRisk",
      "NURSING_ASSESSMENT"
    );
  }
  // If Morse exists and is LOW — no fall suggestion (staleness / reevaluation).

  // Pressure injury — Braden MODERATE+
  const braden = latestNonVoided(docs, BRADEN_RISK_ASSESSMENT_CARD_ID);
  const bradenLevel = braden?.payload ? asLevel(braden.payload.riskLevel) : "";
  if (braden && bradenElevated(bradenLevel)) {
    pushActivateOrReview(
      "pressure_injury_risk",
      "pressureInjuryBraden",
      "activePlanReviewPressureInjury",
      "SKIN_ASSESSMENT"
    );
  }

  // Impaired mobility — EDOC mobility/ambulation
  const mobility = latestNonVoided(docs, MOBILITY_AMBULATION_ASSESSMENT_CARD_ID);
  if (mobility?.payload && mobilityImpaired(mobility.payload)) {
    pushActivateOrReview(
      "impaired_mobility",
      "mobilityAssessment",
      "activePlanReviewMobility",
      "MOBILITY_ASSESSMENT"
    );
  }

  // Aspiration — stroke swallow FAILED only (no free-text inference)
  const swallow = latestNonVoided(docs, STROKE_SWALLOW_SCREEN_CARD_ID);
  if (swallow?.payload && swallowFailed(swallow.payload)) {
    pushActivateOrReview(
      "aspiration_risk",
      "aspirationSwallowFailed",
      "activePlanReviewAspiration",
      "SWALLOW_ASSESSMENT"
    );
  }

  return out;
}

/** Card IDs the Care Plan list endpoint should batch-load for suggestions. */
export const CARE_PLAN_SUGGESTION_SIGNAL_CARD_IDS = [
  MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
  MOBILITY_AMBULATION_ASSESSMENT_CARD_ID,
  BRADEN_RISK_ASSESSMENT_CARD_ID,
  STROKE_SWALLOW_SCREEN_CARD_ID,
] as const;
