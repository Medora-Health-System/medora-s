/**
 * D4A.1 — Medical/Surgical nursing admission & structured clinical assessment engine.
 *
 * Enterprise longitudinal documentation foundation (zero schema migration):
 * - Patient owns longitudinal history (Patient.clinicalHistoryProfileJson).
 * - Encounter owns verification, interpretation, reassessment, findings, signatures.
 * - Durable admission documentation lives under admissionSummaryJson.medSurgNursingAdmissionV1.
 *
 * NEVER duplicate patient history into every encounter.
 * NEVER auto-convert home medications into inpatient MAR/orders.
 */

import {
  ADMISSION_HISTORY_VERIFICATION_STATUSES,
  ADMISSION_SECTION_COMPLETION_STATES,
  BELONGINGS_CATEGORIES,
  BELONGINGS_DISPOSITIONS,
  HOME_MEDICATION_RECON_STATUSES,
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  admissionDocumentationSupportsSaveAndResume,
  homeMedicationsMustNotAutoConvertToInpatientOrders,
  preloadedHistoryMustRetainProvenance,
  preloadedHistoryRequiresVerification,
  sumCashDenominationTotal,
  type AdmissionHistoryVerificationStatus,
  type AdmissionSectionCompletionState,
  type BelongingsDisposition,
  type BelongingsInventoryItemV1,
  type CashDenominationCountV1,
  type InpatientAdmissionClinicalSection,
  type AdmissionWoundEntryV1,
} from "./connectedInpatientAdmissionIntakeD4a0.js";
import type {
  PatientClinicalHistoryProfile,
  PatientHistorySectionKey,
} from "../patient/patientClinicalHistoryProfile.js";

export const MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID =
  "MEDUI.MEDSURG_NURSING_ADMISSION.D4A1" as const;

export const MED_SURG_NURSING_ADMISSION_KEY = "medSurgNursingAdmissionV1" as const;

export const MED_SURG_NURSING_ADMISSION_DOC_VERSION = 1 as const;

/** Prefixed domains preloaded into admission with mandatory provenance. */
export const ADMISSION_PRELOAD_DOMAINS = [
  "MEDICAL_HISTORY",
  "SURGICAL_HISTORY",
  "ALLERGIES",
  "HOME_MEDICATIONS",
  "SMOKING",
  "ALCOHOL",
  "RECREATIONAL_DRUGS",
  "PREFERRED_LANGUAGE",
  "COMMUNICATION_NEEDS",
  "EXISTING_WOUNDS",
  "EXISTING_DEVICES",
  "ISOLATION",
  "CODE_STATUS",
  "ADVANCED_DIRECTIVES",
  "MOBILITY_BASELINE",
  "FALL_RISK",
] as const;

export type AdmissionPreloadDomain = (typeof ADMISSION_PRELOAD_DOMAINS)[number];

export type AdmissionProvenanceV1 = {
  sourceType:
    | "PATIENT_PROFILE"
    | "ED_ENCOUNTER"
    | "SOURCE_ENCOUNTER"
    | "MANUAL_ENTRY"
    | "PRIOR_ADMISSION"
    | "UNKNOWN";
  sourceEncounterId?: string | null;
  sourceLabel?: string | null;
  recordedByUserId?: string | null;
  recordedAt?: string | null;
  verified: boolean;
  verifiedByUserId?: string | null;
  verifiedAt?: string | null;
  verificationStatus: AdmissionHistoryVerificationStatus;
};

export type PreloadedHistoryItemV1 = {
  itemId: string;
  domain: AdmissionPreloadDomain;
  displayLabel: string;
  valueText?: string | null;
  provenance: AdmissionProvenanceV1;
  /** Encounter-local note — never overwrites patient longitudinal record silently. */
  encounterNote?: string | null;
};

export type HomeMedicationReconciliationLineV1 = {
  lineId: string;
  medicationLabel: string;
  strength?: string | null;
  dose?: string | null;
  route?: string | null;
  frequency?: string | null;
  indication?: string | null;
  lastDoseAt?: string | null;
  source?: string | null;
  status: (typeof HOME_MEDICATION_RECON_STATUSES)[number];
  provenance: AdmissionProvenanceV1;
  /** Explicit: recon decisions must never create inpatient orders/MAR rows. */
  createsInpatientOrder: false;
};

export type HeadToToeSystemKey =
  | "NEUROLOGIC"
  | "HEENT"
  | "RESPIRATORY"
  | "CARDIOVASCULAR"
  | "GI"
  | "GU"
  | "MUSCULOSKELETAL"
  | "SKIN"
  | "ENDOCRINE"
  | "PSYCHOSOCIAL"
  | "PAIN"
  | "SAFETY"
  | "EDUCATION";

export const HEAD_TO_TOE_SYSTEM_KEYS: readonly HeadToToeSystemKey[] = [
  "NEUROLOGIC",
  "HEENT",
  "RESPIRATORY",
  "CARDIOVASCULAR",
  "GI",
  "GU",
  "MUSCULOSKELETAL",
  "SKIN",
  "ENDOCRINE",
  "PSYCHOSOCIAL",
  "PAIN",
  "SAFETY",
  "EDUCATION",
] as const;

/** Maps assessment systems to existing Medora EDOC / nursing domain reuse hints. */
export const HEAD_TO_TOE_REUSE_DOMAIN: Record<HeadToToeSystemKey, string> = {
  NEUROLOGIC: "EDOC14_NEURO / NIHSS",
  HEENT: "EDOC_HEENT",
  RESPIRATORY: "EDOC_RESPIRATORY",
  CARDIOVASCULAR: "EDOC_CARDIOVASCULAR",
  GI: "EDOC_GI",
  GU: "EDOC_GU",
  MUSCULOSKELETAL: "EDOC_MSK",
  SKIN: "EDOC20_SKIN",
  ENDOCRINE: "EDOC_ENDOCRINE",
  PSYCHOSOCIAL: "EDOC16_BEHAVIORAL",
  PAIN: "EDOC13_PAIN",
  SAFETY: "EDOC14_FALL_SAFETY",
  EDUCATION: "EDOC22_PATIENT_EDUCATION",
};

export type HeadToToeAssessmentEntryV1 = {
  system: HeadToToeSystemKey;
  findingsText?: string | null;
  status: AdmissionSectionCompletionState;
  reuseDomain: string;
  documentedByUserId?: string | null;
  documentedAt?: string | null;
};

export type AdmissionNurseSignatureV1 = {
  signed: boolean;
  signedAt?: string | null;
  signedByUserId?: string | null;
  credentials?: string | null;
  displayName?: string | null;
  amendmentOfSignatureId?: string | null;
  expectedVersionAtSign?: number | null;
};

export type ProviderAdmissionHandoffV1 = {
  taskId: string;
  status: "PENDING" | "ACKNOWLEDGED" | "IN_PROGRESS" | "COMPLETE" | "CANCELLED";
  createdAt: string;
  createdByUserId: string;
  outstandingSectionIds: InpatientAdmissionClinicalSection[];
  includesVerifiedHistories: boolean;
  includesVerifiedMedications: boolean;
  includesVerifiedAllergies: boolean;
  includesAdmissionAssessment: boolean;
};

export type AdmissionSectionDocumentV1 = {
  sectionId: InpatientAdmissionClinicalSection;
  completionState: AdmissionSectionCompletionState;
  expectedVersion: number;
  draftText?: string | null;
  /** D4A.2.5 — structured field answers (additive; never auto-filled on open). */
  answers?: Record<string, unknown> | null;
  /** Required when completionState is UNABLE_TO_COMPLETE. */
  unableReason?: string | null;
  updatedAt?: string | null;
  updatedByUserId?: string | null;
};

export type MedSurgNursingAdmissionDocV1 = {
  version: typeof MED_SURG_NURSING_ADMISSION_DOC_VERSION;
  expectedVersion: number;
  patientId: string;
  facilityId: string;
  encounterId: string;
  sourceEncounterId?: string | null;
  preloadedItems: PreloadedHistoryItemV1[];
  sections: Partial<Record<InpatientAdmissionClinicalSection, AdmissionSectionDocumentV1>>;
  homeMedicationLines: HomeMedicationReconciliationLineV1[];
  belongings: BelongingsInventoryItemV1[];
  cashDenominations: CashDenominationCountV1[];
  cashReceiptNumber?: string | null;
  cashWitnessUserId?: string | null;
  wounds: AdmissionWoundEntryV1[];
  headToToe: HeadToToeAssessmentEntryV1[];
  nurseSignature?: AdmissionNurseSignatureV1 | null;
  providerHandoff?: ProviderAdmissionHandoffV1 | null;
  /** D4A.2.5A — stable references to enterprise domain records (not full copies). */
  domainReferences?: unknown[];
  /** D4A.2.5A — append-only post-sign amendments (original signature remains immutable). */
  amendments?: unknown[];
  /**
   * MEDUI.INP.2B.1 — nurse-selected clinical effective time.
   * Distinct from server audit `updatedAt` / signature clocks. Additive JSON only.
   */
  clinicalDocumentedAt?: string | null;
  updatedAt: string;
  updatedByUserId?: string | null;
};

export function emptyMedSurgNursingAdmissionDocV1(input: {
  patientId: string;
  facilityId: string;
  encounterId: string;
  sourceEncounterId?: string | null;
  nowIso?: string;
}): MedSurgNursingAdmissionDocV1 {
  const sections: MedSurgNursingAdmissionDocV1["sections"] = {};
  for (const sectionId of INPATIENT_ADMISSION_CLINICAL_SECTIONS) {
    sections[sectionId] = {
      sectionId,
      completionState: "NOT_STARTED",
      expectedVersion: 0,
    };
  }
  return {
    version: MED_SURG_NURSING_ADMISSION_DOC_VERSION,
    expectedVersion: 0,
    patientId: input.patientId,
    facilityId: input.facilityId,
    encounterId: input.encounterId,
    sourceEncounterId: input.sourceEncounterId ?? null,
    preloadedItems: [],
    sections,
    homeMedicationLines: [],
    belongings: [],
    cashDenominations: [],
    wounds: [],
    headToToe: HEAD_TO_TOE_SYSTEM_KEYS.map((system) => ({
      system,
      status: "NOT_STARTED",
      reuseDomain: HEAD_TO_TOE_REUSE_DOMAIN[system],
    })),
    nurseSignature: { signed: false },
    providerHandoff: null,
    clinicalDocumentedAt: null,
    updatedAt: input.nowIso ?? new Date().toISOString(),
  };
}

export function readMedSurgNursingAdmissionFromSummary(
  admissionSummaryJson: unknown
): MedSurgNursingAdmissionDocV1 | null {
  if (!admissionSummaryJson || typeof admissionSummaryJson !== "object") return null;
  const raw = (admissionSummaryJson as Record<string, unknown>)[MED_SURG_NURSING_ADMISSION_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as MedSurgNursingAdmissionDocV1;
}

export function mergeMedSurgNursingAdmissionIntoSummary(
  admissionSummaryJson: unknown,
  doc: MedSurgNursingAdmissionDocV1
): Record<string, unknown> {
  const base =
    admissionSummaryJson &&
    typeof admissionSummaryJson === "object" &&
    !Array.isArray(admissionSummaryJson)
      ? { ...(admissionSummaryJson as Record<string, unknown>) }
      : {};
  base[MED_SURG_NURSING_ADMISSION_KEY] = doc;
  return base;
}

function mapProfileSectionToDomain(section: PatientHistorySectionKey): AdmissionPreloadDomain {
  switch (section) {
    case "medicalHistory":
      return "MEDICAL_HISTORY";
    case "surgicalHistory":
      return "SURGICAL_HISTORY";
    case "allergies":
      return "ALLERGIES";
    case "homeMedications":
      return "HOME_MEDICATIONS";
    case "socialHistory":
      return "SMOKING";
  }
}

function unverifiedProvenance(input: {
  sourceType: AdmissionProvenanceV1["sourceType"];
  sourceEncounterId?: string | null;
  sourceLabel?: string | null;
  recordedByUserId?: string | null;
  recordedAt?: string | null;
}): AdmissionProvenanceV1 {
  return {
    sourceType: input.sourceType,
    sourceEncounterId: input.sourceEncounterId ?? null,
    sourceLabel: input.sourceLabel ?? null,
    recordedByUserId: input.recordedByUserId ?? null,
    recordedAt: input.recordedAt ?? null,
    verified: false,
    verificationStatus: "UNKNOWN",
  };
}

/**
 * Build preload items from the shared patient clinical history profile.
 * Items arrive UNVERIFIED — admission must explicitly confirm/update/unable-to-verify.
 */
export function buildAdmissionPreloadFromPatientProfile(input: {
  profile: PatientClinicalHistoryProfile | null | undefined;
  sourceEncounterId?: string | null;
}): PreloadedHistoryItemV1[] {
  const profile = input.profile;
  if (!profile) return [];
  const items: PreloadedHistoryItemV1[] = [];
  const push = (
    domain: AdmissionPreloadDomain,
    itemId: string,
    displayLabel: string,
    valueText: string | null | undefined,
    sectionKey: PatientHistorySectionKey
  ) => {
    const text = String(valueText ?? "").trim();
    if (!text) return;
    const prov = profile.provenance?.[sectionKey];
    items.push({
      itemId,
      domain,
      displayLabel,
      valueText: text,
      provenance: unverifiedProvenance({
        sourceType: prov?.sourceEncounterId ? "SOURCE_ENCOUNTER" : "PATIENT_PROFILE",
        sourceEncounterId: prov?.sourceEncounterId ?? input.sourceEncounterId ?? null,
        sourceLabel: prov?.sourceType ?? "patient_clinical_history_profile",
        recordedByUserId: prov?.reviewerId ?? profile.updatedBy ?? null,
        recordedAt: prov?.lastReviewedAt ?? profile.updatedAt ?? null,
      }),
    });
  };

  push(
    "MEDICAL_HISTORY",
    "pmh-summary",
    "Past medical history",
    profile.medicalHistory?.pastMedicalHistory,
    "medicalHistory"
  );
  push(
    "SURGICAL_HISTORY",
    "psh-summary",
    "Past surgical history",
    profile.surgicalHistory?.pastSurgicalHistory,
    "surgicalHistory"
  );
  push(
    "ALLERGIES",
    "allergy-note",
    "Allergy note",
    profile.allergies?.allergyNote ?? profile.allergies?.medicationAllergiesDetail,
    "allergies"
  );
  push(
    "HOME_MEDICATIONS",
    "home-meds-summary",
    "Home medications",
    profile.homeMedications?.medicationsSummary,
    "homeMedications"
  );
  const social = profile.socialHistory;
  if (social) {
    push("SMOKING", "smoking", "Smoking", social.smokingStatus, "socialHistory");
    push("ALCOHOL", "alcohol", "Alcohol", social.alcoholUse, "socialHistory");
    const drugs = [social.marijuanaUse, social.stimulantUse, social.opioidHeroinUse]
      .filter((x) => String(x ?? "").trim())
      .join("; ");
    push("RECREATIONAL_DRUGS", "recreational-drugs", "Recreational substances", drugs, "socialHistory");
  }

  void mapProfileSectionToDomain;
  return items;
}

/**
 * Overlay current enterprise history onto admission preload without duplicating PMH.
 * Preserves encounter verification provenance. Adds newly available domains (e.g. surgical).
 * Display-only on GET; persist happens on verify/section save.
 */
export function mergeAdmissionPreloadFromPatientProfile(input: {
  existing: PreloadedHistoryItemV1[];
  profile: PatientClinicalHistoryProfile | null | undefined;
  sourceEncounterId?: string | null;
}): PreloadedHistoryItemV1[] {
  const fresh = buildAdmissionPreloadFromPatientProfile({
    profile: input.profile,
    sourceEncounterId: input.sourceEncounterId,
  });
  const byId = new Map((input.existing ?? []).map((item) => [item.itemId, item]));
  const out: PreloadedHistoryItemV1[] = [];
  const seen = new Set<string>();
  for (const item of fresh) {
    const prior = byId.get(item.itemId);
    if (prior) {
      out.push({
        ...prior,
        displayLabel: item.displayLabel,
        valueText: item.valueText,
      });
    } else {
      out.push(item);
    }
    seen.add(item.itemId);
  }
  for (const prior of input.existing ?? []) {
    if (!seen.has(prior.itemId)) out.push(prior);
  }
  return out;
}

export function assertPreloadRequiresVerification(item: PreloadedHistoryItemV1): boolean {
  if (!preloadedHistoryRequiresVerification()) return false;
  if (!preloadedHistoryMustRetainProvenance()) return false;
  return item.provenance.verified !== true;
}

export function applyHistoryVerification(input: {
  item: PreloadedHistoryItemV1;
  status: AdmissionHistoryVerificationStatus;
  actorUserId: string;
  atIso?: string;
  encounterNote?: string | null;
}): PreloadedHistoryItemV1 {
  const at = input.atIso ?? new Date().toISOString();
  const verified = input.status === "CONFIRMED" || input.status === "UPDATED";
  return {
    ...input.item,
    encounterNote: input.encounterNote ?? input.item.encounterNote ?? null,
    provenance: {
      ...input.item.provenance,
      verified,
      verifiedByUserId: input.actorUserId,
      verifiedAt: at,
      verificationStatus: input.status,
    },
  };
}

/** Longitudinal invariant: patient history is shared; encounter records verification only. */
export function patientOwnsLongitudinalRecord(): true {
  return true;
}

export function encounterOwnsVerificationNotDuplicateHistory(): true {
  return true;
}

export function admissionMustNotSilentlyOverwritePatientHistory(): true {
  return true;
}

export function homeMedReconMustNotCreateOrders(
  line: Pick<HomeMedicationReconciliationLineV1, "createsInpatientOrder">
): boolean {
  return (
    homeMedicationsMustNotAutoConvertToInpatientOrders() &&
    line.createsInpatientOrder === false
  );
}

export function buildHomeMedReconLinesFromPreload(
  items: readonly PreloadedHistoryItemV1[]
): HomeMedicationReconciliationLineV1[] {
  return items
    .filter((i) => i.domain === "HOME_MEDICATIONS")
    .map((i) => ({
      lineId: `hm-${i.itemId}`,
      medicationLabel: i.valueText || i.displayLabel,
      status: "UNABLE_TO_VERIFY" as const,
      provenance: { ...i.provenance },
      createsInpatientOrder: false as const,
    }));
}

export function validateSectionDraftSave(input: {
  currentExpectedVersion: number;
  clientExpectedVersion: number;
}): { ok: true } | { ok: false; code: "EXPECTED_VERSION_CONFLICT" } {
  if (input.clientExpectedVersion !== input.currentExpectedVersion) {
    return { ok: false, code: "EXPECTED_VERSION_CONFLICT" };
  }
  return { ok: true };
}

export function saveAdmissionSectionDraft(input: {
  doc: MedSurgNursingAdmissionDocV1;
  sectionId: InpatientAdmissionClinicalSection;
  draftText?: string | null;
  answers?: Record<string, unknown> | null;
  unableReason?: string | null;
  completionState?: AdmissionSectionCompletionState;
  clientExpectedVersion: number;
  actorUserId: string;
  atIso?: string;
  /** Nurse-selected clinical effective time. Never copied onto `updatedAt`. */
  clinicalDocumentedAt?: string | null;
  /** When true, refuse if nurse signature already present (use addendum path). */
  blockIfSigned?: boolean;
}):
  | { ok: true; doc: MedSurgNursingAdmissionDocV1 }
  | {
      ok: false;
      code: "EXPECTED_VERSION_CONFLICT" | "NURSING_ADMISSION_ALREADY_SIGNED";
    } {
  if (!admissionDocumentationSupportsSaveAndResume()) {
    return { ok: false, code: "EXPECTED_VERSION_CONFLICT" };
  }
  if (input.blockIfSigned !== false && input.doc.nurseSignature?.signed) {
    return { ok: false, code: "NURSING_ADMISSION_ALREADY_SIGNED" };
  }
  const gate = validateSectionDraftSave({
    currentExpectedVersion: input.doc.expectedVersion,
    clientExpectedVersion: input.clientExpectedVersion,
  });
  if (!gate.ok) return gate;

  const at = input.atIso ?? new Date().toISOString();
  const prev = input.doc.sections[input.sectionId] ?? {
    sectionId: input.sectionId,
    completionState: "NOT_STARTED" as const,
    expectedVersion: 0,
  };
  const nextState =
    input.completionState ??
    (prev.completionState === "NOT_STARTED" ? "IN_PROGRESS" : prev.completionState);
  const nextVersion = input.doc.expectedVersion + 1;
  const nextAnswers =
    input.answers !== undefined ? input.answers : (prev.answers ?? null);
  const sections = {
    ...input.doc.sections,
    [input.sectionId]: {
      ...prev,
      draftText: input.draftText !== undefined ? input.draftText : (prev.draftText ?? null),
      answers: nextAnswers,
      unableReason:
        input.unableReason !== undefined
          ? input.unableReason
          : (prev.unableReason ?? null),
      completionState: nextState,
      expectedVersion: nextVersion,
      updatedAt: at,
      updatedByUserId: input.actorUserId,
    },
  };
  const clinicalDocumentedAt =
    input.clinicalDocumentedAt !== undefined
      ? input.clinicalDocumentedAt
      : (input.doc.clinicalDocumentedAt ?? null);
  return {
    ok: true,
    doc: {
      ...input.doc,
      sections,
      expectedVersion: nextVersion,
      clinicalDocumentedAt,
      updatedAt: at,
      updatedByUserId: input.actorUserId,
    },
  };
}

export function computeAdmissionCompletionSummary(doc: MedSurgNursingAdmissionDocV1): {
  total: number;
  complete: number;
  inProgress: number;
  notStarted: number;
  unable: number;
  notApplicable: number;
  /** COMPLETE + N/A + UNABLE — workflow progress numerator. */
  resolved: number;
  allRequiredComplete: boolean;
} {
  let complete = 0;
  let inProgress = 0;
  let notStarted = 0;
  let unable = 0;
  let notApplicable = 0;
  for (const sectionId of INPATIENT_ADMISSION_CLINICAL_SECTIONS) {
    const st = doc.sections[sectionId]?.completionState ?? "NOT_STARTED";
    if (st === "COMPLETE") complete += 1;
    else if (st === "IN_PROGRESS") inProgress += 1;
    else if (st === "UNABLE_TO_COMPLETE") unable += 1;
    else if (st === "NOT_APPLICABLE") notApplicable += 1;
    else notStarted += 1;
  }
  const total = INPATIENT_ADMISSION_CLINICAL_SECTIONS.length;
  const actionable = total - notApplicable;
  const resolved = complete + notApplicable + unable;
  return {
    total,
    complete,
    inProgress,
    notStarted,
    unable,
    notApplicable,
    resolved,
    allRequiredComplete: complete + unable >= actionable && actionable > 0,
  };
}

export function applyNurseAdmissionSignature(input: {
  doc: MedSurgNursingAdmissionDocV1;
  actorUserId: string;
  credentials?: string | null;
  displayName?: string | null;
  clientExpectedVersion: number;
  atIso?: string;
}):
  | { ok: true; doc: MedSurgNursingAdmissionDocV1 }
  | { ok: false; code: "EXPECTED_VERSION_CONFLICT" | "INCOMPLETE_ADMISSION" } {
  const gate = validateSectionDraftSave({
    currentExpectedVersion: input.doc.expectedVersion,
    clientExpectedVersion: input.clientExpectedVersion,
  });
  if (!gate.ok) return gate;
  const summary = computeAdmissionCompletionSummary(input.doc);
  // Legal completion is distinct from merely authoring a draft. Optional sections must be
  // explicitly marked not applicable; all remaining sections must be complete or unable.
  if (!summary.allRequiredComplete) {
    return { ok: false, code: "INCOMPLETE_ADMISSION" };
  }
  const at = input.atIso ?? new Date().toISOString();
  const nextVersion = input.doc.expectedVersion + 1;
  return {
    ok: true,
    doc: {
      ...input.doc,
      expectedVersion: nextVersion,
      nurseSignature: {
        signed: true,
        signedAt: at,
        signedByUserId: input.actorUserId,
        credentials: input.credentials ?? null,
        displayName: input.displayName ?? null,
        expectedVersionAtSign: nextVersion,
      },
      updatedAt: at,
      updatedByUserId: input.actorUserId,
    },
  };
}

export function createProviderAdmissionHandoff(input: {
  doc: MedSurgNursingAdmissionDocV1;
  actorUserId: string;
  atIso?: string;
}): MedSurgNursingAdmissionDocV1 {
  const at = input.atIso ?? new Date().toISOString();
  const outstanding = INPATIENT_ADMISSION_CLINICAL_SECTIONS.filter((s) => {
    const st = input.doc.sections[s]?.completionState ?? "NOT_STARTED";
    return st !== "COMPLETE" && st !== "NOT_APPLICABLE";
  });
  const verifiedDomains = new Set(
    input.doc.preloadedItems
      .filter((i) => i.provenance.verified)
      .map((i) => i.domain)
  );
  const handoff: ProviderAdmissionHandoffV1 = {
    taskId: `pah-${input.doc.encounterId}-${Date.now().toString(36)}`,
    status: "PENDING",
    createdAt: at,
    createdByUserId: input.actorUserId,
    outstandingSectionIds: outstanding,
    includesVerifiedHistories:
      verifiedDomains.has("MEDICAL_HISTORY") || verifiedDomains.has("SURGICAL_HISTORY"),
    includesVerifiedMedications: input.doc.homeMedicationLines.some(
      (l) => l.status === "CONFIRMED" || l.status === "UPDATED"
    ),
    includesVerifiedAllergies: verifiedDomains.has("ALLERGIES"),
    includesAdmissionAssessment: Boolean(input.doc.nurseSignature?.signed),
  };
  return {
    ...input.doc,
    providerHandoff: handoff,
    expectedVersion: input.doc.expectedVersion + 1,
    updatedAt: at,
    updatedByUserId: input.actorUserId,
  };
}

export function belongingsLineIsValid(item: BelongingsInventoryItemV1): boolean {
  if (!String(item.description ?? "").trim()) return false;
  if (!Number.isFinite(item.quantity) || item.quantity < 1) return false;
  if (!(BELONGINGS_DISPOSITIONS as readonly string[]).includes(item.disposition)) return false;
  const cat = String(item.category ?? "");
  return (BELONGINGS_CATEGORIES as readonly string[]).includes(cat) || cat === "OTHER" || Boolean(cat);
}

export function cashInventoryIsValid(
  rows: readonly CashDenominationCountV1[]
): { ok: boolean; total: number } {
  const total = sumCashDenominationTotal(rows);
  const ok = rows.every(
    (r) =>
      String(r.currency ?? "").trim() &&
      Number.isFinite(r.denomination) &&
      r.denomination > 0 &&
      Number.isFinite(r.quantity) &&
      r.quantity >= 0
  );
  return { ok, total };
}

export function woundRequiresPresentOnAdmissionFlag(wound: AdmissionWoundEntryV1): boolean {
  return typeof wound.presentOnAdmission === "boolean";
}

export function isAdmissionCompletionState(raw: unknown): raw is AdmissionSectionCompletionState {
  return (
    typeof raw === "string" &&
    (ADMISSION_SECTION_COMPLETION_STATES as readonly string[]).includes(raw)
  );
}

export function isAdmissionHistoryVerificationStatus(
  raw: unknown
): raw is AdmissionHistoryVerificationStatus {
  return (
    typeof raw === "string" &&
    (ADMISSION_HISTORY_VERIFICATION_STATUSES as readonly string[]).includes(raw)
  );
}

export function futureAdmissionsPreloadVerifiedItems(
  priorDoc: MedSurgNursingAdmissionDocV1
): PreloadedHistoryItemV1[] {
  return priorDoc.preloadedItems
    .filter((i) => i.provenance.verified)
    .map((i) => ({
      ...i,
      provenance: unverifiedProvenance({
        sourceType: "PRIOR_ADMISSION",
        sourceEncounterId: priorDoc.encounterId,
        sourceLabel: "prior_verified_admission",
        recordedByUserId: i.provenance.verifiedByUserId ?? null,
        recordedAt: i.provenance.verifiedAt ?? null,
      }),
    }));
}

export {
  ADMISSION_HISTORY_VERIFICATION_STATUSES,
  ADMISSION_SECTION_COMPLETION_STATES,
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  HOME_MEDICATION_RECON_STATUSES,
  BELONGINGS_CATEGORIES,
  BELONGINGS_DISPOSITIONS,
};
