/**
 * ER Nursing Progress / Reassessment V1 — stored under `Encounter.nursingAssessment.erNursingReassessmentV1` (Json).
 * Persists via existing PATCH /encounters/:id (merge with other nursingAssessment keys). No backend migration.
 */

import { productUiBcp47Tag, type SupportedLanguage } from "@/i18n/config";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { formatVitalsHeaderLineForLocale } from "@/lib/patientVitals";

export const ER_NURSING_REASSESSMENT_V1_KEY = "erNursingReassessmentV1" as const;

/** Legacy ABCD-style values (prior reassessment saves). */
export type ErNursingAbcLegacy = "wnl" | "yes" | "no" | "unknown";

/** Airway / breathing / circulation reassessment (string codes in JSON; legacy values still load). */
export type ErAbcOption =
  | ""
  | ErNursingAbcLegacy
  | "air_patent"
  | "air_needs_suction"
  | "air_obstructed_concern"
  | "air_support_in_place"
  | "air_unable_to_assess"
  | "br_even_unlabored"
  | "br_increased_wob"
  | "br_wheezing"
  | "br_sob"
  | "br_o2_in_use"
  | "br_unable_to_assess"
  | "circ_warm_perfused"
  | "circ_pale_cool"
  | "circ_diaphoretic"
  | "circ_weak_pulses"
  | "circ_hypotension_concern"
  | "circ_unable_to_assess";

/** Patient trend (string codes in JSON; legacy improved/worse normalized on read). */
export type ErTrend =
  | ""
  | "improved"
  | "unchanged"
  | "worse"
  | "improving"
  | "stable"
  | "worsening"
  | "awaiting_reassessment"
  | "provider_notified"
  | "unable_to_assess";

/**
 * Phase-2 structured nursing fields stored alongside the existing reassessment blob (no migration —
 * `Encounter.nursingAssessment` is `Json?`). Codes are stable; legacy/unknown values normalize to "".
 */
export type ErMentalStatus =
  | ""
  | "alert"
  | "drowsy"
  | "confused"
  | "agitated"
  | "lethargic"
  | "unresponsive"
  | "unable_to_assess"
  | "other";

export type ErOrientation =
  | ""
  | "oriented_x4"
  | "oriented_x3"
  | "oriented_x2"
  | "oriented_x1"
  | "disoriented"
  | "unable_to_assess"
  | "other";

export type ErSpeech =
  | ""
  | "clear"
  | "slurred"
  | "aphasic"
  | "mute"
  | "unable_to_assess"
  | "other";

export type ErRespiratoryPattern =
  | ""
  | "regular"
  | "irregular"
  | "shallow"
  | "labored"
  | "cheyne_stokes"
  | "kussmaul"
  | "unable_to_assess"
  | "other";

export type ErCardiacRhythm =
  | ""
  | "regular"
  | "irregular"
  | "tachycardic"
  | "bradycardic"
  | "pulseless_concern"
  | "unable_to_assess"
  | "other";

export type ErFallRisk =
  | ""
  | "low"
  | "moderate"
  | "high"
  | "unable_to_assess"
  | "other";

/** Phase-2b additional structured rows (JSON-only, no migration). */
export type ErGeneralAppearanceCode =
  | ""
  | "well_appearing"
  | "ill_appearing"
  | "anxious"
  | "comfortable"
  | "in_pain"
  | "lethargic"
  | "diaphoretic"
  | "unable_to_assess"
  | "other";

export type ErSkinCondition =
  | ""
  | "warm_dry_intact"
  | "warm_diaphoretic"
  | "cool_clammy"
  | "pale"
  | "flushed"
  | "cyanotic"
  | "jaundiced"
  | "mottled"
  | "wound_present"
  | "unable_to_assess"
  | "other";

export type ErAmbulation =
  | ""
  | "independent"
  | "ambulatory_with_help"
  | "with_walker"
  | "with_cane"
  | "wheelchair"
  | "bedbound"
  | "unable_to_assess"
  | "other";

export type ErSafetyRisk =
  | ""
  | "none"
  | "fall_risk"
  | "elopement_risk"
  | "self_harm_risk"
  | "violence_risk"
  | "isolation_required"
  | "unable_to_assess"
  | "other";

export type ErDistressLevel =
  | ""
  | "none"
  | "mild"
  | "moderate"
  | "severe"
  | "life_threatening"
  | "unable_to_assess"
  | "other";

/**
 * Phase-3 mockup-aligned structured rows. These split the prior `ErAbcOption` macro-codes
 * (`air_patent`, `br_even_unlabored`, `circ_warm_perfused`, …) into finer-grained dropdowns that
 * match the bedside flowsheet vocabulary: airway type / respiratory effort / depth / chest
 * movement, plus cardiac ectopy, generalised skin and IV access. Saved alongside the existing
 * `airway`/`breathing`/`circulation` fields so old records keep rendering and a slow rollout
 * remains possible. JSON-additive — no Prisma migration.
 */
export type ErAirwayType =
  | ""
  | "natural"
  | "oral_airway"
  | "nasal_airway"
  | "intubated"
  | "tracheostomy"
  | "unable_to_assess"
  | "other";

export type ErRespEffort =
  | ""
  | "unlabored"
  | "mild_distress"
  | "moderate_distress"
  | "severe_distress"
  | "unable_to_assess"
  | "other";

export type ErRespDepth =
  | ""
  | "normal"
  | "shallow"
  | "deep"
  | "unable_to_assess"
  | "other";

export type ErRespChestMovement =
  | ""
  | "symmetrical"
  | "asymmetrical"
  | "paradoxical"
  | "unable_to_assess"
  | "other";

export type ErCardiacEctopy =
  | ""
  | "none"
  | "pacs"
  | "pvcs"
  | "couplets"
  | "runs_vt"
  | "unable_to_assess"
  | "other";

export type ErIvAccess =
  | ""
  | "none"
  | "peripheral_18g"
  | "peripheral_20g"
  | "peripheral_22g"
  | "central_line"
  | "intraosseous"
  | "port"
  | "saline_lock"
  | "unable_to_assess"
  | "other";

export type ErNursingReassessmentForm = {
  reassessmentAt: string;
  narrative: string;
  generalAppearance: string;
  pain0to10: string;
  bedsideStatus: string;
  airway: ErAbcOption;
  breathing: ErAbcOption;
  circulation: ErAbcOption;
  vitalsSummaryNote: string;
  responseToTreatment: string;
  trend: ErTrend;
  interventionsPerformed: string;
  safetyRoundingNote: string;
  /**
   * Care / monitoring summary — additive JSON-only field. Stores the chip-multi serialization
   * (one selected option label per line) for the "Care / monitoring summary" row inside the
   * column grid. Backwards-compatible: legacy events without this key just render `""`. Not
   * a schema change — `Encounter.nursingAssessment` is `Json?`.
   */
  careMonitoringSummary: string;
  addendum: string;
  /** Phase-2 structured rows surfaced in the column-style documentation grid. */
  mentalStatus: ErMentalStatus;
  orientation: ErOrientation;
  speech: ErSpeech;
  respiratoryPattern: ErRespiratoryPattern;
  cardiacRhythm: ErCardiacRhythm;
  fallRisk: ErFallRisk;
  /** Phase-2b additional structured rows. Free-text `generalAppearance` is preserved separately. */
  generalAppearanceCode: ErGeneralAppearanceCode;
  skinCondition: ErSkinCondition;
  ambulation: ErAmbulation;
  safetyRisk: ErSafetyRisk;
  distressLevel: ErDistressLevel;
  /**
   * Phase-3 mockup-aligned structured rows. These coexist with `airway`/`breathing`/`circulation`
   * (legacy `ErAbcOption` codes) — both render in the grid; new entries go through these
   * finer-grained fields, while older records keep rendering through the legacy ones.
   */
  airwayType: ErAirwayType;
  respEffortBreathing: ErRespEffort;
  respDepth: ErRespDepth;
  respChestMovement: ErRespChestMovement;
  cardiacEctopy: ErCardiacEctopy;
  ivAccess: ErIvAccess;
};

export function emptyErNursingReassessmentForm(): ErNursingReassessmentForm {
  return {
    reassessmentAt: "",
    narrative: "",
    generalAppearance: "",
    pain0to10: "",
    bedsideStatus: "",
    airway: "",
    breathing: "",
    circulation: "",
    vitalsSummaryNote: "",
    responseToTreatment: "",
    trend: "",
    interventionsPerformed: "",
    safetyRoundingNote: "",
    careMonitoringSummary: "",
    addendum: "",
    mentalStatus: "",
    orientation: "",
    speech: "",
    respiratoryPattern: "",
    cardiacRhythm: "",
    fallRisk: "",
    generalAppearanceCode: "",
    skinCondition: "",
    ambulation: "",
    safetyRisk: "",
    distressLevel: "",
    airwayType: "",
    respEffortBreathing: "",
    respDepth: "",
    respChestMovement: "",
    cardiacEctopy: "",
    ivAccess: "",
  };
}

export type ErNursingReassessmentSignature = {
  savedAt: string;
  savedByDisplayName: string;
};

export type ErNursingReassessmentStored = {
  reassessmentAt: string | null;
  narrative: string;
  generalAppearance: string;
  pain0to10: number | null;
  bedsideStatus: string;
  airway: ErAbcOption;
  breathing: ErAbcOption;
  circulation: ErAbcOption;
  vitalsSummaryNote: string;
  responseToTreatment: string;
  trend: ErTrend;
  interventionsPerformed: string;
  safetyRoundingNote: string;
  /** Optional — present on saves made after the chip-multi flowsheet rollout. */
  careMonitoringSummary?: string;
  addendum: string;
  /** Phase-2 structured fields (optional; absent on legacy saves). */
  mentalStatus?: ErMentalStatus;
  orientation?: ErOrientation;
  speech?: ErSpeech;
  respiratoryPattern?: ErRespiratoryPattern;
  cardiacRhythm?: ErCardiacRhythm;
  fallRisk?: ErFallRisk;
  /** Phase-2b additional structured fields. */
  generalAppearanceCode?: ErGeneralAppearanceCode;
  skinCondition?: ErSkinCondition;
  ambulation?: ErAmbulation;
  safetyRisk?: ErSafetyRisk;
  distressLevel?: ErDistressLevel;
  /** Phase-3 mockup-aligned structured fields (optional; absent on older saves). */
  airwayType?: ErAirwayType;
  respEffortBreathing?: ErRespEffort;
  respDepth?: ErRespDepth;
  respChestMovement?: ErRespChestMovement;
  cardiacEctopy?: ErCardiacEctopy;
  ivAccess?: ErIvAccess;
  signature?: ErNursingReassessmentSignature;
};

/** Dropdown order: clinical options first, then legacy scale (prior saves). */
export const ER_NURSING_AIRWAY_SELECT_OPTIONS: readonly ErAbcOption[] = [
  "air_patent",
  "air_needs_suction",
  "air_obstructed_concern",
  "air_support_in_place",
  "air_unable_to_assess",
  "wnl",
  "yes",
  "no",
  "unknown",
];

export const ER_NURSING_BREATHING_SELECT_OPTIONS: readonly ErAbcOption[] = [
  "br_even_unlabored",
  "br_increased_wob",
  "br_wheezing",
  "br_sob",
  "br_o2_in_use",
  "br_unable_to_assess",
  "wnl",
  "yes",
  "no",
  "unknown",
];

export const ER_NURSING_CIRCULATION_SELECT_OPTIONS: readonly ErAbcOption[] = [
  "circ_warm_perfused",
  "circ_pale_cool",
  "circ_diaphoretic",
  "circ_weak_pulses",
  "circ_hypotension_concern",
  "circ_unable_to_assess",
  "wnl",
  "yes",
  "no",
  "unknown",
];

const NURSING_ABC_VALUES = new Set<string>([
  ...ER_NURSING_AIRWAY_SELECT_OPTIONS,
  ...ER_NURSING_BREATHING_SELECT_OPTIONS,
  ...ER_NURSING_CIRCULATION_SELECT_OPTIONS,
]);

function abcFromUnknown(v: unknown): ErAbcOption {
  const s = typeof v === "string" ? v : "";
  if (!s) return "";
  return NURSING_ABC_VALUES.has(s) ? (s as ErAbcOption) : "";
}

const NURSING_TREND_VALUES = new Set<string>([
  "improved",
  "unchanged",
  "worse",
  "improving",
  "stable",
  "worsening",
  "awaiting_reassessment",
  "provider_notified",
  "unable_to_assess",
]);

/** Phase-2 structured option lists (clinically conservative; English codes / FR labels via i18n). */
/**
 * Option lists for structured nursing rows. Per the clinical-flexibility rule, every list ends
 * with `unable_to_assess` followed by `other`, and the dropdown UI always offers a leading
 * blank state — nurses can never be hard-forced into a specific code. `other` lets the nurse pick
 * a clinically-meaningful "off-list" without dropping back to free-text.
 */
export const ER_NURSING_MENTAL_STATUS_OPTIONS: readonly ErMentalStatus[] = [
  "alert",
  "drowsy",
  "confused",
  "agitated",
  "lethargic",
  "unresponsive",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_ORIENTATION_OPTIONS: readonly ErOrientation[] = [
  "oriented_x4",
  "oriented_x3",
  "oriented_x2",
  "oriented_x1",
  "disoriented",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_SPEECH_OPTIONS: readonly ErSpeech[] = [
  "clear",
  "slurred",
  "aphasic",
  "mute",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_RESPIRATORY_PATTERN_OPTIONS: readonly ErRespiratoryPattern[] = [
  "regular",
  "irregular",
  "shallow",
  "labored",
  "cheyne_stokes",
  "kussmaul",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_CARDIAC_RHYTHM_OPTIONS: readonly ErCardiacRhythm[] = [
  "regular",
  "irregular",
  "tachycardic",
  "bradycardic",
  "pulseless_concern",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_FALL_RISK_OPTIONS: readonly ErFallRisk[] = [
  "low",
  "moderate",
  "high",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_GENERAL_APPEARANCE_OPTIONS: readonly ErGeneralAppearanceCode[] = [
  "well_appearing",
  "ill_appearing",
  "anxious",
  "comfortable",
  "in_pain",
  "lethargic",
  "diaphoretic",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_SKIN_CONDITION_OPTIONS: readonly ErSkinCondition[] = [
  "warm_dry_intact",
  "warm_diaphoretic",
  "cool_clammy",
  "pale",
  "flushed",
  "cyanotic",
  "jaundiced",
  "mottled",
  "wound_present",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_AMBULATION_OPTIONS: readonly ErAmbulation[] = [
  "independent",
  "ambulatory_with_help",
  "with_walker",
  "with_cane",
  "wheelchair",
  "bedbound",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_SAFETY_RISK_OPTIONS: readonly ErSafetyRisk[] = [
  "none",
  "fall_risk",
  "elopement_risk",
  "self_harm_risk",
  "violence_risk",
  "isolation_required",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_DISTRESS_LEVEL_OPTIONS: readonly ErDistressLevel[] = [
  "none",
  "mild",
  "moderate",
  "severe",
  "life_threatening",
  "unable_to_assess",
  "other",
];

const NURSING_MENTAL_STATUS_VALUES = new Set<string>(ER_NURSING_MENTAL_STATUS_OPTIONS);
const NURSING_ORIENTATION_VALUES = new Set<string>(ER_NURSING_ORIENTATION_OPTIONS);
const NURSING_SPEECH_VALUES = new Set<string>(ER_NURSING_SPEECH_OPTIONS);
const NURSING_RESP_PATTERN_VALUES = new Set<string>(ER_NURSING_RESPIRATORY_PATTERN_OPTIONS);
const NURSING_CARDIAC_RHYTHM_VALUES = new Set<string>(ER_NURSING_CARDIAC_RHYTHM_OPTIONS);
const NURSING_FALL_RISK_VALUES = new Set<string>(ER_NURSING_FALL_RISK_OPTIONS);

function mentalStatusFromUnknown(v: unknown): ErMentalStatus {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_MENTAL_STATUS_VALUES.has(s) ? (s as ErMentalStatus) : "";
}

function orientationFromUnknown(v: unknown): ErOrientation {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_ORIENTATION_VALUES.has(s) ? (s as ErOrientation) : "";
}

function speechFromUnknown(v: unknown): ErSpeech {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_SPEECH_VALUES.has(s) ? (s as ErSpeech) : "";
}

function respiratoryPatternFromUnknown(v: unknown): ErRespiratoryPattern {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_RESP_PATTERN_VALUES.has(s) ? (s as ErRespiratoryPattern) : "";
}

function cardiacRhythmFromUnknown(v: unknown): ErCardiacRhythm {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_CARDIAC_RHYTHM_VALUES.has(s) ? (s as ErCardiacRhythm) : "";
}

function fallRiskFromUnknown(v: unknown): ErFallRisk {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_FALL_RISK_VALUES.has(s) ? (s as ErFallRisk) : "";
}

const NURSING_GENERAL_APPEARANCE_VALUES = new Set<string>(ER_NURSING_GENERAL_APPEARANCE_OPTIONS);
const NURSING_SKIN_CONDITION_VALUES = new Set<string>(ER_NURSING_SKIN_CONDITION_OPTIONS);
const NURSING_AMBULATION_VALUES = new Set<string>(ER_NURSING_AMBULATION_OPTIONS);
const NURSING_SAFETY_RISK_VALUES = new Set<string>(ER_NURSING_SAFETY_RISK_OPTIONS);
const NURSING_DISTRESS_LEVEL_VALUES = new Set<string>(ER_NURSING_DISTRESS_LEVEL_OPTIONS);

function generalAppearanceCodeFromUnknown(v: unknown): ErGeneralAppearanceCode {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_GENERAL_APPEARANCE_VALUES.has(s) ? (s as ErGeneralAppearanceCode) : "";
}

function skinConditionFromUnknown(v: unknown): ErSkinCondition {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_SKIN_CONDITION_VALUES.has(s) ? (s as ErSkinCondition) : "";
}

function ambulationFromUnknown(v: unknown): ErAmbulation {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_AMBULATION_VALUES.has(s) ? (s as ErAmbulation) : "";
}

function safetyRiskFromUnknown(v: unknown): ErSafetyRisk {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_SAFETY_RISK_VALUES.has(s) ? (s as ErSafetyRisk) : "";
}

function distressLevelFromUnknown(v: unknown): ErDistressLevel {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_DISTRESS_LEVEL_VALUES.has(s) ? (s as ErDistressLevel) : "";
}

/**
 * Phase-3 mockup-aligned option lists. Every list ends with `unable_to_assess` then `other`,
 * and the dropdown UI offers a leading blank state so nurses are never hard-forced into a code.
 */
export const ER_NURSING_AIRWAY_TYPE_OPTIONS: readonly ErAirwayType[] = [
  "natural",
  "oral_airway",
  "nasal_airway",
  "intubated",
  "tracheostomy",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_RESP_EFFORT_OPTIONS: readonly ErRespEffort[] = [
  "unlabored",
  "mild_distress",
  "moderate_distress",
  "severe_distress",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_RESP_DEPTH_OPTIONS: readonly ErRespDepth[] = [
  "normal",
  "shallow",
  "deep",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_RESP_CHEST_MOVEMENT_OPTIONS: readonly ErRespChestMovement[] = [
  "symmetrical",
  "asymmetrical",
  "paradoxical",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_CARDIAC_ECTOPY_OPTIONS: readonly ErCardiacEctopy[] = [
  "none",
  "pacs",
  "pvcs",
  "couplets",
  "runs_vt",
  "unable_to_assess",
  "other",
];

export const ER_NURSING_IV_ACCESS_OPTIONS: readonly ErIvAccess[] = [
  "none",
  "peripheral_18g",
  "peripheral_20g",
  "peripheral_22g",
  "central_line",
  "intraosseous",
  "port",
  "saline_lock",
  "unable_to_assess",
  "other",
];

const NURSING_AIRWAY_TYPE_VALUES = new Set<string>(ER_NURSING_AIRWAY_TYPE_OPTIONS);
const NURSING_RESP_EFFORT_VALUES = new Set<string>(ER_NURSING_RESP_EFFORT_OPTIONS);
const NURSING_RESP_DEPTH_VALUES = new Set<string>(ER_NURSING_RESP_DEPTH_OPTIONS);
const NURSING_RESP_CHEST_MOVEMENT_VALUES = new Set<string>(ER_NURSING_RESP_CHEST_MOVEMENT_OPTIONS);
const NURSING_CARDIAC_ECTOPY_VALUES = new Set<string>(ER_NURSING_CARDIAC_ECTOPY_OPTIONS);
const NURSING_IV_ACCESS_VALUES = new Set<string>(ER_NURSING_IV_ACCESS_OPTIONS);

function airwayTypeFromUnknown(v: unknown): ErAirwayType {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_AIRWAY_TYPE_VALUES.has(s) ? (s as ErAirwayType) : "";
}

function respEffortFromUnknown(v: unknown): ErRespEffort {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_RESP_EFFORT_VALUES.has(s) ? (s as ErRespEffort) : "";
}

function respDepthFromUnknown(v: unknown): ErRespDepth {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_RESP_DEPTH_VALUES.has(s) ? (s as ErRespDepth) : "";
}

function respChestMovementFromUnknown(v: unknown): ErRespChestMovement {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_RESP_CHEST_MOVEMENT_VALUES.has(s) ? (s as ErRespChestMovement) : "";
}

function cardiacEctopyFromUnknown(v: unknown): ErCardiacEctopy {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_CARDIAC_ECTOPY_VALUES.has(s) ? (s as ErCardiacEctopy) : "";
}

function ivAccessFromUnknown(v: unknown): ErIvAccess {
  const s = typeof v === "string" ? v : "";
  return s && NURSING_IV_ACCESS_VALUES.has(s) ? (s as ErIvAccess) : "";
}

/** Dropdown order for patient trend (legacy improved/worse normalized on load). */
export const ER_NURSING_TREND_SELECT_OPTIONS: readonly ErTrend[] = [
  "improving",
  "stable",
  "unchanged",
  "worsening",
  "awaiting_reassessment",
  "provider_notified",
  "unable_to_assess",
];

function trendFromUnknown(v: unknown): ErTrend {
  const s = typeof v === "string" ? v : "";
  if (!s) return "";
  if (!NURSING_TREND_VALUES.has(s)) return "";
  if (s === "improved") return "improving";
  if (s === "worse") return "worsening";
  return s as ErTrend;
}

export function erNursingReassessmentFormFromEncounter(nursingAssessment: unknown): ErNursingReassessmentForm {
  const e = emptyErNursingReassessmentForm();
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) return e;
  const raw = (nursingAssessment as Record<string, unknown>)[ER_NURSING_REASSESSMENT_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return e;
  const o = raw as Record<string, unknown>;

  const ra = o.reassessmentAt;
  if (typeof ra === "string" && ra) {
    try {
      e.reassessmentAt = new Date(ra).toISOString().slice(0, 16);
    } catch {
      e.reassessmentAt = "";
    }
  }
  e.narrative = typeof o.narrative === "string" ? o.narrative : "";
  e.generalAppearance = typeof o.generalAppearance === "string" ? o.generalAppearance : "";
  e.pain0to10 =
    typeof o.pain0to10 === "number" && !Number.isNaN(o.pain0to10) ? String(Math.min(10, Math.max(0, o.pain0to10))) : "";
  e.bedsideStatus = typeof o.bedsideStatus === "string" ? o.bedsideStatus : "";
  e.airway = abcFromUnknown(o.airway);
  e.breathing = abcFromUnknown(o.breathing);
  e.circulation = abcFromUnknown(o.circulation);
  e.vitalsSummaryNote = typeof o.vitalsSummaryNote === "string" ? o.vitalsSummaryNote : "";
  e.responseToTreatment = typeof o.responseToTreatment === "string" ? o.responseToTreatment : "";
  e.trend = trendFromUnknown(o.trend);
  e.interventionsPerformed = typeof o.interventionsPerformed === "string" ? o.interventionsPerformed : "";
  e.safetyRoundingNote = typeof o.safetyRoundingNote === "string" ? o.safetyRoundingNote : "";
  e.careMonitoringSummary = typeof o.careMonitoringSummary === "string" ? o.careMonitoringSummary : "";
  e.addendum = typeof o.addendum === "string" ? o.addendum : "";
  e.mentalStatus = mentalStatusFromUnknown(o.mentalStatus);
  e.orientation = orientationFromUnknown(o.orientation);
  e.speech = speechFromUnknown(o.speech);
  e.respiratoryPattern = respiratoryPatternFromUnknown(o.respiratoryPattern);
  e.cardiacRhythm = cardiacRhythmFromUnknown(o.cardiacRhythm);
  e.fallRisk = fallRiskFromUnknown(o.fallRisk);
  e.generalAppearanceCode = generalAppearanceCodeFromUnknown(o.generalAppearanceCode);
  e.skinCondition = skinConditionFromUnknown(o.skinCondition);
  e.ambulation = ambulationFromUnknown(o.ambulation);
  e.safetyRisk = safetyRiskFromUnknown(o.safetyRisk);
  e.distressLevel = distressLevelFromUnknown(o.distressLevel);
  e.airwayType = airwayTypeFromUnknown(o.airwayType);
  e.respEffortBreathing = respEffortFromUnknown(o.respEffortBreathing);
  e.respDepth = respDepthFromUnknown(o.respDepth);
  e.respChestMovement = respChestMovementFromUnknown(o.respChestMovement);
  e.cardiacEctopy = cardiacEctopyFromUnknown(o.cardiacEctopy);
  e.ivAccess = ivAccessFromUnknown(o.ivAccess);
  return e;
}

function formToStored(form: ErNursingReassessmentForm, signature: ErNursingReassessmentSignature): ErNursingReassessmentStored {
  const pain =
    form.pain0to10.trim() === "" ? null : Math.min(10, Math.max(0, parseInt(form.pain0to10, 10) || 0));
  return {
    reassessmentAt: form.reassessmentAt ? new Date(form.reassessmentAt).toISOString() : null,
    narrative: form.narrative.trim().slice(0, 8000),
    generalAppearance: form.generalAppearance.trim().slice(0, 4000),
    pain0to10: pain,
    bedsideStatus: form.bedsideStatus.trim().slice(0, 2000),
    airway: form.airway,
    breathing: form.breathing,
    circulation: form.circulation,
    vitalsSummaryNote: form.vitalsSummaryNote.trim().slice(0, 2000),
    responseToTreatment: form.responseToTreatment.trim().slice(0, 4000),
    trend: form.trend,
    interventionsPerformed: form.interventionsPerformed.trim().slice(0, 8000),
    safetyRoundingNote: form.safetyRoundingNote.trim().slice(0, 4000),
    ...(form.careMonitoringSummary.trim()
      ? { careMonitoringSummary: form.careMonitoringSummary.trim().slice(0, 4000) }
      : {}),
    addendum: form.addendum.trim().slice(0, 8000),
    ...(form.mentalStatus ? { mentalStatus: form.mentalStatus } : {}),
    ...(form.orientation ? { orientation: form.orientation } : {}),
    ...(form.speech ? { speech: form.speech } : {}),
    ...(form.respiratoryPattern ? { respiratoryPattern: form.respiratoryPattern } : {}),
    ...(form.cardiacRhythm ? { cardiacRhythm: form.cardiacRhythm } : {}),
    ...(form.fallRisk ? { fallRisk: form.fallRisk } : {}),
    ...(form.generalAppearanceCode ? { generalAppearanceCode: form.generalAppearanceCode } : {}),
    ...(form.skinCondition ? { skinCondition: form.skinCondition } : {}),
    ...(form.ambulation ? { ambulation: form.ambulation } : {}),
    ...(form.safetyRisk ? { safetyRisk: form.safetyRisk } : {}),
    ...(form.distressLevel ? { distressLevel: form.distressLevel } : {}),
    ...(form.airwayType ? { airwayType: form.airwayType } : {}),
    ...(form.respEffortBreathing ? { respEffortBreathing: form.respEffortBreathing } : {}),
    ...(form.respDepth ? { respDepth: form.respDepth } : {}),
    ...(form.respChestMovement ? { respChestMovement: form.respChestMovement } : {}),
    ...(form.cardiacEctopy ? { cardiacEctopy: form.cardiacEctopy } : {}),
    ...(form.ivAccess ? { ivAccess: form.ivAccess } : {}),
    signature,
  };
}

/** True if stored object has any clinical content (signature alone does not count). */
export function storedHasClinicalContent(s: ErNursingReassessmentStored): boolean {
  return Boolean(
    s.reassessmentAt ||
      s.narrative.trim() ||
      s.generalAppearance.trim() ||
      s.pain0to10 != null ||
      s.bedsideStatus.trim() ||
      s.airway ||
      s.breathing ||
      s.circulation ||
      s.vitalsSummaryNote.trim() ||
      s.responseToTreatment.trim() ||
      s.trend ||
      s.interventionsPerformed.trim() ||
      s.safetyRoundingNote.trim() ||
      (s.careMonitoringSummary ?? "").trim() ||
      s.addendum.trim() ||
      s.mentalStatus ||
      s.orientation ||
      s.speech ||
      s.respiratoryPattern ||
      s.cardiacRhythm ||
      s.fallRisk ||
      s.generalAppearanceCode ||
      s.skinCondition ||
      s.ambulation ||
      s.safetyRisk ||
      s.distressLevel ||
      s.airwayType ||
      s.respEffortBreathing ||
      s.respDepth ||
      s.respChestMovement ||
      s.cardiacEctopy ||
      s.ivAccess
  );
}

/**
 * Merge ER reassessment blob into full nursingAssessment for PATCH.
 * Preserves nursingEvalV1, physicianEvalV1, etc.
 */
export function mergeErNursingReassessmentIntoNursingAssessment(
  previousNursingAssessment: unknown,
  form: ErNursingReassessmentForm,
  signature: ErNursingReassessmentSignature
): Record<string, unknown> {
  const base =
    previousNursingAssessment && typeof previousNursingAssessment === "object" && !Array.isArray(previousNursingAssessment)
      ? { ...(previousNursingAssessment as Record<string, unknown>) }
      : {};
  const stored = formToStored(form, signature);
  if (storedHasClinicalContent(stored)) {
    base[ER_NURSING_REASSESSMENT_V1_KEY] = stored;
  } else {
    delete base[ER_NURSING_REASSESSMENT_V1_KEY];
  }
  return base;
}

function interpolatePreviewModel(template: string, vars: Record<string, string | number>): string {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

function previewModelString(locale: SupportedLanguage, key: string): string {
  return i18nMessage(locale, `emergencyNursingReassessment.previewModel.${key}`);
}

function abcOptionLabel(locale: SupportedLanguage, v: ErAbcOption): string {
  if (v === "wnl") return i18nMessage(locale, "emergencyNursingReassessment.abcOptionWnl");
  if (v === "yes") return i18nMessage(locale, "emergencyNursingReassessment.abcOptionYes");
  if (v === "no") return i18nMessage(locale, "emergencyNursingReassessment.abcOptionNo");
  if (v === "unknown") return i18nMessage(locale, "emergencyNursingReassessment.abcOptionUnknown");
  if (v === "air_patent") return i18nMessage(locale, "emergencyNursingReassessment.abcAirPatent");
  if (v === "air_needs_suction") return i18nMessage(locale, "emergencyNursingReassessment.abcAirNeedsSuction");
  if (v === "air_obstructed_concern") return i18nMessage(locale, "emergencyNursingReassessment.abcAirObstructedConcern");
  if (v === "air_support_in_place") return i18nMessage(locale, "emergencyNursingReassessment.abcAirSupportInPlace");
  if (v === "air_unable_to_assess") return i18nMessage(locale, "emergencyNursingReassessment.abcAirUnableToAssess");
  if (v === "br_even_unlabored") return i18nMessage(locale, "emergencyNursingReassessment.abcBrEvenUnlabored");
  if (v === "br_increased_wob") return i18nMessage(locale, "emergencyNursingReassessment.abcBrIncreasedWob");
  if (v === "br_wheezing") return i18nMessage(locale, "emergencyNursingReassessment.abcBrWheezing");
  if (v === "br_sob") return i18nMessage(locale, "emergencyNursingReassessment.abcBrSob");
  if (v === "br_o2_in_use") return i18nMessage(locale, "emergencyNursingReassessment.abcBrO2InUse");
  if (v === "br_unable_to_assess") return i18nMessage(locale, "emergencyNursingReassessment.abcBrUnableToAssess");
  if (v === "circ_warm_perfused") return i18nMessage(locale, "emergencyNursingReassessment.abcCircWarmPerfused");
  if (v === "circ_pale_cool") return i18nMessage(locale, "emergencyNursingReassessment.abcCircPaleCool");
  if (v === "circ_diaphoretic") return i18nMessage(locale, "emergencyNursingReassessment.abcCircDiaphoretic");
  if (v === "circ_weak_pulses") return i18nMessage(locale, "emergencyNursingReassessment.abcCircWeakPulses");
  if (v === "circ_hypotension_concern") return i18nMessage(locale, "emergencyNursingReassessment.abcCircHypotensionConcern");
  if (v === "circ_unable_to_assess") return i18nMessage(locale, "emergencyNursingReassessment.abcCircUnableToAssess");
  return "";
}

/** Phase-2 select labels (i18n-driven). Values are stable English codes. */
export function nursingMentalStatusLabel(locale: SupportedLanguage, v: ErMentalStatus): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.mentalStatusOptions.${v}`);
}

export function nursingOrientationLabel(locale: SupportedLanguage, v: ErOrientation): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.orientationOptions.${v}`);
}

export function nursingSpeechLabel(locale: SupportedLanguage, v: ErSpeech): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.speechOptions.${v}`);
}

export function nursingRespiratoryPatternLabel(
  locale: SupportedLanguage,
  v: ErRespiratoryPattern
): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.respiratoryPatternOptions.${v}`);
}

export function nursingCardiacRhythmLabel(locale: SupportedLanguage, v: ErCardiacRhythm): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.cardiacRhythmOptions.${v}`);
}

export function nursingFallRiskLabel(locale: SupportedLanguage, v: ErFallRisk): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.fallRiskOptions.${v}`);
}

export function nursingGeneralAppearanceLabel(
  locale: SupportedLanguage,
  v: ErGeneralAppearanceCode
): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.generalAppearanceOptions.${v}`);
}

export function nursingSkinConditionLabel(locale: SupportedLanguage, v: ErSkinCondition): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.skinConditionOptions.${v}`);
}

export function nursingAmbulationLabel(locale: SupportedLanguage, v: ErAmbulation): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.ambulationOptions.${v}`);
}

export function nursingSafetyRiskLabel(locale: SupportedLanguage, v: ErSafetyRisk): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.safetyRiskOptions.${v}`);
}

export function nursingDistressLevelLabel(locale: SupportedLanguage, v: ErDistressLevel): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.distressLevelOptions.${v}`);
}

/** Phase-3 label resolvers for the mockup-aligned dropdowns (i18n-driven). */
export function nursingAirwayTypeLabel(locale: SupportedLanguage, v: ErAirwayType): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.airwayTypeOptions.${v}`);
}

export function nursingRespEffortLabel(locale: SupportedLanguage, v: ErRespEffort): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.respEffortOptions.${v}`);
}

export function nursingRespDepthLabel(locale: SupportedLanguage, v: ErRespDepth): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.respDepthOptions.${v}`);
}

export function nursingRespChestMovementLabel(
  locale: SupportedLanguage,
  v: ErRespChestMovement
): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.respChestMovementOptions.${v}`);
}

export function nursingCardiacEctopyLabel(locale: SupportedLanguage, v: ErCardiacEctopy): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.cardiacEctopyOptions.${v}`);
}

export function nursingIvAccessLabel(locale: SupportedLanguage, v: ErIvAccess): string {
  if (!v) return "";
  return i18nMessage(locale, `emergencyNursingReassessment.ivAccessOptions.${v}`);
}

function trendLineLabel(locale: SupportedLanguage, v: ErTrend): string {
  if (v === "improved" || v === "improving") return i18nMessage(locale, "emergencyNursingReassessment.trendImproving");
  if (v === "unchanged") return i18nMessage(locale, "emergencyNursingReassessment.trendUnchanged");
  if (v === "worse" || v === "worsening") return i18nMessage(locale, "emergencyNursingReassessment.trendWorsening");
  if (v === "stable") return i18nMessage(locale, "emergencyNursingReassessment.trendStable");
  if (v === "awaiting_reassessment") return i18nMessage(locale, "emergencyNursingReassessment.trendAwaitingReassessment");
  if (v === "provider_notified") return i18nMessage(locale, "emergencyNursingReassessment.trendProviderNotified");
  if (v === "unable_to_assess") return i18nMessage(locale, "emergencyNursingReassessment.trendUnableToAssess");
  return "";
}

function trendNarrativeFragment(locale: SupportedLanguage, v: ErTrend): string {
  if (v === "improved" || v === "improving") return previewModelString(locale, "narrativeTrendImproved");
  if (v === "unchanged") return previewModelString(locale, "narrativeTrendUnchanged");
  if (v === "worse" || v === "worsening") return previewModelString(locale, "narrativeTrendWorse");
  if (v === "stable") return previewModelString(locale, "narrativeTrendStable");
  if (v === "awaiting_reassessment") return previewModelString(locale, "narrativeTrendAwaitingReassessment");
  if (v === "provider_notified") return previewModelString(locale, "narrativeTrendProviderNotified");
  if (v === "unable_to_assess") return previewModelString(locale, "narrativeTrendUnableToAssess");
  return "";
}

export type ErNursingPreviewSection = { id: string; title: string; lines: string[] };

export type ErNursingPreviewModel = {
  sections: ErNursingPreviewSection[];
  narrative: string;
};

export function buildErNursingReassessmentPreviewModel(
  form: ErNursingReassessmentForm,
  locale: SupportedLanguage
): ErNursingPreviewModel {
  const dateTag = productUiBcp47Tag(locale);
  const sections: ErNursingPreviewSection[] = [];

  const timing: string[] = [];
  if (form.reassessmentAt) {
    const d = new Date(form.reassessmentAt);
    if (!Number.isNaN(d.getTime())) {
      timing.push(
        interpolatePreviewModel(previewModelString(locale, "timingLine"), {
          datetime: d.toLocaleString(dateTag),
        })
      );
    }
  }
  if (timing.length) {
    sections.push({ id: "timing", title: previewModelString(locale, "sectionTimingContext"), lines: timing });
  }

  const etat: string[] = [];
  const nar = form.narrative.trim();
  if (nar) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineNarrative"), {
        text: nar.length > 500 ? `${nar.slice(0, 500)}…` : nar,
      })
    );
  }
  const ga = form.generalAppearance.trim();
  if (ga) etat.push(interpolatePreviewModel(previewModelString(locale, "lineAppearance"), { text: ga }));
  if (form.pain0to10.trim()) {
    const n = parseInt(form.pain0to10, 10);
    if (!Number.isNaN(n)) {
      etat.push(interpolatePreviewModel(previewModelString(locale, "linePain"), { n: String(n) }));
    }
  }
  if (form.mentalStatus) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineMentalStatus"), {
        value: nursingMentalStatusLabel(locale, form.mentalStatus),
      })
    );
  }
  if (form.orientation) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineOrientation"), {
        value: nursingOrientationLabel(locale, form.orientation),
      })
    );
  }
  if (form.speech) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineSpeech"), {
        value: nursingSpeechLabel(locale, form.speech),
      })
    );
  }
  if (form.airway) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineAirway"), {
        value: abcOptionLabel(locale, form.airway),
      })
    );
  }
  if (form.breathing) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineBreathing"), {
        value: abcOptionLabel(locale, form.breathing),
      })
    );
  }
  if (form.respiratoryPattern) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineRespiratoryPattern"), {
        value: nursingRespiratoryPatternLabel(locale, form.respiratoryPattern),
      })
    );
  }
  if (form.circulation) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineCirculation"), {
        value: abcOptionLabel(locale, form.circulation),
      })
    );
  }
  if (form.cardiacRhythm) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineCardiacRhythm"), {
        value: nursingCardiacRhythmLabel(locale, form.cardiacRhythm),
      })
    );
  }
  if (form.fallRisk) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineFallRisk"), {
        value: nursingFallRiskLabel(locale, form.fallRisk),
      })
    );
  }
  if (form.generalAppearanceCode) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineGeneralAppearanceCode"), {
        value: nursingGeneralAppearanceLabel(locale, form.generalAppearanceCode),
      })
    );
  }
  if (form.skinCondition) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineSkinCondition"), {
        value: nursingSkinConditionLabel(locale, form.skinCondition),
      })
    );
  }
  if (form.ambulation) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineAmbulation"), {
        value: nursingAmbulationLabel(locale, form.ambulation),
      })
    );
  }
  if (form.safetyRisk) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineSafetyRisk"), {
        value: nursingSafetyRiskLabel(locale, form.safetyRisk),
      })
    );
  }
  if (form.distressLevel) {
    etat.push(
      interpolatePreviewModel(previewModelString(locale, "lineDistressLevel"), {
        value: nursingDistressLevelLabel(locale, form.distressLevel),
      })
    );
  }
  const bs = form.bedsideStatus.trim();
  if (bs) etat.push(interpolatePreviewModel(previewModelString(locale, "lineBedside"), { text: bs }));
  if (etat.length) {
    sections.push({ id: "etat", title: previewModelString(locale, "sectionClinicalState"), lines: etat });
  }

  const vitalsNote: string[] = [];
  const vn = form.vitalsSummaryNote.trim();
  if (vn) vitalsNote.push(interpolatePreviewModel(previewModelString(locale, "lineVitalsNote"), { text: vn }));
  if (vitalsNote.length) {
    sections.push({
      id: "vitals",
      title: previewModelString(locale, "sectionVitalsRecording"),
      lines: vitalsNote,
    });
  }

  const resp: string[] = [];
  const rt = form.responseToTreatment.trim();
  if (rt) resp.push(interpolatePreviewModel(previewModelString(locale, "lineResponseToCare"), { text: rt }));
  if (form.trend) {
    resp.push(
      interpolatePreviewModel(previewModelString(locale, "lineTrend"), {
        value: trendLineLabel(locale, form.trend),
      })
    );
  }
  if (resp.length) {
    sections.push({
      id: "response",
      title: previewModelString(locale, "sectionResponseEvolution"),
      lines: resp,
    });
  }

  const soins: string[] = [];
  const intv = form.interventionsPerformed.trim();
  if (intv) soins.push(interpolatePreviewModel(previewModelString(locale, "lineInterventions"), { text: intv }));
  const safe = form.safetyRoundingNote.trim();
  if (safe) soins.push(interpolatePreviewModel(previewModelString(locale, "lineSafetyRounding"), { text: safe }));
  const cms = form.careMonitoringSummary.trim();
  if (cms) {
    soins.push(
      interpolatePreviewModel(previewModelString(locale, "lineCareMonitoringSummary"), { text: cms })
    );
  }
  if (soins.length) {
    sections.push({ id: "soins", title: previewModelString(locale, "sectionCareSafety"), lines: soins });
  }

  const add: string[] = [];
  const ad = form.addendum.trim();
  if (ad) add.push(ad);
  if (add.length) {
    sections.push({ id: "addendum", title: previewModelString(locale, "sectionAddendum"), lines: add });
  }

  const parts: string[] = [];
  if (form.reassessmentAt) {
    const d = new Date(form.reassessmentAt);
    if (!Number.isNaN(d.getTime())) {
      parts.push(
        interpolatePreviewModel(previewModelString(locale, "narrativeFragmentReassessment"), {
          datetime: d.toLocaleString(dateTag, { dateStyle: "short", timeStyle: "short" }),
        })
      );
    }
  }
  if (form.trend) {
    const frag = trendNarrativeFragment(locale, form.trend);
    if (frag) parts.push(frag);
  }
  if (form.pain0to10.trim()) {
    const n = parseInt(form.pain0to10, 10);
    if (!Number.isNaN(n)) {
      parts.push(interpolatePreviewModel(previewModelString(locale, "narrativeFragmentPain"), { n: String(n) }));
    }
  }
  const narrative =
    parts.length > 0
      ? interpolatePreviewModel(previewModelString(locale, "narrativeSummaryFull"), { parts: parts.join(" · ") })
      : "";

  if (sections.length === 0 && !narrative) {
    return {
      sections: [
        {
          id: "empty",
          title: i18nMessage(locale, "emergencyNursingReassessment.previewEmptyTitle"),
          lines: [i18nMessage(locale, "emergencyNursingReassessment.previewEmptyLine")],
        },
      ],
      narrative: "",
    };
  }

  return { sections, narrative };
}

/**
 * Stable open / close markers that delimit the auto-generated structured fragment block inside the
 * narrative. Markers are intentionally **language-stable** (not localized) so that toggling the UI
 * locale does NOT orphan a previously-inserted block. The visible French copy stays readable to
 * clinicians; English markers are accepted as a fallback when reading legacy notes.
 */
const NARRATIVE_AUTO_BLOCK_OPEN_FR = "── Documentation structurée (auto) ──";
const NARRATIVE_AUTO_BLOCK_CLOSE_FR = "── Fin de la documentation structurée ──";
const NARRATIVE_AUTO_BLOCK_OPEN_LEGACY_EN = "── Structured documentation (auto) ──";
const NARRATIVE_AUTO_BLOCK_CLOSE_LEGACY_EN = "── End of structured documentation ──";

const NARRATIVE_AUTO_BLOCK_OPEN_CANDIDATES = [
  NARRATIVE_AUTO_BLOCK_OPEN_FR,
  NARRATIVE_AUTO_BLOCK_OPEN_LEGACY_EN,
];
const NARRATIVE_AUTO_BLOCK_CLOSE_CANDIDATES = [
  NARRATIVE_AUTO_BLOCK_CLOSE_FR,
  NARRATIVE_AUTO_BLOCK_CLOSE_LEGACY_EN,
];

function findFirstIndex(haystack: string, needles: readonly string[]): { idx: number; needle: string } | null {
  let best: { idx: number; needle: string } | null = null;
  for (const needle of needles) {
    const i = haystack.indexOf(needle);
    if (i >= 0 && (!best || i < best.idx)) best = { idx: i, needle };
  }
  return best;
}

/**
 * Collect the auto-fragment lines for the current structured form state. Returns lines in clinical
 * reading order. Free-text fields (narrative, generalAppearance, bedsideStatus, vitalsSummaryNote,
 * responseToTreatment, interventionsPerformed, safetyRoundingNote, addendum) are NEVER touched.
 */
export function buildStructuredNarrativeFragmentLines(
  form: ErNursingReassessmentForm,
  locale: SupportedLanguage
): string[] {
  const lines: string[] = [];
  const push = (templateKey: string, value: string) => {
    if (!value) return;
    lines.push(
      interpolatePreviewModel(previewModelString(locale, templateKey), { value })
    );
  };
  if (form.mentalStatus) push("lineMentalStatus", nursingMentalStatusLabel(locale, form.mentalStatus));
  if (form.orientation) push("lineOrientation", nursingOrientationLabel(locale, form.orientation));
  if (form.speech) push("lineSpeech", nursingSpeechLabel(locale, form.speech));
  if (form.generalAppearanceCode)
    push("lineGeneralAppearanceCode", nursingGeneralAppearanceLabel(locale, form.generalAppearanceCode));
  if (form.distressLevel)
    push("lineDistressLevel", nursingDistressLevelLabel(locale, form.distressLevel));
  if (form.airwayType) push("lineAirwayType", nursingAirwayTypeLabel(locale, form.airwayType));
  if (form.airway) push("lineAirway", abcOptionLabel(locale, form.airway));
  if (form.respEffortBreathing)
    push("lineRespEffortBreathing", nursingRespEffortLabel(locale, form.respEffortBreathing));
  if (form.breathing) push("lineBreathing", abcOptionLabel(locale, form.breathing));
  if (form.respDepth) push("lineRespDepth", nursingRespDepthLabel(locale, form.respDepth));
  if (form.respChestMovement)
    push("lineRespChestMovement", nursingRespChestMovementLabel(locale, form.respChestMovement));
  if (form.respiratoryPattern)
    push("lineRespiratoryPattern", nursingRespiratoryPatternLabel(locale, form.respiratoryPattern));
  if (form.circulation) push("lineCirculation", abcOptionLabel(locale, form.circulation));
  if (form.cardiacRhythm)
    push("lineCardiacRhythm", nursingCardiacRhythmLabel(locale, form.cardiacRhythm));
  if (form.cardiacEctopy)
    push("lineCardiacEctopy", nursingCardiacEctopyLabel(locale, form.cardiacEctopy));
  if (form.skinCondition)
    push("lineSkinCondition", nursingSkinConditionLabel(locale, form.skinCondition));
  if (form.ivAccess) push("lineIvAccess", nursingIvAccessLabel(locale, form.ivAccess));
  if (form.ambulation) push("lineAmbulation", nursingAmbulationLabel(locale, form.ambulation));
  if (form.fallRisk) push("lineFallRisk", nursingFallRiskLabel(locale, form.fallRisk));
  if (form.safetyRisk) push("lineSafetyRisk", nursingSafetyRiskLabel(locale, form.safetyRisk));
  if (form.pain0to10.trim()) {
    const n = parseInt(form.pain0to10, 10);
    if (!Number.isNaN(n)) {
      lines.push(interpolatePreviewModel(previewModelString(locale, "linePain"), { n: String(n) }));
    }
  }
  if (form.trend) push("lineTrend", trendLineLabel(locale, form.trend));
  return lines;
}

/**
 * Strip every existing auto-fragment block (FR and legacy EN markers) from the narrative.
 *
 * Idempotent + corruption-resistant: if multiple blocks accumulated due to prior bugs, language
 * toggles, paste, or partial markers, this collapses them ALL away. Each iteration removes one
 * block (open → matching close, or open → end-of-string when the close marker is missing) so a
 * subsequent insert always lands on a clean, single-block narrative.
 *
 * Manual content outside any marker block is preserved verbatim and re-joined with a single blank
 * line between fragments.
 */
function stripAllAutoBlocks(currentNarrative: string): string {
  let s = currentNarrative ?? "";
  /** Hard upper bound prevents an infinite loop on pathological input. */
  let safety = 32;
  while (safety-- > 0) {
    const openHit = findFirstIndex(s, NARRATIVE_AUTO_BLOCK_OPEN_CANDIDATES);
    if (!openHit) break;
    const afterStart = openHit.idx + openHit.needle.length;
    const closeHit = findFirstIndex(s.slice(afterStart), NARRATIVE_AUTO_BLOCK_CLOSE_CANDIDATES);
    const afterEnd = closeHit ? afterStart + closeHit.idx + closeHit.needle.length : s.length;
    const before = s.slice(0, openHit.idx).replace(/\s+$/u, "");
    const after = s.slice(afterEnd).replace(/^\s+/u, "");
    s = [before, after].filter((seg) => seg.length > 0).join("\n\n");
  }
  return s;
}

/**
 * Re-render the auto-generated structured block inside the narrative without touching any manual
 * edits. Strict guarantees:
 *
 * - The auto block markers can NEVER appear twice — every call first strips ALL pre-existing
 *   blocks (idempotent) and only then appends a single clean block.
 * - Manual content outside the markers is preserved verbatim.
 * - If `lines.length === 0`, all blocks are removed and nothing is re-inserted.
 *
 * Pure / deterministic. The structured field state is the only auto input.
 */
export function applyStructuredNarrativeFragment(
  currentNarrative: string,
  lines: string[]
): string {
  const open = NARRATIVE_AUTO_BLOCK_OPEN_FR;
  const close = NARRATIVE_AUTO_BLOCK_CLOSE_FR;
  const cleaned = stripAllAutoBlocks(currentNarrative ?? "");

  if (lines.length === 0) return cleaned;

  const block = `${open}\n${lines.map((l) => `- ${l}`).join("\n")}\n${close}`;
  if (cleaned.trim().length === 0) return block;
  return `${cleaned.replace(/\s+$/u, "")}\n\n${block}`;
}

/**
 * Read-only column captured from a `GET /encounters/:id/nursing-reassessment-events` entry. The
 * bedside grid renders one of these per persisted historical reassessment, plus one editable
 * draft column on the right. The type intentionally mirrors the trimmed shape returned by the
 * API (snapshot fields are absent when the underlying save did not include them).
 */
export type ErNursingReassessmentEventColumn = {
  /** Event row id, or the literal "legacy" for the back-compat single-object pre-history column. */
  id: string;
  /** ISO timestamp the nurse entered as the clinical reassessment time, may be null. */
  documentedAt: string | null;
  /** ISO timestamp the row was actually persisted (system save time). */
  createdAt: string;
  /**
   * Immutable user id of the row's original creator (the saver who opened this column). Used to
   * detect cross-user latest-column situations: when the panel's authenticated user differs from
   * `createdByUserId` of the most recent persisted column, the panel resets the active draft and
   * arms a new session so the next save inserts a brand-new column instead of attempting to
   * update someone else's row. `null` for the legacy single-object column (pre-history saves).
   */
  createdByUserId: string | null;
  performerInitials: string;
  performerDisplayName: string;
  performerRoleTitle: string;
  /** The reassessment snapshot at save time (loose-typed Record; renderer reads field-by-field). */
  snapshot: Record<string, unknown> | null;
  /** Trauma survey snapshot at save time (`erTraumaSurveyV1`), null when not co-saved. */
  traumaSnapshot: Record<string, unknown> | null;
};

/**
 * Build a back-compat single-column from the existing `Encounter.nursingAssessment.erNursingReassessmentV1`
 * blob + signature, so charts saved before the append-only history landed still appear as one
 * persisted column in the grid until the next save creates a real event row. Returns null when
 * the encounter has no clinical content yet (no signature, no narrative, no structured fields).
 */
export function legacyReassessmentColumnFromEncounter(
  nursingAssessment: unknown
): ErNursingReassessmentEventColumn | null {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return null;
  }
  const ns = (nursingAssessment as Record<string, unknown>)[ER_NURSING_REASSESSMENT_V1_KEY];
  if (!ns || typeof ns !== "object" || Array.isArray(ns)) return null;
  const o = ns as Record<string, unknown>;

  /** Only render a legacy column when the underlying record was actually saved. */
  const sigRaw = o.signature;
  const sig =
    sigRaw && typeof sigRaw === "object" && !Array.isArray(sigRaw)
      ? (sigRaw as Record<string, unknown>)
      : null;
  const savedAt = sig && typeof sig.savedAt === "string" ? sig.savedAt : null;
  const savedByDisplayName = sig && typeof sig.savedByDisplayName === "string" ? sig.savedByDisplayName : "";
  if (!savedAt) return null;

  const documentedAt = typeof o.reassessmentAt === "string" && o.reassessmentAt.trim() ? o.reassessmentAt : null;

  /** Two-letter initials from displayName (mirrors backend `computeDisplayNameInitials`). */
  const trimmed = savedByDisplayName.trim();
  const parts = trimmed ? trimmed.split(/\s+/u) : [];
  let initials = "";
  if (parts.length === 1) {
    initials = parts[0]!.slice(0, 2).toUpperCase();
  } else if (parts.length >= 2) {
    initials = `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
  }

  const traumaRaw = (nursingAssessment as Record<string, unknown>).erTraumaSurveyV1;
  const traumaSnapshot =
    traumaRaw && typeof traumaRaw === "object" && !Array.isArray(traumaRaw)
      ? (traumaRaw as Record<string, unknown>)
      : null;

  return {
    id: "legacy",
    documentedAt,
    createdAt: savedAt,
    /** Pre-history saves don't carry a userId; null disables the cross-user guard for legacy. */
    createdByUserId: null,
    performerInitials: initials,
    performerDisplayName: trimmed,
    performerRoleTitle: "",
    snapshot: o,
    traumaSnapshot,
  };
}

/** Vitals one-liner from triage GET vitalsJson (same as triage strip). */
export function vitalsLineFromTriageVitalsJson(
  vitalsJson: unknown,
  language: SupportedLanguage
): string {
  if (vitalsJson == null || typeof vitalsJson !== "object" || Array.isArray(vitalsJson)) return "";
  return formatVitalsHeaderLineForLocale(
    vitalsJson as Record<string, number | string | null | undefined>,
    language
  );
}
