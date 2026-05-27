/**
 * Phase 19T.1 — Web adapters for triage carry-forward (logic lives in @medora/shared).
 */
import type { ErTriageV1Form } from "./medoraErTriageV1";
import {
  attachTriageCarryForwardMetaToVitalsJson,
  emptyTriageCarryForwardDraft,
  evaluateCarryForwardReviewStatus,
  mergeCarryForwardIntoNewTriage,
  triageCarryForwardMetaFromVitalsJson,
  type TriageCarryForwardExtraction,
  type TriageCarryForwardMeta,
} from "@medora/shared";

export {
  attachTriageCarryForwardMetaToVitalsJson,
  buildTriageCarryForwardAuditMetadata,
  buildTriageCarryForwardSummary,
  evaluateCarryForwardReviewStatus,
  extractCarryForwardTriageHistory,
  mergeCarryForwardIntoNewTriage,
  triageCarryForwardMetaFromVitalsJson,
  TRIAGE_CARRY_FORWARD_META_KEY,
  TRIAGE_CARRY_FORWARD_VERSION,
  type TriageCarryForwardFieldKey,
  type TriageCarryForwardMeta,
  type TriageCarryForwardReviewStatus,
} from "@medora/shared";

export type TriagePanelCarryForwardFormSlice = {
  allergyNote: string;
  erV1: ErTriageV1Form;
};

export function triagePanelFormToCarryForwardDraft(form: TriagePanelCarryForwardFormSlice) {
  const d = emptyTriageCarryForwardDraft();
  d.allergyNote = form.allergyNote;
  d.erV1.medicationAllergiesDetail = form.erV1.medicationAllergiesDetail;
  d.erV1.foodAllergiesDetail = form.erV1.foodAllergiesDetail;
  d.erV1.additionalAllergyInfo = form.erV1.additionalAllergyInfo;
  d.erV1.allergyDetailSelections = [...form.erV1.allergyDetailSelections];
  d.erV1.medicationsSummary = form.erV1.medicationsSummary;
  d.erV1.medicationSummarySelections = [...form.erV1.medicationSummarySelections];
  d.erV1.pastMedicalHistory = form.erV1.pastMedicalHistory;
  d.erV1.pastSurgicalHistory = form.erV1.pastSurgicalHistory;
  d.erV1.smokingStatus = form.erV1.smokingStatus;
  d.erV1.alcoholUse = form.erV1.alcoholUse;
  d.erV1.marijuanaUse = form.erV1.marijuanaUse;
  d.erV1.stimulantUse = form.erV1.stimulantUse;
  d.erV1.opioidHeroinUse = form.erV1.opioidHeroinUse;
  d.erV1.historySocialComments = form.erV1.historySocialComments;
  d.erV1.socialHistorySelections = [...form.erV1.socialHistorySelections];
  return d;
}

export function applyCarryForwardDraftToTriagePanelForm(
  form: TriagePanelCarryForwardFormSlice,
  draft: ReturnType<typeof triagePanelFormToCarryForwardDraft>
): TriagePanelCarryForwardFormSlice {
  return {
    allergyNote: draft.allergyNote,
    erV1: {
      ...form.erV1,
      medicationAllergiesDetail: draft.erV1.medicationAllergiesDetail,
      foodAllergiesDetail: draft.erV1.foodAllergiesDetail,
      additionalAllergyInfo: draft.erV1.additionalAllergyInfo,
      allergyDetailSelections: [...draft.erV1.allergyDetailSelections],
      medicationsSummary: draft.erV1.medicationsSummary,
      medicationSummarySelections: [...draft.erV1.medicationSummarySelections],
      pastMedicalHistory: draft.erV1.pastMedicalHistory,
      pastSurgicalHistory: draft.erV1.pastSurgicalHistory,
      smokingStatus: draft.erV1.smokingStatus,
      alcoholUse: draft.erV1.alcoholUse,
      marijuanaUse: draft.erV1.marijuanaUse,
      stimulantUse: draft.erV1.stimulantUse,
      opioidHeroinUse: draft.erV1.opioidHeroinUse,
      historySocialComments: draft.erV1.historySocialComments,
      socialHistorySelections: [...draft.erV1.socialHistorySelections],
    },
  };
}

export function mergeCarryForwardApiPayloadIntoTriageForm(
  form: TriagePanelCarryForwardFormSlice,
  payload: {
    allergyNote?: string;
    fields?: Partial<ReturnType<typeof emptyTriageCarryForwardDraft>["erV1"]>;
    meta: TriageCarryForwardMeta;
  }
): { form: TriagePanelCarryForwardFormSlice; meta: TriageCarryForwardMeta; mergedFieldKeys: string[] } {
  const extraction: TriageCarryForwardExtraction = {
    allergyNote: payload.allergyNote,
    fields: payload.fields ?? {},
    appliedFieldKeys: Object.keys(payload.meta.fields) as TriageCarryForwardExtraction["appliedFieldKeys"],
  };
  const target = triagePanelFormToCarryForwardDraft(form);
  const { draft, meta, mergedFieldKeys } = mergeCarryForwardIntoNewTriage(target, extraction, {
    version: payload.meta.version,
    sourceEncounterId: payload.meta.sourceEncounterId,
    sourceEncounterDate: payload.meta.sourceEncounterDate,
    sourceFacilityId: payload.meta.sourceFacilityId,
    carriedForwardAt: payload.meta.carriedForwardAt,
    carriedForwardBy: payload.meta.carriedForwardBy,
  });
  return {
    form: applyCarryForwardDraftToTriagePanelForm(form, draft),
    meta,
    mergedFieldKeys,
  };
}

export function refreshCarryForwardReviewStatusFromForm(
  meta: TriageCarryForwardMeta | null,
  form: TriagePanelCarryForwardFormSlice,
  options?: { markReviewed?: boolean; reviewedBy?: string }
): TriageCarryForwardMeta | null {
  if (!meta) return null;
  return evaluateCarryForwardReviewStatus(meta, triagePanelFormToCarryForwardDraft(form), {
    markReviewed: options?.markReviewed,
    reviewedBy: options?.reviewedBy,
  });
}
