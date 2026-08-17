/**
 * MEDUI.INP.2B — Read-only Overview projection from nursing admission JSON.
 * Does not create a new persistence authority.
 */

import {
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  computeAdmissionCompletionSummary,
  type MedSurgNursingAdmissionDocV1,
} from "./medSurgNursingAdmissionD4a1.js";

function ans(
  doc: MedSurgNursingAdmissionDocV1 | null | undefined,
  sectionId: string,
  key: string
): string | null {
  const v = doc?.sections?.[sectionId as keyof typeof doc.sections]?.answers?.[key];
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (Array.isArray(v) && v.length) return v.map(String).filter(Boolean).join(", ");
  return null;
}

function yn(doc: MedSurgNursingAdmissionDocV1 | null | undefined, sectionId: string, key: string) {
  return ans(doc, sectionId, key);
}

export type NursingAdmissionOverviewProjectionV1 = {
  availability: "READY" | "EMPTY";
  completeCount: number;
  totalSections: number;
  allRequiredComplete: boolean;
  signed: boolean;
  admissionSource: string | null;
  modeOfArrival: string | null;
  language: string | null;
  interpreterNeeded: string | null;
  historyReviewed: string | null;
  allergyReviewed: string | null;
  homeMedReviewed: string | null;
  advanceDirective: string | null;
  fallRiskConcern: string | null;
  mobilityBaseline: string | null;
  skinBaseline: string | null;
  nutritionConcern: string | null;
  eliminationBaseline: string | null;
  psychosocialBarrier: string | null;
  educationBarrier: string | null;
  preAdmissionResidence: string | null;
  dischargeBaselineFlag: string | null;
};

export function projectNursingAdmissionOverview(
  doc: MedSurgNursingAdmissionDocV1 | null | undefined
): NursingAdmissionOverviewProjectionV1 {
  if (!doc) {
    return {
      availability: "EMPTY",
      completeCount: 0,
      totalSections: INPATIENT_ADMISSION_CLINICAL_SECTIONS.length,
      allRequiredComplete: false,
      signed: false,
      admissionSource: null,
      modeOfArrival: null,
      language: null,
      interpreterNeeded: null,
      historyReviewed: null,
      allergyReviewed: null,
      homeMedReviewed: null,
      advanceDirective: null,
      fallRiskConcern: null,
      mobilityBaseline: null,
      skinBaseline: null,
      nutritionConcern: null,
      eliminationBaseline: null,
      psychosocialBarrier: null,
      educationBarrier: null,
      preAdmissionResidence: null,
      dischargeBaselineFlag: null,
    };
  }
  const summary = computeAdmissionCompletionSummary(doc);
  const historyReviewed =
    yn(doc, "MEDICAL_HISTORY", "rapidHistoryReviewed") ??
    yn(doc, "MEDICAL_HISTORY", "historyReviewedStatus");
  const allergyReviewed =
    yn(doc, "ALLERGIES", "rapidAllergyReviewed") ?? yn(doc, "ALLERGIES", "allergyReviewedStatus");
  const homeMedReviewed =
    yn(doc, "HOME_MEDICATIONS", "rapidHomeMedReviewed") ??
    yn(doc, "HOME_MEDICATIONS", "medicationHistorySource");
  const hasAny =
    Boolean(ans(doc, "OVERVIEW", "admissionSource")) ||
    Boolean(ans(doc, "OVERVIEW", "modeOfArrival")) ||
    summary.complete > 0 ||
    Boolean(doc.nurseSignature?.signed);

  return {
    availability: hasAny ? "READY" : "EMPTY",
    completeCount: summary.complete,
    totalSections: summary.total,
    allRequiredComplete: summary.allRequiredComplete,
    signed: Boolean(doc.nurseSignature?.signed),
    admissionSource: ans(doc, "OVERVIEW", "admissionSource"),
    modeOfArrival: ans(doc, "OVERVIEW", "modeOfArrival"),
    language: ans(doc, "OVERVIEW", "language"),
    interpreterNeeded: ans(doc, "OVERVIEW", "interpreterNeeded"),
    historyReviewed,
    allergyReviewed,
    homeMedReviewed,
    advanceDirective: yn(doc, "SOCIAL_HISTORY", "advanceDirectiveKnown"),
    fallRiskConcern:
      ans(doc, "FALL_SAFETY", "rapidFallPrecautions") ??
      yn(doc, "FALL_SAFETY", "fallRiskPresent"),
    mobilityBaseline:
      ans(doc, "FUNCTIONAL_MOBILITY", "rapidMobility") ??
      ans(doc, "FUNCTIONAL_MOBILITY", "assistanceLevel"),
    skinBaseline:
      ans(doc, "SKIN_WOUND", "rapidSkinStatus") ?? yn(doc, "SKIN_WOUND", "skinIntact"),
    nutritionConcern:
      yn(doc, "NUTRITION", "rapidNutritionOk") ?? yn(doc, "NUTRITION", "swallowingDifficulty"),
    eliminationBaseline:
      yn(doc, "ELIMINATION", "rapidEliminationOk") ??
      ans(doc, "ELIMINATION", "continenceStatus"),
    psychosocialBarrier:
      yn(doc, "PSYCHOSOCIAL", "rapidSocialWorkNeed") ??
      yn(doc, "PSYCHOSOCIAL", "housingConcern"),
    educationBarrier:
      yn(doc, "EDUCATION_COMMUNICATION", "barriersToLearning") ??
      yn(doc, "EDUCATION_COMMUNICATION", "readinessToLearn"),
    preAdmissionResidence:
      ans(doc, "PSYCHOSOCIAL", "rapidPreAdmissionResidence") ??
      ans(doc, "PSYCHOSOCIAL", "livingSituation"),
    dischargeBaselineFlag:
      yn(doc, "PSYCHOSOCIAL", "rapidCaseManagementNeed") ??
      yn(doc, "PROVIDER_ADMISSION", "dischargePlanningStarted"),
  };
}
