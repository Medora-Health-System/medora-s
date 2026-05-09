"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { hasVitalsJson, MEDORA_PATIENT_VITALS_UPDATED, type PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardRoomBlock,
  MedoraCardTitle,
} from "@/components/medora-card";
import {
  applyStructuredNarrativeFragment,
  buildErNursingReassessmentPreviewModel,
  buildStructuredNarrativeFragmentLines,
  emptyErNursingReassessmentForm,
  ER_NURSING_AIRWAY_SELECT_OPTIONS,
  ER_NURSING_BREATHING_SELECT_OPTIONS,
  ER_NURSING_CIRCULATION_SELECT_OPTIONS,
  ER_NURSING_REASSESSMENT_V1_KEY,
  ER_NURSING_TREND_SELECT_OPTIONS,
  erNursingReassessmentFormFromEncounter,
  legacyReassessmentColumnFromEncounter,
  mergeErNursingReassessmentIntoNursingAssessment,
  vitalsLineFromTriageVitalsJson,
  type ErAbcOption,
  type ErNursingReassessmentEventColumn,
  type ErNursingReassessmentForm,
  type ErTrend,
} from "./emergencyNursingReassessmentV1";
import { EmergencyNursingDocumentationGrid } from "./EmergencyNursingDocumentationGrid";
import {
  buildErTraumaSurveyV1PreviewModel,
  emptyErTraumaSurveyV1Form,
  erTraumaSurveyV1FormFromEncounter,
  mergeErTraumaSurveyV1IntoNursingAssessment,
  type ErAbcdeOption,
  type ErTraumaSurveyV1,
} from "./erTraumaSurveyV1";
import { ErTriageV1NursingCareSafetyFieldsBlock } from "./ErTriageV1NursingCareSafetyFieldsBlock";
import {
  appendIfNotPresent,
  emptyErTriageV1NursingCarePersistSlice,
  erTriageNursingCareSliceFromVitalsJson,
  patchMedoraErTriageV1FieldsInVitalsJson,
  type ErTriageV1NursingCarePersistSlice,
} from "./medoraErTriageV1";
import { isTriageStaleConflictError } from "./triageConcurrency";

type EncounterLite = {
  id: string;
  status?: string | null;
  type?: string | null;
  nursingAssessment?: unknown;
  updatedAt?: string | null;
  patient?: { id?: string | null } | null;
};

/**
 * Frontend-only local draft preservation (sessionStorage). NEVER autosaves to backend.
 *
 * Scope:
 *   - Keyed per encounterId so draft from another patient never leaks here.
 *   - Tab-scoped (sessionStorage clears when the tab closes; survives accidental refresh).
 *   - Restored only when the locally-captured `lastTouched` is strictly newer than the server
 *     `encounter.updatedAt`, so a save from another tab/user wins over a stale draft.
 *   - Cleared explicitly on successful save AND when the user presses "Discard draft".
 */
const NURSING_DRAFT_STORAGE_KEY_PREFIX = "medora.erNursingReassessmentDraft.v1";

/**
 * Phase-2 master switch: render the unified multi-column documentation grid that covers every
 * reassessment domain (head-to-toe, ABC, care/monitoring, response, trend, interventions, bedside
 * safety, narrative support, trauma primary + secondary survey, addendum). Always `true` in this
 * PR; kept as a const so a single flip restores the Phase-1 (structured-only grid + legacy
 * standalone sections) layout in an emergency without redeploy gymnastics.
 */
const FULL_COLUMN_GRID_ENABLED = true;

/**
 * Phase-3: render the free-text "Notes panel" sections below the documentation grid. The grid
 * is dropdown-only by design (mockup-aligned); free-text capability (narrative, general
 * appearance, bedside status, response to treatment, interventions performed, safety rounding,
 * addendum, trauma primary/secondary survey) lives in this panel so nurses retain the ability
 * to chart non-discrete findings. Duplicates that are also in the grid (pain quick-pick, ABC
 * select trio, trend select) have been removed to avoid double-entry and keep this panel
 * scoped to free-text only.
 *
 * Always `true` in this PR; kept as a const so a single flip restores the Phase-1 / Phase-2
 * layout if a clinical parity issue surfaces. The reassessment-time row (clock + datetime +
 * "Nouvelle séance") and the triage bedside-safety block are NEVER gated by this flag.
 */
const SHOW_LEGACY_STANDALONE_REASSESSMENT_SECTIONS = true;

type NursingReassessmentLocalDraft = {
  form: ErNursingReassessmentForm;
  traumaForm: ErTraumaSurveyV1;
  triageNursingSlice: ErTriageV1NursingCarePersistSlice;
  lastTouched: string;
  /**
   * User who created the draft. On shared workstations / kiosks, the next user must NEVER see the
   * previous user's draft — we discard silently when this id mismatches the currently-authenticated
   * user. Drafts created before this field was introduced (no `savedByUserId`) are also discarded
   * so legacy local state cannot bypass the safety check.
   */
  savedByUserId: string;
};

function nursingDraftKey(encounterId: string): string {
  return `${NURSING_DRAFT_STORAGE_KEY_PREFIX}.${encounterId}`;
}

function readNursingDraft(encounterId: string): NursingReassessmentLocalDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(nursingDraftKey(encounterId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NursingReassessmentLocalDraft>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.lastTouched !== "string" ||
      typeof parsed.savedByUserId !== "string" ||
      !parsed.savedByUserId.trim() ||
      !parsed.form ||
      !parsed.traumaForm ||
      !parsed.triageNursingSlice
    ) {
      return null;
    }
    return parsed as NursingReassessmentLocalDraft;
  } catch {
    return null;
  }
}

function writeNursingDraft(encounterId: string, draft: NursingReassessmentLocalDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(nursingDraftKey(encounterId), JSON.stringify(draft));
  } catch {
    /* sessionStorage may be disabled / quota exceeded — silently ignore */
  }
}

function clearNursingDraft(encounterId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(nursingDraftKey(encounterId));
  } catch {
    /* ignore */
  }
}

/**
 * Structured field keys that participate in the auto-narrative fragment block. ANY change to one of
 * these triggers a regeneration of the fenced "── Documentation structurée (auto) ──" block at the
 * end of `form.narrative`. Free-text outside the markers is preserved verbatim.
 */
const STRUCTURED_FIELDS_FOR_NARRATIVE: ReadonlySet<keyof ErNursingReassessmentForm> = new Set<
  keyof ErNursingReassessmentForm
>([
  "mentalStatus",
  "orientation",
  "speech",
  "generalAppearanceCode",
  "distressLevel",
  "pain0to10",
  "airway",
  "breathing",
  "respiratoryPattern",
  "circulation",
  "cardiacRhythm",
  "skinCondition",
  "ambulation",
  "fallRisk",
  "safetyRisk",
  "trend",
]);

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  color: "#0f172a",
  backgroundColor: "#fff",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontWeight: 600,
  fontSize: 13,
  color: "#475569",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 12,
};

const grid3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
};

const sectionHeading: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

const PREVIEW_ACCENTS: Record<string, string> = {
  timing: "#0ea5e9",
  etat: "#b91c1c",
  vitals: "#059669",
  response: "#7c3aed",
  soins: "#d97706",
  addendum: "#64748b",
  trauma_primary: "#b45309",
  trauma_secondary: "#a16207",
  empty: "#cbd5e1",
};

const NURSING_ABC_OPTION_I18N_SUFFIX: Partial<Record<ErAbcOption, string>> = {
  wnl: "abcOptionWnl",
  yes: "abcOptionYes",
  no: "abcOptionNo",
  unknown: "abcOptionUnknown",
  air_patent: "abcAirPatent",
  air_needs_suction: "abcAirNeedsSuction",
  air_obstructed_concern: "abcAirObstructedConcern",
  air_support_in_place: "abcAirSupportInPlace",
  air_unable_to_assess: "abcAirUnableToAssess",
  br_even_unlabored: "abcBrEvenUnlabored",
  br_increased_wob: "abcBrIncreasedWob",
  br_wheezing: "abcBrWheezing",
  br_sob: "abcBrSob",
  br_o2_in_use: "abcBrO2InUse",
  br_unable_to_assess: "abcBrUnableToAssess",
  circ_warm_perfused: "abcCircWarmPerfused",
  circ_pale_cool: "abcCircPaleCool",
  circ_diaphoretic: "abcCircDiaphoretic",
  circ_weak_pulses: "abcCircWeakPulses",
  circ_hypotension_concern: "abcCircHypotensionConcern",
  circ_unable_to_assess: "abcCircUnableToAssess",
};

function nursingAbcSelectLabel(t: (key: string) => string, code: ErAbcOption): string {
  if (!code) return "";
  const suffix = NURSING_ABC_OPTION_I18N_SUFFIX[code] ?? "abcOptionUnknown";
  return t(`emergencyNursingReassessment.${suffix}`);
}

const NURSING_TREND_I18N_SUFFIX: Partial<Record<ErTrend, string>> = {
  improving: "trendImproving",
  improved: "trendImproving",
  stable: "trendStable",
  unchanged: "trendUnchanged",
  worsening: "trendWorsening",
  worse: "trendWorsening",
  awaiting_reassessment: "trendAwaitingReassessment",
  provider_notified: "trendProviderNotified",
  unable_to_assess: "trendUnableToAssess",
};

function nursingTrendSelectLabel(t: (key: string) => string, code: ErTrend): string {
  if (!code) return "";
  const suffix = NURSING_TREND_I18N_SUFFIX[code] ?? "trendUnableToAssess";
  return t(`emergencyNursingReassessment.${suffix}`);
}

function NursingAbcSelect({
  value,
  options,
  onChange,
  disabled,
  t,
}: {
  value: ErAbcOption;
  options: readonly ErAbcOption[];
  onChange: (v: ErAbcOption) => void;
  disabled: boolean;
  t: (key: string) => string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ErAbcOption)}
      disabled={disabled}
      style={{ ...inputBase, cursor: disabled ? "not-allowed" : "pointer", backgroundColor: disabled ? "#f8fafc" : "#fff" }}
    >
      <option value="">—</option>
      {options.map((code) => (
        <option key={code} value={code}>
          {nursingAbcSelectLabel(t, code)}
        </option>
      ))}
    </select>
  );
}

type NursingReassessmentTextChipField =
  | "narrative"
  | "generalAppearance"
  | "bedsideStatus"
  | "responseToTreatment"
  | "interventionsPerformed"
  | "safetyRoundingNote"
  | "addendum";

const NURSING_QUICK_CHIP_GROUPS: readonly {
  field: NursingReassessmentTextChipField;
  fragmentKeys: readonly string[];
}[] = [
  {
    field: "narrative",
    fragmentKeys: [
      "navBedsideReassessed",
      "navNoAcuteDistressObserved",
      "navSymptomsUnchanged",
      "navSymptomsImproved",
      "navSymptomsWorsened",
      "navAwaitingProvider",
      "navAwaitingResults",
    ],
  },
  {
    field: "generalAppearance",
    fragmentKeys: [
      "gaAlert",
      "gaRestingComfortably",
      "gaUncomfortableAppearing",
      "gaPale",
      "gaDiaphoretic",
      "gaAnxious",
      "gaLethargic",
    ],
  },
  {
    field: "bedsideStatus",
    fragmentKeys: [
      "bsSupine",
      "bsSittingUpright",
      "bsAmbulatoryWithAssistance",
      "bsFamilyAtBedside",
      "bsCallLightWithinReach",
      "bsSideRailsUp",
    ],
  },
  {
    field: "responseToTreatment",
    fragmentKeys: [
      "rtImprovedAfterTreatment",
      "rtNoChangeAfterTreatment",
      "rtPainImproved",
      "rtNauseaImproved",
      "rtBreathingImproved",
      "rtProviderNotifiedOfChange",
      "prPainUnchanged",
      "prPainWorsened",
      "prPainReassessedAfterIntervention",
      "prPatientReportsTolerablePain",
      "prProviderNotifiedUncontrolledPain",
    ],
  },
  {
    field: "interventionsPerformed",
    fragmentKeys: [
      "niIvAccessAssessed",
      "niMedicationAdministeredPerMar",
      "niOxygenApplied",
      "niPatientRepositioned",
      "niSafetyRoundingCompleted",
      "niEducationProvided",
      "niProviderUpdated",
      "niNonPharmacologicComfort",
      "niIceHeatApplied",
      "niRepositionedForComfort",
      "niPainReassessmentCompleted",
      "niEducationPainReporting",
    ],
  },
  {
    field: "safetyRoundingNote",
    fragmentKeys: [
      "srFallPrecautions",
      "srBedLockedLow",
      "srCallLightWithinReach",
      "srRailsUp",
      "srBelongingsWithinReach",
      "srLineTubingChecked",
      "srMonitoringContinued",
    ],
  },
  {
    field: "addendum",
    fragmentKeys: [
      "adSeeProviderNote",
      "adFamilyUpdated",
      "adPatientQuestionsAnswered",
      "adCarePlanReviewed",
      "adNoAdditionalConcernsVoiced",
    ],
  },
] as const;

const quickChipHintStyle: React.CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: 11,
  color: "#94a3b8",
  fontWeight: 500,
  lineHeight: 1.4,
};

const quickChipPillBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: 9999,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#334155",
  fontSize: 12,
  lineHeight: 1.3,
  fontFamily: "inherit",
  WebkitTapHighlightColor: "transparent",
  userSelect: "none",
};

const PAIN_SCORE_QUICK_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function NursingPainScoreQuickPick({
  value,
  formDisabled,
  onPick,
  t,
}: {
  value: string;
  formDisabled: boolean;
  onPick: (n: number) => void;
  t: (key: string) => string;
}) {
  const nVal = value.trim() === "" ? null : parseInt(value, 10);
  const selected = nVal !== null && !Number.isNaN(nVal) ? Math.min(10, Math.max(0, nVal)) : null;
  return (
    <>
      <p style={{ ...quickChipHintStyle, marginTop: 6 }}>{t("emergencyNursingReassessment.quick.painScoreHint")}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>
        {PAIN_SCORE_QUICK_VALUES.map((n) => {
          const isSelected = selected === n;
          return (
            <button
              key={n}
              type="button"
              disabled={formDisabled}
              onClick={() => onPick(n)}
              style={{
                minWidth: 32,
                justifyContent: "center",
                ...quickChipPillBase,
                padding: "4px 8px",
                fontWeight: 700,
                background: isSelected ? "#e0f2fe" : formDisabled ? "#f1f5f9" : "#f8fafc",
                color: formDisabled ? "#94a3b8" : isSelected ? "#0369a1" : "#334155",
                borderColor: isSelected ? "#38bdf8" : "#e2e8f0",
                cursor: formDisabled ? "not-allowed" : "pointer",
                opacity: formDisabled ? 0.55 : 1,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </>
  );
}

function NursingReassessmentQuickChips({
  field,
  formDisabled,
  t,
  onChip,
}: {
  field: NursingReassessmentTextChipField;
  formDisabled: boolean;
  t: (key: string) => string;
  onChip: (field: NursingReassessmentTextChipField, msgKey: string) => void;
}) {
  const group = NURSING_QUICK_CHIP_GROUPS.find((g) => g.field === field);
  if (!group) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>
      {group.fragmentKeys.map((fk) => {
        const msgKey = `emergencyNursingReassessment.quick.${fk}`;
        return (
          <button
            key={fk}
            type="button"
            disabled={formDisabled}
            onClick={() => onChip(field, msgKey)}
            style={{
              ...quickChipPillBase,
              cursor: formDisabled ? "not-allowed" : "pointer",
              opacity: formDisabled ? 0.55 : 1,
              background: formDisabled ? "#f1f5f9" : "#f8fafc",
              color: formDisabled ? "#94a3b8" : "#334155",
              borderColor: formDisabled ? "#e2e8f0" : "#e2e8f0",
            }}
          >
            {t(msgKey)}
          </button>
        );
      })}
    </div>
  );
}

export function EmergencyNursingReassessmentPanel({
  encounterId,
  facilityId,
  encounter,
  isLocked,
  onSaved,
  nursingTabHref,
}: {
  encounterId: string;
  facilityId: string;
  encounter: EncounterLite;
  isLocked: boolean;
  onSaved: () => void | Promise<void>;
  /** Lien vers l&apos;onglet évaluation infirmière du dossier (référence complète). */
  nursingTabHref: string;
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";

  const applyAbcStableFillEmpty = useCallback(() => {
    setForm((f) => ({
      ...f,
      airway: f.airway ? f.airway : "air_patent",
      breathing: f.breathing ? f.breathing : "br_even_unlabored",
      circulation: f.circulation ? f.circulation : "circ_warm_perfused",
    }));
  }, []);

  const abcdeSelectTrauma = (
    value: ErAbcdeOption,
    onChange: (v: ErAbcdeOption) => void,
    disabled: boolean
  ): React.ReactNode => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ErAbcdeOption)}
      disabled={disabled}
      style={{ ...inputBase, cursor: disabled ? "not-allowed" : "pointer", backgroundColor: disabled ? "#f8fafc" : "#fff" }}
    >
      <option value="">—</option>
      <option value="normal">{t("emergencyNursingReassessment.abcdeOptionNormal")}</option>
      <option value="abnormal">{t("emergencyNursingReassessment.abcdeOptionAbnormal")}</option>
      <option value="unknown">{t("emergencyNursingReassessment.abcOptionUnknown")}</option>
    </select>
  );

  const [triage, setTriage] = useState<Record<string, unknown> | null>(null);
  const [triageNursingSlice, setTriageNursingSlice] = useState<ErTriageV1NursingCarePersistSlice>(() =>
    emptyErTriageV1NursingCarePersistSlice()
  );
  const triageNursingBaselineRef = useRef(JSON.stringify(emptyErTriageV1NursingCarePersistSlice()));
  const [form, setForm] = useState<ErNursingReassessmentForm>(() =>
    erNursingReassessmentFormFromEncounter(encounter.nursingAssessment)
  );
  const [traumaForm, setTraumaForm] = useState<ErTraumaSurveyV1>(() =>
    erTraumaSurveyV1FormFromEncounter(encounter.nursingAssessment)
  );
  const [loadingTriage, setLoadingTriage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  /** UI-visible flag: a sessionStorage draft was just restored on top of the server state. */
  const [draftRestored, setDraftRestored] = useState(false);
  /**
   * Local-edit dirty marker. Set to true whenever the user (or quick-chip / structured grid) edits
   * any field. Cleared on (a) fresh server hydration without an active draft, and (b) successful
   * save. The session-storage persistence effect only writes when this is `true`, which prevents
   * "echo" writes from server-side resets after save from re-creating the draft.
   */
  const isDirtyRef = useRef(false);
  /** When true, the next form change is a result of a draft restore, which does not need a re-write. */
  const skipNextDraftWriteRef = useRef(false);
  /**
   * Pending triage-slice draft to apply once the triage fetch completes (the bedside slice is sourced
   * from triage GET, so we cannot restore it during the encounter-sync effect synchronously).
   */
  const pendingDraftSliceRef = useRef<ErTriageV1NursingCarePersistSlice | null>(null);
  /**
   * Currently-authenticated user id (from /api/auth/me). Drafts are scoped to this id so a shared
   * workstation can never restore another nurse's local draft. We do not restore *any* draft until
   * we have this id; until then we render the server state.
   */
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  /** Most recent timestamp (epoch ms) at which the structured grid auto-rebuilt the narrative block. */
  const [structuredAckTick, setStructuredAckTick] = useState<number>(0);
  /**
   * UI-visible "structured documentation updated" indicator. Set true on every structured grid
   * change and auto-cleared after a short window so it doesn't permanently consume bedside space.
   */
  const [structuredAckVisible, setStructuredAckVisible] = useState(false);

  /**
   * Append-only history of persisted reassessment columns for this encounter (newest-first as
   * returned by the API). Refreshed on mount and after every successful save. Empty until a
   * save with the new event-writing path lands; pre-history charts are surfaced via
   * `legacyReassessmentColumnFromEncounter` instead so existing documentation never disappears.
   */
  const [persistedColumns, setPersistedColumns] = useState<ErNursingReassessmentEventColumn[]>([]);

  /**
   * Synthetic single column from the existing (pre-event-history) `erNursingReassessmentV1`
   * blob. Rendered only when the API returned no event rows yet; once the chart accumulates
   * even one append-only event, the legacy column is suppressed (the same data is already
   * captured on the latest event row by then).
   */
  const legacyColumn = useMemo<ErNursingReassessmentEventColumn | null>(() => {
    if (persistedColumns.length > 0) return null;
    return legacyReassessmentColumnFromEncounter(encounter.nursingAssessment);
  }, [persistedColumns, encounter.nursingAssessment]);

  /**
   * Reassessment session lifecycle (frontend half).
   *
   * `nextSaveStartsNewSession` is the explicit "open a new column on next save" marker — set by
   * the document-icon "Nouvelle séance" button and by material `reassessmentAt` changes (more
   * than ~60 minutes from the loaded session's documentedAt). When this is `true`, the next
   * successful save sends `reassessmentNewSession: true` to the backend and the API INSERTS a
   * new event row. Otherwise the API UPDATEs the most recent reassessment event row in place,
   * keeping incremental bedside edits in the same active column (no timeline spam).
   *
   * `loadedReassessmentAtIso` snapshots the `reassessmentAt` value the form was hydrated with,
   * so a subsequent edit can be compared against the originally-loaded session timestamp. It's
   * refreshed on encounter-sync and on every successful save.
   */
  const [nextSaveStartsNewSession, setNextSaveStartsNewSession] = useState(false);
  const loadedReassessmentAtIsoRef = useRef<string>("");
  /**
   * Material-change threshold: a reassessment time edit ≥ this many minutes from the loaded
   * value rolls into a new session automatically. Below the threshold (e.g. fixing a typo from
   * 14:32 → 14:35) keeps the active session and the same event row.
   */
  const REASSESSMENT_NEW_SESSION_MINUTES = 60;

  /**
   * Visible notice driven by the cross-user safety guard: when the latest persisted reassessment
   * column was created by a different authenticated user, the panel resets the active draft to
   * empty and arms a new session so the next save will INSERT a fresh column rather than appear
   * to "continue" someone else's work. The notice surfaces the prior author's display name (if
   * known from the event payload) so the bedside nurse understands why the form is empty.
   *
   * `null` means no cross-user guard is active. `priorAuthorDisplayName` may be empty when the
   * event row didn't capture it; the i18n template handles that case with a generic fallback.
   *
   * The guard runs only once per (encounter, currentUserId) pair to avoid clobbering the user's
   * in-progress edits — `crossUserGuardAppliedRef` records the encounter id last guarded.
   */
  const [crossUserNotice, setCrossUserNotice] = useState<{ priorAuthorDisplayName: string } | null>(null);
  const crossUserGuardAppliedRef = useRef<string | null>(null);

  const isReadOnly = encounter.status !== "OPEN";
  const formDisabled = isReadOnly || isLocked;

  const loadTriage = useCallback(async () => {
    setLoadingTriage(true);
    try {
      const data = await apiFetch(`/encounters/${encounterId}/triage`, { facilityId });
      setTriage(data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null);
    } catch (e) {
      console.error(e);
      setTriage(null);
    } finally {
      setLoadingTriage(false);
    }
  }, [encounterId, facilityId]);

  /**
   * Fetch the append-only nursing reassessment column history from
   * `GET /encounters/:id/nursing-reassessment-events`. Failure is non-fatal: the grid simply
   * falls back to the legacy single-column rendering, so a transient API hiccup never erases
   * documentation from the nurse's view.
   */
  const loadPersistedColumns = useCallback(async () => {
    try {
      const data = await apiFetch(`/encounters/${encounterId}/nursing-reassessment-events`, {
        facilityId,
      });
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const entries = (data as { entries?: unknown }).entries;
        if (Array.isArray(entries)) {
          /** Defensive shape mapping: only accept rows that look like event columns. */
          const safe: ErNursingReassessmentEventColumn[] = [];
          for (const e of entries) {
            if (!e || typeof e !== "object" || Array.isArray(e)) continue;
            const row = e as Record<string, unknown>;
            const id = typeof row.id === "string" ? row.id : "";
            if (!id) continue;
            const createdAt = typeof row.createdAt === "string" ? row.createdAt : "";
            if (!createdAt) continue;
            safe.push({
              id,
              createdAt,
              /**
               * Row-level immutable creator id. Unknown / missing values are mapped to `null`
               * so the cross-user guard fails-open (i.e. it does not falsely accuse the
               * current user of being a different user when the field is absent — typical for
               * older event rows written before the field was exposed). The backend now writes
               * this on every new save.
               */
              createdByUserId:
                typeof row.createdByUserId === "string" && row.createdByUserId.trim()
                  ? row.createdByUserId
                  : null,
              documentedAt:
                typeof row.documentedAt === "string" && row.documentedAt.trim() ? row.documentedAt : null,
              performerInitials:
                typeof row.performerInitials === "string" ? row.performerInitials : "",
              performerDisplayName:
                typeof row.performerDisplayName === "string" ? row.performerDisplayName : "",
              performerRoleTitle:
                typeof row.performerRoleTitle === "string" ? row.performerRoleTitle : "",
              snapshot:
                row.snapshot && typeof row.snapshot === "object" && !Array.isArray(row.snapshot)
                  ? (row.snapshot as Record<string, unknown>)
                  : null,
              traumaSnapshot:
                row.traumaSnapshot &&
                typeof row.traumaSnapshot === "object" &&
                !Array.isArray(row.traumaSnapshot)
                  ? (row.traumaSnapshot as Record<string, unknown>)
                  : null,
            });
          }
          setPersistedColumns(safe);
          return;
        }
      }
      setPersistedColumns([]);
    } catch (e) {
      console.error(e);
      /** Keep prior list on failure rather than blanking the grid. */
    }
  }, [encounterId, facilityId]);

  useEffect(() => {
    void loadTriage();
  }, [loadTriage]);

  useEffect(() => {
    void loadPersistedColumns();
  }, [loadPersistedColumns]);

  useEffect(() => {
    if (!triage) {
      const empty = emptyErTriageV1NursingCarePersistSlice();
      setTriageNursingSlice(empty);
      triageNursingBaselineRef.current = JSON.stringify(empty);
      return;
    }
    const slice = erTriageNursingCareSliceFromVitalsJson(triage.vitalsJson);
    /** Baseline must always reflect the server state so the dirty-check on save is correct. */
    triageNursingBaselineRef.current = JSON.stringify(slice);
    /** If we restored a draft, prefer the drafted slice over the freshly-fetched server slice. */
    if (pendingDraftSliceRef.current) {
      setTriageNursingSlice(pendingDraftSliceRef.current);
      pendingDraftSliceRef.current = null;
    } else {
      setTriageNursingSlice(slice);
    }
  }, [triage?.id, triage?.updatedAt]);

  /**
   * Capture the authenticated user id once on mount. This is required to scope sessionStorage
   * drafts per-user (shared-workstation safety). Until this resolves, the encounter-sync effect
   * will skip draft restoration and render server state.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const me = await parseApiResponse(res);
        if (cancelled) return;
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const id = (me as { userId?: unknown; id?: unknown }).userId ?? (me as { id?: unknown }).id;
          if (typeof id === "string" && id.trim()) {
            setCurrentUserId(id);
          }
        }
      } catch {
        /* If we cannot identify the user, we simply never restore the draft. Safe default. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    /**
     * Encounter-sync. On every encounter prop refresh we either (a) restore a strictly-newer local
     * draft created by the SAME authenticated user, or (b) reset form state from the server. Drafts
     * older than `encounter.updatedAt` are stale and discarded; drafts saved by a different user
     * are silently discarded (shared workstation / kiosk safety).
     */
    const draft = readNursingDraft(encounterId);
    const serverUpdatedAt = encounter.updatedAt ?? null;
    const draftIsNewer =
      !!draft && (!serverUpdatedAt || draft.lastTouched > serverUpdatedAt);
    /**
     * Don't peek at drafts before we know who's logged in — if /api/auth/me hasn't resolved yet,
     * fall through to server state and let a later run (with currentUserId set) restore.
     */
    const userMatches = !!draft && !!currentUserId && draft.savedByUserId === currentUserId;
    const userMismatch = !!draft && !!currentUserId && draft.savedByUserId !== currentUserId;
    if (draft && (!draftIsNewer || userMismatch)) {
      /** Stale OR another-user draft: silently drop. No banner, no PHI mention. */
      clearNursingDraft(encounterId);
    }
    if (draftIsNewer && draft && userMatches) {
      skipNextDraftWriteRef.current = true;
      setForm(draft.form);
      setTraumaForm(draft.traumaForm);
      pendingDraftSliceRef.current = draft.triageNursingSlice;
      setDraftRestored(true);
      isDirtyRef.current = true;
      /** A draft restore alone does not start a new session; whatever the user picks next decides. */
      loadedReassessmentAtIsoRef.current = draft.form.reassessmentAt || "";
    } else {
      const fresh = erNursingReassessmentFormFromEncounter(encounter.nursingAssessment);
      setForm(fresh);
      setTraumaForm(erTraumaSurveyV1FormFromEncounter(encounter.nursingAssessment));
      pendingDraftSliceRef.current = null;
      setDraftRestored(false);
      isDirtyRef.current = false;
      /**
       * Re-hydration baseline for the active session. Future edits compare against this; only a
       * material reassessmentAt drift (or the document-icon button) can flip the next save into
       * a new column. Reset the new-session marker so a stale flag from a prior chart never
       * rolls over into another encounter / patient.
       */
      loadedReassessmentAtIsoRef.current = fresh.reassessmentAt || "";
      setNextSaveStartsNewSession(false);
    }
    void loadTriage();
  }, [encounter.nursingAssessment, encounter.updatedAt, encounterId, currentUserId, loadTriage]);

  /**
   * Cross-user safety guard.
   *
   * The bedside grid loads its append-only column history asynchronously
   * (`loadPersistedColumns` → `setPersistedColumns`). Once both the latest persisted columns and
   * the current authenticated user id are available, check whether the most recent column was
   * created by a different user. If so:
   *
   *   1. Reset the active draft form and trauma form to empty (do NOT pre-fill from the
   *      existing `encounter.nursingAssessment` flat blob — that blob mirrors the latest column,
   *      i.e. the OTHER user's content, and pre-filling it would visually re-attribute their
   *      documentation to the new nurse).
   *   2. Arm `nextSaveStartsNewSession = true` so the very next save sends the
   *      `reassessmentNewSession: true` flag and the API inserts a brand-new column. The
   *      backend identity guard would also force this on its own, but doing it here makes the
   *      UX consistent (the action bar / banner reflects "new column" intent).
   *   3. Surface a small notice with the prior author's display name so the nurse understands
   *      why the form started empty.
   *
   * Re-entrancy: the guard is applied at most once per (encounterId, currentUserId, latestColumnId)
   * tuple. Once the user starts editing or another user's column appears, the guard re-arms.
   * In-flight edits are protected: when `isDirtyRef.current === true`, we skip the reset to avoid
   * clobbering active bedside work — a save will then trigger the backend's own identity guard
   * which will auto-insert a new column on the server side regardless.
   */
  useEffect(() => {
    if (!currentUserId) return;
    if (persistedColumns.length === 0) {
      crossUserGuardAppliedRef.current = null;
      setCrossUserNotice(null);
      return;
    }
    /** Newest persisted column drives the comparison (the API returns newest-first). */
    const latest = persistedColumns[0];
    const ownerId = latest.createdByUserId;
    /**
     * `null` ownerId means we can't prove ownership (legacy / pre-migration rows). Be lenient:
     * skip the guard rather than silently discard the user's view, since the safer behavior in
     * that ambiguous case is to let the backend's identity guard handle save-time correctness.
     */
    if (!ownerId) {
      crossUserGuardAppliedRef.current = null;
      setCrossUserNotice(null);
      return;
    }
    if (ownerId === currentUserId) {
      /** Same user — no guard needed. Clear any prior notice from a stale state. */
      crossUserGuardAppliedRef.current = null;
      setCrossUserNotice(null);
      return;
    }
    /** Cross-user latest column. Apply guard at most once per (encounter, latest column id). */
    const guardKey = `${encounterId}:${latest.id}`;
    if (crossUserGuardAppliedRef.current === guardKey) return;
    /** Don't clobber active in-progress bedside edits — the backend will still do the right thing. */
    if (isDirtyRef.current) return;
    crossUserGuardAppliedRef.current = guardKey;
    /** Reset draft to empty so the new nurse starts a clean column with their own identity. */
    setForm(emptyErNursingReassessmentForm());
    setTraumaForm(emptyErTraumaSurveyV1Form());
    setNextSaveStartsNewSession(true);
    loadedReassessmentAtIsoRef.current = "";
    setCrossUserNotice({ priorAuthorDisplayName: latest.performerDisplayName ?? "" });
  }, [currentUserId, persistedColumns, encounterId]);

  /** Persist current local edits to sessionStorage whenever the user touches anything. */
  useEffect(() => {
    if (!isDirtyRef.current) return;
    if (skipNextDraftWriteRef.current) {
      skipNextDraftWriteRef.current = false;
      return;
    }
    /**
     * Refuse to write a draft if we don't know the current user. Without a user id we cannot
     * later prove the draft belongs to whoever opens the chart next — better to drop it.
     */
    if (!currentUserId) return;
    writeNursingDraft(encounterId, {
      form,
      traumaForm,
      triageNursingSlice,
      lastTouched: new Date().toISOString(),
      savedByUserId: currentUserId,
    });
  }, [encounterId, currentUserId, form, traumaForm, triageNursingSlice]);

  /**
   * Auto-hide the "structured documentation updated" indicator a few seconds after the last
   * structured grid change so it doesn't permanently consume bedside space, but stays visible
   * long enough for the nurse to register that the narrative was refreshed.
   */
  useEffect(() => {
    if (structuredAckTick === 0) return;
    setStructuredAckVisible(true);
    const handle = window.setTimeout(() => setStructuredAckVisible(false), 3500);
    return () => window.clearTimeout(handle);
  }, [structuredAckTick]);

  const [wideLayout, setWideLayout] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 960px)");
    const apply = () => setWideLayout(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const workspaceStyle: React.CSSProperties = wideLayout
    ? {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 400px)",
        gap: 20,
        alignItems: "start",
        width: "100%",
      }
    : {
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
      };

  const resumeColumnStyle: React.CSSProperties = wideLayout
    ? {
        position: "sticky",
        top: 12,
        alignSelf: "start",
        maxHeight: "calc(100vh - 100px)",
        overflowY: "auto",
        minWidth: 0,
      }
    : { minWidth: 0 };

  const esiLine = triage?.esi != null && triage.esi !== "" ? String(triage.esi) : "—";
  const vitalsStrip = useMemo(
    () => vitalsLineFromTriageVitalsJson(triage?.vitalsJson, language) || "—",
    [triage?.vitalsJson, language]
  );
  const triageUpdated =
    triage?.updatedByDisplayFr && triage?.updatedAt
      ? `${String(triage.updatedByDisplayFr).trim()} — ${new Date(triage.updatedAt as string).toLocaleString(dateLocale)}`
      : null;

  const storedSig = useMemo(() => {
    const nav = encounter.nursingAssessment;
    if (!nav || typeof nav !== "object" || Array.isArray(nav)) return null;
    const raw = (nav as Record<string, unknown>)[ER_NURSING_REASSESSMENT_V1_KEY];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const s = (raw as Record<string, unknown>).signature;
    if (!s || typeof s !== "object") return null;
    const at = (s as { savedAt?: unknown }).savedAt;
    const by = (s as { savedByDisplayName?: unknown }).savedByDisplayName;
    if (typeof at !== "string" || typeof by !== "string") return null;
    return { savedAt: at, savedByDisplayName: by };
  }, [encounter.nursingAssessment]);

  const previewModel = useMemo(() => {
    const reassess = buildErNursingReassessmentPreviewModel(form, language);
    const trauma = buildErTraumaSurveyV1PreviewModel(traumaForm);
    const rSecs = reassess.sections.filter((s) => s.id !== "empty");
    const tSecs = trauma.sections;
    const sections = [...rSecs, ...tSecs];
    const narrative = [reassess.narrative, trauma.narrative].filter(Boolean).join(" ").trim();
    if (sections.length === 0 && !narrative) {
      return {
        sections: [
          { id: "empty", title: t("emergencyNursingReassessment.previewEmptyTitle"), lines: [t("emergencyNursingReassessment.previewEmptyLine")] },
        ],
        narrative: "",
      };
    }
    return {
      sections: sections.length > 0 ? sections : reassess.sections,
      narrative,
    };
  }, [form, traumaForm, t, language]);

  const patchForm = useCallback(
    (patch: Partial<ErNursingReassessmentForm>) => {
      isDirtyRef.current = true;
      let touchedStructured = false;
      let materialReassessmentAtChange = false;
      setForm((f) => {
        const merged: ErNursingReassessmentForm = { ...f, ...patch };
        /**
         * If any structured-grid field changed, refresh the fenced auto-fragment block at the
         * end of the narrative WITHOUT touching free-text outside the markers. This is the
         * "selections update narrative — but never overwrite manual edits" guarantee.
         */
        touchedStructured = Object.keys(patch).some((k) =>
          STRUCTURED_FIELDS_FOR_NARRATIVE.has(k as keyof ErNursingReassessmentForm)
        );
        if (touchedStructured) {
          const lines = buildStructuredNarrativeFragmentLines(merged, language);
          merged.narrative = applyStructuredNarrativeFragment(merged.narrative, lines);
        }
        /**
         * Material reassessmentAt drift = "this is a different reassessment session."
         * Threshold-gated so a small typo correction (e.g. 14:30 → 14:35) does NOT trigger a
         * new column event. The loaded ref is the timestamp the active session was opened with;
         * any drift beyond the threshold rolls the next save into a fresh column.
         */
        if (Object.prototype.hasOwnProperty.call(patch, "reassessmentAt")) {
          const baseIso = loadedReassessmentAtIsoRef.current;
          if (baseIso && merged.reassessmentAt && merged.reassessmentAt !== baseIso) {
            const baseMs = Date.parse(baseIso);
            const nextMs = Date.parse(merged.reassessmentAt);
            if (!Number.isNaN(baseMs) && !Number.isNaN(nextMs)) {
              const diffMin = Math.abs(nextMs - baseMs) / 60000;
              if (diffMin >= REASSESSMENT_NEW_SESSION_MINUTES) {
                materialReassessmentAtChange = true;
              }
            }
          }
        }
        return merged;
      });
      if (touchedStructured) {
        /** Trigger the visible "✓ Documentation structurée mise à jour" hint. */
        setStructuredAckTick(Date.now());
      }
      if (materialReassessmentAtChange) {
        setNextSaveStartsNewSession(true);
      }
    },
    [language]
  );

  const appendNursingQuickChip = useCallback(
    (field: NursingReassessmentTextChipField, msgKey: string) => {
      const fragment = t(msgKey).trim();
      if (!fragment) return;
      isDirtyRef.current = true;
      setForm((f) => ({ ...f, [field]: appendIfNotPresent(f[field], fragment) }));
    },
    [t]
  );

  const patchTraumaForm = useCallback((patch: Partial<ErTraumaSurveyV1>) => {
    isDirtyRef.current = true;
    setTraumaForm((f) => ({ ...f, ...patch }));
  }, []);

  const patchTriageNursingSlice = useCallback(
    (patch: Partial<ErTriageV1NursingCarePersistSlice>) => {
      isDirtyRef.current = true;
      setTriageNursingSlice((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  /**
   * Open a fresh reassessment session. This is the document-icon "Nouvelle séance" action.
   *
   * Behavior:
   *   - If the form has unsaved edits, prompt for confirmation so a stray bedside tap cannot
   *     silently lose typed work. Confirmed → continue. Cancelled → leave state untouched.
   *   - Reset the structured grid rows + reassessment timestamp to "now" so the next save opens
   *     a clean column. Free-text fields are intentionally NOT cleared — clearing nurse-typed
   *     narrative / interventions / etc. would be destructive; nurses can clear with the
   *     existing "Effacer la colonne" control if they really want a blank column.
   *   - Arm `nextSaveStartsNewSession` so the next save sends `reassessmentNewSession: true` to
   *     the API, which inserts a new event row instead of updating the active session.
   *
   * Append-only safety: this never touches existing event rows. Any unsaved edits to the active
   * session are released; persisted history is unaffected.
   */
  const handleOpenNewReassessmentSession = useCallback(() => {
    if (formDisabled) return;
    if (isDirtyRef.current && typeof window !== "undefined") {
      const ok = window.confirm(
        t("emergencyNursingReassessment.documentationGrid.newSessionUnsavedConfirm")
      );
      if (!ok) return;
    }
    /** Default the new column's clinical timestamp to "now" (datetime-local format). */
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;
    setForm((f) => {
      const merged: ErNursingReassessmentForm = {
        ...f,
        reassessmentAt: localIso,
        /** Clear structured rows so the new column doesn't accidentally inherit prior selections. */
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
        airway: "",
        breathing: "",
        circulation: "",
        trend: "",
        pain0to10: "",
        /** Phase-3 mockup-aligned dropdowns — cleared with the rest so a fresh column starts clean. */
        airwayType: "",
        respEffortBreathing: "",
        respDepth: "",
        respChestMovement: "",
        cardiacEctopy: "",
        ivAccess: "",
      };
      /** Re-render the auto-fragment block now that all structured rows are blank. */
      const lines = buildStructuredNarrativeFragmentLines(merged, language);
      merged.narrative = applyStructuredNarrativeFragment(merged.narrative, lines);
      return merged;
    });
    isDirtyRef.current = true;
    setNextSaveStartsNewSession(true);
    /**
     * Update the loaded baseline so the user can still nudge the new session's documentedAt by
     * a few minutes (typo correction) without re-triggering the new-session flag — they already
     * armed it explicitly.
     */
    loadedReassessmentAtIsoRef.current = localIso;
    setStructuredAckTick(Date.now());
  }, [formDisabled, language, t]);

  /**
   * Discard the local draft and re-hydrate from the server-side encounter snapshot. This is the
   * explicit "I don't want my unsaved changes" action the nurse can take from the restored-draft
   * banner. It does NOT delete any persisted clinical record.
   *
   * UX safety: when there ARE local unsaved edits (`isDirtyRef.current === true`), prompt for
   * confirmation so a stray bedside tap can't lose charting. When the form is clean (no edits to
   * lose), clear silently without an interruptive prompt.
   */
  const handleDiscardLocalDraft = useCallback(() => {
    if (isDirtyRef.current && typeof window !== "undefined") {
      const ok = window.confirm(
        t("emergencyNursingReassessment.documentationGrid.draftDiscardConfirm")
      );
      if (!ok) return;
    }
    clearNursingDraft(encounterId);
    isDirtyRef.current = false;
    skipNextDraftWriteRef.current = true;
    setForm(erNursingReassessmentFormFromEncounter(encounter.nursingAssessment));
    setTraumaForm(erTraumaSurveyV1FormFromEncounter(encounter.nursingAssessment));
    pendingDraftSliceRef.current = null;
    /** Re-fetch triage so the bedside slice resets from the server too. */
    void loadTriage();
    setDraftRestored(false);
    setSaveInfo(t("emergencyNursingReassessment.documentationGrid.draftDiscarded"));
  }, [encounter.nursingAssessment, encounterId, loadTriage, t]);

  /**
   * Clear the active draft's structured selects (Phase-2 + Phase-3 dropdowns) without saving.
   * Mirrors the bottom-bar "Clear latest column" mockup action. Free-text in the Notes panel
   * (narrative, addendum, trauma) is intentionally NOT touched here — clearing nurse-typed
   * prose is destructive and should only be done via explicit per-field edits or the discard-
   * draft flow above.
   */
  const handleClearLatestColumn = useCallback(() => {
    if (formDisabled) return;
    setForm((f) => ({
      ...f,
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
      airwayType: "",
      respEffortBreathing: "",
      respDepth: "",
      respChestMovement: "",
      cardiacEctopy: "",
      ivAccess: "",
    }));
    isDirtyRef.current = true;
    setStructuredAckTick(Date.now());
  }, [formDisabled]);

  /**
   * Save the current reassessment.
   *
   * `forceNewSession` lets the caller bypass the asynchronous `setNextSaveStartsNewSession(true)`
   * → `void handleSave()` race that affected the "Add current column" button (Phase-3 regression):
   * because React batches state updates, calling the setter immediately before `handleSave()` did
   * not actually flip `nextSaveStartsNewSession` in time, so the PATCH body omitted the
   * `reassessmentNewSession: true` marker and the backend took the (now-guarded) UPDATE path
   * instead of inserting a new column. Callers that must guarantee a new column should pass
   * `{ forceNewSession: true }` rather than relying on the setter timing.
   */
  const handleSave = async (opts?: { forceNewSession?: boolean }) => {
    if (formDisabled) return;
    const forceNewSession = opts?.forceNewSession === true;
    setSaving(true);
    setSaveInfo(null);
    try {
      let savedByDisplayName = t("emergencyNursingReassessment.signerFallback");
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await parseApiResponse(meRes);
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) savedByDisplayName = fn;
        }
      } catch {
        /* repli */
      }
      const signature = {
        savedAt: new Date().toISOString(),
        savedByDisplayName,
      };
      const mergedNav = mergeErNursingReassessmentIntoNursingAssessment(encounter.nursingAssessment, form, signature);
      const finalNav = mergeErTraumaSurveyV1IntoNursingAssessment(mergedNav, traumaForm);
      /**
       * Session lifecycle: the optional `reassessmentNewSession` flag tells the API whether to
       * INSERT a new reassessment column event (true) or UPDATE the active session's row in
       * place (false / omitted). Set by the "Nouvelle séance" button, by material
       * reassessmentAt drift, by explicit `forceNewSession`, and by the cross-user safety guard
       * (when the latest persisted column belongs to a different user, we always start fresh).
       * Reset to false after a successful save (next save continues the just-saved column
       * unless the user takes another explicit action).
       *
       * Backend mirror: an identity+recency guard in `apps/api/src/encounters/encounters.service.ts`
       * also auto-falls-through to INSERT when the latest event row was created by a different
       * user OR is older than the recency window, regardless of this flag. The flag is the
       * "user explicitly asked for a new column" signal; the backend guard is the safety net.
       */
      const startsNewSession = forceNewSession || nextSaveStartsNewSession;
      const res = await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nursingAssessment: finalNav,
          ...(startsNewSession ? { reassessmentNewSession: true } : {}),
        }),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;

      /**
       * Save succeeded (or was queued for offline retry) — the local draft is no longer needed.
       * Clearing it here also prevents the next encounter-prop refresh from "restoring" the
       * just-saved state as a draft and looping the banner.
       */
      isDirtyRef.current = false;
      clearNursingDraft(encounterId);
      setDraftRestored(false);

      const triageNursingDirty = JSON.stringify(triageNursingSlice) !== triageNursingBaselineRef.current;
      let triageSideError: string | null = null;
      if (triageNursingDirty) {
        try {
          const triLatest = await apiFetch(`/encounters/${encounterId}/triage`, { facilityId });
          if (!triLatest || typeof triLatest !== "object" || Array.isArray(triLatest)) {
            triageSideError = t("emergencyNursingReassessment.triageBedsideNoTriageRow");
          } else {
            const d = triLatest as Record<string, unknown>;
            const newVitals = patchMedoraErTriageV1FieldsInVitalsJson(d.vitalsJson, triageNursingSlice);
            const lastKnownTriageUpdatedAt =
              typeof d.updatedAt === "string"
                ? d.updatedAt
                : d.updatedAt
                  ? new Date(d.updatedAt as string).toISOString()
                  : null;
            const triPayload: Record<string, unknown> = {
              chiefComplaint: d.chiefComplaint ?? null,
              onsetAt: d.onsetAt ? new Date(d.onsetAt as string).toISOString() : null,
              esi: d.esi != null && d.esi !== "" ? Number(d.esi) : null,
              vitalsJson: newVitals,
              strokeScreen: d.strokeScreen ?? null,
              sepsisScreen: d.sepsisScreen ?? null,
              triageCompleteAt: d.triageCompleteAt ? new Date(d.triageCompleteAt as string).toISOString() : null,
              lastKnownTriageUpdatedAt,
            };
            await apiFetch(`/encounters/${encounterId}/triage`, {
              method: "PUT",
              facilityId,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(triPayload),
            });
            triageNursingBaselineRef.current = JSON.stringify(triageNursingSlice);
            const patientIdForEvent = encounter.patient?.id?.trim();
            let supersededSnapshot: PatientTriageVitalsSnapshot | null = null;
            if (patientIdForEvent && d.id && hasVitalsJson(d.vitalsJson)) {
              const u = d.updatedAt;
              supersededSnapshot = {
                encounterId,
                encounterType: encounter.type ?? "—",
                triageId: String(d.id),
                updatedAt: typeof u === "string" ? u : new Date(u as string).toISOString(),
                triageCompleteAt: d.triageCompleteAt
                  ? new Date(d.triageCompleteAt as string).toISOString()
                  : null,
                vitalsJson: { ...(d.vitalsJson as object) } as Record<string, unknown>,
              };
            }
            if (patientIdForEvent && typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent(MEDORA_PATIENT_VITALS_UPDATED, {
                  detail: { patientId: patientIdForEvent, supersededSnapshot },
                })
              );
            }
            await loadTriage();
          }
        } catch (e) {
          console.error(e);
          if (isTriageStaleConflictError(e)) {
            /**
             * Stale-token 409 on the optional triage bedside side-write: the nursing
             * reassessment write itself already succeeded above. We surface the same shared
             * refresh prompt so the nurse knows the bedside slice did not land and can
             * reapply after refresh; their reassessment column is preserved.
             */
            triageSideError = t("erTriage.panel.staleConflict");
          } else {
            triageSideError =
              normalizeUserFacingError(e instanceof Error ? e.message : null) ||
              t("emergencyNursingReassessment.triageBedsideSaveFailed");
          }
        }
      }

      /** Refresh the append-only history so the just-saved column appears as the new "Actuel". */
      await loadPersistedColumns();
      /**
       * Clear the cross-user notice — the brand-new column we just inserted is owned by the
       * current user, so the guard no longer applies. Without this, the warning banner could
       * linger until the next encounter prop refresh.
       */
      setCrossUserNotice(null);
      crossUserGuardAppliedRef.current = null;

      /**
       * Lock in the just-saved session as the new active baseline. Any future edits below the
       * material-change threshold continue updating this column; a new session must be
       * explicitly requested again. Tracking the just-saved `reassessmentAt` (form value) keeps
       * the comparison stable across the round-trip even when the form pre-fill is unchanged.
       */
      loadedReassessmentAtIsoRef.current = form.reassessmentAt || "";
      setNextSaveStartsNewSession(false);

      await onSaved();
      if (triageSideError) {
        const tpl = queued
          ? t("emergencyNursingReassessment.saveQueuedTriageBedsideFailed")
          : t("emergencyNursingReassessment.saveOkTriageBedsideFailed");
        setSaveInfo(tpl.replace("{detail}", triageSideError));
      } else {
        setSaveInfo(queued ? t("emergencyNursingReassessment.saveQueued") : t("emergencyNursingReassessment.saveOk"));
      }
    } catch (e) {
      console.error(e);
      setSaveInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null) || t("emergencyNursingReassessment.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <MedoraCard leftAccentColor="#0ea5e9" variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials="S">
          <MedoraCardTitle
            title={t("emergencyNursingReassessment.cardTitle")}
            subline={
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                {t("emergencyNursingReassessment.cardSubline")}
              </p>
            }
          />
        </MedoraCardIdentity>

        <MedoraCardActions railBorderTopColor="#e2e8f0" gap={10} minWidth={0} alignItems="flex-start">
          <Link
            href={nursingTabHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #bae6fd",
              backgroundColor: "#f0f9ff",
              color: "#0369a1",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {t("emergencyNursingReassessment.openNursingTab")}
          </Link>
        </MedoraCardActions>

        {loadingTriage ? (
          <p style={{ margin: "12px 0 0 0", fontSize: 14, color: "#64748b" }}>{t("common.loading")}</p>
        ) : (
          <>
            {saveInfo ? (
              <p
                style={{
                  margin: "10px 0 0 0",
                  fontSize: 13,
                  color:
                    saveInfo.toLowerCase().includes("impossible") || saveInfo.toLowerCase().includes("unable")
                      ? "#b91c1c"
                      : "#15803d",
                  lineHeight: 1.45,
                }}
              >
                {saveInfo}
              </p>
            ) : null}

            {draftRestored ? (
              <div
                role="status"
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #fcd34d",
                  backgroundColor: "#fffbeb",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "#92400e",
                    }}
                  >
                    {t("emergencyNursingReassessment.documentationGrid.draftRestoredTitle")}
                  </p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#78350f", lineHeight: 1.45 }}>
                    {t("emergencyNursingReassessment.documentationGrid.draftRestoredBody")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDiscardLocalDraft}
                  disabled={formDisabled}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #f59e0b",
                    backgroundColor: formDisabled ? "#fef3c7" : "#fff",
                    color: formDisabled ? "#a16207" : "#92400e",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: formDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  {t("emergencyNursingReassessment.documentationGrid.draftDiscardButton")}
                </button>
              </div>
            ) : null}

            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "stretch",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <MedoraCardRoomBlock label={t("emergencyNursingReassessment.esiRoomLabel")} value={esiLine} />
              <div style={{ flex: "1 1 200px", minWidth: 180 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#64748b",
                  }}
                >
                  {t("emergencyNursingReassessment.vitalsStripLabel")}
                </p>
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#0f172a", lineHeight: 1.45 }}>{vitalsStrip}</p>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 180 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#64748b",
                  }}
                >
                  {t("emergencyNursingReassessment.triageUpdatedLabel")}
                </p>
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
                  {triageUpdated ?? "—"}
                </p>
              </div>
            </div>

            <div style={{ ...workspaceStyle, marginTop: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                {/**
                 * "Last updated by" banner — clinical handoff clarity at the top of the
                 * reassessment area. Sourced from the SAME `storedSig` the structured grid
                 * footer uses, so the two views can never disagree. Only renders when a
                 * reassessment has actually been saved (no fake history when empty).
                 */}
                <div
                  role="note"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#f8fafc",
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: "#334155",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#64748b",
                    }}
                  >
                    {t("emergencyNursingReassessment.documentationGrid.lastUpdatedByLabel")}
                  </span>
                  {storedSig ? (
                    <span style={{ fontWeight: 600, color: "#0f172a" }} title={storedSig.savedByDisplayName}>
                      {storedSig.savedByDisplayName}
                      <span style={{ marginLeft: 6, fontWeight: 500, color: "#475569" }}>
                        ·{" "}
                        {new Date(storedSig.savedAt).toLocaleString(dateLocale, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </span>
                  ) : (
                    <span style={{ color: "#64748b" }}>
                      {t("emergencyNursingReassessment.documentationGrid.lastUpdatedByNotRecorded")}
                    </span>
                  )}
                </div>

                {/**
                 * Cross-user safety notice. Visible only when the cross-user guard reset the
                 * active draft because the latest persisted column was created by a different
                 * authenticated user. Communicates intent ("you'll be saving a new column") and
                 * surfaces the prior author's name so the bedside nurse understands why the
                 * form started empty. Plain inline notice — no modal — to avoid blocking
                 * bedside charting.
                 */}
                {crossUserNotice ? (
                  <div
                    role="status"
                    aria-live="polite"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #fcd34d",
                      backgroundColor: "#fffbeb",
                      color: "#92400e",
                      fontSize: 12,
                      lineHeight: 1.45,
                    }}
                  >
                    <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>•</span>
                    <span>
                      {(() => {
                        const author = crossUserNotice.priorAuthorDisplayName?.trim();
                        const tpl = author
                          ? t("emergencyNursingReassessment.crossUserNoticeWithAuthor")
                          : t("emergencyNursingReassessment.crossUserNoticeGeneric");
                        return author ? tpl.replace("{author}", author) : tpl;
                      })()}
                    </span>
                  </div>
                ) : null}

                <EmergencyNursingDocumentationGrid
                  form={form}
                  onPatch={patchForm}
                  formDisabled={formDisabled}
                  t={t}
                  language={language}
                  savedSignature={storedSig}
                  persistedColumns={persistedColumns}
                  legacyColumn={legacyColumn}
                  onAddColumn={handleOpenNewReassessmentSession}
                />
                {structuredAckVisible ? (
                  <p
                    role="status"
                    aria-live="polite"
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "#15803d",
                      fontWeight: 600,
                      lineHeight: 1.45,
                      transition: "opacity 200ms ease",
                    }}
                    title={t(
                      "emergencyNursingReassessment.documentationGrid.structuredDocumentationUpdatedHint"
                    )}
                  >
                    {t("emergencyNursingReassessment.documentationGrid.structuredDocumentationUpdated")}
                  </p>
                ) : null}

                <div>
                  <p style={sectionHeading}>{t("emergencyNursingReassessment.sectionReassess")}</p>
                  <p style={quickChipHintStyle}>{t("emergencyNursingReassessment.quick.hint")}</p>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>{t("emergencyNursingReassessment.labelReassessmentTime")}</label>
                      {/**
                       * Reassessment-time row.
                       *
                       *  [🕐 clock affordance] [datetime-local input] [📄 Nouvelle séance]
                       *
                       * The clock affordance is purely visual (forwards focus to the input) and
                       * makes the "you can edit the column's documentedAt" control discoverable
                       * at a glance. Editing the input itself is what actually changes the value;
                       * a material drift (≥ 60 min) auto-arms the new-session marker. The
                       * document button is the explicit "open a brand-new column" action.
                       */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          aria-label={t(
                            "emergencyNursingReassessment.documentationGrid.editDocumentedAtAriaLabel"
                          )}
                          title={t(
                            "emergencyNursingReassessment.documentationGrid.editDocumentedAtAriaLabel"
                          )}
                          onClick={() => {
                            if (typeof document === "undefined") return;
                            const el = document.getElementById(
                              "er-nursing-reassessment-at-input"
                            ) as HTMLInputElement | null;
                            el?.focus();
                            try {
                              /**
                               * Best-effort: open the picker on supporting browsers so the
                               * clock icon feels like a real shortcut. Safe to call when the
                               * method isn't supported (older browsers just gain focus).
                               */
                              (
                                el as unknown as { showPicker?: () => void } | null
                              )?.showPicker?.();
                            } catch {
                              /* ignore */
                            }
                          }}
                          disabled={formDisabled}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 10,
                            backgroundColor: formDisabled ? "#f1f5f9" : "#fff",
                            color: formDisabled ? "#94a3b8" : "#0369a1",
                            cursor: formDisabled ? "not-allowed" : "pointer",
                            padding: "8px 10px",
                            fontSize: 16,
                            lineHeight: 1,
                          }}
                        >
                          <span aria-hidden>🕐</span>
                        </button>
                        <input
                          id="er-nursing-reassessment-at-input"
                          type="datetime-local"
                          value={form.reassessmentAt}
                          onChange={(e) => patchForm({ reassessmentAt: e.target.value })}
                          disabled={formDisabled}
                          style={{
                            ...inputBase,
                            flex: "1 1 220px",
                            minWidth: 200,
                            backgroundColor: formDisabled ? "#f8fafc" : "#fff",
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleOpenNewReassessmentSession}
                          disabled={formDisabled}
                          aria-label={t(
                            "emergencyNursingReassessment.documentationGrid.newSessionButton"
                          )}
                          title={t(
                            "emergencyNursingReassessment.documentationGrid.newSessionHint"
                          )}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            border: nextSaveStartsNewSession ? "1px solid #16a34a" : "1px solid #bae6fd",
                            borderRadius: 10,
                            backgroundColor: nextSaveStartsNewSession
                              ? "#dcfce7"
                              : formDisabled
                              ? "#f1f5f9"
                              : "#f0f9ff",
                            color: nextSaveStartsNewSession
                              ? "#166534"
                              : formDisabled
                              ? "#94a3b8"
                              : "#0369a1",
                            fontWeight: 600,
                            fontSize: 13,
                            padding: "8px 12px",
                            cursor: formDisabled ? "not-allowed" : "pointer",
                          }}
                        >
                          <span aria-hidden>📄</span>
                          {t("emergencyNursingReassessment.documentationGrid.newSessionButton")}
                        </button>
                      </div>
                      {nextSaveStartsNewSession ? (
                        <p
                          role="status"
                          aria-live="polite"
                          style={{
                            margin: "6px 0 0 0",
                            fontSize: 12,
                            color: "#15803d",
                            fontWeight: 600,
                            lineHeight: 1.45,
                          }}
                        >
                          {t(
                            "emergencyNursingReassessment.documentationGrid.newSessionArmed"
                          )}
                        </p>
                      ) : (
                        <p
                          style={{
                            margin: "6px 0 0 0",
                            fontSize: 11,
                            color: "#64748b",
                            lineHeight: 1.45,
                          }}
                        >
                          {t(
                            "emergencyNursingReassessment.documentationGrid.activeSessionHint"
                          )}
                        </p>
                      )}
                    </div>
                    {SHOW_LEGACY_STANDALONE_REASSESSMENT_SECTIONS ? (
                      <>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelNarrative")}</label>
                          <textarea
                            value={form.narrative}
                            onChange={(e) => patchForm({ narrative: e.target.value })}
                            disabled={formDisabled}
                            rows={4}
                            style={{ ...inputBase, resize: "vertical", minHeight: 88, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                            placeholder={t("emergencyNursingReassessment.narrativePlaceholder")}
                          />
                          <NursingReassessmentQuickChips
                            field="narrative"
                            formDisabled={formDisabled}
                            t={t}
                            onChip={appendNursingQuickChip}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelGeneralAppearance")}</label>
                          <input
                            type="text"
                            value={form.generalAppearance}
                            onChange={(e) => patchForm({ generalAppearance: e.target.value })}
                            disabled={formDisabled}
                            style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                          />
                          <NursingReassessmentQuickChips
                            field="generalAppearance"
                            formDisabled={formDisabled}
                            t={t}
                            onChip={appendNursingQuickChip}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelBedsideStatus")}</label>
                          <input
                            type="text"
                            value={form.bedsideStatus}
                            onChange={(e) => patchForm({ bedsideStatus: e.target.value })}
                            disabled={formDisabled}
                            style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                            placeholder={t("emergencyNursingReassessment.placeholderBedsideStatus")}
                          />
                          <NursingReassessmentQuickChips
                            field="bedsideStatus"
                            formDisabled={formDisabled}
                            t={t}
                            onChip={appendNursingQuickChip}
                          />
                        </div>
                      </>
                    ) : null}

                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
                      <p style={sectionHeading}>{t("emergencyNursingReassessment.triageBedsideSafetySection")}</p>
                      <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                        {t("emergencyNursingReassessment.triageBedsideSafetyHelp")}
                      </p>
                      {loadingTriage ? (
                        <p style={{ margin: "10px 0 0 0", fontSize: 13, color: "#64748b" }}>
                          {t("emergencyNursingReassessment.triageBedsideLoading")}
                        </p>
                      ) : (
                        <div style={{ marginTop: 10 }}>
                          <ErTriageV1NursingCareSafetyFieldsBlock
                            slice={triageNursingSlice}
                            onSliceChange={patchTriageNursingSlice}
                            formDisabled={formDisabled}
                            inputBase={inputBase}
                            labelStyle={labelStyle}
                            grid3={grid3}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {SHOW_LEGACY_STANDALONE_REASSESSMENT_SECTIONS ? (
                  <>
                <div>
                  <p style={sectionHeading}>{t("emergencyNursingReassessment.sectionResponse")}</p>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>{t("emergencyNursingReassessment.labelResponseToTreatment")}</label>
                      <textarea
                        value={form.responseToTreatment}
                        onChange={(e) => patchForm({ responseToTreatment: e.target.value })}
                        disabled={formDisabled}
                        rows={3}
                        style={{ ...inputBase, resize: "vertical", minHeight: 72, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                      <NursingReassessmentQuickChips
                        field="responseToTreatment"
                        formDisabled={formDisabled}
                        t={t}
                        onChip={appendNursingQuickChip}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p style={sectionHeading}>{t("emergencyNursingReassessment.sectionCareSafety")}</p>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>{t("emergencyNursingReassessment.labelInterventions")}</label>
                      <textarea
                        value={form.interventionsPerformed}
                        onChange={(e) => patchForm({ interventionsPerformed: e.target.value })}
                        disabled={formDisabled}
                        rows={3}
                        style={{ ...inputBase, resize: "vertical", minHeight: 72, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                      <NursingReassessmentQuickChips
                        field="interventionsPerformed"
                        formDisabled={formDisabled}
                        t={t}
                        onChip={appendNursingQuickChip}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{t("emergencyNursingReassessment.labelSafetyRounding")}</label>
                      <textarea
                        value={form.safetyRoundingNote}
                        onChange={(e) => patchForm({ safetyRoundingNote: e.target.value })}
                        disabled={formDisabled}
                        rows={3}
                        style={{ ...inputBase, resize: "vertical", minHeight: 72, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                        placeholder={t("emergencyNursingReassessment.placeholderSafety")}
                      />
                      <NursingReassessmentQuickChips
                        field="safetyRoundingNote"
                        formDisabled={formDisabled}
                        t={t}
                        onChip={appendNursingQuickChip}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{t("emergencyNursingReassessment.labelAddendum")}</label>
                      <textarea
                        value={form.addendum}
                        onChange={(e) => patchForm({ addendum: e.target.value })}
                        disabled={formDisabled}
                        rows={2}
                        style={{ ...inputBase, resize: "vertical", minHeight: 56, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                      <NursingReassessmentQuickChips
                        field="addendum"
                        formDisabled={formDisabled}
                        t={t}
                        onChip={appendNursingQuickChip}
                      />
                    </div>
                  </div>
                </div>

                <details
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "10px 12px",
                    backgroundColor: "#fff",
                  }}
                >
                  <summary
                    style={{
                      cursor: formDisabled ? "default" : "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                      color: "#334155",
                    }}
                  >
                    {t("emergencyNursingReassessment.traumaSummaryLabel")}
                  </summary>
                  <p style={{ margin: "10px 0 8px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                    {t("emergencyNursingReassessment.traumaSummaryHelp")}
                  </p>
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <p style={{ ...sectionHeading, fontSize: 10 }}>{t("emergencyNursingReassessment.traumaPrimaryAbcde")}</p>
                      <div style={{ marginTop: 10, ...grid3 }}>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelAirway")}</label>
                          {abcdeSelectTrauma(traumaForm.primaryAirway, (v) => patchTraumaForm({ primaryAirway: v }), formDisabled)}
                        </div>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelBreathing")}</label>
                          {abcdeSelectTrauma(traumaForm.primaryBreathing, (v) => patchTraumaForm({ primaryBreathing: v }), formDisabled)}
                        </div>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelCirculation")}</label>
                          {abcdeSelectTrauma(traumaForm.primaryCirculation, (v) => patchTraumaForm({ primaryCirculation: v }), formDisabled)}
                        </div>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelNeurologic")}</label>
                          {abcdeSelectTrauma(traumaForm.primaryDisability, (v) => patchTraumaForm({ primaryDisability: v }), formDisabled)}
                        </div>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelExposurePrimary")}</label>
                          {abcdeSelectTrauma(traumaForm.primaryExposure, (v) => patchTraumaForm({ primaryExposure: v }), formDisabled)}
                        </div>
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <label style={labelStyle}>{t("emergencyNursingReassessment.traumaPrimaryNotes")}</label>
                        <textarea
                          value={traumaForm.primaryNotes}
                          onChange={(e) => patchTraumaForm({ primaryNotes: e.target.value })}
                          disabled={formDisabled}
                          rows={2}
                          style={{ ...inputBase, resize: "vertical", minHeight: 56, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                        />
                      </div>
                    </div>
                    <div>
                      <p style={{ ...sectionHeading, fontSize: 10 }}>{t("emergencyNursingReassessment.traumaSecondary")}</p>
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelHeadFace")}</label>
                          <textarea
                            value={traumaForm.secondaryHeadFace}
                            onChange={(e) => patchTraumaForm({ secondaryHeadFace: e.target.value })}
                            disabled={formDisabled}
                            rows={2}
                            style={{ ...inputBase, resize: "vertical", minHeight: 52, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelNeck")}</label>
                          <textarea
                            value={traumaForm.secondaryNeck}
                            onChange={(e) => patchTraumaForm({ secondaryNeck: e.target.value })}
                            disabled={formDisabled}
                            rows={2}
                            style={{ ...inputBase, resize: "vertical", minHeight: 52, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelChest")}</label>
                          <textarea
                            value={traumaForm.secondaryChest}
                            onChange={(e) => patchTraumaForm({ secondaryChest: e.target.value })}
                            disabled={formDisabled}
                            rows={2}
                            style={{ ...inputBase, resize: "vertical", minHeight: 52, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelAbdomenPelvis")}</label>
                          <textarea
                            value={traumaForm.secondaryAbdomenPelvis}
                            onChange={(e) => patchTraumaForm({ secondaryAbdomenPelvis: e.target.value })}
                            disabled={formDisabled}
                            rows={2}
                            style={{ ...inputBase, resize: "vertical", minHeight: 52, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelBackSpine")}</label>
                          <textarea
                            value={traumaForm.secondaryBackSpine}
                            onChange={(e) => patchTraumaForm({ secondaryBackSpine: e.target.value })}
                            disabled={formDisabled}
                            rows={2}
                            style={{ ...inputBase, resize: "vertical", minHeight: 52, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelExtremities")}</label>
                          <textarea
                            value={traumaForm.secondaryExtremities}
                            onChange={(e) => patchTraumaForm({ secondaryExtremities: e.target.value })}
                            disabled={formDisabled}
                            rows={2}
                            style={{ ...inputBase, resize: "vertical", minHeight: 52, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelSkinWounds")}</label>
                          <textarea
                            value={traumaForm.secondarySkinWounds}
                            onChange={(e) => patchTraumaForm({ secondarySkinWounds: e.target.value })}
                            disabled={formDisabled}
                            rows={2}
                            style={{ ...inputBase, resize: "vertical", minHeight: 52, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>{t("emergencyNursingReassessment.labelSecondaryNotes")}</label>
                          <textarea
                            value={traumaForm.secondaryNotes}
                            onChange={(e) => patchTraumaForm({ secondaryNotes: e.target.value })}
                            disabled={formDisabled}
                            rows={2}
                            style={{ ...inputBase, resize: "vertical", minHeight: 52, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
                  </>
                ) : null}

                {/**
                 * Mockup-aligned bottom action bar. Three actions, ordered for clinical clarity:
                 *
                 *  - "Effacer la colonne actuelle" (secondary): wipes the structured selects of
                 *    the active draft only. Free-text in the Notes panel above is intentionally
                 *    NOT touched.
                 *  - "Enregistrer (séance active)" (secondary): saves WITHOUT starting a new
                 *    column — preserves Phase-1 in-place lifecycle for incremental edits.
                 *  - "Ajouter la colonne actuelle" (primary): arms the new-session marker, then
                 *    saves; produces a brand-new immutable column in the timeline. The mockup's
                 *    headline call-to-action.
                 */}
                <div
                  style={{
                    marginTop: 4,
                    paddingTop: 14,
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "#64748b",
                      lineHeight: 1.45,
                      flex: "1 1 240px",
                    }}
                  >
                    {t("emergencyNursingReassessment.documentationGrid.bottomBarStatus")}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={handleClearLatestColumn}
                      disabled={formDisabled || saving}
                      aria-label={t(
                        "emergencyNursingReassessment.documentationGrid.clearLatestColumnButtonAria"
                      )}
                      title={t(
                        "emergencyNursingReassessment.documentationGrid.clearLatestColumnButtonAria"
                      )}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        backgroundColor: formDisabled ? "#f1f5f9" : "#fff",
                        color: formDisabled ? "#94a3b8" : "#475569",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: formDisabled || saving ? "not-allowed" : "pointer",
                      }}
                    >
                      {t("emergencyNursingReassessment.documentationGrid.clearLatestColumnButton")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={formDisabled || saving}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        backgroundColor: formDisabled ? "#f1f5f9" : "#f8fafc",
                        color: formDisabled ? "#94a3b8" : "#334155",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: formDisabled || saving ? "not-allowed" : "pointer",
                      }}
                    >
                      {saving
                        ? t("emergencyNursingReassessment.saveButtonSaving")
                        : t("emergencyNursingReassessment.saveButton")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (formDisabled || saving) return;
                        /**
                         * Use `forceNewSession: true` instead of relying on
                         * `setNextSaveStartsNewSession(true)` immediately before `handleSave()`.
                         * The setter is asynchronous (state update batched), so the previous
                         * implementation's PATCH body could omit `reassessmentNewSession: true`
                         * — causing the backend to UPDATE the prior column instead of inserting
                         * a fresh one. Passing the flag through the function arg sidesteps the
                         * race entirely.
                         */
                        void handleSave({ forceNewSession: true });
                      }}
                      disabled={formDisabled || saving}
                      aria-label={t(
                        "emergencyNursingReassessment.documentationGrid.addCurrentColumnButtonAria"
                      )}
                      title={t(
                        "emergencyNursingReassessment.documentationGrid.addCurrentColumnButtonAria"
                      )}
                      style={{
                        padding: "10px 18px",
                        borderRadius: 10,
                        border: "1px solid #0ea5e9",
                        backgroundColor: formDisabled ? "#f1f5f9" : "#0ea5e9",
                        color: formDisabled ? "#94a3b8" : "#fff",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: formDisabled || saving ? "not-allowed" : "pointer",
                      }}
                    >
                      {t("emergencyNursingReassessment.documentationGrid.addCurrentColumnButton")}
                    </button>
                  </div>
                </div>
              </div>

              <div style={resumeColumnStyle}>
                <p style={sectionHeading}>{t("emergencyNursingReassessment.resumeTitle")}</p>
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  {t("emergencyNursingReassessment.resumeHint")}
                </p>
                <div
                  style={{
                    marginTop: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#fff",
                  }}
                >
                  {previewModel.sections.map((sec, idx) => (
                    <div key={sec.id} style={{ marginBottom: idx === previewModel.sections.length - 1 ? 0 : 14 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: PREVIEW_ACCENTS[sec.id] ?? "#64748b",
                        }}
                      >
                        {sec.title}
                      </p>
                      <ul style={{ margin: "8px 0 0 0", paddingLeft: 18, fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
                        {sec.lines.map((line, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {previewModel.narrative ? (
                    <p style={{ margin: "12px 0 0 0", fontSize: 13, color: "#0f172a", lineHeight: 1.5, fontWeight: 600 }}>
                      {previewModel.narrative}
                    </p>
                  ) : null}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #bae6fd",
                    backgroundColor: "#f0f9ff",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#0369a1" }}>
                    {t("emergencyNursingReassessment.traumaSignatureHeading")}
                  </p>
                  {storedSig ? (
                    <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#0c4a6e", lineHeight: 1.45 }}>
                      {storedSig.savedByDisplayName}
                      <br />
                      {new Date(storedSig.savedAt).toLocaleString(dateLocale, { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  ) : (
                    <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#64748b" }}>{t("emergencyNursingReassessment.notRecorded")}</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </MedoraCardInner>
    </MedoraCard>
  );
}
