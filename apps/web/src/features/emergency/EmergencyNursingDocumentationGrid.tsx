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
};

const colorBlue = "#0284c7";
const colorBorder = "#e2e8f0";
const colorMuted = "#64748b";
const colorRowAlt = "#f8fafc";

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

const headerTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.02em",
  color: colorBlue,
};

const helpText: React.CSSProperties = {
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
  alignItems: "center",
  gap: 6,
  position: "sticky",
  left: 0,
  zIndex: 1,
};

const valueCellBase: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: `1px solid ${colorBorder}`,
  display: "flex",
  alignItems: "center",
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
  const tag = language === "en" ? "en-US" : "fr-FR";
  return {
    time: d.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" }),
    date: d.toLocaleDateString(tag, { day: "2-digit", month: "2-digit", year: "numeric" }),
  };
}

function buildGridTemplate(columnCount: number): string {
  const cols = Math.max(1, columnCount);
  return `minmax(180px, 220px) ${Array.from({ length: cols }, () => "minmax(220px, 1fr)").join(" ")}`;
}

// ── Row catalog ──────────────────────────────────────────────────────────────

type GridSectionId = "primary" | "additional" | "legacy_abc";

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
  | { kind: "pain-select"; sectionId: GridSectionId; key: "pain0to10"; labelKey: string };

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

  // ── C. Legacy ABC (default collapsed; rendered only when data exists) ───
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

function resolveReadonlyDisplay(
  t: TFn,
  row: RowDef,
  snapshot: Record<string, unknown> | null
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
   * Per-row collapse state. Default-collapsed rows: every row in the `additional` and
   * `legacy_abc` sections so the mockup-aligned grid renders compact by default. Nurses can
   * expand any row via its chevron; collapsed rows still preserve their form value (UX-only).
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

  function renderEditableCell(row: RowDef): React.ReactNode {
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
        return (
          <select
            value={form.trend}
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
              backgroundColor: formDisabled ? "#f8fafc" : "#fff",
              cursor: formDisabled ? "not-allowed" : "pointer",
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
              backgroundColor: formDisabled ? "#f8fafc" : "#fff",
              cursor: formDisabled ? "not-allowed" : "pointer",
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
        <p style={headerTitle}>{dg("sectionTitle")}</p>
      </div>
      <p id={sectionHelpId} style={helpText}>
        {dg("sectionHelp")}
      </p>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", display: "flex" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: buildGridTemplate(totalDataColumns),
            borderTop: `1px solid ${colorBorder}`,
            marginTop: 10,
            flex: "1 1 auto",
          }}
        >
          {/* Empty corner cell (sticky-left). */}
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
                  borderRight: `1px solid ${colorBorder}`,
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
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
          {/* Draft column header (rightmost data column). */}
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
          {(["primary", "additional", "legacy_abc"] as const).map((sectionId) => {
            if (sectionId === "legacy_abc" && !hasLegacyAbcData) return null;
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
                         * Single full-row span fills all data tracks with a thin "collapsed"
                         * placeholder — keeps grid alignment without rendering each individual
                         * cell when the row is hidden.
                         */
                        <div
                          style={{
                            gridColumn: `2 / span ${totalDataColumns}`,
                            padding: "6px 10px",
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
                            const display = resolveReadonlyDisplay(t, row, col.snapshot);
                            return (
                              <div
                                key={`v-${col.id}-${rowId(row)}`}
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
                            {editableForRow ?? (
                              <div
                                style={{ ...readOnlyTextBox, color: "#94a3b8", fontStyle: "italic" }}
                              >
                                —
                              </div>
                            )}
                          </div>
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

        {/**
         * "+ Add column" placeholder rendered as a single tall button to the right of the grid.
         * Clicking it triggers the parent's `onAddColumn` handler, which mirrors the bottom-bar
         * "Add current column" action: save the active session, then start a new column. Kept
         * non-interactive (presentation-only) when no handler is provided so older callers
         * continue to render correctly.
         */}
        <button
          type="button"
          onClick={onAddColumn}
          disabled={formDisabled || !onAddColumn}
          aria-label={dg("addColumnPlaceholderHint")}
          title={dg("addColumnPlaceholderHint")}
          style={{
            flex: "0 0 auto",
            width: 140,
            margin: "10px 0 0 0",
            border: `1px dashed ${colorBorder}`,
            borderRadius: 8,
            backgroundColor: formDisabled ? "#f8fafc" : "#fff",
            color: formDisabled ? "#cbd5e1" : colorMuted,
            cursor: formDisabled || !onAddColumn ? "default" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 8px",
            minHeight: 80,
          }}
        >
          {dg("addColumnPlaceholder")}
        </button>
      </div>
    </div>
  );
}

function rowId(row: RowDef): string {
  return `${row.sectionId}:${row.kind}:${row.key}`;
}
