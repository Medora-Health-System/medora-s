/**
 * MEDUI.INP.2B — Read-only Overview projection from nursing admission JSON.
 * Does not create a new persistence authority.
 */

import {
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  type InpatientAdmissionClinicalSection,
} from "./connectedInpatientAdmissionIntakeD4a0.js";
import {
  computeAdmissionCompletionSummary,
  type MedSurgNursingAdmissionDocV1,
} from "./medSurgNursingAdmissionD4a1.js";
import {
  NURSING_ADMISSION_STAGES,
  nursingAdmissionStageForSection,
  type NursingAdmissionStageId,
} from "./inpatientWorkspaceRecoveryD4a27b.js";

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
  clinicalDocumentedAt: string | null;
  authorUserId: string | null;
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
  painStatus: string | null;
  safetyConcern: string | null;
  devicesConfirmed: string | null;
  unresolvedSectionCount: number;
  conditionOnArrival: string | null;
};

export type NursingAdmissionRailSummaryV1 = {
  completeCount: number;
  totalSections: number;
  currentStageId: NursingAdmissionStageId | null;
  currentSectionId: InpatientAdmissionClinicalSection | null;
  unresolvedSectionCount: number;
  clinicalDocumentedAt: string | null;
  signed: boolean;
  painStatus: string | null;
  safetyConcern: string | null;
  devicesConfirmed: string | null;
  conditionOnArrival: string | null;
  admissionAssessmentComplete: boolean;
};

function painStatusFromDoc(doc: MedSurgNursingAdmissionDocV1): string | null {
  const rapid = ans(doc, "PAIN", "rapidPainPresence");
  if (rapid) return rapid;
  const present = yn(doc, "PAIN", "painPresent");
  if (present === "YES") {
    const score = ans(doc, "PAIN", "score");
    return score ? `PAIN_${score}` : "PAIN_PRESENT";
  }
  if (present === "NO") return "NO_PAIN";
  if (present === "UNKNOWN") return "UNABLE_TO_ASSESS";
  return null;
}

function safetyConcernFromDoc(doc: MedSurgNursingAdmissionDocV1): string | null {
  return (
    yn(doc, "NURSING_ADMISSION_ASSESSMENT", "immediateSafetyConcern") ??
    yn(doc, "FALL_SAFETY", "fallPriorMonths") ??
    ans(doc, "FALL_SAFETY", "rapidFallPrecautions")
  );
}

function devicesConfirmedFromDoc(doc: MedSurgNursingAdmissionDocV1): string | null {
  return (
    yn(doc, "LINES_DRAINS_DEVICES", "rapidDevicesConfirmed") ??
    yn(doc, "LINES_DRAINS_DEVICES", "devicesPresent")
  );
}

function unresolvedCount(doc: MedSurgNursingAdmissionDocV1): number {
  const summary = computeAdmissionCompletionSummary(doc);
  return summary.notStarted + summary.inProgress + summary.unable;
}

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
      clinicalDocumentedAt: null,
      authorUserId: null,
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
      painStatus: null,
      safetyConcern: null,
      devicesConfirmed: null,
      unresolvedSectionCount: 0,
      conditionOnArrival: null,
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
    clinicalDocumentedAt: doc.clinicalDocumentedAt ?? null,
    authorUserId: doc.updatedByUserId ?? null,
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
    painStatus: painStatusFromDoc(doc),
    safetyConcern: safetyConcernFromDoc(doc),
    devicesConfirmed: devicesConfirmedFromDoc(doc),
    unresolvedSectionCount: unresolvedCount(doc),
    conditionOnArrival: ans(doc, "OVERVIEW", "conditionOnArrival"),
  };
}

export function projectNursingAdmissionRailSummary(input: {
  doc: MedSurgNursingAdmissionDocV1 | null | undefined;
  activeSectionId?: InpatientAdmissionClinicalSection | null;
}): NursingAdmissionRailSummaryV1 {
  const overview = projectNursingAdmissionOverview(input.doc);
  const stage = input.activeSectionId
    ? nursingAdmissionStageForSection(input.activeSectionId)
    : null;
  const assessmentState =
    input.doc?.sections?.NURSING_ADMISSION_ASSESSMENT?.completionState ?? "NOT_STARTED";
  return {
    completeCount: overview.completeCount,
    totalSections: overview.totalSections,
    currentStageId: (stage?.id ?? null) as NursingAdmissionStageId | null,
    currentSectionId: input.activeSectionId ?? null,
    unresolvedSectionCount: overview.unresolvedSectionCount,
    clinicalDocumentedAt: overview.clinicalDocumentedAt,
    signed: overview.signed,
    painStatus: overview.painStatus,
    safetyConcern: overview.safetyConcern,
    devicesConfirmed: overview.devicesConfirmed,
    conditionOnArrival: overview.conditionOnArrival,
    admissionAssessmentComplete: assessmentState === "COMPLETE" || assessmentState === "NOT_APPLICABLE",
  };
}

export function nursingAdmissionStageGroupStatus(
  doc: MedSurgNursingAdmissionDocV1 | null | undefined,
  stageId: NursingAdmissionStageId
): "COMPLETE" | "IN_PROGRESS" | "NOT_STARTED" | "UNABLE_TO_COMPLETE" | "NOT_APPLICABLE" {
  const stage = NURSING_ADMISSION_STAGES.find((s) => s.id === stageId);
  if (!doc || !stage) return "NOT_STARTED";
  const states = stage.sectionKeys.map(
    (id) => doc.sections[id as InpatientAdmissionClinicalSection]?.completionState ?? "NOT_STARTED"
  );
  if (states.every((s) => s === "NOT_STARTED")) return "NOT_STARTED";
  if (states.every((s) => s === "COMPLETE" || s === "NOT_APPLICABLE")) return "COMPLETE";
  if (states.every((s) => s === "NOT_APPLICABLE")) return "NOT_APPLICABLE";
  if (states.some((s) => s === "UNABLE_TO_COMPLETE") && !states.some((s) => s === "IN_PROGRESS")) {
    return "UNABLE_TO_COMPLETE";
  }
  return "IN_PROGRESS";
}

export function nursingAdmissionOutstandingSections(
  doc: MedSurgNursingAdmissionDocV1 | null | undefined
): InpatientAdmissionClinicalSection[] {
  if (!doc) return [];
  return INPATIENT_ADMISSION_CLINICAL_SECTIONS.filter((id) => {
    const st = doc.sections[id]?.completionState ?? "NOT_STARTED";
    return st !== "COMPLETE" && st !== "NOT_APPLICABLE";
  });
}
