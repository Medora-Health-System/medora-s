"use client";

/**
 * Column-style documentation grid for the ED Nursing Reassessment panel — Phase-2 unified.
 *
 * Renders a left → right timeline:
 *   [persisted column #1 (oldest)] … [persisted column #N (most recent, "Actuel")] [draft (editable)]
 *
 * Persisted columns come from the append-only `EncounterClinicalEvent NURSING_ASSESSMENT_SAVED`
 * history (namespace `erNursingReassessmentV1`). Each event row carries both the reassessment
 * snapshot and the co-saved trauma snapshot (`erTraumaSurveyV1`), so a column independently
 * preserves its own structured values, free-text, and trauma documentation.
 *
 * The draft column is bound to the editable `ErNursingReassessmentForm` + `ErTraumaSurveyV1`
 * state owned by the parent — every save creates a NEW persisted column event-row only when an
 * explicit session marker fires (clock drift ≥ 60 min or "Nouvelle séance" click); otherwise
 * the API UPDATEs the active session's row in place. Persisted columns are read-only by design
 * (no edit/delete in normal flow), matching the prior architectural guidance to use append-only
 * events for reassessment history.
 *
 * Backward compatibility: when there are no persisted events yet but the chart already has a
 * saved single-object reassessment, the parent passes a synthetic `legacyColumn` so the chart's
 * pre-history documentation still appears as one column until the next save materializes a
 * real event row.
 *
 * Phase-2 scope: every reassessment domain (head-to-toe, ABC, care/monitoring, response, trend,
 * interventions, bedside safety, narrative support, trauma primary + secondary survey, addendum)
 * renders as a row inside the same grid. Section headers group rows. Read-only cells render
 * resolved labels (selects) or text (text/textarea), clamped with internal scroll for long
 * narratives so column heights stay stable.
 */

import React, { useId, useMemo } from "react";
import type { useI18n } from "@/lib/i18n";
import {
  ER_NURSING_AIRWAY_SELECT_OPTIONS,
  ER_NURSING_AMBULATION_OPTIONS,
  ER_NURSING_BREATHING_SELECT_OPTIONS,
  ER_NURSING_CARDIAC_RHYTHM_OPTIONS,
  ER_NURSING_CIRCULATION_SELECT_OPTIONS,
  ER_NURSING_DISTRESS_LEVEL_OPTIONS,
  ER_NURSING_FALL_RISK_OPTIONS,
  ER_NURSING_GENERAL_APPEARANCE_OPTIONS,
  ER_NURSING_MENTAL_STATUS_OPTIONS,
  ER_NURSING_ORIENTATION_OPTIONS,
  ER_NURSING_RESPIRATORY_PATTERN_OPTIONS,
  ER_NURSING_SAFETY_RISK_OPTIONS,
  ER_NURSING_SKIN_CONDITION_OPTIONS,
  ER_NURSING_SPEECH_OPTIONS,
  ER_NURSING_TREND_SELECT_OPTIONS,
  type ErAbcOption,
  type ErNursingReassessmentEventColumn,
  type ErNursingReassessmentForm,
  type ErTrend,
} from "./emergencyNursingReassessmentV1";
import type { ErAbcdeOption, ErTraumaSurveyV1 } from "./erTraumaSurveyV1";

type TFn = ReturnType<typeof useI18n>["t"];

type SavedSignature = { savedAt?: string; savedByDisplayName?: string };

/**
 * Stable text-chip field codes shared with the parent panel. Importing the type directly from
 * the panel would create a render-time dependency cycle; redeclaring here keeps the grid file
 * decoupled while staying in lockstep with the panel's chip groups.
 */
export type NursingReassessmentTextChipField =
  | "narrative"
  | "generalAppearance"
  | "bedsideStatus"
  | "responseToTreatment"
  | "interventionsPerformed"
  | "safetyRoundingNote"
  | "addendum";

type Props = {
  /** Editable reassessment form state (active draft column). */
  form: ErNursingReassessmentForm;
  /** Apply a partial patch to the reassessment form. */
  onPatch: (patch: Partial<ErNursingReassessmentForm>) => void;
  /** Editable trauma survey state (active draft column, trauma scope). */
  traumaForm: ErTraumaSurveyV1;
  /** Apply a partial patch to the trauma form. */
  onPatchTrauma: (patch: Partial<ErTraumaSurveyV1>) => void;
  formDisabled: boolean;
  t: TFn;
  language: "en" | "fr";
  /** Most recent saved signature (read from `nursingAssessment.erNursingReassessmentV1.signature`). */
  savedSignature?: SavedSignature | null;
  /**
   * Read-only persisted columns from the append-only event history. Newest-first ordering as
   * returned by the API; the grid reverses this internally so the timeline reads
   * left-to-right oldest-to-newest with the draft column on the far right.
   */
  persistedColumns?: ErNursingReassessmentEventColumn[];
  /**
   * Synthetic single column for back-compat: passed only when the chart has saved data but no
   * append-only event rows exist yet (pre-history charts). Always rendered first (left-most).
   */
  legacyColumn?: ErNursingReassessmentEventColumn | null;
  /**
   * Render the chip-helper row for a free-text field (e.g. narrative, responseToTreatment).
   * Owned by the parent so chip data + `appendNursingQuickChip` callback stay colocated with
   * panel state. Returns `null` to skip the chip row for that field.
   */
  renderChipsForField?: (field: NursingReassessmentTextChipField) => React.ReactNode;
  /**
   * Render the 0-10 quick-pick row beside the pain-score input in the editable column. Owned
   * by the parent for the same reason as `renderChipsForField`.
   */
  painQuickPickNode?: React.ReactNode;
};

const colorBlue = "#0284c7";
const colorBorder = "#e2e8f0";
const colorMuted = "#64748b";
const colorRowAlt = "#f8fafc";

/** Initials helper: FN+LN, fallback first 2 of display, fallback first letter. "—" when empty. */
function displayNameInitials(name: string | null | undefined): string {
  const s = (name ?? "").trim();
  if (!s) return "—";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]!.toUpperCase()}${parts[parts.length - 1]![0]!.toUpperCase()}`;
  }
  const only = parts[0]!;
  return only.length >= 2 ? only.slice(0, 2).toUpperCase() : only[0]!.toUpperCase();
}

const wrap: React.CSSProperties = {
  border: `1px solid ${colorBorder}`,
  borderRadius: 12,
  backgroundColor: "#fff",
  overflow: "hidden",
  width: "100%",
  boxSizing: "border-box",
};

const headerBar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "10px 12px",
  borderBottom: `1px solid ${colorBorder}`,
  backgroundColor: "#f0f9ff",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.02em",
  color: colorBlue,
};

const helpStyle: React.CSSProperties = {
  margin: "8px 12px 0 12px",
  fontSize: 12,
  color: colorMuted,
  lineHeight: 1.45,
};

const labelCellBase: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
  borderBottom: `1px solid ${colorBorder}`,
  borderRight: `1px solid ${colorBorder}`,
  backgroundColor: "#fff",
  display: "flex",
  alignItems: "flex-start",
  /**
   * Sticky-left labels stay visible during horizontal scroll on narrow screens — important for
   * orientation when the timeline accumulates many persisted columns and the user scrolls right.
   */
  position: "sticky",
  left: 0,
  zIndex: 1,
};

const valueCellBase: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: `1px solid ${colorBorder}`,
  display: "flex",
  alignItems: "flex-start",
  minWidth: 0,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 10px",
  border: `1px solid ${colorBorder}`,
  borderRadius: 8,
  fontSize: 13,
  color: "#0f172a",
  backgroundColor: "#fff",
  minWidth: 0,
};

const inputStyle: React.CSSProperties = {
  ...selectStyle,
  cursor: "text",
};

const textareaStyle: React.CSSProperties = {
  ...selectStyle,
  resize: "vertical",
  minHeight: 56,
  maxHeight: 220,
  fontFamily: "inherit",
  lineHeight: 1.45,
};

const colHeaderTopBox: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: `1px solid ${colorBorder}`,
  backgroundColor: "#f8fafc",
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const colFooterBox: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 11,
  color: colorMuted,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const currentBadge: React.CSSProperties = {
  alignSelf: "flex-start",
  display: "inline-block",
  padding: "1px 6px",
  borderRadius: 9999,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  backgroundColor: "#dcfce7",
  color: "#166534",
  marginTop: 2,
};

const sectionHeaderRow: React.CSSProperties = {
  gridColumn: "1 / -1",
  padding: "10px 12px 6px 12px",
  borderTop: `1px solid ${colorBorder}`,
  borderBottom: `1px solid #f1f5f9`,
  backgroundColor: "#f8fafc",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: colorMuted,
};

const readOnlyTextBox: React.CSSProperties = {
  width: "100%",
  fontSize: 13,
  color: "#0f172a",
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  /** Clamp tall narratives so column row heights remain stable; full text is reachable by scroll. */
  maxHeight: 132,
  overflowY: "auto",
};

function formatColumnTime(
  isoOrLocal: string,
  language: "en" | "fr"
): { time: string; date: string } {
  if (!isoOrLocal) return { time: "—", date: "" };
  const d = new Date(isoOrLocal);
  if (Number.isNaN(d.getTime())) return { time: "—", date: "" };
  const tag = language === "en" ? "en-US" : "fr-FR";
  return {
    time: d.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" }),
    date: d.toLocaleDateString(tag, { day: "2-digit", month: "2-digit", year: "numeric" }),
  };
}

/**
 * Build the grid template: one fixed label track on the left, then one track per documentation
 * column (persisted history + 1 editable draft). Each column gets a min width so dropdowns and
 * read-only values stay legible; horizontal scroll handles overflow when many columns exist.
 */
function buildGridTemplate(columnCount: number): string {
  const cols = Math.max(1, columnCount);
  return `minmax(180px, 220px) ${Array.from({ length: cols }, () => "minmax(260px, 1fr)").join(" ")}`;
}

// ── Sections + rows ──────────────────────────────────────────────────────────

type GridSectionId =
  | "head_to_toe"
  | "abc"
  | "care_monitoring"
  | "response_treatment"
  | "interventions"
  | "bedside_safety"
  | "narrative_support"
  | "trauma_primary"
  | "trauma_secondary"
  | "addendum";

const SECTION_ORDER: GridSectionId[] = [
  "head_to_toe",
  "abc",
  "care_monitoring",
  "response_treatment",
  "interventions",
  "bedside_safety",
  "narrative_support",
  "trauma_primary",
  "trauma_secondary",
  "addendum",
];

function sectionLabel(t: TFn, sectionId: GridSectionId): string {
  return t(`emergencyNursingReassessment.documentationGrid.sections.${sectionId}`);
}

/**
 * Cell-type taxonomy. Each row declares one cell type plus the keys / options needed to render
 * it in either editable or read-only mode. The `traumaScope: true` discriminant flips the row's
 * value source from `snapshot[key]` / `form[key]` to `traumaSnapshot[key]` / `traumaForm[key]`.
 */
type ReassessmentSelectKey =
  | "mentalStatus"
  | "orientation"
  | "speech"
  | "generalAppearanceCode"
  | "distressLevel"
  | "respiratoryPattern"
  | "cardiacRhythm"
  | "skinCondition"
  | "ambulation"
  | "fallRisk"
  | "safetyRisk"
  | "trend";

type AbcSelectKey = "airway" | "breathing" | "circulation";

type ReassessmentTextKey = "generalAppearance" | "bedsideStatus" | "vitalsSummaryNote";

type ReassessmentTextareaKey =
  | "narrative"
  | "responseToTreatment"
  | "interventionsPerformed"
  | "safetyRoundingNote"
  | "addendum";

type TraumaAbcdeKey =
  | "primaryAirway"
  | "primaryBreathing"
  | "primaryCirculation"
  | "primaryDisability"
  | "primaryExposure";

type TraumaTextareaKey =
  | "primaryNotes"
  | "secondaryHeadFace"
  | "secondaryNeck"
  | "secondaryChest"
  | "secondaryAbdomenPelvis"
  | "secondaryBackSpine"
  | "secondaryExtremities"
  | "secondarySkinWounds"
  | "secondaryNotes";

type CellRowDef = { sectionId: GridSectionId; labelKey: string } & (
  | { kind: "select"; key: Exclude<ReassessmentSelectKey, "trend">; options: readonly string[]; optionsI18nNamespace: string }
  | { kind: "trend-select"; key: "trend"; options: readonly ErTrend[] }
  | { kind: "abc-select"; key: AbcSelectKey; options: readonly ErAbcOption[] }
  | { kind: "abcde-select"; key: TraumaAbcdeKey }
  | { kind: "number-pain"; key: "pain0to10" }
  | { kind: "text"; key: ReassessmentTextKey; placeholderKey?: string }
  | {
      kind: "textarea";
      key: ReassessmentTextareaKey;
      chipFieldKey?: NursingReassessmentTextChipField;
      placeholderKey?: string;
    }
  | { kind: "trauma-textarea"; key: TraumaTextareaKey }
);

const ROWS: readonly CellRowDef[] = [
  // Head-to-toe / body systems
  {
    sectionId: "head_to_toe",
    kind: "select",
    key: "mentalStatus",
    options: ER_NURSING_MENTAL_STATUS_OPTIONS,
    optionsI18nNamespace: "mentalStatusOptions",
    labelKey: "rowMentalStatus",
  },
  {
    sectionId: "head_to_toe",
    kind: "select",
    key: "orientation",
    options: ER_NURSING_ORIENTATION_OPTIONS,
    optionsI18nNamespace: "orientationOptions",
    labelKey: "rowOrientation",
  },
  {
    sectionId: "head_to_toe",
    kind: "select",
    key: "speech",
    options: ER_NURSING_SPEECH_OPTIONS,
    optionsI18nNamespace: "speechOptions",
    labelKey: "rowSpeech",
  },
  {
    sectionId: "head_to_toe",
    kind: "select",
    key: "generalAppearanceCode",
    options: ER_NURSING_GENERAL_APPEARANCE_OPTIONS,
    optionsI18nNamespace: "generalAppearanceOptions",
    labelKey: "rowGeneralAppearance",
  },
  {
    sectionId: "head_to_toe",
    kind: "text",
    key: "generalAppearance",
    labelKey: "rowGeneralAppearanceFreeText",
  },
  {
    sectionId: "head_to_toe",
    kind: "select",
    key: "distressLevel",
    options: ER_NURSING_DISTRESS_LEVEL_OPTIONS,
    optionsI18nNamespace: "distressLevelOptions",
    labelKey: "rowDistressLevel",
  },
  {
    sectionId: "head_to_toe",
    kind: "number-pain",
    key: "pain0to10",
    labelKey: "rowPain",
  },
  {
    sectionId: "head_to_toe",
    kind: "select",
    key: "respiratoryPattern",
    options: ER_NURSING_RESPIRATORY_PATTERN_OPTIONS,
    optionsI18nNamespace: "respiratoryPatternOptions",
    labelKey: "rowRespiratoryPattern",
  },
  {
    sectionId: "head_to_toe",
    kind: "select",
    key: "cardiacRhythm",
    options: ER_NURSING_CARDIAC_RHYTHM_OPTIONS,
    optionsI18nNamespace: "cardiacRhythmOptions",
    labelKey: "rowCardiacRhythm",
  },
  {
    sectionId: "head_to_toe",
    kind: "select",
    key: "skinCondition",
    options: ER_NURSING_SKIN_CONDITION_OPTIONS,
    optionsI18nNamespace: "skinConditionOptions",
    labelKey: "rowSkinCondition",
  },
  {
    sectionId: "head_to_toe",
    kind: "select",
    key: "ambulation",
    options: ER_NURSING_AMBULATION_OPTIONS,
    optionsI18nNamespace: "ambulationOptions",
    labelKey: "rowAmbulation",
  },
  {
    sectionId: "head_to_toe",
    kind: "select",
    key: "fallRisk",
    options: ER_NURSING_FALL_RISK_OPTIONS,
    optionsI18nNamespace: "fallRiskOptions",
    labelKey: "rowFallRisk",
  },
  {
    sectionId: "head_to_toe",
    kind: "select",
    key: "safetyRisk",
    options: ER_NURSING_SAFETY_RISK_OPTIONS,
    optionsI18nNamespace: "safetyRiskOptions",
    labelKey: "rowSafetyRisk",
  },

  // ABC (réévaluation)
  {
    sectionId: "abc",
    kind: "abc-select",
    key: "airway",
    options: ER_NURSING_AIRWAY_SELECT_OPTIONS,
    labelKey: "rowAirway",
  },
  {
    sectionId: "abc",
    kind: "abc-select",
    key: "breathing",
    options: ER_NURSING_BREATHING_SELECT_OPTIONS,
    labelKey: "rowBreathing",
  },
  {
    sectionId: "abc",
    kind: "abc-select",
    key: "circulation",
    options: ER_NURSING_CIRCULATION_SELECT_OPTIONS,
    labelKey: "rowCirculation",
  },

  // Soins / surveillance
  {
    sectionId: "care_monitoring",
    kind: "text",
    key: "bedsideStatus",
    labelKey: "rowBedsideStatus",
    placeholderKey: "placeholderBedsideStatus",
  },

  // Réponse au traitement
  {
    sectionId: "response_treatment",
    kind: "textarea",
    key: "responseToTreatment",
    chipFieldKey: "responseToTreatment",
    labelKey: "rowResponseToTreatment",
  },
  {
    sectionId: "response_treatment",
    kind: "trend-select",
    key: "trend",
    options: ER_NURSING_TREND_SELECT_OPTIONS,
    labelKey: "rowTrend",
  },

  // Interventions infirmières
  {
    sectionId: "interventions",
    kind: "textarea",
    key: "interventionsPerformed",
    chipFieldKey: "interventionsPerformed",
    labelKey: "rowInterventionsPerformed",
  },

  // Sécurité au chevet / tournées
  {
    sectionId: "bedside_safety",
    kind: "textarea",
    key: "safetyRoundingNote",
    chipFieldKey: "safetyRoundingNote",
    labelKey: "rowSafetyRoundingNote",
    placeholderKey: "placeholderSafety",
  },

  // Notes de soutien à la réévaluation
  {
    sectionId: "narrative_support",
    kind: "textarea",
    key: "narrative",
    chipFieldKey: "narrative",
    labelKey: "rowNarrative",
    placeholderKey: "narrativePlaceholder",
  },
  {
    sectionId: "narrative_support",
    kind: "text",
    key: "vitalsSummaryNote",
    labelKey: "rowVitalsSummaryNote",
  },

  // Trauma — examen primaire (ABCDE)
  { sectionId: "trauma_primary", kind: "abcde-select", key: "primaryAirway", labelKey: "rowAirway" },
  { sectionId: "trauma_primary", kind: "abcde-select", key: "primaryBreathing", labelKey: "rowBreathing" },
  { sectionId: "trauma_primary", kind: "abcde-select", key: "primaryCirculation", labelKey: "rowCirculation" },
  { sectionId: "trauma_primary", kind: "abcde-select", key: "primaryDisability", labelKey: "rowNeurologic" },
  { sectionId: "trauma_primary", kind: "abcde-select", key: "primaryExposure", labelKey: "rowExposure" },
  { sectionId: "trauma_primary", kind: "trauma-textarea", key: "primaryNotes", labelKey: "rowTraumaPrimaryNotes" },

  // Trauma — examen secondaire
  { sectionId: "trauma_secondary", kind: "trauma-textarea", key: "secondaryHeadFace", labelKey: "rowHeadFace" },
  { sectionId: "trauma_secondary", kind: "trauma-textarea", key: "secondaryNeck", labelKey: "rowNeck" },
  { sectionId: "trauma_secondary", kind: "trauma-textarea", key: "secondaryChest", labelKey: "rowChest" },
  {
    sectionId: "trauma_secondary",
    kind: "trauma-textarea",
    key: "secondaryAbdomenPelvis",
    labelKey: "rowAbdomenPelvis",
  },
  { sectionId: "trauma_secondary", kind: "trauma-textarea", key: "secondaryBackSpine", labelKey: "rowBackSpine" },
  {
    sectionId: "trauma_secondary",
    kind: "trauma-textarea",
    key: "secondaryExtremities",
    labelKey: "rowExtremities",
  },
  {
    sectionId: "trauma_secondary",
    kind: "trauma-textarea",
    key: "secondarySkinWounds",
    labelKey: "rowSkinWounds",
  },
  {
    sectionId: "trauma_secondary",
    kind: "trauma-textarea",
    key: "secondaryNotes",
    labelKey: "rowSecondaryNotes",
  },

  // Addendum
  {
    sectionId: "addendum",
    kind: "textarea",
    key: "addendum",
    chipFieldKey: "addendum",
    labelKey: "rowAddendum",
  },
];

// ── Read-only display resolvers ──────────────────────────────────────────────

function readSnapshotString(
  snapshot: Record<string, unknown> | null | undefined,
  key: string
): string {
  if (!snapshot) return "";
  const v = snapshot[key];
  if (typeof v === "string") return v;
  return "";
}

function readSnapshotPain(snapshot: Record<string, unknown> | null | undefined): string {
  if (!snapshot) return "";
  const v = snapshot.pain0to10;
  if (typeof v === "number" && !Number.isNaN(v)) return String(Math.min(10, Math.max(0, v)));
  return "";
}

function resolveSelectLabel(
  t: TFn,
  optionsI18nNamespace: string,
  rawValue: string
): string {
  if (!rawValue) return "";
  return t(`emergencyNursingReassessment.${optionsI18nNamespace}.${rawValue}`);
}

/** ABC option label resolver — kept inline to avoid an import cycle with the panel. */
function nursingAbcSelectOptionLabel(t: TFn, v: ErAbcOption): string {
  if (!v) return "";
  if (v === "wnl") return t("emergencyNursingReassessment.abcOptionWnl");
  if (v === "yes") return t("emergencyNursingReassessment.abcOptionYes");
  if (v === "no") return t("emergencyNursingReassessment.abcOptionNo");
  if (v === "unknown") return t("emergencyNursingReassessment.abcOptionUnknown");
  if (v === "air_patent") return t("emergencyNursingReassessment.abcAirPatent");
  if (v === "air_needs_suction") return t("emergencyNursingReassessment.abcAirNeedsSuction");
  if (v === "air_obstructed_concern") return t("emergencyNursingReassessment.abcAirObstructedConcern");
  if (v === "air_support_in_place") return t("emergencyNursingReassessment.abcAirSupportInPlace");
  if (v === "air_unable_to_assess") return t("emergencyNursingReassessment.abcAirUnableToAssess");
  if (v === "br_even_unlabored") return t("emergencyNursingReassessment.abcBrEvenUnlabored");
  if (v === "br_increased_wob") return t("emergencyNursingReassessment.abcBrIncreasedWob");
  if (v === "br_wheezing") return t("emergencyNursingReassessment.abcBrWheezing");
  if (v === "br_sob") return t("emergencyNursingReassessment.abcBrSob");
  if (v === "br_o2_in_use") return t("emergencyNursingReassessment.abcBrO2InUse");
  if (v === "br_unable_to_assess") return t("emergencyNursingReassessment.abcBrUnableToAssess");
  if (v === "circ_warm_perfused") return t("emergencyNursingReassessment.abcCircWarmPerfused");
  if (v === "circ_pale_cool") return t("emergencyNursingReassessment.abcCircPaleCool");
  if (v === "circ_diaphoretic") return t("emergencyNursingReassessment.abcCircDiaphoretic");
  if (v === "circ_weak_pulses") return t("emergencyNursingReassessment.abcCircWeakPulses");
  if (v === "circ_hypotension_concern") return t("emergencyNursingReassessment.abcCircHypotensionConcern");
  if (v === "circ_unable_to_assess") return t("emergencyNursingReassessment.abcCircUnableToAssess");
  return "";
}

function nursingTrendOptionLabel(t: TFn, v: ErTrend): string {
  if (!v) return "";
  if (v === "improving") return t("emergencyNursingReassessment.trendImproving");
  if (v === "improved") return t("emergencyNursingReassessment.trendImproved");
  if (v === "stable") return t("emergencyNursingReassessment.trendStable");
  if (v === "unchanged") return t("emergencyNursingReassessment.trendUnchanged");
  if (v === "worsening") return t("emergencyNursingReassessment.trendWorsening");
  if (v === "worse") return t("emergencyNursingReassessment.trendWorse");
  if (v === "awaiting_reassessment") return t("emergencyNursingReassessment.trendAwaitingReassessment");
  if (v === "provider_notified") return t("emergencyNursingReassessment.trendProviderNotified");
  if (v === "unable_to_assess") return t("emergencyNursingReassessment.trendUnableToAssess");
  return "";
}

function abcdeOptionLabel(t: TFn, v: ErAbcdeOption | string): string {
  if (v === "normal") return t("emergencyNursingReassessment.abcdeOptionNormal");
  if (v === "abnormal") return t("emergencyNursingReassessment.abcdeOptionAbnormal");
  if (v === "unknown") return t("emergencyNursingReassessment.abcOptionUnknown");
  return "";
}

/**
 * Resolve the read-only display string for a row in a persisted column. Pure: reads from the
 * appropriate snapshot (reassessment vs trauma), maps codes to FR labels via i18n, returns ""
 * when the value is missing so the caller can render `—` consistently.
 */
function resolveReadonlyDisplay(
  t: TFn,
  row: CellRowDef,
  reassessmentSnapshot: Record<string, unknown> | null,
  traumaSnapshot: Record<string, unknown> | null
): string {
  switch (row.kind) {
    case "select": {
      const v = readSnapshotString(reassessmentSnapshot, row.key);
      return resolveSelectLabel(t, row.optionsI18nNamespace, v);
    }
    case "trend-select": {
      const v = readSnapshotString(reassessmentSnapshot, row.key);
      return nursingTrendOptionLabel(t, v as ErTrend);
    }
    case "abc-select": {
      const v = readSnapshotString(reassessmentSnapshot, row.key);
      return nursingAbcSelectOptionLabel(t, v as ErAbcOption);
    }
    case "abcde-select": {
      const v = readSnapshotString(traumaSnapshot, row.key);
      return abcdeOptionLabel(t, v);
    }
    case "number-pain":
      return readSnapshotPain(reassessmentSnapshot);
    case "text":
      return readSnapshotString(reassessmentSnapshot, row.key);
    case "textarea":
      return readSnapshotString(reassessmentSnapshot, row.key);
    case "trauma-textarea":
      return readSnapshotString(traumaSnapshot, row.key);
    default: {
      const _exhaustive: never = row;
      return _exhaustive;
    }
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function EmergencyNursingDocumentationGrid({
  form,
  onPatch,
  traumaForm,
  onPatchTrauma,
  formDisabled,
  t,
  language,
  savedSignature,
  persistedColumns,
  legacyColumn,
  renderChipsForField,
  painQuickPickNode,
}: Props) {
  const dg = (k: string) => t(`emergencyNursingReassessment.documentationGrid.${k}`);

  /**
   * Stable id for the section help paragraph, referenced by every `<select aria-describedby>` so
   * screen-reader users get the documentation guidance ("structured selections refresh the auto
   * narrative block, free-text outside is preserved") on every focusable control.
   */
  const sectionHelpId = useId();
  const clearHintId = useId();

  const columnTime = useMemo(
    () => formatColumnTime(form.reassessmentAt, language),
    [form.reassessmentAt, language]
  );
  const savedTime = useMemo(
    () => formatColumnTime(savedSignature?.savedAt ?? "", language),
    [savedSignature?.savedAt, language]
  );

  /** "Current" badge is shown only when the column is actually persisted (signature present). */
  const isPersistedCurrent = Boolean(savedSignature?.savedAt);
  const updaterName = savedSignature?.savedByDisplayName?.trim() || "";
  const updaterInitials = displayNameInitials(updaterName);

  /**
   * Persisted columns come newest-first from the API. We render oldest-to-newest so the timeline
   * reads naturally left-to-right; the legacy column (if any) is always the leftmost. Latest
   * persisted column = "Actuel". The editable draft column is rendered last on the right.
   */
  const persistedColumnsForRender = useMemo(() => {
    const fromEvents = (persistedColumns ?? []).slice().reverse();
    return legacyColumn ? [legacyColumn, ...fromEvents] : fromEvents;
  }, [persistedColumns, legacyColumn]);

  const totalDataColumns = persistedColumnsForRender.length + 1;

  /**
   * "Effacer la colonne" wipes only the structured selects in the active draft column. Free-text
   * and trauma fields are deliberately untouched: clearing nurse-typed prose is destructive and
   * should only happen via explicit per-field edits or the "Nouvelle séance" flow above.
   */
  const handleClearColumn = () => {
    onPatch({
      mentalStatus: "",
      orientation: "",
      speech: "",
      pain0to10: "",
      airway: "",
      breathing: "",
      respiratoryPattern: "",
      circulation: "",
      cardiacRhythm: "",
      fallRisk: "",
      trend: "",
      generalAppearanceCode: "",
      skinCondition: "",
      ambulation: "",
      safetyRisk: "",
      distressLevel: "",
    });
  };

  // ── Editable cell renderer (active draft column only) ──────────────────────

  function renderEditableCell(row: CellRowDef): React.ReactNode {
    switch (row.kind) {
      case "select": {
        const value = (form[row.key] as string) ?? "";
        return (
          <select
            value={value}
            onChange={(e) => onPatch({ [row.key]: e.target.value } as Partial<ErNursingReassessmentForm>)}
            disabled={formDisabled}
            aria-label={dg(row.labelKey)}
            aria-describedby={sectionHelpId}
            style={{
              ...selectStyle,
              backgroundColor: formDisabled ? "#f8fafc" : "#fff",
              cursor: formDisabled ? "not-allowed" : "pointer",
            }}
          >
            <option value="">{dg("placeholder")}</option>
            {row.options.map((o) => (
              <option key={o} value={o}>
                {resolveSelectLabel(t, row.optionsI18nNamespace, o)}
              </option>
            ))}
          </select>
        );
      }
      case "trend-select": {
        const value = form.trend;
        return (
          <select
            value={value}
            onChange={(e) => onPatch({ trend: e.target.value as ErTrend })}
            disabled={formDisabled}
            aria-label={dg(row.labelKey)}
            aria-describedby={sectionHelpId}
            style={{
              ...selectStyle,
              backgroundColor: formDisabled ? "#f8fafc" : "#fff",
              cursor: formDisabled ? "not-allowed" : "pointer",
            }}
          >
            <option value="">—</option>
            {row.options.map((o) => (
              <option key={o} value={o}>
                {nursingTrendOptionLabel(t, o)}
              </option>
            ))}
          </select>
        );
      }
      case "abc-select": {
        const value = form[row.key];
        return (
          <select
            value={value}
            onChange={(e) =>
              onPatch({ [row.key]: e.target.value as ErAbcOption } as Partial<ErNursingReassessmentForm>)
            }
            disabled={formDisabled}
            aria-label={dg(row.labelKey)}
            aria-describedby={sectionHelpId}
            style={{
              ...selectStyle,
              backgroundColor: formDisabled ? "#f8fafc" : "#fff",
              cursor: formDisabled ? "not-allowed" : "pointer",
            }}
          >
            <option value="">—</option>
            {row.options.map((o) => (
              <option key={o} value={o}>
                {nursingAbcSelectOptionLabel(t, o)}
              </option>
            ))}
          </select>
        );
      }
      case "abcde-select": {
        const value = traumaForm[row.key] ?? "";
        return (
          <select
            value={value}
            onChange={(e) =>
              onPatchTrauma({ [row.key]: e.target.value as ErAbcdeOption } as Partial<ErTraumaSurveyV1>)
            }
            disabled={formDisabled}
            aria-label={dg(row.labelKey)}
            aria-describedby={sectionHelpId}
            style={{
              ...selectStyle,
              backgroundColor: formDisabled ? "#f8fafc" : "#fff",
              cursor: formDisabled ? "not-allowed" : "pointer",
            }}
          >
            <option value="">—</option>
            <option value="normal">{abcdeOptionLabel(t, "normal")}</option>
            <option value="abnormal">{abcdeOptionLabel(t, "abnormal")}</option>
            <option value="unknown">{abcdeOptionLabel(t, "unknown")}</option>
          </select>
        );
      }
      case "number-pain": {
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            <input
              type="number"
              min={0}
              max={10}
              value={form.pain0to10}
              onChange={(e) => onPatch({ pain0to10: e.target.value })}
              disabled={formDisabled}
              aria-label={dg(row.labelKey)}
              style={{
                ...inputStyle,
                backgroundColor: formDisabled ? "#f8fafc" : "#fff",
              }}
            />
            {painQuickPickNode ?? null}
          </div>
        );
      }
      case "text": {
        const value = (form[row.key] as string) ?? "";
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onPatch({ [row.key]: e.target.value } as Partial<ErNursingReassessmentForm>)}
            disabled={formDisabled}
            aria-label={dg(row.labelKey)}
            placeholder={row.placeholderKey ? t(`emergencyNursingReassessment.${row.placeholderKey}`) : ""}
            style={{
              ...inputStyle,
              backgroundColor: formDisabled ? "#f8fafc" : "#fff",
            }}
          />
        );
      }
      case "textarea": {
        const value = (form[row.key] as string) ?? "";
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            <textarea
              value={value}
              onChange={(e) =>
                onPatch({ [row.key]: e.target.value } as Partial<ErNursingReassessmentForm>)
              }
              disabled={formDisabled}
              rows={2}
              aria-label={dg(row.labelKey)}
              placeholder={
                row.placeholderKey ? t(`emergencyNursingReassessment.${row.placeholderKey}`) : ""
              }
              style={{
                ...textareaStyle,
                backgroundColor: formDisabled ? "#f8fafc" : "#fff",
              }}
            />
            {row.chipFieldKey && renderChipsForField ? renderChipsForField(row.chipFieldKey) : null}
          </div>
        );
      }
      case "trauma-textarea": {
        const value = traumaForm[row.key] ?? "";
        return (
          <textarea
            value={value}
            onChange={(e) =>
              onPatchTrauma({ [row.key]: e.target.value } as Partial<ErTraumaSurveyV1>)
            }
            disabled={formDisabled}
            rows={2}
            aria-label={dg(row.labelKey)}
            style={{
              ...textareaStyle,
              backgroundColor: formDisabled ? "#f8fafc" : "#fff",
            }}
          />
        );
      }
      default: {
        const _exhaustive: never = row;
        return _exhaustive;
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={wrap}>
      <div style={headerBar}>
        <p style={sectionTitleStyle}>{dg("sectionTitle")}</p>
        <button
          type="button"
          onClick={handleClearColumn}
          disabled={formDisabled}
          aria-label={dg("clearColumnButton")}
          aria-describedby={clearHintId}
          style={{
            padding: "5px 10px",
            border: `1px solid ${colorBorder}`,
            borderRadius: 8,
            backgroundColor: formDisabled ? "#f1f5f9" : "#fff",
            color: formDisabled ? "#94a3b8" : "#334155",
            fontSize: 12,
            fontWeight: 600,
            cursor: formDisabled ? "not-allowed" : "pointer",
          }}
        >
          {dg("clearColumnButton")}
        </button>
      </div>
      <p id={sectionHelpId} style={helpStyle}>
        {dg("sectionHelp")}
      </p>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: buildGridTemplate(totalDataColumns),
            borderTop: `1px solid ${colorBorder}`,
            marginTop: 10,
          }}
        >
          {/* Empty top-left corner cell — sticky-left so it stays under the row labels. */}
          <div
            style={{
              padding: "8px 10px",
              borderBottom: `1px solid ${colorBorder}`,
              borderRight: `1px solid ${colorBorder}`,
              backgroundColor: "#fff",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: colorMuted,
              position: "sticky",
              left: 0,
              zIndex: 2,
            }}
            aria-hidden
          />
          {/* Persisted column headers (oldest → newest, legacy first when present). */}
          {persistedColumnsForRender.map((col, idx) => {
            const t1 = formatColumnTime(col.documentedAt ?? col.createdAt, language);
            const isLatestPersisted = idx === persistedColumnsForRender.length - 1;
            return (
              <div
                key={`hdr-${col.id}`}
                style={{
                  ...colHeaderTopBox,
                  backgroundColor: isLatestPersisted ? "#ecfdf5" : "#f8fafc",
                  borderRight: `1px solid ${colorBorder}`,
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
                  {t1.time}
                </span>
                <span style={{ fontSize: 11, color: colorMuted }}>
                  {t1.date || dg("columnTimePlaceholder")}
                </span>
                {isLatestPersisted ? (
                  <span style={currentBadge}>{dg("columnHeaderLatest")}</span>
                ) : null}
              </div>
            );
          })}
          {/* Draft column header (rightmost). */}
          <div style={colHeaderTopBox}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
              {columnTime.time}
            </span>
            <span style={{ fontSize: 11, color: colorMuted }}>
              {columnTime.date || dg("columnTimePlaceholder")}
            </span>
            <span
              style={{
                ...currentBadge,
                backgroundColor: persistedColumnsForRender.length > 0 ? "#dbeafe" : "#dcfce7",
                color: persistedColumnsForRender.length > 0 ? "#1d4ed8" : "#166534",
              }}
            >
              {persistedColumnsForRender.length > 0
                ? dg("columnHeaderDraft")
                : isPersistedCurrent
                ? dg("columnHeaderLatest")
                : dg("columnHeaderDraft")}
            </span>
          </div>

          {/* Sections + rows */}
          {SECTION_ORDER.map((sectionId) => {
            const sectionRows = ROWS.filter((r) => r.sectionId === sectionId);
            if (sectionRows.length === 0) return null;
            return (
              <React.Fragment key={`sec-${sectionId}`}>
                <div style={sectionHeaderRow}>
                  {/**
                   * Section label is rendered inside a sticky-left inline-block so it stays
                   * visible at the left edge during horizontal scroll while the divider line
                   * spans the full grid width.
                   */}
                  <span
                    style={{
                      position: "sticky",
                      left: 12,
                      display: "inline-block",
                    }}
                  >
                    {sectionLabel(t, sectionId)}
                  </span>
                </div>
                {sectionRows.map((row, rowIdx) => {
                  const altBg = rowIdx % 2 === 1 ? colorRowAlt : "#fff";
                  return (
                    <React.Fragment key={`r-${sectionId}-${row.kind}-${row.key}`}>
                      <div style={{ ...labelCellBase, backgroundColor: altBg }}>
                        {dg(row.labelKey)}
                      </div>
                      {persistedColumnsForRender.map((col) => {
                        const display = resolveReadonlyDisplay(t, row, col.snapshot, col.traumaSnapshot);
                        return (
                          <div
                            key={`v-${col.id}-${row.kind}-${row.key}`}
                            style={{
                              ...valueCellBase,
                              backgroundColor: altBg,
                              borderRight: `1px solid ${colorBorder}`,
                            }}
                          >
                            <div
                              style={{
                                ...readOnlyTextBox,
                                color: display ? "#0f172a" : "#94a3b8",
                              }}
                            >
                              {display || "—"}
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ ...valueCellBase, backgroundColor: altBg }}>
                        {renderEditableCell(row)}
                      </div>
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* Footer row: updated-by per column */}
          <div
            style={{
              padding: "8px 10px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: colorMuted,
              borderRight: `1px solid ${colorBorder}`,
              borderTop: `1px solid ${colorBorder}`,
              backgroundColor: "#fff",
              position: "sticky",
              left: 0,
              zIndex: 1,
            }}
          >
            {dg("footerUpdatedBy")}
          </div>
          {persistedColumnsForRender.map((col) => {
            const t2 = formatColumnTime(col.createdAt, language);
            const fullName = col.performerDisplayName.trim();
            const initials = col.performerInitials.trim() || displayNameInitials(fullName);
            return (
              <div
                key={`f-${col.id}`}
                style={{
                  ...colFooterBox,
                  borderRight: `1px solid ${colorBorder}`,
                  borderTop: `1px solid ${colorBorder}`,
                }}
              >
                {fullName ? (
                  <>
                    <span
                      style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}
                      title={fullName}
                    >
                      {fullName}
                    </span>
                    <span
                      style={{ fontSize: 11, color: colorMuted }}
                      title={fullName}
                      aria-label={fullName}
                    >
                      {initials}
                      {col.performerRoleTitle ? ` · ${col.performerRoleTitle}` : ""}
                      {t2.time !== "—" ? ` · ${t2.date} ${t2.time}` : ""}
                    </span>
                  </>
                ) : (
                  <span>{dg("footerNotSavedYet")}</span>
                )}
              </div>
            );
          })}
          <div style={{ ...colFooterBox, borderTop: `1px solid ${colorBorder}` }}>
            {updaterName ? (
              <>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }} title={updaterName}>
                  {updaterName}
                </span>
                <span
                  style={{ fontSize: 11, color: colorMuted }}
                  title={updaterName}
                  aria-label={updaterName}
                >
                  {updaterInitials}
                  {savedTime.time !== "—" ? ` · ${savedTime.date} ${savedTime.time}` : ""}
                </span>
              </>
            ) : (
              <span>{dg("footerNotSavedYet")}</span>
            )}
          </div>
        </div>
      </div>
      <p
        id={clearHintId}
        style={{
          margin: 0,
          padding: "8px 12px 10px",
          fontSize: 11,
          color: colorMuted,
          lineHeight: 1.45,
        }}
      >
        {dg("clearColumnHint")}
      </p>
    </div>
  );
}
