/**
 * Phase 19T.3 — Patient longitudinal clinical history profile (pure helpers).
 * Canonical patient-level history sourced from reviewed/reconciled encounter data only.
 */

import {
  emptyTriageCarryForwardDraft,
  fieldKeyToCarryForwardSection,
  sectionHasCarriedForwardFields,
  type TriageCarryForwardDraft,
  type TriageCarryForwardExtraction,
  type TriageCarryForwardFieldKey,
  type TriageCarryForwardMeta,
  type TriageCarryForwardSectionKey,
} from "../triage/triageCarryForward.js";

export const PATIENT_CLINICAL_HISTORY_PROFILE_VERSION = "19T.3" as const;

export type PatientHistoryProvenanceSourceType =
  | "reviewed_triage"
  | "manually_entered"
  | "reconciled_update";

export type PatientHistorySectionKey =
  | "allergies"
  | "homeMedications"
  | "medicalHistory"
  | "surgicalHistory"
  | "socialHistory";

export type PatientHistoryProvenance = {
  sourceEncounterId?: string;
  sourceEncounterDate?: string;
  sourceFacilityId?: string;
  sourceType: PatientHistoryProvenanceSourceType;
  lastReviewedAt?: string;
  reviewerId?: string;
};

export type PatientClinicalHistoryAllergies = {
  allergyNote?: string;
  medicationAllergiesDetail?: string;
  foodAllergiesDetail?: string;
  additionalAllergyInfo?: string;
  allergyDetailSelections?: string[];
};

export type PatientClinicalHistoryHomeMedications = {
  medicationsSummary?: string;
  medicationSummarySelections?: string[];
};

export type PatientClinicalHistoryMedical = {
  pastMedicalHistory?: string;
};

export type PatientClinicalHistorySurgical = {
  pastSurgicalHistory?: string;
};

export type PatientClinicalHistorySocial = {
  smokingStatus?: string;
  alcoholUse?: string;
  marijuanaUse?: string;
  stimulantUse?: string;
  opioidHeroinUse?: string;
  historySocialComments?: string;
  socialHistorySelections?: string[];
};

export type PatientClinicalHistoryProfile = {
  version: typeof PATIENT_CLINICAL_HISTORY_PROFILE_VERSION;
  updatedAt: string;
  updatedBy?: string;
  allergies?: PatientClinicalHistoryAllergies;
  homeMedications?: PatientClinicalHistoryHomeMedications;
  medicalHistory?: PatientClinicalHistoryMedical;
  surgicalHistory?: PatientClinicalHistorySurgical;
  socialHistory?: PatientClinicalHistorySocial;
  provenance: Partial<Record<PatientHistorySectionKey, PatientHistoryProvenance>>;
};

export type PatientHistoryReconciliationAction =
  | "promoted"
  | "skipped_pending"
  | "removed"
  | "unchanged";

export type PatientHistoryReconciliationResult = {
  profile: PatientClinicalHistoryProfile | null;
  sectionActions: Partial<Record<PatientHistorySectionKey, PatientHistoryReconciliationAction>>;
  changedSections: PatientHistorySectionKey[];
};

export type PatientHistoryReconciliationAuditMetadata = {
  patientId: string;
  encounterId: string;
  changedSections: PatientHistorySectionKey[];
  sectionActions: Partial<Record<PatientHistorySectionKey, PatientHistoryReconciliationAction>>;
  reviewerId?: string;
  timestamp: string;
};

const CARRY_FORWARD_SECTION_TO_PROFILE_SECTIONS: Record<
  TriageCarryForwardSectionKey,
  readonly PatientHistorySectionKey[]
> = {
  allergies: ["allergies"],
  homeMedications: ["homeMedications"],
  history: ["medicalHistory", "surgicalHistory"],
  socialHistory: ["socialHistory"],
};

const PROFILE_FIELD_TO_CARRY_FORWARD: Partial<
  Record<PatientHistorySectionKey, TriageCarryForwardFieldKey | TriageCarryForwardFieldKey[]>
> = {
  allergies: "allergies",
  homeMedications: "homeMedications",
  medicalHistory: "medicalHistory",
  surgicalHistory: "surgicalHistory",
  socialHistory: ["smokingHistory", "alcoholUse", "substanceUse"],
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function sectionContentFromDraft(
  draft: TriageCarryForwardDraft,
  section: PatientHistorySectionKey
): boolean {
  const er = draft.erV1;
  switch (section) {
    case "allergies":
      return Boolean(
        str(draft.allergyNote) ||
          str(er.medicationAllergiesDetail) ||
          str(er.foodAllergiesDetail) ||
          str(er.additionalAllergyInfo) ||
          er.allergyDetailSelections.length
      );
    case "homeMedications":
      return Boolean(str(er.medicationsSummary) || er.medicationSummarySelections.length);
    case "medicalHistory":
      return Boolean(str(er.pastMedicalHistory));
    case "surgicalHistory":
      return Boolean(str(er.pastSurgicalHistory));
    case "socialHistory":
      return Boolean(
        str(er.smokingStatus) ||
          str(er.alcoholUse) ||
          str(er.marijuanaUse) ||
          str(er.stimulantUse) ||
          str(er.opioidHeroinUse) ||
          str(er.historySocialComments) ||
          er.socialHistorySelections.length
      );
    default:
      return false;
  }
}

function extractSectionPayload(
  draft: TriageCarryForwardDraft,
  section: PatientHistorySectionKey
): PatientClinicalHistoryProfile[PatientHistorySectionKey] | undefined {
  const er = draft.erV1;
  switch (section) {
    case "allergies": {
      const payload: PatientClinicalHistoryAllergies = {};
      if (str(draft.allergyNote)) payload.allergyNote = draft.allergyNote.trim();
      if (str(er.medicationAllergiesDetail))
        payload.medicationAllergiesDetail = er.medicationAllergiesDetail.trim();
      if (str(er.foodAllergiesDetail)) payload.foodAllergiesDetail = er.foodAllergiesDetail.trim();
      if (str(er.additionalAllergyInfo)) payload.additionalAllergyInfo = er.additionalAllergyInfo.trim();
      if (er.allergyDetailSelections.length)
        payload.allergyDetailSelections = [...er.allergyDetailSelections];
      return Object.keys(payload).length ? payload : undefined;
    }
    case "homeMedications": {
      const payload: PatientClinicalHistoryHomeMedications = {};
      if (str(er.medicationsSummary)) payload.medicationsSummary = er.medicationsSummary.trim();
      if (er.medicationSummarySelections.length)
        payload.medicationSummarySelections = [...er.medicationSummarySelections];
      return Object.keys(payload).length ? payload : undefined;
    }
    case "medicalHistory": {
      if (!str(er.pastMedicalHistory)) return undefined;
      return { pastMedicalHistory: er.pastMedicalHistory.trim() };
    }
    case "surgicalHistory": {
      if (!str(er.pastSurgicalHistory)) return undefined;
      return { pastSurgicalHistory: er.pastSurgicalHistory.trim() };
    }
    case "socialHistory": {
      const payload: PatientClinicalHistorySocial = {};
      if (str(er.smokingStatus)) payload.smokingStatus = er.smokingStatus.trim();
      if (str(er.alcoholUse)) payload.alcoholUse = er.alcoholUse.trim();
      if (str(er.marijuanaUse)) payload.marijuanaUse = er.marijuanaUse.trim();
      if (str(er.stimulantUse)) payload.stimulantUse = er.stimulantUse.trim();
      if (str(er.opioidHeroinUse)) payload.opioidHeroinUse = er.opioidHeroinUse.trim();
      if (str(er.historySocialComments)) payload.historySocialComments = er.historySocialComments.trim();
      if (er.socialHistorySelections.length)
        payload.socialHistorySelections = [...er.socialHistorySelections];
      return Object.keys(payload).length ? payload : undefined;
    }
    default:
      return undefined;
  }
}

function carryForwardSectionForProfileSection(
  section: PatientHistorySectionKey
): TriageCarryForwardSectionKey {
  switch (section) {
    case "allergies":
      return "allergies";
    case "homeMedications":
      return "homeMedications";
    case "medicalHistory":
    case "surgicalHistory":
      return "history";
    case "socialHistory":
      return "socialHistory";
  }
}

function sectionWasCarriedForward(
  meta: TriageCarryForwardMeta | null | undefined,
  section: PatientHistorySectionKey
): boolean {
  if (!meta) return false;
  const cfSection = carryForwardSectionForProfileSection(section);
  if (!sectionHasCarriedForwardFields(meta, cfSection)) return false;
  const fieldKey = PROFILE_FIELD_TO_CARRY_FORWARD[section];
  if (!fieldKey) return false;
  if (Array.isArray(fieldKey)) return fieldKey.some((k) => meta.fields[k]);
  return Boolean(meta.fields[fieldKey]);
}

function carryForwardSectionStatus(
  meta: TriageCarryForwardMeta | null | undefined,
  section: PatientHistorySectionKey
): "pending_review" | "reviewed" | "modified" | "removed" | null {
  if (!meta) return null;
  const cfSection = carryForwardSectionForProfileSection(section);
  if (!sectionHasCarriedForwardFields(meta, cfSection)) return null;
  return meta.sectionStatus?.[cfSection] ?? meta.reviewStatus ?? "pending_review";
}

function resolveSourceType(
  meta: TriageCarryForwardMeta | null | undefined,
  section: PatientHistorySectionKey,
  carried: boolean
): PatientHistoryProvenanceSourceType {
  if (!carried) return "manually_entered";
  const status = carryForwardSectionStatus(meta, section);
  if (status === "modified") return "reconciled_update";
  return "reviewed_triage";
}

export function emptyPatientClinicalHistoryProfile(nowIso = new Date().toISOString()): PatientClinicalHistoryProfile {
  return {
    version: PATIENT_CLINICAL_HISTORY_PROFILE_VERSION,
    updatedAt: nowIso,
    provenance: {},
  };
}

export function patientClinicalHistoryProfileFromJson(
  raw: unknown
): PatientClinicalHistoryProfile | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const m = raw as Record<string, unknown>;
  if (m.version !== PATIENT_CLINICAL_HISTORY_PROFILE_VERSION) return null;
  if (typeof m.updatedAt !== "string") return null;
  return m as unknown as PatientClinicalHistoryProfile;
}

export function profileHasClinicalContent(profile: PatientClinicalHistoryProfile | null): boolean {
  if (!profile) return false;
  const draft = profileToTriageDraft(profile);
  return (
    sectionContentFromDraft(draft, "allergies") ||
    sectionContentFromDraft(draft, "homeMedications") ||
    sectionContentFromDraft(draft, "medicalHistory") ||
    sectionContentFromDraft(draft, "surgicalHistory") ||
    sectionContentFromDraft(draft, "socialHistory")
  );
}

export function profileToTriageDraft(profile: PatientClinicalHistoryProfile): TriageCarryForwardDraft {
  const draft = emptyTriageCarryForwardDraft();
  if (profile.allergies) {
    if (profile.allergies.allergyNote) draft.allergyNote = profile.allergies.allergyNote;
    if (profile.allergies.medicationAllergiesDetail)
      draft.erV1.medicationAllergiesDetail = profile.allergies.medicationAllergiesDetail;
    if (profile.allergies.foodAllergiesDetail)
      draft.erV1.foodAllergiesDetail = profile.allergies.foodAllergiesDetail;
    if (profile.allergies.additionalAllergyInfo)
      draft.erV1.additionalAllergyInfo = profile.allergies.additionalAllergyInfo;
    if (profile.allergies.allergyDetailSelections?.length)
      draft.erV1.allergyDetailSelections = [...profile.allergies.allergyDetailSelections];
  }
  if (profile.homeMedications) {
    if (profile.homeMedications.medicationsSummary)
      draft.erV1.medicationsSummary = profile.homeMedications.medicationsSummary;
    if (profile.homeMedications.medicationSummarySelections?.length)
      draft.erV1.medicationSummarySelections = [...profile.homeMedications.medicationSummarySelections];
  }
  if (profile.medicalHistory?.pastMedicalHistory)
    draft.erV1.pastMedicalHistory = profile.medicalHistory.pastMedicalHistory;
  if (profile.surgicalHistory?.pastSurgicalHistory)
    draft.erV1.pastSurgicalHistory = profile.surgicalHistory.pastSurgicalHistory;
  if (profile.socialHistory) {
    const s = profile.socialHistory;
    if (s.smokingStatus) draft.erV1.smokingStatus = s.smokingStatus;
    if (s.alcoholUse) draft.erV1.alcoholUse = s.alcoholUse;
    if (s.marijuanaUse) draft.erV1.marijuanaUse = s.marijuanaUse;
    if (s.stimulantUse) draft.erV1.stimulantUse = s.stimulantUse;
    if (s.opioidHeroinUse) draft.erV1.opioidHeroinUse = s.opioidHeroinUse;
    if (s.historySocialComments) draft.erV1.historySocialComments = s.historySocialComments;
    if (s.socialHistorySelections?.length)
      draft.erV1.socialHistorySelections = [...s.socialHistorySelections];
  }
  return draft;
}

export function profileToCarryForwardExtraction(
  profile: PatientClinicalHistoryProfile
): TriageCarryForwardExtraction | null {
  const draft = profileToTriageDraft(profile);
  const fields = draft.erV1;
  const appliedFieldKeys: TriageCarryForwardFieldKey[] = [];
  if (sectionContentFromDraft(draft, "allergies")) appliedFieldKeys.push("allergies");
  if (sectionContentFromDraft(draft, "homeMedications")) appliedFieldKeys.push("homeMedications");
  if (sectionContentFromDraft(draft, "medicalHistory")) appliedFieldKeys.push("medicalHistory");
  if (sectionContentFromDraft(draft, "surgicalHistory")) appliedFieldKeys.push("surgicalHistory");
  if (sectionContentFromDraft(draft, "socialHistory")) {
    if (str(fields.smokingStatus) || fields.socialHistorySelections.some((c) => c === "SMOKER" || c === "FORMER_SMOKER"))
      appliedFieldKeys.push("smokingHistory");
    if (str(fields.alcoholUse) || fields.socialHistorySelections.includes("ALCOHOL_USE"))
      appliedFieldKeys.push("alcoholUse");
    if (
      str(fields.marijuanaUse) ||
      str(fields.stimulantUse) ||
      str(fields.opioidHeroinUse) ||
      str(fields.historySocialComments) ||
      fields.socialHistorySelections.some((c) =>
        ["CANNABIS_USE", "OPIOID_USE", "STIMULANT_USE"].includes(c)
      )
    )
      appliedFieldKeys.push("substanceUse");
  }
  if (!appliedFieldKeys.length) return null;
  return {
    allergyNote: draft.allergyNote || undefined,
    fields: { ...fields },
    appliedFieldKeys,
  };
}

export function profilePrimaryProvenance(
  profile: PatientClinicalHistoryProfile
): PatientHistoryProvenance | null {
  const entries = Object.values(profile.provenance).filter(Boolean) as PatientHistoryProvenance[];
  if (!entries.length) return null;
  return entries.sort((a, b) =>
    (b.lastReviewedAt ?? b.sourceEncounterDate ?? "").localeCompare(
      a.lastReviewedAt ?? a.sourceEncounterDate ?? ""
    )
  )[0];
}

export function reconcileEncounterHistoryIntoPatientProfile(input: {
  currentProfile: PatientClinicalHistoryProfile | null;
  encounterDraft: TriageCarryForwardDraft;
  carryForwardMeta?: TriageCarryForwardMeta | null;
  encounterId: string;
  encounterDate: string;
  facilityId: string;
  reviewerId?: string;
  timestamp?: string;
  /** Sections explicitly cleared — allow profile removal for those sections. */
  confirmRemovedSections?: PatientHistorySectionKey[];
}): PatientHistoryReconciliationResult {
  const nowIso = input.timestamp ?? new Date().toISOString();
  const profile: PatientClinicalHistoryProfile = input.currentProfile
    ? { ...input.currentProfile, provenance: { ...input.currentProfile.provenance } }
    : emptyPatientClinicalHistoryProfile(nowIso);

  const sectionActions: Partial<Record<PatientHistorySectionKey, PatientHistoryReconciliationAction>> = {};
  const changedSections: PatientHistorySectionKey[] = [];
  const confirmRemoved = new Set(input.confirmRemovedSections ?? []);

  const allSections: PatientHistorySectionKey[] = [
    "allergies",
    "homeMedications",
    "medicalHistory",
    "surgicalHistory",
    "socialHistory",
  ];

  for (const section of allSections) {
    const carried = sectionWasCarriedForward(input.carryForwardMeta, section);
    const status = carryForwardSectionStatus(input.carryForwardMeta, section);
    const hasContent = sectionContentFromDraft(input.encounterDraft, section);
    const confirmRemove = confirmRemoved.has(section);

    if (carried && status === "pending_review") {
      sectionActions[section] = "skipped_pending";
      continue;
    }

    if (carried && status === "removed") {
      if (confirmRemove) {
        delete (profile as Record<string, unknown>)[section];
        delete profile.provenance[section];
        sectionActions[section] = "removed";
        changedSections.push(section);
      } else {
        sectionActions[section] = "skipped_pending";
      }
      continue;
    }

    if (!hasContent) {
      sectionActions[section] = "unchanged";
      continue;
    }

    if (carried && status !== "reviewed" && status !== "modified") {
      sectionActions[section] = "skipped_pending";
      continue;
    }

    const payload = extractSectionPayload(input.encounterDraft, section);
    if (!payload) {
      sectionActions[section] = "unchanged";
      continue;
    }

    (profile as Record<string, unknown>)[section] = payload;
    profile.provenance[section] = {
      sourceEncounterId: input.encounterId,
      sourceEncounterDate: input.encounterDate,
      sourceFacilityId: input.facilityId,
      sourceType: resolveSourceType(input.carryForwardMeta, section, carried),
      lastReviewedAt: nowIso,
      reviewerId: input.reviewerId,
    };
    sectionActions[section] = "promoted";
    changedSections.push(section);
  }

  profile.updatedAt = nowIso;
  profile.updatedBy = input.reviewerId;
  profile.version = PATIENT_CLINICAL_HISTORY_PROFILE_VERSION;

  const hasContent = profileHasClinicalContent(profile);
  return {
    profile: hasContent ? profile : null,
    sectionActions,
    changedSections,
  };
}

export function buildPatientHistoryReconciliationAuditMetadata(input: {
  patientId: string;
  encounterId: string;
  result: PatientHistoryReconciliationResult;
  reviewerId?: string;
  timestamp?: string;
}): PatientHistoryReconciliationAuditMetadata {
  return {
    patientId: input.patientId,
    encounterId: input.encounterId,
    changedSections: input.result.changedSections,
    sectionActions: input.result.sectionActions,
    reviewerId: input.reviewerId,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}

export type PatientHistoryProfileDiffKind =
  | "matches"
  | "differs"
  | "new_in_encounter"
  | "removed_from_profile";

export type PatientHistoryProfileDiff = {
  section: PatientHistorySectionKey;
  kind: PatientHistoryProfileDiffKind;
};

export function compareEncounterDraftWithProfile(
  profile: PatientClinicalHistoryProfile | null,
  encounterDraft: TriageCarryForwardDraft
): PatientHistoryProfileDiff[] {
  const sections: PatientHistorySectionKey[] = [
    "allergies",
    "homeMedications",
    "medicalHistory",
    "surgicalHistory",
    "socialHistory",
  ];
  const out: PatientHistoryProfileDiff[] = [];
  for (const section of sections) {
    const profileDraft = profile ? profileToTriageDraft(profile) : emptyTriageCarryForwardDraft();
    const profileHas = sectionContentFromDraft(profileDraft, section);
    const encounterHas = sectionContentFromDraft(encounterDraft, section);
    const profileSnap = JSON.stringify(extractSectionPayload(profileDraft, section) ?? {});
    const encounterSnap = JSON.stringify(extractSectionPayload(encounterDraft, section) ?? {});

    if (!profileHas && encounterHas) {
      out.push({ section, kind: "new_in_encounter" });
    } else if (profileHas && !encounterHas) {
      out.push({ section, kind: "removed_from_profile" });
    } else if (profileHas && encounterHas && profileSnap !== encounterSnap) {
      out.push({ section, kind: "differs" });
    } else {
      out.push({ section, kind: "matches" });
    }
  }
  return out;
}

export function buildPatientClinicalHistorySummary(profile: PatientClinicalHistoryProfile | null): {
  hasProfile: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  sections: Array<{
    section: PatientHistorySectionKey;
    lastReviewedAt: string | null;
    sourceEncounterDate: string | null;
    sourceType: PatientHistoryProvenanceSourceType | null;
  }>;
} {
  if (!profile) {
    return { hasProfile: false, updatedAt: null, updatedBy: null, sections: [] };
  }
  const sections: PatientHistorySectionKey[] = [
    "allergies",
    "homeMedications",
    "medicalHistory",
    "surgicalHistory",
    "socialHistory",
  ];
  return {
    hasProfile: profileHasClinicalContent(profile),
    updatedAt: profile.updatedAt,
    updatedBy: profile.updatedBy ?? null,
    sections: sections
      .filter((s) => profile[s] != null)
      .map((section) => {
        const prov = profile.provenance[section];
        return {
          section,
          lastReviewedAt: prov?.lastReviewedAt ?? null,
          sourceEncounterDate: prov?.sourceEncounterDate ?? null,
          sourceType: prov?.sourceType ?? null,
        };
      }),
  };
}

/** Map carry-forward field keys back to profile sections (for backward compat checks). */
export function carryForwardFieldToProfileSection(
  key: TriageCarryForwardFieldKey
): PatientHistorySectionKey {
  const cfSection = fieldKeyToCarryForwardSection(key);
  return CARRY_FORWARD_SECTION_TO_PROFILE_SECTIONS[cfSection][0] ?? "allergies";
}
