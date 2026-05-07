"use client";

/**
 * Column-style documentation grid for the ED Nursing Reassessment panel.
 *
 * Reads from / writes to the same `ErNursingReassessmentForm` state owned by the parent panel.
 * The existing PATCH /encounters/:id save handler persists the new structured rows alongside
 * the legacy fields under `Encounter.nursingAssessment.erNursingReassessmentV1` (no schema change).
 *
 * Today the grid renders a single "Current" column for the latest reassessment because the
 * underlying JSON shape stores only the latest record. Multi-column history is a deferred
 * Phase-2 product change (would either use `EncounterClinicalEvent NURSING_ASSESSMENT_SAVED`
 * events or an array shape in JSON).
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
  type ErAmbulation,
  type ErCardiacRhythm,
  type ErDistressLevel,
  type ErFallRisk,
  type ErGeneralAppearanceCode,
  type ErMentalStatus,
  type ErNursingReassessmentForm,
  type ErOrientation,
  type ErRespiratoryPattern,
  type ErSafetyRisk,
  type ErSkinCondition,
  type ErSpeech,
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
  /** Most recent saved signature (read from `nursingAssessment.erNursingReassessmentV1.signature`). */
  savedSignature?: SavedSignature | null;
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

const gridStyle: React.CSSProperties = {
  display: "grid",
  /** label track + one documentation column. Designed to extend with more columns when history lands. */
  gridTemplateColumns: "minmax(140px, 200px) minmax(220px, 1fr)",
  borderTop: `1px solid ${colorBorder}`,
  marginTop: 10,
};

const labelCell: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
  borderBottom: `1px solid ${colorBorder}`,
  borderRight: `1px solid ${colorBorder}`,
  backgroundColor: "#fff",
  display: "flex",
  alignItems: "center",
};

const valueCell: React.CSSProperties = {
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

export function EmergencyNursingDocumentationGrid({
  form,
  onPatch,
  formDisabled,
  t,
  language,
  savedSignature,
}: Props) {
  const dg = (k: string) => t(`emergencyNursingReassessment.documentationGrid.${k}`);

  /**
   * Stable id for the section help paragraph, referenced by every `<select aria-describedby>` so
   * screen-reader users get the documentation guidance ("structured selections refresh the auto
   * narrative block, free-text outside is preserved") on every focusable control.
   */
  const sectionHelpId = useId();
  const clearHintId = useId();

  const columnTime = useMemo(() => formatColumnTime(form.reassessmentAt, language), [form.reassessmentAt, language]);
  const savedTime = useMemo(
    () => formatColumnTime(savedSignature?.savedAt ?? "", language),
    [savedSignature?.savedAt, language]
  );

  /** "Current" badge is shown only when the column is actually persisted (signature present). */
  const isPersistedCurrent = Boolean(savedSignature?.savedAt);
  const updaterName = savedSignature?.savedByDisplayName?.trim() || "";
  const updaterInitials = displayNameInitials(updaterName);

  const rows: Array<{
    key: string;
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
  }> = [
    {
      key: "mentalStatus",
      label: dg("rowMentalStatus"),
      value: form.mentalStatus,
      options: ER_NURSING_MENTAL_STATUS_OPTIONS.map((v) => ({
        value: v,
        label: t(`emergencyNursingReassessment.mentalStatusOptions.${v}`),
      })),
      onChange: (v) => onPatch({ mentalStatus: v as ErMentalStatus }),
    },
    {
      key: "orientation",
      label: dg("rowOrientation"),
      value: form.orientation,
      options: ER_NURSING_ORIENTATION_OPTIONS.map((v) => ({
        value: v,
        label: t(`emergencyNursingReassessment.orientationOptions.${v}`),
      })),
      onChange: (v) => onPatch({ orientation: v as ErOrientation }),
    },
    {
      key: "speech",
      label: dg("rowSpeech"),
      value: form.speech,
      options: ER_NURSING_SPEECH_OPTIONS.map((v) => ({
        value: v,
        label: t(`emergencyNursingReassessment.speechOptions.${v}`),
      })),
      onChange: (v) => onPatch({ speech: v as ErSpeech }),
    },
    {
      key: "generalAppearanceCode",
      label: dg("rowGeneralAppearance"),
      value: form.generalAppearanceCode,
      options: ER_NURSING_GENERAL_APPEARANCE_OPTIONS.map((v) => ({
        value: v,
        label: t(`emergencyNursingReassessment.generalAppearanceOptions.${v}`),
      })),
      onChange: (v) => onPatch({ generalAppearanceCode: v as ErGeneralAppearanceCode }),
    },
    {
      key: "distressLevel",
      label: dg("rowDistressLevel"),
      value: form.distressLevel,
      options: ER_NURSING_DISTRESS_LEVEL_OPTIONS.map((v) => ({
        value: v,
        label: t(`emergencyNursingReassessment.distressLevelOptions.${v}`),
      })),
      onChange: (v) => onPatch({ distressLevel: v as ErDistressLevel }),
    },
    {
      key: "pain0to10",
      label: dg("rowPain"),
      value: form.pain0to10,
      options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((n) => ({
        value: n,
        label: n,
      })),
      onChange: (v) => onPatch({ pain0to10: v }),
    },
    {
      key: "airway",
      label: dg("rowAirway"),
      value: form.airway,
      options: ER_NURSING_AIRWAY_SELECT_OPTIONS.map((v) => ({
        value: v,
        label: nursingAbcSelectOptionLabel(t, v),
      })),
      onChange: (v) => onPatch({ airway: v as ErAbcOption }),
    },
    {
      key: "breathing",
      label: dg("rowBreathing"),
      value: form.breathing,
      options: ER_NURSING_BREATHING_SELECT_OPTIONS.map((v) => ({
        value: v,
        label: nursingAbcSelectOptionLabel(t, v),
      })),
      onChange: (v) => onPatch({ breathing: v as ErAbcOption }),
    },
    {
      key: "respiratoryPattern",
      label: dg("rowRespiratoryPattern"),
      value: form.respiratoryPattern,
      options: ER_NURSING_RESPIRATORY_PATTERN_OPTIONS.map((v) => ({
        value: v,
        label: t(`emergencyNursingReassessment.respiratoryPatternOptions.${v}`),
      })),
      onChange: (v) => onPatch({ respiratoryPattern: v as ErRespiratoryPattern }),
    },
    {
      key: "circulation",
      label: dg("rowCirculation"),
      value: form.circulation,
      options: ER_NURSING_CIRCULATION_SELECT_OPTIONS.map((v) => ({
        value: v,
        label: nursingAbcSelectOptionLabel(t, v),
      })),
      onChange: (v) => onPatch({ circulation: v as ErAbcOption }),
    },
    {
      key: "cardiacRhythm",
      label: dg("rowCardiacRhythm"),
      value: form.cardiacRhythm,
      options: ER_NURSING_CARDIAC_RHYTHM_OPTIONS.map((v) => ({
        value: v,
        label: t(`emergencyNursingReassessment.cardiacRhythmOptions.${v}`),
      })),
      onChange: (v) => onPatch({ cardiacRhythm: v as ErCardiacRhythm }),
    },
    {
      key: "skinCondition",
      label: dg("rowSkinCondition"),
      value: form.skinCondition,
      options: ER_NURSING_SKIN_CONDITION_OPTIONS.map((v) => ({
        value: v,
        label: t(`emergencyNursingReassessment.skinConditionOptions.${v}`),
      })),
      onChange: (v) => onPatch({ skinCondition: v as ErSkinCondition }),
    },
    {
      key: "ambulation",
      label: dg("rowAmbulation"),
      value: form.ambulation,
      options: ER_NURSING_AMBULATION_OPTIONS.map((v) => ({
        value: v,
        label: t(`emergencyNursingReassessment.ambulationOptions.${v}`),
      })),
      onChange: (v) => onPatch({ ambulation: v as ErAmbulation }),
    },
    {
      key: "fallRisk",
      label: dg("rowFallRisk"),
      value: form.fallRisk,
      options: ER_NURSING_FALL_RISK_OPTIONS.map((v) => ({
        value: v,
        label: t(`emergencyNursingReassessment.fallRiskOptions.${v}`),
      })),
      onChange: (v) => onPatch({ fallRisk: v as ErFallRisk }),
    },
    {
      key: "safetyRisk",
      label: dg("rowSafetyRisk"),
      value: form.safetyRisk,
      options: ER_NURSING_SAFETY_RISK_OPTIONS.map((v) => ({
        value: v,
        label: t(`emergencyNursingReassessment.safetyRiskOptions.${v}`),
      })),
      onChange: (v) => onPatch({ safetyRisk: v as ErSafetyRisk }),
    },
    {
      key: "trend",
      label: dg("rowTrend"),
      value: form.trend,
      options: ER_NURSING_TREND_SELECT_OPTIONS.map((v) => ({
        value: v,
        label: nursingTrendOptionLabel(t, v),
      })),
      onChange: (v) => onPatch({ trend: v as ErTrend }),
    },
  ];

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
        <div style={gridStyle}>
          {/* Empty top-left corner cell (sticky label header). */}
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
            }}
            aria-hidden
          />
          {/* Column header (current). */}
          <div style={colHeaderTopBox}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
              {columnTime.time}
            </span>
            <span style={{ fontSize: 11, color: colorMuted }}>{columnTime.date || dg("columnTimePlaceholder")}</span>
            {isPersistedCurrent ? <span style={currentBadge}>{dg("columnHeaderLatest")}</span> : null}
          </div>
          {/* Rows */}
          {rows.map((r, idx) => (
            <React.Fragment key={r.key}>
              <div
                style={{
                  ...labelCell,
                  backgroundColor: idx % 2 === 1 ? colorRowAlt : "#fff",
                }}
              >
                {r.label}
              </div>
              <div
                style={{
                  ...valueCell,
                  backgroundColor: idx % 2 === 1 ? colorRowAlt : "#fff",
                }}
              >
                <select
                  value={r.value}
                  onChange={(e) => r.onChange(e.target.value)}
                  disabled={formDisabled}
                  aria-label={r.label}
                  aria-describedby={sectionHelpId}
                  style={{
                    ...selectStyle,
                    backgroundColor: formDisabled ? "#f8fafc" : "#fff",
                    cursor: formDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  <option value="">{dg("placeholder")}</option>
                  {r.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </React.Fragment>
          ))}
          {/* Footer row: updated by */}
          <div
            style={{
              padding: "8px 10px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: colorMuted,
              borderRight: `1px solid ${colorBorder}`,
            }}
          >
            {dg("footerUpdatedBy")}
          </div>
          <div style={colFooterBox}>
            {updaterName ? (
              <>
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}
                  title={updaterName}
                >
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

/** ABC option label resolver (mirrors existing NursingAbcSelect map; centralized here to avoid an import cycle). */
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
