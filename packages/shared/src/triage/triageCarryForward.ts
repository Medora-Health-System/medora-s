/**
 * Phase 19T.1 — Prior visit triage history carry-forward (pure helpers).
 * Carries selected history fields only; never visit-specific triage data.
 */

export const TRIAGE_CARRY_FORWARD_VERSION = "19T.1" as const;
export const TRIAGE_CARRY_FORWARD_META_KEY = "triageCarryForwardMeta" as const;
const ER_TRIAGE_V1_JSON_KEY = "medoraErTriageV1" as const;

export type TriageCarryForwardReviewStatus = "pending_review" | "reviewed" | "modified" | "removed";

export type TriageCarryForwardSectionKey = "allergies" | "homeMedications" | "history" | "socialHistory";

export type TriageCarryForwardStalenessLevel = "fresh" | "stale" | "very_stale";

/** ~6 months — prior history older than this is flagged stale. */
export const TRIAGE_CARRY_FORWARD_STALE_THRESHOLD_DAYS = 183;

/** ~12 months — prior history older than this is flagged very stale. */
export const TRIAGE_CARRY_FORWARD_VERY_STALE_THRESHOLD_DAYS = 365;

export type TriageCarryForwardStaleness = {
  level: TriageCarryForwardStalenessLevel;
  ageDays: number;
  thresholdDays: number;
};

export type TriageCarryForwardFieldKey =
  | "allergies"
  | "homeMedications"
  | "medicalHistory"
  | "surgicalHistory"
  | "smokingHistory"
  | "alcoholUse"
  | "substanceUse";

export type TriageCarryForwardMeta = {
  version: typeof TRIAGE_CARRY_FORWARD_VERSION;
  sourceEncounterId: string;
  sourceEncounterDate: string;
  sourceFacilityId?: string;
  carriedForwardAt: string;
  carriedForwardBy?: string;
  fields: Partial<Record<TriageCarryForwardFieldKey, true>>;
  reviewStatus: TriageCarryForwardReviewStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  /** Normalized snapshots for review-status evaluation (stored in triage JSON, not audit). */
  fieldSnapshots?: Partial<Record<TriageCarryForwardFieldKey, string>>;
  /** 19T.2 — age of source visit at carry-forward time. */
  staleness?: TriageCarryForwardStaleness;
  /** 19T.2 — per-section review state (UI grouping). */
  sectionStatus?: Partial<Record<TriageCarryForwardSectionKey, TriageCarryForwardReviewStatus>>;
  /** 19T.2 — section-level snapshots for reconciliation. */
  sectionSnapshots?: Partial<Record<TriageCarryForwardSectionKey, string>>;
};

export type TriageCarryForwardHistoryFields = {
  medicationAllergiesDetail: string;
  foodAllergiesDetail: string;
  additionalAllergyInfo: string;
  allergyDetailSelections: string[];
  medicationsSummary: string;
  medicationSummarySelections: string[];
  pastMedicalHistory: string;
  pastSurgicalHistory: string;
  smokingStatus: string;
  alcoholUse: string;
  marijuanaUse: string;
  stimulantUse: string;
  opioidHeroinUse: string;
  historySocialComments: string;
  socialHistorySelections: string[];
};

export type TriageCarryForwardDraft = {
  allergyNote: string;
  erV1: TriageCarryForwardHistoryFields;
};

export type TriageCarryForwardSource = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  encounterDate: string;
  vitalsJson: unknown;
  chiefComplaint?: string | null;
  esi?: number | null;
};

export type TriageCarryForwardExtraction = {
  allergyNote?: string;
  fields: Partial<TriageCarryForwardHistoryFields>;
  appliedFieldKeys: TriageCarryForwardFieldKey[];
};

export type TriageCarryForwardAuditMetadata = {
  patientId: string;
  encounterId: string;
  sourceEncounterId: string;
  fieldKeys: TriageCarryForwardFieldKey[];
  sectionKeys: TriageCarryForwardSectionKey[];
  reviewStatus: TriageCarryForwardReviewStatus;
  sectionStatuses?: Partial<Record<TriageCarryForwardSectionKey, TriageCarryForwardReviewStatus>>;
  stalenessLevel?: TriageCarryForwardStalenessLevel;
  actorId?: string;
  timestamp: string;
};

/** Social chips allowed for carry-forward (smoking / alcohol / substances only). */
export const TRIAGE_CARRY_FORWARD_SOCIAL_CHIP_CODES = [
  "SMOKER",
  "FORMER_SMOKER",
  "ALCOHOL_USE",
  "CANNABIS_USE",
  "OPIOID_USE",
  "STIMULANT_USE",
] as const;

const SMOKING_CHIP_CODES = new Set<string>(["SMOKER", "FORMER_SMOKER"]);
const ALCOHOL_CHIP_CODES = new Set<string>(["ALCOHOL_USE"]);
const SUBSTANCE_CHIP_CODES = new Set<string>(["CANNABIS_USE", "OPIOID_USE", "STIMULANT_USE"]);
const CARRY_FORWARD_SOCIAL_CHIP_SET = new Set<string>(TRIAGE_CARRY_FORWARD_SOCIAL_CHIP_CODES);

/** ER V1 keys that must never be carried forward (visit-specific). */
export const TRIAGE_CARRY_FORWARD_FORBIDDEN_ER_V1_KEYS = [
  "triageNarrative",
  "ppeNote",
  "airway",
  "breathing",
  "circulation",
  "gcsEye",
  "gcsVerbal",
  "gcsMotor",
  "gcsTotal",
  "gcs15",
  "triageExceptionsNote",
  "painScale0to10",
  "referralSource",
  "triageStartedAt",
  "traumaActivation",
  "nursingCareNote",
  "callLightInReach",
  "bedLockedLow",
  "familyAtBedside",
  "inViewOfNursingStation",
  "patientUpdatedOnPlan",
  "comfortMeasuresProvided",
  "edCoursePpeNote",
  "nursingNotesAddendum",
  "feelsSafeAtHome",
  "travelOutsideCountry14d",
  "preferredPharmacy",
  "immunizationStatusNote",
  "familyHistory",
  "sourceRoutingSelections",
  "ppeSelections",
  "nursingCareSelections",
] as const;

export function emptyTriageCarryForwardHistoryFields(): TriageCarryForwardHistoryFields {
  return {
    medicationAllergiesDetail: "",
    foodAllergiesDetail: "",
    additionalAllergyInfo: "",
    allergyDetailSelections: [],
    medicationsSummary: "",
    medicationSummarySelections: [],
    pastMedicalHistory: "",
    pastSurgicalHistory: "",
    smokingStatus: "",
    alcoholUse: "",
    marijuanaUse: "",
    stimulantUse: "",
    opioidHeroinUse: "",
    historySocialComments: "",
    socialHistorySelections: [],
  };
}

export function emptyTriageCarryForwardDraft(): TriageCarryForwardDraft {
  return {
    allergyNote: "",
    erV1: emptyTriageCarryForwardHistoryFields(),
  };
}

function strField(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function stringArrayField(v: unknown, allowed?: Set<string>): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string") continue;
    const c = x.trim();
    if (!c || seen.has(c)) continue;
    if (allowed && !allowed.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

function readErV1Blob(vitalsJson: unknown): Record<string, unknown> {
  if (vitalsJson == null || typeof vitalsJson !== "object" || Array.isArray(vitalsJson)) return {};
  const root = vitalsJson as Record<string, unknown>;
  const er = root[ER_TRIAGE_V1_JSON_KEY];
  if (er != null && typeof er === "object" && !Array.isArray(er)) return er as Record<string, unknown>;
  return {};
}

function readAllergyNote(vitalsJson: unknown): string {
  if (vitalsJson == null || typeof vitalsJson !== "object" || Array.isArray(vitalsJson)) return "";
  return strField((vitalsJson as Record<string, unknown>).allergyNote);
}

function allergiesFieldGroupHasContent(
  allergyNote: string,
  fields: Partial<TriageCarryForwardHistoryFields>
): boolean {
  return Boolean(
    strField(allergyNote) ||
      strField(fields.medicationAllergiesDetail) ||
      strField(fields.foodAllergiesDetail) ||
      strField(fields.additionalAllergyInfo) ||
      (fields.allergyDetailSelections?.length ?? 0) > 0
  );
}

function homeMedsFieldGroupHasContent(fields: Partial<TriageCarryForwardHistoryFields>): boolean {
  return Boolean(
    strField(fields.medicationsSummary) || (fields.medicationSummarySelections?.length ?? 0) > 0
  );
}

function smokingFieldGroupHasContent(fields: Partial<TriageCarryForwardHistoryFields>): boolean {
  const chips = fields.socialHistorySelections ?? [];
  return Boolean(strField(fields.smokingStatus) || chips.some((c) => SMOKING_CHIP_CODES.has(c)));
}

function alcoholFieldGroupHasContent(fields: Partial<TriageCarryForwardHistoryFields>): boolean {
  const chips = fields.socialHistorySelections ?? [];
  return Boolean(strField(fields.alcoholUse) || chips.some((c) => ALCOHOL_CHIP_CODES.has(c)));
}

function substanceFieldGroupHasContent(fields: Partial<TriageCarryForwardHistoryFields>): boolean {
  const chips = fields.socialHistorySelections ?? [];
  return Boolean(
    strField(fields.marijuanaUse) ||
      strField(fields.stimulantUse) ||
      strField(fields.opioidHeroinUse) ||
      strField(fields.historySocialComments) ||
      chips.some((c) => SUBSTANCE_CHIP_CODES.has(c))
  );
}

function fieldGroupSnapshot(
  draft: TriageCarryForwardDraft,
  key: TriageCarryForwardFieldKey
): string {
  const fields = draft.erV1;
  switch (key) {
    case "allergies":
      return JSON.stringify({
        allergyNote: strField(draft.allergyNote),
        medicationAllergiesDetail: strField(fields.medicationAllergiesDetail),
        foodAllergiesDetail: strField(fields.foodAllergiesDetail),
        additionalAllergyInfo: strField(fields.additionalAllergyInfo),
        allergyDetailSelections: fields.allergyDetailSelections ?? [],
      });
    case "homeMedications":
      return JSON.stringify({
        medicationsSummary: strField(fields.medicationsSummary),
        medicationSummarySelections: fields.medicationSummarySelections ?? [],
      });
    case "medicalHistory":
      return JSON.stringify({ pastMedicalHistory: strField(fields.pastMedicalHistory) });
    case "surgicalHistory":
      return JSON.stringify({ pastSurgicalHistory: strField(fields.pastSurgicalHistory) });
    case "smokingHistory":
      return JSON.stringify({
        smokingStatus: strField(fields.smokingStatus),
        socialHistorySelections: (fields.socialHistorySelections ?? []).filter((c) => SMOKING_CHIP_CODES.has(c)),
      });
    case "alcoholUse":
      return JSON.stringify({
        alcoholUse: strField(fields.alcoholUse),
        socialHistorySelections: (fields.socialHistorySelections ?? []).filter((c) => ALCOHOL_CHIP_CODES.has(c)),
      });
    case "substanceUse":
      return JSON.stringify({
        marijuanaUse: strField(fields.marijuanaUse),
        stimulantUse: strField(fields.stimulantUse),
        opioidHeroinUse: strField(fields.opioidHeroinUse),
        historySocialComments: strField(fields.historySocialComments),
        socialHistorySelections: (fields.socialHistorySelections ?? []).filter((c) => SUBSTANCE_CHIP_CODES.has(c)),
      });
    default:
      return "";
  }
}

function buildAppliedFieldKeys(allergyNote: string, fields: Partial<TriageCarryForwardHistoryFields>): TriageCarryForwardFieldKey[] {
  const keys: TriageCarryForwardFieldKey[] = [];
  if (allergiesFieldGroupHasContent(allergyNote, fields)) keys.push("allergies");
  if (homeMedsFieldGroupHasContent(fields)) keys.push("homeMedications");
  if (strField(fields.pastMedicalHistory)) keys.push("medicalHistory");
  if (strField(fields.pastSurgicalHistory)) keys.push("surgicalHistory");
  if (smokingFieldGroupHasContent(fields)) keys.push("smokingHistory");
  if (alcoholFieldGroupHasContent(fields)) keys.push("alcoholUse");
  if (substanceFieldGroupHasContent(fields)) keys.push("substanceUse");
  return keys;
}

function buildFieldSnapshots(
  draft: TriageCarryForwardDraft,
  keys: TriageCarryForwardFieldKey[]
): Partial<Record<TriageCarryForwardFieldKey, string>> {
  const out: Partial<Record<TriageCarryForwardFieldKey, string>> = {};
  for (const key of keys) {
    out[key] = fieldGroupSnapshot(draft, key);
  }
  return out;
}

export function fieldKeyToCarryForwardSection(key: TriageCarryForwardFieldKey): TriageCarryForwardSectionKey {
  switch (key) {
    case "allergies":
      return "allergies";
    case "homeMedications":
      return "homeMedications";
    case "medicalHistory":
    case "surgicalHistory":
      return "history";
    default:
      return "socialHistory";
  }
}

const SECTION_FIELD_KEYS: Record<TriageCarryForwardSectionKey, readonly TriageCarryForwardFieldKey[]> = {
  allergies: ["allergies"],
  homeMedications: ["homeMedications"],
  history: ["medicalHistory", "surgicalHistory"],
  socialHistory: ["smokingHistory", "alcoholUse", "substanceUse"],
};

export function getCarriedForwardSections(meta: TriageCarryForwardMeta): TriageCarryForwardSectionKey[] {
  const sections = new Set<TriageCarryForwardSectionKey>();
  for (const key of Object.keys(meta.fields) as TriageCarryForwardFieldKey[]) {
    if (meta.fields[key]) sections.add(fieldKeyToCarryForwardSection(key));
  }
  return [...sections];
}

export function sectionHasCarriedForwardFields(
  meta: TriageCarryForwardMeta,
  section: TriageCarryForwardSectionKey
): boolean {
  return SECTION_FIELD_KEYS[section].some((key) => meta.fields[key]);
}

function sectionSnapshot(
  draft: TriageCarryForwardDraft,
  section: TriageCarryForwardSectionKey,
  meta?: TriageCarryForwardMeta
): string {
  const parts: Record<string, unknown> = {};
  for (const key of SECTION_FIELD_KEYS[section]) {
    if (meta && !meta.fields[key]) continue;
    parts[key] = JSON.parse(fieldGroupSnapshot(draft, key));
  }
  return JSON.stringify(parts);
}

function buildSectionSnapshots(
  draft: TriageCarryForwardDraft,
  sections: TriageCarryForwardSectionKey[],
  meta?: TriageCarryForwardMeta
): Partial<Record<TriageCarryForwardSectionKey, string>> {
  const out: Partial<Record<TriageCarryForwardSectionKey, string>> = {};
  for (const section of sections) {
    out[section] = sectionSnapshot(draft, section, meta);
  }
  return out;
}

function sectionSnapshotIsEmpty(snapshot: string | undefined): boolean {
  if (!snapshot) return true;
  try {
    const parsed = JSON.parse(snapshot) as Record<string, Record<string, unknown>>;
    for (const part of Object.values(parsed)) {
      if (!part || typeof part !== "object") continue;
      for (const v of Object.values(part)) {
        if (Array.isArray(v) ? v.length > 0 : String(v ?? "").trim()) return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

export function computeCarryForwardStaleness(
  sourceEncounterDate: string,
  now: Date = new Date()
): TriageCarryForwardStaleness {
  const sourceMs = new Date(sourceEncounterDate).getTime();
  const ageDays = Number.isNaN(sourceMs)
    ? 0
    : Math.max(0, Math.floor((now.getTime() - sourceMs) / (1000 * 60 * 60 * 24)));
  if (ageDays >= TRIAGE_CARRY_FORWARD_VERY_STALE_THRESHOLD_DAYS) {
    return {
      level: "very_stale",
      ageDays,
      thresholdDays: TRIAGE_CARRY_FORWARD_VERY_STALE_THRESHOLD_DAYS,
    };
  }
  if (ageDays >= TRIAGE_CARRY_FORWARD_STALE_THRESHOLD_DAYS) {
    return {
      level: "stale",
      ageDays,
      thresholdDays: TRIAGE_CARRY_FORWARD_STALE_THRESHOLD_DAYS,
    };
  }
  return { level: "fresh", ageDays, thresholdDays: TRIAGE_CARRY_FORWARD_STALE_THRESHOLD_DAYS };
}

export function isCarryForwardSectionStale(meta: TriageCarryForwardMeta): boolean {
  const level = meta.staleness?.level ?? computeCarryForwardStaleness(meta.sourceEncounterDate).level;
  return level === "stale" || level === "very_stale";
}

function inferSectionStatusFromGlobal(
  meta: TriageCarryForwardMeta,
  section: TriageCarryForwardSectionKey
): TriageCarryForwardReviewStatus {
  if (!sectionHasCarriedForwardFields(meta, section)) return "removed";
  return meta.reviewStatus ?? "pending_review";
}

export function initializeCarryForwardSectionStatus(
  meta: TriageCarryForwardMeta
): Partial<Record<TriageCarryForwardSectionKey, TriageCarryForwardReviewStatus>> {
  const out: Partial<Record<TriageCarryForwardSectionKey, TriageCarryForwardReviewStatus>> = {};
  for (const section of getCarriedForwardSections(meta)) {
    out[section] = inferSectionStatusFromGlobal(meta, section);
  }
  return out;
}

export function normalizeTriageCarryForwardMeta(
  meta: TriageCarryForwardMeta,
  draft?: TriageCarryForwardDraft,
  now: Date = new Date()
): TriageCarryForwardMeta {
  const sections = getCarriedForwardSections(meta);
  const staleness = meta.staleness ?? computeCarryForwardStaleness(meta.sourceEncounterDate, now);
  const sectionSnapshots =
    meta.sectionSnapshots ??
    (draft ? buildSectionSnapshots(draft, sections, meta) : buildSectionSnapshotsFromFieldSnapshots(meta));
  const sectionStatus = meta.sectionStatus ?? initializeCarryForwardSectionStatus(meta);
  let next: TriageCarryForwardMeta = {
    ...meta,
    staleness,
    sectionSnapshots,
    sectionStatus,
  };
  if (draft) {
    next = refreshCarryForwardStateFromForm(next, draft);
  } else {
    next.reviewStatus = deriveCarryForwardGlobalStatus(sectionStatus, sections);
  }
  return next;
}

function buildSectionSnapshotsFromFieldSnapshots(
  meta: TriageCarryForwardMeta
): Partial<Record<TriageCarryForwardSectionKey, string>> {
  const out: Partial<Record<TriageCarryForwardSectionKey, string>> = {};
  const fieldSnaps = meta.fieldSnapshots ?? {};
  for (const section of getCarriedForwardSections(meta)) {
    const parts: Record<string, unknown> = {};
    for (const key of SECTION_FIELD_KEYS[section]) {
      if (fieldSnaps[key]) parts[key] = JSON.parse(fieldSnaps[key]!);
    }
    if (Object.keys(parts).length) out[section] = JSON.stringify(parts);
  }
  return out;
}

export function evaluateCarryForwardSectionStatus(
  meta: TriageCarryForwardMeta,
  currentDraft: TriageCarryForwardDraft,
  section: TriageCarryForwardSectionKey
): TriageCarryForwardReviewStatus {
  if (!sectionHasCarriedForwardFields(meta, section)) return "removed";

  const baseline =
    meta.sectionSnapshots?.[section] ?? buildSectionSnapshotsFromFieldSnapshots(meta)[section] ?? "";
  const current = sectionSnapshot(currentDraft, section, meta);

  if (sectionSnapshotIsEmpty(current)) {
    return sectionSnapshotIsEmpty(baseline) ? "removed" : "removed";
  }
  if (baseline && current !== baseline) {
    return "modified";
  }
  const pinned = meta.sectionStatus?.[section];
  if (pinned === "reviewed" && current === baseline) return "reviewed";
  return "pending_review";
}

export function deriveCarryForwardGlobalStatus(
  sectionStatus: Partial<Record<TriageCarryForwardSectionKey, TriageCarryForwardReviewStatus>>,
  carriedSections: TriageCarryForwardSectionKey[]
): TriageCarryForwardReviewStatus {
  if (!carriedSections.length) return "removed";

  const statuses = carriedSections.map((s) => sectionStatus[s] ?? "pending_review");
  if (statuses.every((s) => s === "removed")) return "removed";
  const active = statuses.filter((s) => s !== "removed");
  if (active.length === 0) return "removed";
  if (active.some((s) => s === "modified")) return "modified";
  if (active.some((s) => s === "pending_review")) return "pending_review";
  if (active.every((s) => s === "reviewed")) return "reviewed";
  return "pending_review";
}

export function updateCarryForwardSectionStatus(
  meta: TriageCarryForwardMeta,
  section: TriageCarryForwardSectionKey,
  status: TriageCarryForwardReviewStatus,
  options?: { reviewedBy?: string; reviewedAt?: string; nowIso?: string }
): TriageCarryForwardMeta {
  const sections = getCarriedForwardSections(meta);
  const sectionStatus = { ...(meta.sectionStatus ?? initializeCarryForwardSectionStatus(meta)), [section]: status };
  const reviewStatus = deriveCarryForwardGlobalStatus(sectionStatus, sections);
  const nowIso = options?.reviewedAt ?? options?.nowIso ?? new Date().toISOString();
  return {
    ...meta,
    sectionStatus,
    reviewStatus,
    reviewedAt: reviewStatus === "reviewed" ? nowIso : meta.reviewedAt,
    reviewedBy: reviewStatus === "reviewed" ? options?.reviewedBy ?? meta.reviewedBy : meta.reviewedBy,
  };
}

export function removeCarryForwardSectionValues(
  draft: TriageCarryForwardDraft,
  meta: TriageCarryForwardMeta,
  section: TriageCarryForwardSectionKey
): { draft: TriageCarryForwardDraft; meta: TriageCarryForwardMeta } {
  const nextDraft: TriageCarryForwardDraft = {
    allergyNote: draft.allergyNote,
    erV1: { ...draft.erV1, socialHistorySelections: [...draft.erV1.socialHistorySelections] },
  };
  const nextFields = { ...meta.fields };

  if (section === "allergies" && meta.fields.allergies) {
    nextDraft.allergyNote = "";
    nextDraft.erV1.medicationAllergiesDetail = "";
    nextDraft.erV1.foodAllergiesDetail = "";
    nextDraft.erV1.additionalAllergyInfo = "";
    nextDraft.erV1.allergyDetailSelections = [];
    delete nextFields.allergies;
  }

  if (section === "homeMedications" && meta.fields.homeMedications) {
    nextDraft.erV1.medicationsSummary = "";
    nextDraft.erV1.medicationSummarySelections = [];
    delete nextFields.homeMedications;
  }

  if (section === "history") {
    if (meta.fields.medicalHistory) {
      nextDraft.erV1.pastMedicalHistory = "";
      delete nextFields.medicalHistory;
    }
    if (meta.fields.surgicalHistory) {
      nextDraft.erV1.pastSurgicalHistory = "";
      delete nextFields.surgicalHistory;
    }
  }

  if (section === "socialHistory") {
    const baselineSnap = meta.sectionSnapshots?.socialHistory;
    let baselineChips: string[] = [];
    if (baselineSnap) {
      try {
        const parsed = JSON.parse(baselineSnap) as Record<string, Record<string, unknown>>;
        for (const part of Object.values(parsed)) {
          const chips = part?.socialHistorySelections;
          if (Array.isArray(chips)) baselineChips.push(...chips.filter((c): c is string => typeof c === "string"));
        }
      } catch {
        baselineChips = [];
      }
    }
    const baselineChipSet = new Set(baselineChips);
    nextDraft.erV1.socialHistorySelections = nextDraft.erV1.socialHistorySelections.filter(
      (c) => !baselineChipSet.has(c)
    );
    if (meta.fields.smokingHistory) {
      nextDraft.erV1.smokingStatus = "";
      delete nextFields.smokingHistory;
    }
    if (meta.fields.alcoholUse) {
      nextDraft.erV1.alcoholUse = "";
      delete nextFields.alcoholUse;
    }
    if (meta.fields.substanceUse) {
      nextDraft.erV1.marijuanaUse = "";
      nextDraft.erV1.stimulantUse = "";
      nextDraft.erV1.opioidHeroinUse = "";
      nextDraft.erV1.historySocialComments = "";
      delete nextFields.substanceUse;
    }
  }

  const sections = getCarriedForwardSections({ ...meta, fields: nextFields });
  const sectionStatus = {
    ...(meta.sectionStatus ?? initializeCarryForwardSectionStatus(meta)),
    [section]: "removed" as const,
  };
  const sectionSnapshots = { ...meta.sectionSnapshots, [section]: sectionSnapshot(nextDraft, section, { ...meta, fields: nextFields }) };
  const fieldSnapshots = buildFieldSnapshots(nextDraft, Object.keys(nextFields) as TriageCarryForwardFieldKey[]);
  const reviewStatus = deriveCarryForwardGlobalStatus(sectionStatus, getCarriedForwardSections({ ...meta, fields: nextFields }));

  return {
    draft: nextDraft,
    meta: {
      ...meta,
      fields: nextFields,
      sectionStatus,
      sectionSnapshots,
      fieldSnapshots,
      reviewStatus,
    },
  };
}

export function confirmCarryForwardSection(
  meta: TriageCarryForwardMeta,
  currentDraft: TriageCarryForwardDraft,
  section: TriageCarryForwardSectionKey,
  options?: { reviewedBy?: string; reviewedAt?: string }
): TriageCarryForwardMeta {
  const evaluated = evaluateCarryForwardSectionStatus(meta, currentDraft, section);
  if (evaluated === "removed") {
    return updateCarryForwardSectionStatus(meta, section, "removed", options);
  }
  return updateCarryForwardSectionStatus(meta, section, "reviewed", options);
}

export function confirmAllCarryForwardSections(
  meta: TriageCarryForwardMeta,
  currentDraft: TriageCarryForwardDraft,
  options?: { reviewedBy?: string; reviewedAt?: string }
): TriageCarryForwardMeta {
  let next = meta;
  for (const section of getCarriedForwardSections(meta)) {
    const evaluated = evaluateCarryForwardSectionStatus(next, currentDraft, section);
    if (evaluated === "removed") {
      next = updateCarryForwardSectionStatus(next, section, "removed", options);
    } else {
      next = updateCarryForwardSectionStatus(next, section, "reviewed", options);
    }
  }
  return next;
}

export function refreshCarryForwardStateFromForm(
  meta: TriageCarryForwardMeta,
  currentDraft: TriageCarryForwardDraft
): TriageCarryForwardMeta {
  const sections = getCarriedForwardSections(meta);
  if (!sections.length) return { ...meta, reviewStatus: "removed" };

  const sectionStatus: Partial<Record<TriageCarryForwardSectionKey, TriageCarryForwardReviewStatus>> = {};
  for (const section of sections) {
    sectionStatus[section] = evaluateCarryForwardSectionStatus(meta, currentDraft, section);
  }

  const reviewStatus = deriveCarryForwardGlobalStatus(sectionStatus, sections);
  return {
    ...meta,
    sectionStatus,
    reviewStatus,
    sectionSnapshots: meta.sectionSnapshots ?? buildSectionSnapshots(currentDraft, sections, meta),
  };
}

/**
 * Extract allowed carry-forward history from a prior encounter triage vitalsJson.
 * Does not read visit-specific triage fields (vitals, ESI, chief complaint, etc.).
 */
export function extractCarryForwardTriageHistory(source: TriageCarryForwardSource): TriageCarryForwardExtraction | null {
  if (!source.patientId?.trim() || !source.encounterId?.trim()) return null;

  const er = readErV1Blob(source.vitalsJson);
  const allergyNote = readAllergyNote(source.vitalsJson);
  const socialSelections = stringArrayField(er.socialHistorySelections, CARRY_FORWARD_SOCIAL_CHIP_SET);

  const fields: Partial<TriageCarryForwardHistoryFields> = {};
  let extractedAllergyNote: string | undefined;

  const medicationAllergiesDetail = strField(er.medicationAllergiesDetail);
  const foodAllergiesDetail = strField(er.foodAllergiesDetail);
  const additionalAllergyInfo = strField(er.additionalAllergyInfo);
  const allergyDetailSelections = stringArrayField(er.allergyDetailSelections);
  if (allergiesFieldGroupHasContent(allergyNote, { medicationAllergiesDetail, foodAllergiesDetail, additionalAllergyInfo, allergyDetailSelections })) {
    if (allergyNote) extractedAllergyNote = allergyNote;
    if (medicationAllergiesDetail) fields.medicationAllergiesDetail = medicationAllergiesDetail;
    if (foodAllergiesDetail) fields.foodAllergiesDetail = foodAllergiesDetail;
    if (additionalAllergyInfo) fields.additionalAllergyInfo = additionalAllergyInfo;
    if (allergyDetailSelections.length) fields.allergyDetailSelections = allergyDetailSelections;
  }

  const medicationsSummary = strField(er.medicationsSummary);
  const medicationSummarySelections = stringArrayField(er.medicationSummarySelections);
  if (homeMedsFieldGroupHasContent({ medicationsSummary, medicationSummarySelections })) {
    if (medicationsSummary) fields.medicationsSummary = medicationsSummary;
    if (medicationSummarySelections.length) fields.medicationSummarySelections = medicationSummarySelections;
  }

  const pastMedicalHistory = strField(er.pastMedicalHistory);
  if (pastMedicalHistory) fields.pastMedicalHistory = pastMedicalHistory;

  const pastSurgicalHistory = strField(er.pastSurgicalHistory);
  if (pastSurgicalHistory) fields.pastSurgicalHistory = pastSurgicalHistory;

  const smokingStatus = strField(er.smokingStatus);
  const alcoholUse = strField(er.alcoholUse);
  const marijuanaUse = strField(er.marijuanaUse);
  const stimulantUse = strField(er.stimulantUse);
  const opioidHeroinUse = strField(er.opioidHeroinUse);
  const historySocialComments = strField(er.historySocialComments);

  if (smokingStatus) fields.smokingStatus = smokingStatus;
  if (alcoholUse) fields.alcoholUse = alcoholUse;
  if (marijuanaUse) fields.marijuanaUse = marijuanaUse;
  if (stimulantUse) fields.stimulantUse = stimulantUse;
  if (opioidHeroinUse) fields.opioidHeroinUse = opioidHeroinUse;
  if (historySocialComments) fields.historySocialComments = historySocialComments;
  if (socialSelections.length) fields.socialHistorySelections = socialSelections;

  const appliedFieldKeys = buildAppliedFieldKeys(extractedAllergyNote ?? "", fields);
  if (!appliedFieldKeys.length) return null;

  return {
    allergyNote: extractedAllergyNote,
    fields,
    appliedFieldKeys,
  };
}

function isEmptyString(v: string | undefined): boolean {
  return !v?.trim();
}

function isEmptyArray(v: string[] | undefined): boolean {
  return !v?.length;
}

function mergeStringField(target: string, incoming: string | undefined): string {
  if (!isEmptyString(target) || isEmptyString(incoming)) return target;
  return incoming!.trim();
}

function mergeArrayField(target: string[], incoming: string[] | undefined): string[] {
  if (target.length > 0 || !incoming?.length) return target;
  return [...incoming];
}

/**
 * Merge carried-forward history into a new triage draft without overwriting existing values.
 */
export function mergeCarryForwardIntoNewTriage(
  targetDraft: TriageCarryForwardDraft,
  extraction: TriageCarryForwardExtraction,
  metaInput: Omit<TriageCarryForwardMeta, "fields" | "reviewStatus" | "fieldSnapshots">
): { draft: TriageCarryForwardDraft; meta: TriageCarryForwardMeta; mergedFieldKeys: TriageCarryForwardFieldKey[] } {
  const mergedEr = { ...targetDraft.erV1 };
  const f = extraction.fields;

  mergedEr.medicationAllergiesDetail = mergeStringField(mergedEr.medicationAllergiesDetail, f.medicationAllergiesDetail);
  mergedEr.foodAllergiesDetail = mergeStringField(mergedEr.foodAllergiesDetail, f.foodAllergiesDetail);
  mergedEr.additionalAllergyInfo = mergeStringField(mergedEr.additionalAllergyInfo, f.additionalAllergyInfo);
  mergedEr.allergyDetailSelections = mergeArrayField(mergedEr.allergyDetailSelections, f.allergyDetailSelections);
  mergedEr.medicationsSummary = mergeStringField(mergedEr.medicationsSummary, f.medicationsSummary);
  mergedEr.medicationSummarySelections = mergeArrayField(mergedEr.medicationSummarySelections, f.medicationSummarySelections);
  mergedEr.pastMedicalHistory = mergeStringField(mergedEr.pastMedicalHistory, f.pastMedicalHistory);
  mergedEr.pastSurgicalHistory = mergeStringField(mergedEr.pastSurgicalHistory, f.pastSurgicalHistory);
  mergedEr.smokingStatus = mergeStringField(mergedEr.smokingStatus, f.smokingStatus);
  mergedEr.alcoholUse = mergeStringField(mergedEr.alcoholUse, f.alcoholUse);
  mergedEr.marijuanaUse = mergeStringField(mergedEr.marijuanaUse, f.marijuanaUse);
  mergedEr.stimulantUse = mergeStringField(mergedEr.stimulantUse, f.stimulantUse);
  mergedEr.opioidHeroinUse = mergeStringField(mergedEr.opioidHeroinUse, f.opioidHeroinUse);
  mergedEr.historySocialComments = mergeStringField(mergedEr.historySocialComments, f.historySocialComments);

  if (isEmptyArray(mergedEr.socialHistorySelections) && f.socialHistorySelections?.length) {
    mergedEr.socialHistorySelections = [...f.socialHistorySelections];
  }

  const allergyNote = mergeStringField(targetDraft.allergyNote, extraction.allergyNote);

  const mergedFieldKeys: TriageCarryForwardFieldKey[] = [];
  const metaFields: Partial<Record<TriageCarryForwardFieldKey, true>> = {};

  for (const key of extraction.appliedFieldKeys) {
    const before = fieldGroupSnapshot(targetDraft, key);
    const after = fieldGroupSnapshot({ allergyNote, erV1: mergedEr }, key);
    if (before !== after) {
      mergedFieldKeys.push(key);
      metaFields[key] = true;
    }
  }

  const mergedDraft: TriageCarryForwardDraft = { allergyNote, erV1: mergedEr };

  const metaFieldsOnly = { fields: metaFields, reviewStatus: "pending_review" as const };
  const sections = getCarriedForwardSections({
    ...metaInput,
    version: TRIAGE_CARRY_FORWARD_VERSION,
    ...metaFieldsOnly,
  } as TriageCarryForwardMeta);
  const sectionStatus: Partial<Record<TriageCarryForwardSectionKey, TriageCarryForwardReviewStatus>> = {};
  for (const section of sections) {
    sectionStatus[section] = "pending_review";
  }

  const meta: TriageCarryForwardMeta = {
    ...metaInput,
    version: TRIAGE_CARRY_FORWARD_VERSION,
    fields: metaFields,
    reviewStatus: "pending_review",
    fieldSnapshots: buildFieldSnapshots(mergedDraft, mergedFieldKeys),
    staleness: computeCarryForwardStaleness(metaInput.sourceEncounterDate),
    sectionStatus,
    sectionSnapshots: buildSectionSnapshots(mergedDraft, sections, {
      ...metaInput,
      version: TRIAGE_CARRY_FORWARD_VERSION,
      fields: metaFields,
      reviewStatus: "pending_review",
    } as TriageCarryForwardMeta),
  };

  return {
    draft: mergedDraft,
    meta,
    mergedFieldKeys,
  };
}

export function evaluateCarryForwardReviewStatus(
  meta: TriageCarryForwardMeta,
  currentDraft: TriageCarryForwardDraft,
  options?: { markReviewed?: boolean; reviewedBy?: string; reviewedAt?: string; nowIso?: string }
): TriageCarryForwardMeta {
  const fieldKeys = Object.keys(meta.fields) as TriageCarryForwardFieldKey[];
  if (!fieldKeys.length) return { ...meta, reviewStatus: "removed" };

  const normalized = normalizeTriageCarryForwardMeta(meta, undefined);

  if (options?.markReviewed) {
    return confirmAllCarryForwardSections(normalized, currentDraft, {
      reviewedBy: options.reviewedBy,
      reviewedAt: options.reviewedAt ?? options.nowIso,
    });
  }

  return refreshCarryForwardStateFromForm(normalized, currentDraft);
}

export type TriageCarryForwardSummaryLine = {
  fieldKey: TriageCarryForwardFieldKey;
  reviewStatus: TriageCarryForwardReviewStatus;
};

export type TriageCarryForwardSummarySection = {
  sectionKey: TriageCarryForwardSectionKey;
  reviewStatus: TriageCarryForwardReviewStatus;
};

export function buildTriageCarryForwardSummary(meta: TriageCarryForwardMeta | null | undefined): {
  sourceEncounterId: string | null;
  sourceEncounterDate: string | null;
  reviewStatus: TriageCarryForwardReviewStatus | null;
  staleness: TriageCarryForwardStaleness | null;
  sections: TriageCarryForwardSummarySection[];
  fields: TriageCarryForwardSummaryLine[];
  reviewedAt: string | null;
  reviewedBy: string | null;
} {
  if (!meta || meta.version !== TRIAGE_CARRY_FORWARD_VERSION) {
    return {
      sourceEncounterId: null,
      sourceEncounterDate: null,
      reviewStatus: null,
      staleness: null,
      sections: [],
      fields: [],
      reviewedAt: null,
      reviewedBy: null,
    };
  }

  const normalized = normalizeTriageCarryForwardMeta(meta);
  const fieldKeys = Object.keys(normalized.fields) as TriageCarryForwardFieldKey[];
  const sections = getCarriedForwardSections(normalized).map((sectionKey) => ({
    sectionKey,
    reviewStatus: normalized.sectionStatus?.[sectionKey] ?? "pending_review",
  }));

  return {
    sourceEncounterId: normalized.sourceEncounterId,
    sourceEncounterDate: normalized.sourceEncounterDate,
    reviewStatus: normalized.reviewStatus,
    staleness: normalized.staleness ?? computeCarryForwardStaleness(normalized.sourceEncounterDate),
    sections,
    reviewedAt: normalized.reviewedAt ?? null,
    reviewedBy: normalized.reviewedBy ?? null,
    fields: fieldKeys.map((fieldKey) => ({
      fieldKey,
      reviewStatus: normalized.sectionStatus?.[fieldKeyToCarryForwardSection(fieldKey)] ?? normalized.reviewStatus,
    })),
  };
}

export function buildTriageCarryForwardAuditMetadata(input: {
  patientId: string;
  encounterId: string;
  meta: TriageCarryForwardMeta;
  actorId?: string;
  timestamp?: string;
}): TriageCarryForwardAuditMetadata {
  const normalized = normalizeTriageCarryForwardMeta(input.meta);
  const sectionKeys = getCarriedForwardSections(normalized);
  return {
    patientId: input.patientId,
    encounterId: input.encounterId,
    sourceEncounterId: normalized.sourceEncounterId,
    fieldKeys: Object.keys(normalized.fields) as TriageCarryForwardFieldKey[],
    sectionKeys,
    reviewStatus: normalized.reviewStatus,
    sectionStatuses: normalized.sectionStatus,
    stalenessLevel: normalized.staleness?.level ?? computeCarryForwardStaleness(normalized.sourceEncounterDate).level,
    actorId: input.actorId,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}

export function triageCarryForwardMetaFromVitalsJson(vitalsJson: unknown): TriageCarryForwardMeta | null {
  if (vitalsJson == null || typeof vitalsJson !== "object" || Array.isArray(vitalsJson)) return null;
  const raw = (vitalsJson as Record<string, unknown>)[TRIAGE_CARRY_FORWARD_META_KEY];
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const m = raw as Record<string, unknown>;
  if (m.version !== TRIAGE_CARRY_FORWARD_VERSION) return null;
  if (typeof m.sourceEncounterId !== "string" || typeof m.sourceEncounterDate !== "string") return null;
  if (typeof m.carriedForwardAt !== "string") return null;
  const reviewStatus = m.reviewStatus;
  if (
    reviewStatus !== "pending_review" &&
    reviewStatus !== "reviewed" &&
    reviewStatus !== "modified" &&
    reviewStatus !== "removed"
  ) {
    return null;
  }
  return m as unknown as TriageCarryForwardMeta;
}

export function attachTriageCarryForwardMetaToVitalsJson(
  vitalsJson: Record<string, unknown> | null,
  meta: TriageCarryForwardMeta | null
): Record<string, unknown> | null {
  const base =
    vitalsJson && typeof vitalsJson === "object" && !Array.isArray(vitalsJson) ? { ...vitalsJson } : {};
  if (!meta || !Object.keys(meta.fields).length) {
    delete base[TRIAGE_CARRY_FORWARD_META_KEY];
    return Object.keys(base).length ? base : null;
  }
  base[TRIAGE_CARRY_FORWARD_META_KEY] = meta;
  return Object.keys(base).length ? base : null;
}

/** Guard: extraction output must not include forbidden visit-specific keys. */
export function carryForwardExtractionExcludesForbiddenFields(extraction: TriageCarryForwardExtraction): boolean {
  const keys = Object.keys(extraction.fields);
  for (const forbidden of TRIAGE_CARRY_FORWARD_FORBIDDEN_ER_V1_KEYS) {
    if (keys.includes(forbidden)) return false;
  }
  return true;
}
