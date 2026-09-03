"use client";

/**
 * Phase-3 column-style documentation grid for the ED Nursing Reassessment panel.
 *
 * Layout (left → right):
 *   [persisted column #1 (oldest)] … [persisted column #N (most recent, "Actuel")]
 *   [draft (editable)] [+ Add column placeholder]
 *
 * The grid renders the **structured / dropdown** rows only; every cell is a `<select>`. Free-text
 * (narrative, addendum, response-to-treatment, interventions performed, safety rounding, vital
 * signs note, general-appearance free text, trauma primary/secondary survey) lives in a
 * dedicated "Notes" panel below the grid, owned by the parent. This honors the mockup's
 * dropdown-first look without erasing clinical free-text capability.
 *
 * Rows are organized into three sections:
 *
 *   A. Primary (mockup-aligned, default expanded):
 *      Mental Status, Orientation, Speech, Pain (NPRS), Airway Type, Resp Effort Breathing,
 *      Resp Depth, Resp Chest Movement, Resp Pattern, Cardiac Rhythm, Cardiac Ectopy,
 *      Skin (General), IV Access, Safety / Fall Risk.
 *
 *   B. Additional (default collapsed): General Appearance code, Distress Level, Ambulation,
 *      Safety Risk, Trend. Existing fields the mockup doesn't show; collapsed by default to
 *      match the mockup's compactness, never deleted so prior charts keep rendering.
 *
 *   C. Legacy ABC (default collapsed; rendered only if any persisted column has legacy ABC
 *      data): airway / breathing / circulation rendered from the legacy `ErAbcOption` codes.
 *      Read-only context for older saves, never editable.
 *
 * Per-row collapsibility: every row label has a chevron toggle. Collapsing a row hides its
 * cells across all columns (label remains visible) — this keeps the timeline compact when many
 * rows are not relevant to the current case. Collapse state is local to the component (UX
 * preference only, not persisted).
 *
 * Append-only history is preserved end-to-end: the grid never writes back to persisted columns,
 * and only the rightmost editable column is bound to the parent's form state via `onPatch`.
 */

import React, { useId, useMemo, useState } from "react";
import type { useI18n } from "@/lib/i18n";
import {
  ER_NURSING_AIRWAY_SELECT_OPTIONS,
  ER_NURSING_AIRWAY_TYPE_OPTIONS,
  ER_NURSING_AMBULATION_OPTIONS,
  ER_NURSING_BREATHING_SELECT_OPTIONS,
  ER_NURSING_CARDIAC_ECTOPY_OPTIONS,
  ER_NURSING_CARDIAC_RHYTHM_OPTIONS,
  ER_NURSING_CIRCULATION_SELECT_OPTIONS,
  ER_NURSING_DISTRESS_LEVEL_OPTIONS,
  ER_NURSING_FALL_RISK_OPTIONS,
  ER_NURSING_GENERAL_APPEARANCE_OPTIONS,
  ER_NURSING_IV_ACCESS_OPTIONS,
  ER_NURSING_MENTAL_STATUS_OPTIONS,
  ER_NURSING_ORIENTATION_OPTIONS,
  ER_NURSING_RESP_CHEST_MOVEMENT_OPTIONS,
  ER_NURSING_RESP_DEPTH_OPTIONS,
  ER_NURSING_RESP_EFFORT_OPTIONS,
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
import { productUiBcp47Tag } from "@/i18n/config";
import type {
  ErTriageV1NursingCarePersistSlice,
  ErYesNoUnknown,
} from "./medoraErTriageV1";

type TFn = ReturnType<typeof useI18n>["t"];
type SavedSignature = { savedAt?: string; savedByDisplayName?: string };

type Props = {
  form: ErNursingReassessmentForm;
  onPatch: (patch: Partial<ErNursingReassessmentForm>) => void;
  formDisabled: boolean;
  t: TFn;
  language: "en" | "fr";
  savedSignature?: SavedSignature | null;
  persistedColumns?: ErNursingReassessmentEventColumn[];
  legacyColumn?: ErNursingReassessmentEventColumn | null;
  /**
   * Optional callback invoked when the nurse clicks the "+ Add column" placeholder column on
   * the right edge of the grid. Mirrors the bottom-bar "Add current column" action — saves the
   * draft and starts a new reassessment session. When omitted, the placeholder still renders
   * but is non-interactive (purely visual).
   */
  onAddColumn?: () => void;
  /**
   * Optional trauma-survey form bound to the rightmost (active draft) column. When provided,
   * the grid renders a `trauma_primary` and `trauma_secondary` section so trauma rows live
   * inside the column board instead of as a standalone section below. Past columns surface
   * trauma data when the persisted event row carries a `traumaSnapshot`; otherwise the cell
   * renders "—" — no historical trauma row is mutated. Append-only safety preserved.
   */
  traumaForm?: ErTraumaSurveyV1;
  onPatchTrauma?: (patch: Partial<ErTraumaSurveyV1>) => void;
  /**
   * Optional triage bedside-safety slice bound to the rightmost (active draft) column. When
   * provided, the grid renders a `bedside_safety` section so the call-light / bed-low /
   * family-at-bedside / in-view / plan-explained / comfort-measures / PPE / nursing-notes
   * fields live inside the column board instead of as a standalone block. These fields live
   * on the encounter's triage row (single, latest-only) — they're saved by the parent's
   * existing triage side-write flow. Past columns therefore display "—" because no per-column
   * history exists for these fields; this is intentional, preserves current save semantics,
   * and avoids any schema change.
   */
  triageNursingSlice?: ErTriageV1NursingCarePersistSlice;
  onPatchTriageSlice?: (patch: Partial<ErTriageV1NursingCarePersistSlice>) => void;
  triageSliceLoading?: boolean;
};

const colorBlue = "#0284c7";
const colorBorder = "#e2e8f0";
const colorMuted = "#64748b";
const colorRowAlt = "#f8fafc";
/**
 * Subtle tint applied to every cell of the active draft column so it visually behaves as one
 * continuous editable column (per the screenshot pattern). Past columns keep `#fff` /
 * `colorRowAlt` so they read as historical/frozen. Tint is intentionally light enough to
 * preserve readability across long shifts and to not fight the alt-row striping.
 */
const colorActiveTint = "#f0f9ff";
/** Identical to `colorActiveTint` but slightly tinted alt-row variant for visual rhythm. */
const colorActiveTintAlt = "#e0f2fe";

/**
 * Dense uniform row height used by the flowsheet layout. Every label cell, value cell, and
 * input control inherits this minimum so dropdown rows and free-text rows align across all
 * columns. Multi-line textareas can grow vertically (resize: vertical), in which case CSS
 * grid expands the row height for ALL cells of that row — alignment is preserved.
 */
const ROW_MIN_HEIGHT = 30;

/** Two-letter initials helper. "—" when empty so columns never render an empty footer. */
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

/**
 * Flowsheet-style outer wrapper: top + bottom border only so the grid feels embedded into the
 * page rather than floating as a card. Inner cells carry the rest of the borders (right edges
 * between columns, bottom edges between rows). Background is `#fff` so the alt-row + active-
 * column tints remain visible.
 */
const wrap: React.CSSProperties = {
  borderTop: `1px solid ${colorBorder}`,
  borderBottom: `1px solid ${colorBorder}`,
  backgroundColor: "#fff",
  width: "100%",
  boxSizing: "border-box",
};

const headerBar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "6px 12px",
  borderBottom: `1px solid ${colorBorder}`,
  backgroundColor: "#f8fafc",
};

const headerTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#334155",
};

const helpText: React.CSSProperties = {
  margin: "4px 12px",
  fontSize: 11,
  color: colorMuted,
  lineHeight: 1.4,
};

const labelCellBase: React.CSSProperties = {
  padding: "4px 10px",
  fontSize: 11,
  fontWeight: 600,
  color: "#334155",
  borderBottom: `1px solid ${colorBorder}`,
  borderRight: `1px solid ${colorBorder}`,
  backgroundColor: "#fff",
  display: "flex",
  alignItems: "center",
  gap: 6,
  position: "sticky",
  left: 0,
  zIndex: 1,
  minHeight: ROW_MIN_HEIGHT,
};

const valueCellBase: React.CSSProperties = {
  padding: 0,
  borderBottom: `1px solid ${colorBorder}`,
  borderRight: `1px solid ${colorBorder}`,
  display: "flex",
  alignItems: "stretch",
  minWidth: 0,
  minHeight: ROW_MIN_HEIGHT,
};

/**
 * Borderless flush-cell input style — the wrapping `valueCellBase` provides the cell border;
 * the input itself blends into the cell (transparent background, no border, no radius). This
 * is the single biggest visual change to remove the "form widget inside a card" feel.
 */
const selectStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "4px 8px",
  border: 0,
  borderRadius: 0,
  fontSize: 12,
  color: "#0f172a",
  backgroundColor: "transparent",
  minWidth: 0,
};

const colHeaderTopBox: React.CSSProperties = {
  padding: "6px 10px",
  borderBottom: `1px solid ${colorBorder}`,
  borderRight: `1px solid ${colorBorder}`,
  backgroundColor: "#f8fafc",
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const colFooterBox: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 11,
  color: colorMuted,
  borderRight: `1px solid ${colorBorder}`,
  borderTop: `1px solid ${colorBorder}`,
  backgroundColor: "#fff",
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
  padding: "6px 12px 4px 12px",
  borderTop: `1px solid ${colorBorder}`,
  borderBottom: `1px solid #f1f5f9`,
  backgroundColor: "#f1f5f9",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: colorMuted,
};

const readOnlyTextBox: React.CSSProperties = {
  width: "100%",
  padding: "4px 8px",
  fontSize: 12,
  color: "#0f172a",
  lineHeight: 1.35,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

/**
 * Compact chip button used by chip-multi rows. Sized small enough that ~12 chips wrap into 2-3
 * lines inside a 160px–1fr column, while remaining tap-target friendly on touch (>= 22px tall
 * via `padding`). Selection state styling is applied inline at the call-site so we can
 * differentiate active / disabled visuals without duplicating the base style.
 */
const chipButtonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  padding: "2px 8px",
  fontSize: 11,
  fontWeight: 500,
  lineHeight: 1.3,
  whiteSpace: "nowrap",
  textAlign: "left",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const chevronButton: React.CSSProperties = {
  background: "transparent",
  border: 0,
  padding: 0,
  margin: 0,
  width: 18,
  height: 18,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1,
};

function formatColumnTime(
  isoOrLocal: string,
  language: "en" | "fr"
): { time: string; date: string } {
  if (!isoOrLocal) return { time: "—", date: "" };
  const d = new Date(isoOrLocal);
  if (Number.isNaN(d.getTime())) return { time: "—", date: "" };
  const tag = productUiBcp47Tag(language);
  return {
    time: d.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" }),
    date: d.toLocaleDateString(tag, { day: "2-digit", month: "2-digit", year: "numeric" }),
  };
}

/**
 * Build the CSS-grid track template for the flowsheet:
 *   [sticky label track] [N data tracks] [ghost "+ Add column" track]
 * Sticky label track is fixed so the row labels never collapse below readability. Data tracks
 * use a tight min/1fr distribution to keep the spreadsheet dense; the ghost track is narrower
 * because it only carries the "+ Add column" affordance (no body content).
 */
function buildGridTemplate(dataColumnCount: number): string {
  const cols = Math.max(1, dataColumnCount);
  const dataTracks = Array.from({ length: cols }, () => "minmax(160px, 1fr)").join(" ");
  return `minmax(160px, 200px) ${dataTracks} minmax(110px, 130px)`;
}

// ── Row catalog ──────────────────────────────────────────────────────────────

type GridSectionId =
  | "primary"
  | "additional"
  | "care_safety"
  | "bedside_safety"
  | "trauma_primary"
  | "trauma_secondary"
  | "legacy_abc";

type SimpleSelectKey =
  | "mentalStatus"
  | "orientation"
  | "speech"
  | "respiratoryPattern"
  | "cardiacRhythm"
  | "fallRisk"
  | "generalAppearanceCode"
  | "skinCondition"
  | "ambulation"
  | "safetyRisk"
  | "distressLevel"
  | "airwayType"
  | "respEffortBreathing"
  | "respDepth"
  | "respChestMovement"
  | "cardiacEctopy"
  | "ivAccess";

/**
 * Free-text reassessment-snapshot keys (per-column history available via
 * `ErNursingReassessmentStored`). Past columns render the saved string read-only; the active
 * column renders an `<input>` or `<textarea>` bound to the form. Keeping them in the grid
 * preserves clinical free-text capability while removing the duplicate standalone sections.
 *
 * `careMonitoringSummary` is additive (Phase-3+ rollout). Legacy events without it render `""`
 * in past columns — same as any other historically-absent free-text field.
 */
type FreeTextSnapshotKey =
  | "responseToTreatment"
  | "interventionsPerformed"
  | "safetyRoundingNote"
  | "addendum"
  | "bedsideStatus"
  | "generalAppearance"
  | "vitalsSummaryNote"
  | "careMonitoringSummary";

/**
 * Trauma A/B/C/D/E rows. Past columns can show data when the persisted event row carries a
 * `traumaSnapshot`; otherwise "—". Active draft column binds to `traumaForm`.
 */
type TraumaAbcdeKey =
  | "primaryAirway"
  | "primaryBreathing"
  | "primaryCirculation"
  | "primaryDisability"
  | "primaryExposure";

/**
 * Trauma free-text rows (primary notes + secondary survey body regions). Past columns surface
 * data when `traumaSnapshot` carries the field; otherwise "—". Active column binds to
 * `traumaForm`.
 */
type TraumaTextKey =
  | "primaryNotes"
  | "secondaryHeadFace"
  | "secondaryNeck"
  | "secondaryChest"
  | "secondaryAbdomenPelvis"
  | "secondaryBackSpine"
  | "secondaryExtremities"
  | "secondarySkinWounds"
  | "secondaryNotes";

/**
 * Triage bedside-safety Yes/No/Unknown rows. These live on the triage row (encounter-singleton),
 * NOT in the per-column history — past columns render "—" by design. The active draft column
 * binds to the parent-provided `triageNursingSlice` and patches via `onPatchTriageSlice`; the
 * parent's existing triage side-write flow persists changes alongside the reassessment save.
 */
type TriageYnuKey =
  | "callLightInReach"
  | "bedLockedLow"
  | "familyAtBedside"
  | "inViewOfNursingStation"
  | "patientUpdatedOnPlan"
  | "comfortMeasuresProvided";

/** Triage free-text rows (PPE / ED course note + nursing notes addendum + nursing care note). */
type TriageTextKey = "edCoursePpeNote" | "nursingNotesAddendum" | "nursingCareNote";

/**
 * Multi-chip-toggle row.
 *
 * Each chip is a clickable button that toggles its localized label's presence in the
 * underlying free-text storage field. The stored string is the source of truth — chip
 * selection is derived on every render by line-by-line membership against the current
 * stored value (split by `\n`, trim each, equality compare against the chip's localized
 * label). Historical/legacy free-text content is preserved verbatim; chips simply do not
 * highlight when the saved string contains custom prose.
 *
 * `backend` selects which form pipe the chip writes to:
 *   - `"form"`    → `form[key]` via `onPatch`            (per-column history via reassessment snapshot)
 *   - `"trauma"`  → `traumaForm[key]` via `onPatchTrauma` (per-column history via traumaSnapshot)
 *   - `"triage"`  → `triageNursingSlice[key]` via `onPatchTriageSlice` (encounter-singleton — past
 *                   columns render "—")
 *
 * The `"Other / see narrative"` option is just another chip; selecting it toggles a stable
 * localized phrase in the stored string — there is no separate inline free-text widget,
 * keeping the row visually compact and aligned with the flowsheet aesthetic.
 */
type ChipMultiRow =
  | {
      kind: "chip-multi";
      backend: "form";
      sectionId: GridSectionId;
      key: FreeTextSnapshotKey;
      labelKey: string;
      options: readonly string[];
      optionsI18nNamespace: string;
    }
  | {
      kind: "chip-multi";
      backend: "trauma";
      sectionId: GridSectionId;
      key: TraumaTextKey;
      labelKey: string;
      options: readonly string[];
      optionsI18nNamespace: string;
    }
  | {
      kind: "chip-multi";
      backend: "triage";
      sectionId: GridSectionId;
      key: TriageTextKey;
      labelKey: string;
      options: readonly string[];
      optionsI18nNamespace: string;
    };

type RowDef =
  | {
      kind: "select";
      sectionId: GridSectionId;
      key: SimpleSelectKey;
      options: readonly string[];
      optionsI18nNamespace: string;
      labelKey: string;
    }
  | { kind: "trend-select"; sectionId: GridSectionId; key: "trend"; labelKey: string }
  | {
      kind: "abc-select";
      sectionId: GridSectionId;
      key: "airway" | "breathing" | "circulation";
      options: readonly ErAbcOption[];
      labelKey: string;
    }
  | { kind: "pain-select"; sectionId: GridSectionId; key: "pain0to10"; labelKey: string }
  | {
      kind: "free-text";
      sectionId: GridSectionId;
      key: FreeTextSnapshotKey;
      labelKey: string;
      multiline: boolean;
    }
  | { kind: "trauma-abcde"; sectionId: GridSectionId; key: TraumaAbcdeKey; labelKey: string }
  | { kind: "trauma-text"; sectionId: GridSectionId; key: TraumaTextKey; labelKey: string }
  | { kind: "triage-ynu"; sectionId: GridSectionId; key: TriageYnuKey; labelKey: string }
  | {
      kind: "triage-text";
      sectionId: GridSectionId;
      key: TriageTextKey;
      labelKey: string;
      multiline: boolean;
    }
  | ChipMultiRow;

// ── Chip-multi option catalogs ──────────────────────────────────────────────
//
// Internal codes (snake_case, English-stable) used as i18n keys; the UI ALWAYS resolves them
// via `t()` to the localized label before showing or storing them. The phrase actually written
// to the JSON snapshot is the localized label string, joined by `\n`. Adding new codes is
// safe — past saves just won't surface them as chips.
//
// `other_see_narrative` is included on every list (per the task spec). When a row needs no
// catch-all (e.g. trauma fields where notes belong in the trauma-text "notes" row), it can
// still be useful as a quick affordance to defer to the bottom narrative.

const RESPONSE_TO_TREATMENT_OPTIONS: readonly string[] = [
  "improved_after_treatment",
  "no_change_after_treatment",
  "symptoms_worsened",
  "pain_improved",
  "pain_unchanged",
  "pain_worsened",
  "breathing_improved",
  "nausea_improved",
  "reassessed_after_intervention",
  "provider_notified_of_change",
  "provider_notified_uncontrolled_pain",
  "tolerable_pain_level",
  "other_see_narrative",
];

const INTERVENTIONS_PERFORMED_OPTIONS: readonly string[] = [
  "iv_access_assessed",
  "medication_administered_per_mar",
  "oxygen_applied",
  "patient_repositioned",
  "safety_rounding_completed",
  "education_provided",
  "provider_updated",
  "non_pharmacologic_comfort_measures",
  "ice_heat_applied",
  "repositioned_for_comfort",
  "pain_reassessment_completed",
  "education_pain_reporting",
  "other_see_narrative",
];

const BEDSIDE_STATUS_OPTIONS: readonly string[] = [
  "supine",
  "sitting_upright",
  "ambulatory_with_assistance",
  "family_at_bedside",
  "call_light_within_reach",
  "side_rails_up",
  "resting_comfortably",
  "awaiting_provider_reassessment",
  "awaiting_results",
  "other_see_narrative",
];

const CARE_MONITORING_SUMMARY_OPTIONS: readonly string[] = [
  "continuous_monitoring",
  "cardiac_monitor",
  "oxygen_therapy",
  "iv_access_established",
  "fall_precautions",
  "comfort_measures",
  "pain_reassessment",
  "intake_output_monitored",
  "patient_education_reinforced",
  "provider_updated",
  "other_see_narrative",
];

const ED_PPE_OPTIONS: readonly string[] = [
  "standard_precautions",
  "gloves_used",
  "mask_used",
  "eye_protection_used",
  "gown_used",
  "isolation_precautions",
  "hand_hygiene_performed",
  "ppe_not_indicated",
  "other_see_narrative",
];

const TRAUMA_HEAD_FACE_OPTIONS: readonly string[] = [
  "no_visible_trauma",
  "abrasion",
  "laceration",
  "contusion",
  "swelling",
  "tenderness",
  "bleeding_controlled",
  "pupils_equal_reactive",
  "facial_asymmetry",
  "other_see_narrative",
];

const TRAUMA_NECK_OPTIONS: readonly string[] = [
  "no_tenderness",
  "midline_tenderness",
  "c_collar_in_place",
  "rom_intact",
  "limited_rom",
  "trachea_midline",
  "no_jvd",
  "swelling",
  "other_see_narrative",
];

const TRAUMA_CHEST_OPTIONS: readonly string[] = [
  "equal_chest_rise",
  "clear_breath_sounds",
  "chest_wall_tenderness",
  "contusion",
  "crepitus",
  "diminished_breath_sounds",
  "labored_respirations",
  "no_visible_trauma",
  "other_see_narrative",
];

const TRAUMA_ABDOMEN_PELVIS_OPTIONS: readonly string[] = [
  "soft",
  "non_tender",
  "tenderness",
  "distended",
  "guarding",
  "rebound_tenderness",
  "pelvis_stable",
  "pelvic_tenderness",
  "no_visible_trauma",
  "other_see_narrative",
];

const TRAUMA_BACK_SPINE_OPTIONS: readonly string[] = [
  "no_tenderness",
  "midline_tenderness",
  "paraspinal_tenderness",
  "no_step_off",
  "step_off_noted",
  "full_rom",
  "limited_rom",
  "no_visible_trauma",
  "other_see_narrative",
];

const TRAUMA_EXTREMITIES_OPTIONS: readonly string[] = [
  "no_deformity",
  "deformity",
  "swelling",
  "tenderness",
  "distal_pulses_intact",
  "sensation_intact",
  "motor_intact",
  "limited_rom",
  "full_rom",
  "cap_refill_under_2_sec",
  "other_see_narrative",
];

const TRAUMA_SKIN_WOUNDS_OPTIONS: readonly string[] = [
  "skin_intact",
  "abrasion",
  "laceration",
  "contusion",
  "puncture_wound",
  "burn",
  "bleeding_controlled",
  "dressing_applied",
  "wound_cleansed",
  "other_see_narrative",
];

/**
 * i18n namespace prefix for chip-multi options. Each chip option is resolved as
 * `emergencyNursingReassessment.{namespace}.{code}`. Namespaces are scoped under
 * `documentationGrid.options.*` so they live alongside the grid-specific copy.
 */
const CHIP_NS_RESPONSE = "documentationGrid.options.responseToTreatmentOptions";
const CHIP_NS_INTERVENTIONS = "documentationGrid.options.interventionsPerformedOptions";
const CHIP_NS_BEDSIDE = "documentationGrid.options.bedsideStatusOptions";
const CHIP_NS_CARE_MONITORING = "documentationGrid.options.careMonitoringSummaryOptions";
const CHIP_NS_ED_PPE = "documentationGrid.options.edPpeOptions";
const CHIP_NS_TRAUMA_HEAD_FACE = "documentationGrid.options.traumaHeadFaceOptions";
const CHIP_NS_TRAUMA_NECK = "documentationGrid.options.traumaNeckOptions";
const CHIP_NS_TRAUMA_CHEST = "documentationGrid.options.traumaChestOptions";
const CHIP_NS_TRAUMA_ABDOMEN_PELVIS = "documentationGrid.options.traumaAbdomenPelvisOptions";
const CHIP_NS_TRAUMA_BACK_SPINE = "documentationGrid.options.traumaBackSpineOptions";
const CHIP_NS_TRAUMA_EXTREMITIES = "documentationGrid.options.traumaExtremitiesOptions";
const CHIP_NS_TRAUMA_SKIN_WOUNDS = "documentationGrid.options.traumaSkinWoundsOptions";

const ROWS: readonly RowDef[] = [
  // ── A. Primary (mockup-aligned, default expanded) ────────────────────────
  {
    kind: "select",
    sectionId: "primary",
    key: "mentalStatus",
    options: ER_NURSING_MENTAL_STATUS_OPTIONS,
    optionsI18nNamespace: "mentalStatusOptions",
    labelKey: "rowMentalStatus",
  },
  {
    kind: "select",
    sectionId: "primary",
    key: "orientation",
    options: ER_NURSING_ORIENTATION_OPTIONS,
    optionsI18nNamespace: "orientationOptions",
    labelKey: "rowOrientation",
  },
  {
    kind: "select",
    sectionId: "primary",
    key: "speech",
    options: ER_NURSING_SPEECH_OPTIONS,
    optionsI18nNamespace: "speechOptions",
    labelKey: "rowSpeech",
  },
  { kind: "pain-select", sectionId: "primary", key: "pain0to10", labelKey: "rowPain" },
  {
    kind: "select",
    sectionId: "primary",
    key: "airwayType",
    options: ER_NURSING_AIRWAY_TYPE_OPTIONS,
    optionsI18nNamespace: "airwayTypeOptions",
    labelKey: "rowAirwayType",
  },
  {
    kind: "select",
    sectionId: "primary",
    key: "respEffortBreathing",
    options: ER_NURSING_RESP_EFFORT_OPTIONS,
    optionsI18nNamespace: "respEffortOptions",
    labelKey: "rowRespEffortBreathing",
  },
  {
    kind: "select",
    sectionId: "primary",
    key: "respDepth",
    options: ER_NURSING_RESP_DEPTH_OPTIONS,
    optionsI18nNamespace: "respDepthOptions",
    labelKey: "rowRespDepth",
  },
  {
    kind: "select",
    sectionId: "primary",
    key: "respChestMovement",
    options: ER_NURSING_RESP_CHEST_MOVEMENT_OPTIONS,
    optionsI18nNamespace: "respChestMovementOptions",
    labelKey: "rowRespChestMovement",
  },
  {
    kind: "select",
    sectionId: "primary",
    key: "respiratoryPattern",
    options: ER_NURSING_RESPIRATORY_PATTERN_OPTIONS,
    optionsI18nNamespace: "respiratoryPatternOptions",
    labelKey: "rowRespPattern",
  },
  {
    kind: "select",
    sectionId: "primary",
    key: "cardiacRhythm",
    options: ER_NURSING_CARDIAC_RHYTHM_OPTIONS,
    optionsI18nNamespace: "cardiacRhythmOptions",
    labelKey: "rowCardiacRhythm",
  },
  {
    kind: "select",
    sectionId: "primary",
    key: "cardiacEctopy",
    options: ER_NURSING_CARDIAC_ECTOPY_OPTIONS,
    optionsI18nNamespace: "cardiacEctopyOptions",
    labelKey: "rowCardiacEctopy",
  },
  {
    kind: "select",
    sectionId: "primary",
    key: "skinCondition",
    options: ER_NURSING_SKIN_CONDITION_OPTIONS,
    optionsI18nNamespace: "skinConditionOptions",
    labelKey: "rowSkinGeneral",
  },
  {
    kind: "select",
    sectionId: "primary",
    key: "ivAccess",
    options: ER_NURSING_IV_ACCESS_OPTIONS,
    optionsI18nNamespace: "ivAccessOptions",
    labelKey: "rowIvAccess",
  },
  {
    kind: "select",
    sectionId: "primary",
    key: "fallRisk",
    options: ER_NURSING_FALL_RISK_OPTIONS,
    optionsI18nNamespace: "fallRiskOptions",
    labelKey: "rowSafetyFallRisk",
  },

  // ── B. Additional (default collapsed) ───────────────────────────────────
  {
    kind: "select",
    sectionId: "additional",
    key: "generalAppearanceCode",
    options: ER_NURSING_GENERAL_APPEARANCE_OPTIONS,
    optionsI18nNamespace: "generalAppearanceOptions",
    labelKey: "rowGeneralAppearance",
  },
  {
    kind: "select",
    sectionId: "additional",
    key: "distressLevel",
    options: ER_NURSING_DISTRESS_LEVEL_OPTIONS,
    optionsI18nNamespace: "distressLevelOptions",
    labelKey: "rowDistressLevel",
  },
  {
    kind: "select",
    sectionId: "additional",
    key: "ambulation",
    options: ER_NURSING_AMBULATION_OPTIONS,
    optionsI18nNamespace: "ambulationOptions",
    labelKey: "rowAmbulation",
  },
  {
    kind: "select",
    sectionId: "additional",
    key: "safetyRisk",
    options: ER_NURSING_SAFETY_RISK_OPTIONS,
    optionsI18nNamespace: "safetyRiskOptions",
    labelKey: "rowSafetyRisk",
  },
  { kind: "trend-select", sectionId: "additional", key: "trend", labelKey: "rowTrend" },

  // ── C. Care / safety rows (default collapsed) ────────────────────────────
  /**
   * These rows replace the previous standalone "Response", "Care / safety", and "Addendum"
   * sections that lived below the grid. Their values still serialize into the same
   * `ErNursingReassessmentStored` snapshot — no schema change — so per-column history Just
   * Works for past columns.
   *
   * Chip-multi rows (response / interventions / bedside / monitoring) compose the stored
   * string from clickable, localized chip labels (one selected option per line). Free-text
   * rows (rounding note, addendum) remain narrative because their content is intrinsically
   * prose, not enumerable.
   *
   * Removed (duplicates / unused):
   *   - `rowGeneralAppearanceFreeText` (`generalAppearance`) — the structured "Apparence
   *     générale" already lives under Additional Assessment.
   *   - `rowVitalsSummaryNote` (`vitalsSummaryNote`) — vitals are recorded via the dedicated
   *     vitals editor; this row was redundant.
   *   The underlying snapshot fields are kept on the stored type so legacy events still load
   *   without data loss; they just no longer surface as their own row.
   */
  {
    kind: "chip-multi",
    backend: "form",
    sectionId: "care_safety",
    key: "responseToTreatment",
    labelKey: "rowResponseToTreatment",
    options: RESPONSE_TO_TREATMENT_OPTIONS,
    optionsI18nNamespace: CHIP_NS_RESPONSE,
  },
  {
    kind: "chip-multi",
    backend: "form",
    sectionId: "care_safety",
    key: "interventionsPerformed",
    labelKey: "rowInterventionsPerformed",
    options: INTERVENTIONS_PERFORMED_OPTIONS,
    optionsI18nNamespace: CHIP_NS_INTERVENTIONS,
  },
  {
    kind: "chip-multi",
    backend: "form",
    sectionId: "care_safety",
    key: "bedsideStatus",
    labelKey: "rowBedsideStatus",
    options: BEDSIDE_STATUS_OPTIONS,
    optionsI18nNamespace: CHIP_NS_BEDSIDE,
  },
  {
    kind: "chip-multi",
    backend: "form",
    sectionId: "care_safety",
    key: "careMonitoringSummary",
    labelKey: "rowCareMonitoringSummary",
    options: CARE_MONITORING_SUMMARY_OPTIONS,
    optionsI18nNamespace: CHIP_NS_CARE_MONITORING,
  },
  {
    kind: "free-text",
    sectionId: "care_safety",
    key: "safetyRoundingNote",
    labelKey: "rowSafetyRoundingNote",
    multiline: true,
  },
  {
    kind: "free-text",
    sectionId: "care_safety",
    key: "addendum",
    labelKey: "rowAddendum",
    multiline: true,
  },

  // ── D. Bedside safety (triage slice; active column only — no per-column history) ────
  /**
   * Triage bedside-safety Y/N/U fields and free-text notes. Rendered active-column-only
   * because their storage is on the encounter's triage row, which is encounter-singleton.
   * Past columns intentionally render "—" — surfacing the latest triage value across every
   * historical column would misrepresent prior charting. The active-column save path is
   * unchanged (the parent already runs a triage side-write after the reassessment save).
   */
  {
    kind: "triage-ynu",
    sectionId: "bedside_safety",
    key: "callLightInReach",
    labelKey: "rowCallLightInReach",
  },
  {
    kind: "triage-ynu",
    sectionId: "bedside_safety",
    key: "bedLockedLow",
    labelKey: "rowBedLockedLow",
  },
  {
    kind: "triage-ynu",
    sectionId: "bedside_safety",
    key: "familyAtBedside",
    labelKey: "rowFamilyAtBedside",
  },
  {
    kind: "triage-ynu",
    sectionId: "bedside_safety",
    key: "inViewOfNursingStation",
    labelKey: "rowInViewOfDesk",
  },
  {
    kind: "triage-ynu",
    sectionId: "bedside_safety",
    key: "patientUpdatedOnPlan",
    labelKey: "rowPlanExplained",
  },
  {
    kind: "triage-ynu",
    sectionId: "bedside_safety",
    key: "comfortMeasuresProvided",
    labelKey: "rowComfortMeasures",
  },
  {
    kind: "triage-text",
    sectionId: "bedside_safety",
    key: "nursingCareNote",
    labelKey: "rowNursingCareNote",
    multiline: true,
  },
  {
    kind: "chip-multi",
    backend: "triage",
    sectionId: "bedside_safety",
    key: "edCoursePpeNote",
    labelKey: "rowEdPpe",
    options: ED_PPE_OPTIONS,
    optionsI18nNamespace: CHIP_NS_ED_PPE,
  },
  {
    kind: "triage-text",
    sectionId: "bedside_safety",
    key: "nursingNotesAddendum",
    labelKey: "rowNursingNotesAddendum",
    multiline: true,
  },

  // ── E. Trauma — primary survey (default collapsed) ───────────────────────
  /**
   * Trauma fields render in the column board too. Past columns surface trauma data when the
   * persisted reassessment event carries a `traumaSnapshot` (the API includes it when the
   * trauma blob co-saved at the time); otherwise the cell shows "—". The active draft column
   * binds to the parent-provided `traumaForm`. Append-only safety preserved — no historical
   * `traumaSnapshot` is mutated.
   */
  {
    kind: "trauma-abcde",
    sectionId: "trauma_primary",
    key: "primaryAirway",
    labelKey: "rowAirwayPrimary",
  },
  {
    kind: "trauma-abcde",
    sectionId: "trauma_primary",
    key: "primaryBreathing",
    labelKey: "rowBreathingPrimary",
  },
  {
    kind: "trauma-abcde",
    sectionId: "trauma_primary",
    key: "primaryCirculation",
    labelKey: "rowCirculationPrimary",
  },
  {
    kind: "trauma-abcde",
    sectionId: "trauma_primary",
    key: "primaryDisability",
    labelKey: "rowNeurologic",
  },
  {
    kind: "trauma-abcde",
    sectionId: "trauma_primary",
    key: "primaryExposure",
    labelKey: "rowExposure",
  },
  {
    kind: "trauma-text",
    sectionId: "trauma_primary",
    key: "primaryNotes",
    labelKey: "rowTraumaPrimaryNotes",
  },

  // ── F. Trauma — secondary survey (default collapsed) ─────────────────────
  /**
   * Body-region rows are chip-multi so common findings (no visible trauma / abrasion /
   * tenderness / etc.) are one click away. The trailing "Notes" row stays free-text so the
   * nurse can capture region-specific narrative detail. Storage is the same trauma-text
   * fields; past columns surface chip labels verbatim from `traumaSnapshot`.
   */
  {
    kind: "chip-multi",
    backend: "trauma",
    sectionId: "trauma_secondary",
    key: "secondaryHeadFace",
    labelKey: "rowHeadFace",
    options: TRAUMA_HEAD_FACE_OPTIONS,
    optionsI18nNamespace: CHIP_NS_TRAUMA_HEAD_FACE,
  },
  {
    kind: "chip-multi",
    backend: "trauma",
    sectionId: "trauma_secondary",
    key: "secondaryNeck",
    labelKey: "rowNeck",
    options: TRAUMA_NECK_OPTIONS,
    optionsI18nNamespace: CHIP_NS_TRAUMA_NECK,
  },
  {
    kind: "chip-multi",
    backend: "trauma",
    sectionId: "trauma_secondary",
    key: "secondaryChest",
    labelKey: "rowChest",
    options: TRAUMA_CHEST_OPTIONS,
    optionsI18nNamespace: CHIP_NS_TRAUMA_CHEST,
  },
  {
    kind: "chip-multi",
    backend: "trauma",
    sectionId: "trauma_secondary",
    key: "secondaryAbdomenPelvis",
    labelKey: "rowAbdomenPelvis",
    options: TRAUMA_ABDOMEN_PELVIS_OPTIONS,
    optionsI18nNamespace: CHIP_NS_TRAUMA_ABDOMEN_PELVIS,
  },
  {
    kind: "chip-multi",
    backend: "trauma",
    sectionId: "trauma_secondary",
    key: "secondaryBackSpine",
    labelKey: "rowBackSpine",
    options: TRAUMA_BACK_SPINE_OPTIONS,
    optionsI18nNamespace: CHIP_NS_TRAUMA_BACK_SPINE,
  },
  {
    kind: "chip-multi",
    backend: "trauma",
    sectionId: "trauma_secondary",
    key: "secondaryExtremities",
    labelKey: "rowExtremities",
    options: TRAUMA_EXTREMITIES_OPTIONS,
    optionsI18nNamespace: CHIP_NS_TRAUMA_EXTREMITIES,
  },
  {
    kind: "chip-multi",
    backend: "trauma",
    sectionId: "trauma_secondary",
    key: "secondarySkinWounds",
    labelKey: "rowSkinWounds",
    options: TRAUMA_SKIN_WOUNDS_OPTIONS,
    optionsI18nNamespace: CHIP_NS_TRAUMA_SKIN_WOUNDS,
  },
  {
    kind: "trauma-text",
    sectionId: "trauma_secondary",
    key: "secondaryNotes",
    labelKey: "rowSecondaryNotes",
  },

  // ── G. Legacy ABC (default collapsed; rendered only when data exists) ───
  {
    kind: "abc-select",
    sectionId: "legacy_abc",
    key: "airway",
    options: ER_NURSING_AIRWAY_SELECT_OPTIONS,
    labelKey: "rowAirwayLegacy",
  },
  {
    kind: "abc-select",
    sectionId: "legacy_abc",
    key: "breathing",
    options: ER_NURSING_BREATHING_SELECT_OPTIONS,
    labelKey: "rowBreathingLegacy",
  },
  {
    kind: "abc-select",
    sectionId: "legacy_abc",
    key: "circulation",
    options: ER_NURSING_CIRCULATION_SELECT_OPTIONS,
    labelKey: "rowCirculationLegacy",
  },
];

// ── Read-only display resolvers ──────────────────────────────────────────────

function readSnapshotString(
  snapshot: Record<string, unknown> | null | undefined,
  key: string
): string {
  if (!snapshot) return "";
  const v = snapshot[key];
  return typeof v === "string" ? v : "";
}

function readSnapshotPain(snapshot: Record<string, unknown> | null | undefined): string {
  if (!snapshot) return "";
  const v = snapshot.pain0to10;
  if (typeof v === "number" && !Number.isNaN(v)) return String(Math.min(10, Math.max(0, v)));
  return "";
}

function resolveSelectLabel(t: TFn, optionsI18nNamespace: string, rawValue: string): string {
  if (!rawValue) return "";
  return t(`emergencyNursingReassessment.${optionsI18nNamespace}.${rawValue}`);
}

/**
 * Resolve the localized label for a chip-multi option. Same lookup pattern as `resolveSelectLabel`
 * (namespace path under `emergencyNursingReassessment.*`). A chip is rendered with this string,
 * AND the same string is what gets written to the underlying free-text field — so chip presence
 * detection stays language-stable for the active locale.
 */
function resolveChipLabel(t: TFn, namespace: string, code: string): string {
  if (!code) return "";
  return t(`emergencyNursingReassessment.${namespace}.${code}`);
}

/**
 * Pure helper: split a stored chip-multi string into trimmed, non-empty lines. Used by both the
 * read path (chip toggle state) and the toggle-off write path. `\n` is the only separator we
 * write, but we accept `\r\n` defensively for cross-platform clipboard pastes.
 */
function chipMultiLines(stored: string | undefined): string[] {
  if (!stored) return [];
  return stored
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Toggle a chip's localized label inside the stored chip-multi string. Idempotent and
 * order-preserving:
 *   - If `nextSelected` is `true` and the label is absent, the label is appended at the end
 *     (preserves the order of any pre-existing lines).
 *   - If `nextSelected` is `false`, every line whose trimmed value equals the label is removed
 *     (handles dupes from pre-rollout data without losing other content).
 *
 * Lines that DON'T match any chip label are preserved verbatim — this protects legacy free-text
 * content (e.g. the nurse may have typed "patient stable" in a prior chart) from being wiped.
 */
function toggleChipInStored(
  stored: string,
  label: string,
  nextSelected: boolean
): string {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) return stored;
  const lines = chipMultiLines(stored);
  const without = lines.filter((line) => line !== trimmedLabel);
  const next = nextSelected ? [...without, trimmedLabel] : without;
  return next.join("\n");
}

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

/**
 * Map a stored ErAbcdeOption (`normal` / `abnormal` / `unknown`) to its localized label. Used
 * for read-only past-column display of trauma A/B/C/D/E rows.
 */
function nursingAbcdeOptionLabel(t: TFn, v: ErAbcdeOption): string {
  if (!v) return "";
  if (v === "normal") return t("emergencyNursingReassessment.abcdeOptionNormal");
  if (v === "abnormal") return t("emergencyNursingReassessment.abcdeOptionAbnormal");
  if (v === "unknown") return t("emergencyNursingReassessment.abcOptionUnknown");
  return "";
}

/**
 * Map a stored Yes/No/Unknown triage value to its localized label. Reuses the existing
 * `erTriage.preview.*` keys so we do not duplicate option translations.
 */
function triageYnuOptionLabel(t: TFn, v: ErYesNoUnknown): string {
  if (!v) return "";
  if (v === "yes") return t("erTriage.preview.ynuYes");
  if (v === "no") return t("erTriage.preview.ynuNo");
  if (v === "unknown") return t("erTriage.preview.ynuUnknown");
  return "";
}

function resolveReadonlyDisplay(
  t: TFn,
  row: RowDef,
  snapshot: Record<string, unknown> | null,
  traumaSnapshot: Record<string, unknown> | null
): string {
  switch (row.kind) {
    case "select": {
      const v = readSnapshotString(snapshot, row.key);
      return resolveSelectLabel(t, row.optionsI18nNamespace, v);
    }
    case "trend-select": {
      const v = readSnapshotString(snapshot, "trend");
      return nursingTrendOptionLabel(t, v as ErTrend);
    }
    case "abc-select": {
      const v = readSnapshotString(snapshot, row.key);
      return nursingAbcSelectOptionLabel(t, v as ErAbcOption);
    }
    case "pain-select":
      return readSnapshotPain(snapshot);
    case "free-text": {
      /** Past-column free text: render the saved string verbatim (truncated by the cell). */
      return readSnapshotString(snapshot, row.key);
    }
    case "trauma-abcde": {
      const v = readSnapshotString(traumaSnapshot, row.key);
      return nursingAbcdeOptionLabel(t, v as ErAbcdeOption);
    }
    case "trauma-text": {
      return readSnapshotString(traumaSnapshot, row.key);
    }
    case "triage-ynu":
    case "triage-text": {
      /**
       * Triage bedside-safety fields are encounter-singleton — there is no per-column
       * historical trace. Rendering the latest live value across every past column would
       * misrepresent prior charting, so past cells remain "—". The active draft column binds
       * to the parent-provided slice and shows the live value.
       */
      return "";
    }
    case "chip-multi": {
      /**
       * Chip-multi past columns: render the stored string verbatim (each chip label on its
       * own line). The cell preserves whitespace via `whitespace: pre-wrap`, so multi-line
       * content reads cleanly. Triage-backed chip-multi rows still return "" for past
       * columns — same encounter-singleton rationale as `triage-text` above.
       */
      if (row.backend === "triage") return "";
      const src = row.backend === "form" ? snapshot : traumaSnapshot;
      return readSnapshotString(src, row.key);
    }
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
  formDisabled,
  t,
  language,
  savedSignature,
  persistedColumns,
  legacyColumn,
  onAddColumn,
  traumaForm,
  onPatchTrauma,
  triageNursingSlice,
  onPatchTriageSlice,
  triageSliceLoading,
}: Props) {
  const dg = (k: string) => t(`emergencyNursingReassessment.documentationGrid.${k}`);

  const sectionHelpId = useId();

  const columnTime = useMemo(
    () => formatColumnTime(form.reassessmentAt, language),
    [form.reassessmentAt, language]
  );
  const savedTime = useMemo(
    () => formatColumnTime(savedSignature?.savedAt ?? "", language),
    [savedSignature?.savedAt, language]
  );

  const isPersistedCurrent = Boolean(savedSignature?.savedAt);
  const updaterName = savedSignature?.savedByDisplayName?.trim() || "";
  const updaterInitials = displayNameInitials(updaterName);

  /** Persisted history is API-newest-first; render oldest-to-newest with legacy column leftmost. */
  const persistedColumnsForRender = useMemo(() => {
    const fromEvents = (persistedColumns ?? []).slice().reverse();
    return legacyColumn ? [legacyColumn, ...fromEvents] : fromEvents;
  }, [persistedColumns, legacyColumn]);

  /**
   * Whether any persisted column has data in the legacy ABC fields. The legacy section is
   * suppressed entirely when no historical chart used those codes — keeps new-clinic workflows
   * uncluttered while preserving the audit trail for older sites.
   */
  const hasLegacyAbcData = useMemo(() => {
    return persistedColumnsForRender.some((col) => {
      const a = readSnapshotString(col.snapshot, "airway");
      const b = readSnapshotString(col.snapshot, "breathing");
      const c = readSnapshotString(col.snapshot, "circulation");
      return Boolean(a || b || c);
    });
  }, [persistedColumnsForRender]);

  /**
   * Per-row collapse state. Default-collapsed rows: every row outside the `primary` section.
   * Care/safety, bedside-safety, trauma, and additional sections start collapsed so the
   * mockup-aligned compact bedside view is preserved; nurses expand any row via its chevron.
   * Collapsed rows still preserve their form value (UX-only).
   */
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const row of ROWS) {
      if (row.sectionId !== "primary") s.add(rowId(row));
    }
    return s;
  });
  const isRowCollapsed = (row: RowDef) => collapsedRows.has(rowId(row));
  const toggleRow = (row: RowDef) => {
    const id = rowId(row);
    setCollapsedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalDataColumns = persistedColumnsForRender.length + 1; // +1 for editable draft

  // Render helpers ---------------------------------------------------------

  /**
   * Editable cells render borderless inputs that fill the wrapping cell — the cell border
   * (from `valueCellBase`) is the only visible chrome. This is the central change that turns
   * the grid into a continuous flowsheet rather than a card grid. Inputs inherit the cell
   * background (transparent), so the active-column tint applied by the cell wrapper shows
   * through.
   */
  function renderEditableCell(row: RowDef): React.ReactNode {
    const disabledStyle: React.CSSProperties = formDisabled
      ? { color: "#94a3b8", cursor: "not-allowed" }
      : {};
    switch (row.kind) {
      case "select": {
        const value = (form[row.key] as string) ?? "";
        return (
          <select
            value={value}
            onChange={(e) =>
              onPatch({ [row.key]: e.target.value } as Partial<ErNursingReassessmentForm>)
            }
            disabled={formDisabled}
            aria-label={dg(row.labelKey)}
            aria-describedby={sectionHelpId}
            style={{
              ...selectStyle,
              cursor: formDisabled ? "not-allowed" : "pointer",
              ...disabledStyle,
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
        return (
          <select
            value={form.trend}
            onChange={(e) => onPatch({ trend: e.target.value as ErTrend })}
            disabled={formDisabled}
            aria-label={dg(row.labelKey)}
            aria-describedby={sectionHelpId}
            style={{
              ...selectStyle,
              cursor: formDisabled ? "not-allowed" : "pointer",
              ...disabledStyle,
            }}
          >
            <option value="">{dg("placeholder")}</option>
            {ER_NURSING_TREND_SELECT_OPTIONS.map((o) => (
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
              cursor: formDisabled ? "not-allowed" : "pointer",
              ...disabledStyle,
            }}
          >
            <option value="">{dg("placeholder")}</option>
            {row.options.map((o) => (
              <option key={o} value={o}>
                {nursingAbcSelectOptionLabel(t, o)}
              </option>
            ))}
          </select>
        );
      }
      case "pain-select": {
        return (
          <select
            value={form.pain0to10}
            onChange={(e) => onPatch({ pain0to10: e.target.value })}
            disabled={formDisabled}
            aria-label={dg(row.labelKey)}
            aria-describedby={sectionHelpId}
            style={{
              ...selectStyle,
              cursor: formDisabled ? "not-allowed" : "pointer",
              ...disabledStyle,
            }}
          >
            <option value="">{dg("placeholder")}</option>
            {Array.from({ length: 11 }, (_, i) => String(i)).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        );
      }
      case "free-text": {
        const value = (form[row.key] as string) ?? "";
        const commonStyle: React.CSSProperties = {
          ...selectStyle,
          cursor: formDisabled ? "not-allowed" : "text",
          ...disabledStyle,
        };
        if (row.multiline) {
          return (
            <textarea
              value={value}
              onChange={(e) =>
                onPatch({ [row.key]: e.target.value } as Partial<ErNursingReassessmentForm>)
              }
              disabled={formDisabled}
              rows={1}
              aria-label={dg(row.labelKey)}
              aria-describedby={sectionHelpId}
              style={{ ...commonStyle, minHeight: ROW_MIN_HEIGHT, resize: "vertical" }}
            />
          );
        }
        return (
          <input
            type="text"
            value={value}
            onChange={(e) =>
              onPatch({ [row.key]: e.target.value } as Partial<ErNursingReassessmentForm>)
            }
            disabled={formDisabled}
            aria-label={dg(row.labelKey)}
            aria-describedby={sectionHelpId}
            style={commonStyle}
          />
        );
      }
      case "trauma-abcde": {
        if (!traumaForm || !onPatchTrauma) return null;
        const value: ErAbcdeOption = (traumaForm[row.key] as ErAbcdeOption) || "";
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
              cursor: formDisabled ? "not-allowed" : "pointer",
              ...disabledStyle,
            }}
          >
            <option value="">{dg("placeholder")}</option>
            <option value="normal">{t("emergencyNursingReassessment.abcdeOptionNormal")}</option>
            <option value="abnormal">{t("emergencyNursingReassessment.abcdeOptionAbnormal")}</option>
            <option value="unknown">{t("emergencyNursingReassessment.abcOptionUnknown")}</option>
          </select>
        );
      }
      case "trauma-text": {
        if (!traumaForm || !onPatchTrauma) return null;
        const value = (traumaForm[row.key] as string) ?? "";
        return (
          <textarea
            value={value}
            onChange={(e) =>
              onPatchTrauma({ [row.key]: e.target.value } as Partial<ErTraumaSurveyV1>)
            }
            disabled={formDisabled}
            rows={1}
            aria-label={dg(row.labelKey)}
            aria-describedby={sectionHelpId}
            style={{
              ...selectStyle,
              cursor: formDisabled ? "not-allowed" : "text",
              minHeight: ROW_MIN_HEIGHT,
              resize: "vertical",
              ...disabledStyle,
            }}
          />
        );
      }
      case "triage-ynu": {
        if (!triageNursingSlice || !onPatchTriageSlice) return null;
        const value: ErYesNoUnknown = (triageNursingSlice[row.key] as ErYesNoUnknown) || "";
        const triageDisabled = formDisabled || triageSliceLoading === true;
        return (
          <select
            value={value}
            onChange={(e) =>
              onPatchTriageSlice({
                [row.key]: e.target.value as ErYesNoUnknown,
              } as Partial<ErTriageV1NursingCarePersistSlice>)
            }
            disabled={triageDisabled}
            aria-label={dg(row.labelKey)}
            aria-describedby={sectionHelpId}
            style={{
              ...selectStyle,
              cursor: triageDisabled ? "not-allowed" : "pointer",
              ...(triageDisabled ? { color: "#94a3b8" } : {}),
            }}
          >
            <option value="">{dg("placeholder")}</option>
            <option value="yes">{t("erTriage.preview.ynuYes")}</option>
            <option value="no">{t("erTriage.preview.ynuNo")}</option>
            <option value="unknown">{t("erTriage.preview.ynuUnknown")}</option>
          </select>
        );
      }
      case "triage-text": {
        if (!triageNursingSlice || !onPatchTriageSlice) return null;
        const value = (triageNursingSlice[row.key] as string) ?? "";
        const triageDisabled = formDisabled || triageSliceLoading === true;
        const commonStyle: React.CSSProperties = {
          ...selectStyle,
          cursor: triageDisabled ? "not-allowed" : "text",
          ...(triageDisabled ? { color: "#94a3b8" } : {}),
        };
        if (row.multiline) {
          return (
            <textarea
              value={value}
              onChange={(e) =>
                onPatchTriageSlice({
                  [row.key]: e.target.value,
                } as Partial<ErTriageV1NursingCarePersistSlice>)
              }
              disabled={triageDisabled}
              rows={1}
              aria-label={dg(row.labelKey)}
              aria-describedby={sectionHelpId}
              style={{ ...commonStyle, minHeight: ROW_MIN_HEIGHT, resize: "vertical" }}
            />
          );
        }
        return (
          <input
            type="text"
            value={value}
            onChange={(e) =>
              onPatchTriageSlice({
                [row.key]: e.target.value,
              } as Partial<ErTriageV1NursingCarePersistSlice>)
            }
            disabled={triageDisabled}
            aria-label={dg(row.labelKey)}
            aria-describedby={sectionHelpId}
            style={commonStyle}
          />
        );
      }
      case "chip-multi": {
        /**
         * Resolve the stored string for the row's backend. Triage-backed chip-multi rows
         * require the parent's triage slice to be provided; without it the row renders "—"
         * (mirrors the existing `triage-text` fallback for older callers).
         */
        let stored = "";
        let chipDisabled = formDisabled;
        let writeChange: ((next: string) => void) | null = null;
        if (row.backend === "form") {
          stored = (form[row.key] as string) ?? "";
          writeChange = (next) =>
            onPatch({ [row.key]: next } as Partial<ErNursingReassessmentForm>);
        } else if (row.backend === "trauma") {
          if (!traumaForm || !onPatchTrauma) return null;
          stored = (traumaForm[row.key] as string) ?? "";
          writeChange = (next) =>
            onPatchTrauma({ [row.key]: next } as Partial<ErTraumaSurveyV1>);
        } else {
          if (!triageNursingSlice || !onPatchTriageSlice) return null;
          stored = (triageNursingSlice[row.key] as string) ?? "";
          chipDisabled = chipDisabled || triageSliceLoading === true;
          writeChange = (next) =>
            onPatchTriageSlice({
              [row.key]: next,
            } as Partial<ErTriageV1NursingCarePersistSlice>);
        }
        const lines = chipMultiLines(stored);
        const lineSet = new Set(lines);
        return (
          <div
            role="group"
            aria-label={dg(row.labelKey)}
            aria-describedby={sectionHelpId}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              padding: "4px 6px",
              minWidth: 0,
              alignContent: "flex-start",
            }}
          >
            {row.options.map((code) => {
              const label = resolveChipLabel(t, row.optionsI18nNamespace, code);
              if (!label) return null;
              const selected = lineSet.has(label);
              return (
                <button
                  type="button"
                  key={code}
                  onClick={() => {
                    if (chipDisabled || !writeChange) return;
                    writeChange(toggleChipInStored(stored, label, !selected));
                  }}
                  disabled={chipDisabled}
                  aria-pressed={selected}
                  title={label}
                  style={{
                    ...chipButtonStyle,
                    backgroundColor: selected
                      ? chipDisabled
                        ? "#cbd5e1"
                        : "#0ea5e9"
                      : chipDisabled
                      ? "#f1f5f9"
                      : "#fff",
                    color: selected ? "#fff" : chipDisabled ? "#94a3b8" : "#334155",
                    borderColor: selected ? "#0ea5e9" : "#cbd5e1",
                    cursor: chipDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        );
      }
      default: {
        const _exhaustive: never = row;
        return _exhaustive;
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  /**
   * Whether the active draft has any non-default content. Drives the "DRAFT" vs "CURRENT"
   * badge and the active-column tint intensity. Free-text fields are considered "started" via
   * trim() so an empty-with-only-whitespace value is still treated as empty.
   */
  const ghostColumnEnabled = Boolean(onAddColumn) && !formDisabled;

  /** Compute background for an active-column cell; alternating-row-aware so striping reads. */
  const activeBg = (rowIdx: number): string =>
    rowIdx % 2 === 1 ? colorActiveTintAlt : colorActiveTint;

  return (
    <div style={wrap}>
      <div style={headerBar}>
        <p style={headerTitle}>{dg("sectionTitle")}</p>
      </div>
      <p id={sectionHelpId} style={helpText}>
        {dg("sectionHelp")}
      </p>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: buildGridTemplate(totalDataColumns),
            borderTop: `1px solid ${colorBorder}`,
          }}
        >
          {/* Empty corner cell (sticky-left). */}
          <div
            style={{
              padding: "6px 10px",
              borderBottom: `1px solid ${colorBorder}`,
              borderRight: `1px solid ${colorBorder}`,
              backgroundColor: "#f8fafc",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: colorMuted,
              position: "sticky",
              left: 0,
              zIndex: 2,
              minHeight: 56,
            }}
            aria-hidden
          />
          {/* Persisted column headers — oldest leftmost, latest = "Actuel". */}
          {persistedColumnsForRender.map((col, idx) => {
            const headerTime = formatColumnTime(col.documentedAt ?? col.createdAt, language);
            const isLatestPersisted = idx === persistedColumnsForRender.length - 1;
            return (
              <div
                key={`hdr-${col.id}`}
                style={{
                  ...colHeaderTopBox,
                  backgroundColor: isLatestPersisted ? "#ecfdf5" : "#f8fafc",
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
                  {headerTime.time}
                </span>
                <span style={{ fontSize: 11, color: colorMuted }}>
                  {headerTime.date || dg("columnTimePlaceholder")}
                </span>
                {isLatestPersisted ? (
                  <span style={currentBadge}>{dg("columnHeaderLatest")}</span>
                ) : null}
              </div>
            );
          })}
          {/**
           * Draft column header — tinted to match the active-column body cells. Right border
           * removed so the dashed left border on the ghost column header is the only visible
           * boundary between active and ghost (avoids a doubled solid + dashed 2px line).
           */}
          <div
            style={{
              ...colHeaderTopBox,
              borderRight: 0,
              backgroundColor: persistedColumnsForRender.length > 0
                ? colorActiveTintAlt
                : "#dcfce7",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
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
          {/**
           * Ghost "+ Add column" header — clickable cell INSIDE the grid that mirrors the
           * bottom-bar "Add current column" action. Kept as a quiet dashed cell so it reads
           * as a placeholder column rather than a primary action; the bottom action bar
           * remains the primary path.
           */}
          <button
            type="button"
            onClick={onAddColumn}
            disabled={!ghostColumnEnabled}
            aria-label={dg("addColumnPlaceholderHint")}
            title={dg("addColumnPlaceholderHint")}
            style={{
              ...colHeaderTopBox,
              borderRight: 0,
              borderLeft: `1px dashed ${colorBorder}`,
              backgroundColor: "#fff",
              color: ghostColumnEnabled ? colorMuted : "#cbd5e1",
              cursor: ghostColumnEnabled ? "pointer" : "not-allowed",
              fontWeight: 600,
              fontSize: 12,
              textAlign: "center",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {dg("addColumnPlaceholder")}
          </button>

          {/* Sections + rows */}
          {(
            [
              "primary",
              "additional",
              "care_safety",
              "bedside_safety",
              "trauma_primary",
              "trauma_secondary",
              "legacy_abc",
            ] as const
          ).map((sectionId) => {
            if (sectionId === "legacy_abc" && !hasLegacyAbcData) return null;
            /**
             * Trauma rows cannot be authored without `traumaForm` + `onPatchTrauma`. Hide the
             * whole trauma sections from older callers that don't pass those props so we don't
             * render dead read-only-only rows. Past-column display still works through the
             * `traumaSnapshot` resolver when present.
             */
            if (
              (sectionId === "trauma_primary" || sectionId === "trauma_secondary") &&
              (!traumaForm || !onPatchTrauma)
            ) {
              return null;
            }
            /**
             * Bedside-safety rows likewise require a triage slice + patch handler. Hide the
             * section entirely when the parent doesn't pass them so the standalone-block
             * fallback keeps working without surfacing inert cells in the grid.
             */
            if (
              sectionId === "bedside_safety" &&
              (!triageNursingSlice || !onPatchTriageSlice)
            ) {
              return null;
            }
            const sectionRows = ROWS.filter((r) => r.sectionId === sectionId);
            if (sectionRows.length === 0) return null;
            return (
              <React.Fragment key={`sec-${sectionId}`}>
                <div style={sectionHeaderRow}>
                  <span style={{ position: "sticky", left: 12, display: "inline-block" }}>
                    {dg(`sections.${sectionId}`)}
                    {sectionId === "legacy_abc" ? (
                      <span
                        style={{
                          marginLeft: 8,
                          fontWeight: 500,
                          textTransform: "none",
                          letterSpacing: 0,
                          color: colorMuted,
                        }}
                      >
                        — {dg("legacyAbcExplain")}
                      </span>
                    ) : null}
                  </span>
                </div>
                {sectionRows.map((row, rowIdx) => {
                  const altBg = rowIdx % 2 === 1 ? colorRowAlt : "#fff";
                  const collapsed = isRowCollapsed(row);
                  const editableForRow = sectionId === "legacy_abc" ? null : renderEditableCell(row);
                  return (
                    <React.Fragment key={`r-${rowId(row)}`}>
                      <div style={{ ...labelCellBase, backgroundColor: altBg }}>
                        <button
                          type="button"
                          onClick={() => toggleRow(row)}
                          aria-label={collapsed ? dg("expandRowAria") : dg("collapseRowAria")}
                          aria-expanded={!collapsed}
                          style={chevronButton}
                        >
                          <span aria-hidden style={{ display: "inline-block" }}>
                            {collapsed ? "▸" : "▾"}
                          </span>
                        </button>
                        <span>{dg(row.labelKey)}</span>
                      </div>
                      {collapsed ? (
                        /**
                         * Single full-row span fills all data tracks (incl. ghost) with a
                         * thin "collapsed" placeholder. `+ 1` accounts for the ghost track.
                         */
                        <div
                          style={{
                            gridColumn: `2 / span ${totalDataColumns + 1}`,
                            padding: "4px 10px",
                            borderBottom: `1px solid ${colorBorder}`,
                            fontSize: 11,
                            color: "#cbd5e1",
                            backgroundColor: altBg,
                          }}
                          aria-hidden
                        >
                          ···
                        </div>
                      ) : (
                        <>
                          {persistedColumnsForRender.map((col) => {
                            const display = resolveReadonlyDisplay(
                              t,
                              row,
                              col.snapshot,
                              col.traumaSnapshot
                            );
                            return (
                              <div
                                key={`v-${col.id}-${rowId(row)}`}
                                style={{
                                  ...valueCellBase,
                                  backgroundColor: altBg,
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
                          {/**
                           * Active draft column cell — tinted via `activeBg(rowIdx)` so the
                           * entire active column reads as one continuous editable strip. The
                           * editable input inherits the cell background (transparent), so
                           * the tint shows through the borderless flush input. Right border
                           * removed; the ghost column's dashed left border is the boundary.
                           */}
                          <div
                            style={{
                              ...valueCellBase,
                              borderRight: 0,
                              backgroundColor: activeBg(rowIdx),
                            }}
                          >
                            {editableForRow ?? (
                              <div
                                style={{ ...readOnlyTextBox, color: "#94a3b8", fontStyle: "italic" }}
                              >
                                —
                              </div>
                            )}
                          </div>
                          {/**
                           * Ghost-column body cell. Empty by design — the column exists only
                           * so the "+ Add column" header has somewhere to anchor visually.
                           * Dashed left border ties it to the header.
                           */}
                          <div
                            aria-hidden
                            style={{
                              ...valueCellBase,
                              borderRight: 0,
                              borderLeft: `1px dashed ${colorBorder}`,
                              backgroundColor: "#fff",
                            }}
                          />
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* Footer row: updater identity per column */}
          <div
            style={{
              padding: "6px 10px",
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
              display: "flex",
              alignItems: "center",
            }}
          >
            {dg("footerUpdatedBy")}
          </div>
          {persistedColumnsForRender.map((col) => {
            const t2 = formatColumnTime(col.createdAt, language);
            const fullName = col.performerDisplayName.trim();
            const initials = col.performerInitials.trim() || displayNameInitials(fullName);
            return (
              <div key={`f-${col.id}`} style={colFooterBox}>
                {fullName ? (
                  <>
                    <span
                      style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}
                      title={fullName}
                    >
                      {fullName}
                    </span>
                    <span
                      style={{ fontSize: 10, color: colorMuted }}
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
          {/**
           * Active-column footer — tinted to match the active-column body. Right border
           * removed for the same reason as the active body cells: the ghost column's dashed
           * left border is the boundary.
           */}
          <div
            style={{
              ...colFooterBox,
              borderRight: 0,
              backgroundColor: colorActiveTint,
            }}
          >
            {updaterName ? (
              <>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }} title={updaterName}>
                  {updaterName}
                </span>
                <span
                  style={{ fontSize: 10, color: colorMuted }}
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
          {/** Ghost-column footer cell — empty placeholder. */}
          <div
            aria-hidden
            style={{
              ...colFooterBox,
              borderRight: 0,
              borderLeft: `1px dashed ${colorBorder}`,
              backgroundColor: "#fff",
            }}
          />
        </div>

      </div>
    </div>
  );
}

function rowId(row: RowDef): string {
  return `${row.sectionId}:${row.kind}:${row.key}`;
}
