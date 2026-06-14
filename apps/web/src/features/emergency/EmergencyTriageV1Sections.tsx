"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getCatalogSearchItemDisplayLabel } from "@/lib/catalogDisplayLabel";
import { searchCatalog } from "@/lib/catalogSearchApi";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import { searchIcd10Catalog, type Icd10SearchHit } from "@/lib/chartApi";
import { HomeMedicationEntryModal } from "./HomeMedicationEntryModal";
import { DrugAllergySearchPanel } from "./DrugAllergySearchPanel";
import {
  appendDiagnosisToPmh,
  applySurgicalHistoryPick,
  shouldShowSafetyAssessment,
  shouldShowTravelDetails,
  togglePpeSelection,
} from "./edTriageEfficiencyGovernance";
import {
  diagnosisMatchesLocalizedSearch,
  resolveLocalizedDiagnosisSearchQueries,
} from "./diagnosisFrenchSearchAliases";
import { getLocalizedDiagnosisDisplayLabel } from "./diagnosisFrenchDisplayLabels";
import {
  resolveSurgicalHistoryDisplayName,
  searchSurgicalHistoryCatalog,
  SURGICAL_HISTORY_SEARCH_MIN_CHARS,
} from "@medora/shared";
import {
  formatHomeMedicationSummaryLine,
  formatHomeMedicationSearchSubtitle,
  type HomeMedicationEntryForm,
} from "./homeMedicationEntry";
import type {
  ErAbcOption,
  ErTraumaActivationCriterionId,
  ErTraumaLevel,
  ErTriageV1Form,
  ErTriageV1StructuredSelectionKey,
  ErYesNoUnknown,
} from "./medoraErTriageV1";
import {
  ER_TRAUMA_ACTIVATION_CRITERIA_IDS,
  ER_TRIAGE_ALLERGY_CHIP_DEFS,
  ER_TRIAGE_MEDS_CHIP_DEFS,
  ER_TRIAGE_PPE_CHIP_DEFS,
  ER_TRIAGE_ROUTING_CHIP_DEFS,
  appendIfNotPresent,
  emptyErTraumaActivationForm,
  erTriageV1FormHasAnyContent,
  nextGcsStateAfterComponentChange,
} from "./medoraErTriageV1";
import { MedoraCardBadge } from "@/components/medora-card";
import { TriageCarryForwardSectionBadge, TriageCarryForwardSectionToolbar } from "./TriageCarryForwardBanner";
import type { TriageCarryForwardMeta, TriageCarryForwardSectionKey } from "./triageCarryForward";

const TRAUMA_CRITERION_I18N_KEY: Record<ErTraumaActivationCriterionId, string> = {
  hypotension: "erTriage.v1.traumaCriteriaHypotension",
  respiratory_distress: "erTriage.v1.traumaCriteriaRespiratory",
  neuro_alteration: "erTriage.v1.traumaCriteriaNeuro",
  major_fall: "erTriage.v1.traumaCriteriaFall",
  high_energy_mechanism: "erTriage.v1.traumaCriteriaHighEnergy",
  penetrating_wound: "erTriage.v1.traumaCriteriaPenetrating",
  amputation_crush: "erTriage.v1.traumaCriteriaAmputation",
  other_major: "erTriage.v1.traumaCriteriaOther",
};

const detailsShell: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "10px 12px",
  backgroundColor: "#fff",
};

const summaryRow: React.CSSProperties = {
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  color: "#334155",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  listStyle: "none",
};

type ErTriageDocChipProps = {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

function ErTriageDocChip({ label, onClick, active, disabled }: ErTriageDocChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 9999,
        border: active ? "1px solid #3b82f6" : "1px solid #e2e8f0",
        background: active ? "#eff6ff" : "#f8fafc",
        color: "#334155",
        fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        lineHeight: 1.3,
        opacity: disabled ? 0.55 : 1,
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
      }}
    >
      {label}
    </button>
  );
}

function ErTriageDocChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>{children}</div>
  );
}

type ErTriageChipTextKey =
  | "referralSource"
  | "ppeNote"
  | "historySocialComments"
  | "medicationsSummary"
  | "additionalAllergyInfo"
  | "nursingCareNote";

function toggleStructuredTriageChip(
  patchErV1: (p: Partial<ErTriageV1Form>) => void,
  er: ErTriageV1Form,
  selectionKey: ErTriageV1StructuredSelectionKey,
  textKey: ErTriageChipTextKey,
  code: string,
  label: string
): void {
  const current = er[selectionKey];
  if (current.includes(code)) {
    patchErV1({ [selectionKey]: current.filter((c) => c !== code) } as Partial<ErTriageV1Form>);
    return;
  }
  patchErV1({
    [selectionKey]: [...current, code],
    [textKey]: appendIfNotPresent(er[textKey], label),
  } as Partial<ErTriageV1Form>);
}

const MED_HOME_SEARCH_MIN_CHARS = 2;
const MED_HOME_SEARCH_DEBOUNCE_MS = 320;
const MED_HOME_SEARCH_LIMIT = 12;
const PMH_DIAGNOSIS_SEARCH_MIN_CHARS = 2;
const PMH_DIAGNOSIS_SEARCH_DEBOUNCE_MS = 280;
const PMH_DIAGNOSIS_SEARCH_LIMIT = 12;

/** i18n keys under `erTriage.v1.*` — legacy reaction quick-picks removed in 19T.1. */

/** Past medical history quick-picks — append localized labels to `pastMedicalHistory` only. */
const HISTORY_PMH_I18N_KEYS = [
  "historyPmhHypertension",
  "historyPmhDiabetes",
  "historyPmhCad",
  "historyPmhStrokeTia",
  "historyPmhAsthma",
  "historyPmhCopd",
  "historyPmhCkd",
  "historyPmhSeizure",
  "historyPmhCancer",
  "historyPmhAnticoagulant",
  "historyPmhNoChronic",
  "historyPmhOther",
] as const;

const HISTORY_FH_I18N_KEYS = [
  "historyFhHeart",
  "historyFhStroke",
  "historyFhDiabetes",
  "historyFhCancer",
  "historyFhSuddenDeath",
  "historyFhBloodClots",
  "historyFhNoSignificant",
  "historyFhUnknown",
] as const;

type ErHistoryTextField = "pastMedicalHistory" | "pastSurgicalHistory" | "familyHistory";

type ErSubstanceTextField = "smokingStatus" | "alcoholUse" | "marijuanaUse" | "stimulantUse" | "opioidHeroinUse";

const SMOKING_CHIP_I18N_KEYS = [
  "chipSmokeNo",
  "chipSmokeCurrent",
  "chipSmokeFormer",
  "chipSmokeCigarettes",
  "chipSmokeCigars",
  "chipSmokeVaping",
  "chipSmokeUnknown",
] as const;

const ALCOHOL_CHIP_I18N_KEYS = [
  "chipAlcNo",
  "chipAlcSocial",
  "chipAlcCurrent",
  "chipAlcDaily",
  "chipAlcIntoxication",
  "chipAlcUnknown",
] as const;

const CANNABIS_CHIP_I18N_KEYS = [
  "chipCanNo",
  "chipCanMarijuana",
  "chipCanEdibles",
  "chipCanCurrent",
  "chipCanUnknown",
] as const;

const STIMULANT_CHIP_I18N_KEYS = [
  "chipStimNo",
  "chipStimCocaine",
  "chipStimMeth",
  "chipStimAmphetamine",
  "chipStimOther",
  "chipStimUnknown",
] as const;

const OPIOID_CHIP_I18N_KEYS = [
  "chipOpiNo",
  "chipOpiOpioidUse",
  "chipOpiHeroin",
  "chipOpiFentanyl",
  "chipOpiPrescription",
  "chipOpiUnknown",
] as const;

const IMMU_CHIP_I18N_KEYS = [
  "chipImmuUpToDate",
  "chipImmuUnknown",
  "chipImmuInfluenza",
  "chipImmuCovid19",
  "chipImmuTdap",
  "chipImmuHepB",
  "chipImmuPneumo",
  "chipImmuNotUpToDate",
] as const;

function painOptions(dash: string): { value: string; label: string }[] {
  const o: { value: string; label: string }[] = [{ value: "", label: dash }];
  for (let i = 0; i <= 10; i += 1) o.push({ value: String(i), label: `${i}/10` });
  return o;
}

function gcsScoreOptions(dash: string, max: number): { value: string; label: string }[] {
  const o: { value: string; label: string }[] = [{ value: "", label: dash }];
  for (let i = 1; i <= max; i += 1) o.push({ value: String(i), label: String(i) });
  return o;
}

function gcsTriadCompleteWithTotal(er: ErTriageV1Form): { total: number } | null {
  const e = er.gcsEye.trim();
  const v = er.gcsVerbal.trim();
  const m = er.gcsMotor.trim();
  const ne = parseInt(e, 10);
  const nv = parseInt(v, 10);
  const nm = parseInt(m, 10);
  if (Number.isNaN(ne) || Number.isNaN(nv) || Number.isNaN(nm)) return null;
  if (ne < 1 || ne > 4 || nv < 1 || nv > 5 || nm < 1 || nm > 6) return null;
  const sum = ne + nv + nm;
  if (sum < 3 || sum > 15) return null;
  return { total: sum };
}

export type EmergencyTriageV1SectionsProps = {
  er: ErTriageV1Form;
  patchErV1: (p: Partial<ErTriageV1Form>) => void;
  formDisabled: boolean;
  inputBase: React.CSSProperties;
  labelStyle: React.CSSProperties;
  grid2: React.CSSProperties;
  grid3: React.CSSProperties;
  sectionHeading: React.CSSProperties;
  patientChartHref?: string;
  /** Required for home-medication catalog search (display names appended to summary only). */
  facilityId?: string;
  carryForwardMeta?: TriageCarryForwardMeta | null;
  onConfirmCarryForwardSection?: (section: TriageCarryForwardSectionKey) => void;
  onClearCarryForwardSection?: (section: TriageCarryForwardSectionKey) => void;
};

export function EmergencyTriageV1Sections({
  er,
  patchErV1,
  formDisabled,
  inputBase,
  labelStyle,
  grid2,
  grid3,
  sectionHeading,
  facilityId,
  carryForwardMeta,
  onConfirmCarryForwardSection,
  onClearCarryForwardSection,
}: EmergencyTriageV1SectionsProps) {
  const { t, language } = useI18n();
  const v1Any = erTriageV1FormHasAnyContent(er);

  const dash = t("erTriage.preview.emptyOption");
  const abcOptions: { value: ErAbcOption; label: string }[] = useMemo(
    () => [
      { value: "", label: dash },
      { value: "wnl", label: t("erTriage.preview.abcWnl") },
      { value: "yes", label: t("erTriage.preview.ynuYes") },
      { value: "no", label: t("erTriage.preview.ynuNo") },
      { value: "unknown", label: t("erTriage.preview.ynuUnknown") },
    ],
    [t, dash]
  );
  const ynuOptions: { value: ErYesNoUnknown; label: string }[] = useMemo(
    () => [
      { value: "", label: dash },
      { value: "yes", label: t("erTriage.preview.ynuYes") },
      { value: "no", label: t("erTriage.preview.ynuNo") },
      { value: "unknown", label: t("erTriage.preview.ynuUnknown") },
    ],
    [t, dash]
  );
  const gcsEyeOpts = useMemo(() => gcsScoreOptions(dash, 4), [dash]);
  const gcsVerbalOpts = useMemo(() => gcsScoreOptions(dash, 5), [dash]);
  const gcsMotorOpts = useMemo(() => gcsScoreOptions(dash, 6), [dash]);
  const gcsTriad = useMemo(() => gcsTriadCompleteWithTotal(er), [er.gcsEye, er.gcsVerbal, er.gcsMotor]);
  const gcsAbnormal = gcsTriad != null && gcsTriad.total < 15;

  const [medHomeSearchInput, setMedHomeSearchInput] = useState("");
  const [medHomeSearchResults, setMedHomeSearchResults] = useState<CatalogSearchItem[]>([]);
  const [medHomeSearchLoading, setMedHomeSearchLoading] = useState(false);
  const [homeMedEntryCatalogItem, setHomeMedEntryCatalogItem] = useState<CatalogSearchItem | null>(null);
  const medHomeSearchReq = useRef(0);

  useEffect(() => {
    if (!facilityId?.trim()) {
      setMedHomeSearchResults([]);
      setMedHomeSearchLoading(false);
      return;
    }
    const q = medHomeSearchInput.trim();
    if (q.length < MED_HOME_SEARCH_MIN_CHARS) {
      setMedHomeSearchResults([]);
      setMedHomeSearchLoading(false);
      return;
    }
    setMedHomeSearchLoading(true);
    const reqId = ++medHomeSearchReq.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const items = await searchCatalog(facilityId.trim(), "MEDICATION", {
            q,
            limit: MED_HOME_SEARCH_LIMIT,
            purpose: "documentation",
          });
          if (medHomeSearchReq.current === reqId) {
            setMedHomeSearchResults(items);
          }
        } catch {
          if (medHomeSearchReq.current === reqId) {
            setMedHomeSearchResults([]);
          }
        } finally {
          if (medHomeSearchReq.current === reqId) {
            setMedHomeSearchLoading(false);
          }
        }
      })();
    }, MED_HOME_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [medHomeSearchInput, facilityId]);

  const openHomeMedicationEntry = useCallback((item: CatalogSearchItem) => {
    setHomeMedEntryCatalogItem(item);
    setMedHomeSearchInput("");
    setMedHomeSearchResults([]);
  }, []);

  const saveHomeMedicationEntry = useCallback(
    (entry: HomeMedicationEntryForm) => {
      const line = formatHomeMedicationSummaryLine(entry, t, language);
      if (!line) return;
      patchErV1({ medicationsSummary: appendIfNotPresent(er.medicationsSummary, line) });
      setHomeMedEntryCatalogItem(null);
    },
    [er.medicationsSummary, language, patchErV1, t]
  );

  const [historyPmhFilter, setHistoryPmhFilter] = useState("");
  const [historyFhFilter, setHistoryFhFilter] = useState("");
  const [pmhDiagnosisSearchInput, setPmhDiagnosisSearchInput] = useState("");
  const [pmhDiagnosisSearchResults, setPmhDiagnosisSearchResults] = useState<Icd10SearchHit[]>([]);
  const [pmhDiagnosisSearchLoading, setPmhDiagnosisSearchLoading] = useState(false);
  const pmhDiagnosisSearchReq = useRef(0);
  const [pshTemplateSearchInput, setPshTemplateSearchInput] = useState("");
  const pshTemplateMatches = useMemo(
    () => searchSurgicalHistoryCatalog(pshTemplateSearchInput, language),
    [pshTemplateSearchInput, language]
  );

  useEffect(() => {
    const q = pmhDiagnosisSearchInput.trim();
    if (q.length < PMH_DIAGNOSIS_SEARCH_MIN_CHARS) {
      setPmhDiagnosisSearchResults([]);
      setPmhDiagnosisSearchLoading(false);
      return;
    }
    setPmhDiagnosisSearchLoading(true);
    const reqId = ++pmhDiagnosisSearchReq.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const apiQueries = resolveLocalizedDiagnosisSearchQueries(q, language);
          const merged: Icd10SearchHit[] = [];
          const seen = new Set<string>();
          for (const apiQ of apiQueries) {
            const res = await searchIcd10Catalog(apiQ, PMH_DIAGNOSIS_SEARCH_LIMIT);
            for (const hit of Array.isArray(res.items) ? res.items : []) {
              if (seen.has(hit.id)) continue;
              seen.add(hit.id);
              merged.push(hit);
            }
            if (merged.length >= PMH_DIAGNOSIS_SEARCH_LIMIT) break;
          }
          const items =
            language === "fr"
              ? merged.filter((hit) => diagnosisMatchesLocalizedSearch(hit, q, language)).slice(0, PMH_DIAGNOSIS_SEARCH_LIMIT)
              : merged.slice(0, PMH_DIAGNOSIS_SEARCH_LIMIT);
          if (pmhDiagnosisSearchReq.current === reqId) {
            setPmhDiagnosisSearchResults(items);
          }
        } catch {
          if (pmhDiagnosisSearchReq.current === reqId) {
            setPmhDiagnosisSearchResults([]);
          }
        } finally {
          if (pmhDiagnosisSearchReq.current === reqId) {
            setPmhDiagnosisSearchLoading(false);
          }
        }
      })();
    }, PMH_DIAGNOSIS_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [language, pmhDiagnosisSearchInput]);

  const pickPmhDiagnosis = useCallback(
    (hit: Icd10SearchHit) => {
      patchErV1({ pastMedicalHistory: appendDiagnosisToPmh(er.pastMedicalHistory, hit, language) });
      setPmhDiagnosisSearchInput("");
      setPmhDiagnosisSearchResults([]);
    },
    [er.pastMedicalHistory, language, patchErV1]
  );

  const pickSurgicalHistoryTemplate = useCallback(
    (tpl: (typeof pshTemplateMatches)[number]) => {
      patchErV1({ pastSurgicalHistory: applySurgicalHistoryPick(er.pastSurgicalHistory, tpl, language) });
      setPshTemplateSearchInput("");
    },
    [er.pastSurgicalHistory, language, patchErV1]
  );

  const appendHistoryQuick = useCallback(
    (field: ErHistoryTextField, i18nSuffix: string) => {
      const label = t(`erTriage.v1.${i18nSuffix}`).trim();
      if (!label) return;
      patchErV1({ [field]: appendIfNotPresent(er[field], label) });
    },
    [er.pastMedicalHistory, er.pastSurgicalHistory, er.familyHistory, patchErV1, t]
  );

  const appendSubstanceFieldQuick = useCallback(
    (field: ErSubstanceTextField, i18nSuffix: string) => {
      const label = t(`erTriage.v1.${i18nSuffix}`).trim();
      if (!label) return;
      patchErV1({ [field]: appendIfNotPresent(er[field], label) });
    },
    [er.alcoholUse, er.marijuanaUse, er.opioidHeroinUse, er.smokingStatus, er.stimulantUse, patchErV1, t]
  );

  const appendImmuQuickText = useCallback(
    (i18nSuffix: string) => {
      const label = t(`erTriage.v1.${i18nSuffix}`).trim();
      if (!label) return;
      patchErV1({ immunizationStatusNote: appendIfNotPresent(er.immunizationStatusNote, label) });
    },
    [er.immunizationStatusNote, patchErV1, t]
  );

  const traumaLevelOptions: { value: ErTraumaLevel; label: string }[] = useMemo(
    () => [
      { value: "", label: dash },
      { value: "LEVEL_1", label: t("erTriage.v1.traumaLevelN1") },
      { value: "LEVEL_2", label: t("erTriage.v1.traumaLevelN2") },
      { value: "LEVEL_3", label: t("erTriage.v1.traumaLevelN3") },
      { value: "LEVEL_4", label: t("erTriage.v1.traumaLevelN4") },
    ],
    [t, dash]
  );

  const sel = (key: keyof ErTriageV1Form, options: { value: string; label: string }[]) => (
    <select
      value={String(er[key] ?? "")}
      onChange={(e) => patchErV1({ [key]: e.target.value } as Partial<ErTriageV1Form>)}
      disabled={formDisabled}
      style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
    >
      {options.map((o) => (
        <option key={o.value === "" ? "empty" : o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {v1Any ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <MedoraCardBadge soft={{ bg: "#fef2f2", text: "#991b1b", border: "#fecaca" }}>{t("erTriage.v1.badge")}</MedoraCardBadge>
        </div>
      ) : null}

      <details open style={detailsShell}>
        <summary style={summaryRow}>
          <span>{t("erTriage.v1.s1Title")}</span>
        </summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
          <div>
            <p style={sectionHeading}>{t("erTriage.v1.narrativeHeading")}</p>
            <textarea
              value={er.triageNarrative}
              onChange={(e) => patchErV1({ triageNarrative: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={8000}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", marginTop: 8, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              placeholder={t("erTriage.v1.narrativePlaceholder")}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.ppe")}</label>
            <input
              type="text"
              value={er.ppeNote}
              onChange={(e) => patchErV1({ ppeNote: e.target.value })}
              disabled={formDisabled}
              style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              placeholder={t("erTriage.v1.ppePlaceholder")}
            />
            <ErTriageDocChipRow>
              {ER_TRIAGE_PPE_CHIP_DEFS.map((def) => {
                const label = t(`erTriage.v1.${def.i18nKey}`);
                return (
                  <ErTriageDocChip
                    key={def.code}
                    label={label}
                    active={er.ppeSelections.includes(def.code)}
                    disabled={formDisabled}
                    onClick={() => {
                      const label = t(`erTriage.v1.${def.i18nKey}`);
                      patchErV1(togglePpeSelection(er, def.code, label));
                    }}
                  />
                );
              })}
            </ErTriageDocChipRow>
          </div>
          <div style={grid2}>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.airway")}</label>
              {sel("airway", abcOptions)}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.breathing")}</label>
              {sel("breathing", abcOptions)}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.circulation")}</label>
              {sel("circulation", abcOptions)}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p style={sectionHeading}>{t("erTriage.v1.gcsSection")}</p>
              <div style={{ ...grid3, marginTop: 8 }}>
                <div>
                  <label style={labelStyle}>{t("erTriage.v1.gcsEye")}</label>
                  <select
                    value={er.gcsEye}
                    onChange={(e) => patchErV1(nextGcsStateAfterComponentChange(er, "gcsEye", e.target.value))}
                    disabled={formDisabled}
                    style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                  >
                    {gcsEyeOpts.map((o) => (
                      <option key={o.value === "" ? "empty" : o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t("erTriage.v1.gcsVerbal")}</label>
                  <select
                    value={er.gcsVerbal}
                    onChange={(e) => patchErV1(nextGcsStateAfterComponentChange(er, "gcsVerbal", e.target.value))}
                    disabled={formDisabled}
                    style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                  >
                    {gcsVerbalOpts.map((o) => (
                      <option key={o.value === "" ? "empty" : o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t("erTriage.v1.gcsMotor")}</label>
                  <select
                    value={er.gcsMotor}
                    onChange={(e) => patchErV1(nextGcsStateAfterComponentChange(er, "gcsMotor", e.target.value))}
                    disabled={formDisabled}
                    style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                  >
                    {gcsMotorOpts.map((o) => (
                      <option key={o.value === "" ? "empty" : o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t("erTriage.v1.gcsTotal")}</label>
                  <div
                    style={{
                      ...inputBase,
                      display: "flex",
                      alignItems: "center",
                      minHeight: 38,
                      backgroundColor: formDisabled ? "#f8fafc" : "#f1f5f9",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 600,
                      color: "#334155",
                    }}
                    aria-live="polite"
                  >
                    {gcsTriad ? String(gcsTriad.total) : dash}
                  </div>
                </div>
              </div>
              {gcsAbnormal ? (
                <p
                  role="status"
                  style={{
                    margin: "10px 0 0",
                    fontSize: 12,
                    color: "#b45309",
                    lineHeight: 1.45,
                    fontWeight: 600,
                  }}
                >
                  {t("erTriage.v1.gcsAbnormalWarning")}
                </p>
              ) : null}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.pain010")}</label>
              {sel("painScale0to10", painOptions(dash))}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.referral")}</label>
              <input
                type="text"
                value={er.referralSource}
                onChange={(e) => patchErV1({ referralSource: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                placeholder={t("erTriage.v1.referralPlaceholder")}
              />
              <ErTriageDocChipRow>
                {ER_TRIAGE_ROUTING_CHIP_DEFS.map((def) => {
                  const label = t(`erTriage.v1.${def.i18nKey}`);
                  return (
                    <ErTriageDocChip
                      key={def.code}
                      label={label}
                      active={er.sourceRoutingSelections.includes(def.code)}
                      disabled={formDisabled}
                      onClick={() =>
                        toggleStructuredTriageChip(
                          patchErV1,
                          er,
                          "sourceRoutingSelections",
                          "referralSource",
                          def.code,
                          label
                        )
                      }
                    />
                  );
                })}
              </ErTriageDocChipRow>
            </div>
          </div>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              backgroundColor: "#fffafa",
            }}
          >
            <p style={{ ...sectionHeading, marginBottom: 8 }}>{t("erTriage.v1.traumaBlockTitle")}</p>
            {!er.traumaActivation.activated ? (
              <button
                type="button"
                onClick={() =>
                  patchErV1({
                    traumaActivation: { ...er.traumaActivation, activated: true },
                  })
                }
                disabled={formDisabled}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #b91c1c",
                  backgroundColor: formDisabled ? "#f1f5f9" : "#b91c1c",
                  color: formDisabled ? "#94a3b8" : "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: formDisabled ? "not-allowed" : "pointer",
                }}
              >
                {t("erTriage.v1.traumaActivate")}
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#991b1b" }}>{t("erTriage.v1.traumaActive")}</span>
                  <button
                    type="button"
                    onClick={() => patchErV1({ traumaActivation: emptyErTraumaActivationForm() })}
                    disabled={formDisabled}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#64748b",
                      cursor: formDisabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {t("erTriage.v1.traumaDeactivate")}
                  </button>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>{t("erTriage.v1.traumaLevel")}</label>
                    <select
                      value={er.traumaActivation.level}
                      onChange={(e) =>
                        patchErV1({
                          traumaActivation: {
                            ...er.traumaActivation,
                            level: e.target.value as ErTraumaLevel,
                          },
                        })
                      }
                      disabled={formDisabled}
                      style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                    >
                      {traumaLevelOptions.map((o) => (
                        <option key={o.value === "" ? "empty" : o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t("erTriage.v1.traumaActivatedAt")}</label>
                    <input
                      type="datetime-local"
                      value={er.traumaActivation.activatedAt}
                      onChange={(e) =>
                        patchErV1({
                          traumaActivation: { ...er.traumaActivation, activatedAt: e.target.value },
                        })
                      }
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t("erTriage.v1.traumaCriteria")}</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    {ER_TRAUMA_ACTIVATION_CRITERIA_IDS.map((id) => {
                      const on = er.traumaActivation.criteria.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            const cur = er.traumaActivation.criteria;
                            const next = on ? cur.filter((x) => x !== id) : [...cur, id];
                            patchErV1({
                              traumaActivation: { ...er.traumaActivation, criteria: next },
                            });
                          }}
                          disabled={formDisabled}
                          style={{
                            padding: "6px 10px",
                            fontSize: 12,
                            borderRadius: 9999,
                            border: `1px solid ${on ? "#93c5fd" : "#e2e8f0"}`,
                            backgroundColor: on ? "#eff6ff" : "#fff",
                            color: "#0f172a",
                            cursor: formDisabled ? "not-allowed" : "pointer",
                          }}
                        >
                          {t(TRAUMA_CRITERION_I18N_KEY[id as ErTraumaActivationCriterionId])}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t("erTriage.v1.traumaNotes")}</label>
                  <textarea
                    value={er.traumaActivation.notes}
                    onChange={(e) =>
                      patchErV1({
                        traumaActivation: { ...er.traumaActivation, notes: e.target.value },
                      })
                    }
                    disabled={formDisabled}
                    rows={2}
                    maxLength={4000}
                    style={{ ...inputBase, resize: "vertical", minHeight: 52, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                  />
                </div>
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.exceptions")}</label>
            <textarea
              value={er.triageExceptionsNote}
              onChange={(e) => patchErV1({ triageExceptionsNote: e.target.value })}
              disabled={formDisabled}
              rows={2}
              maxLength={4000}
              style={{ ...inputBase, minHeight: 56, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              placeholder={t("erTriage.v1.exceptionsPlaceholder")}
            />
          </div>
        </div>
      </details>

      <details style={detailsShell}>
        <summary style={summaryRow}>
          <span>{t("erTriage.v1.safetyRoutingTitle")}</span>
        </summary>
        <div style={{ ...grid3, marginTop: 10 }}>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.safeHome")}</label>
            {sel("feelsSafeAtHome", ynuOptions)}
          </div>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.travel14")}</label>
            {sel("travelOutsideCountry14d", ynuOptions)}
          </div>
        </div>
        {shouldShowTravelDetails(er.travelOutsideCountry14d) ? (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ ...sectionHeading, margin: 0 }}>{t("erTriage.v1.travelDetailsTitle")}</p>
            <div style={grid2}>
              <div>
                <label style={labelStyle}>{t("erTriage.v1.travelDestination")}</label>
                <input
                  type="text"
                  value={er.travelDestinationCountry}
                  onChange={(e) => patchErV1({ travelDestinationCountry: e.target.value })}
                  disabled={formDisabled}
                  required
                  style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                />
              </div>
              <div>
                <label style={labelStyle}>{t("erTriage.v1.travelDateOrReturn")}</label>
                <input
                  type="text"
                  value={er.travelDateOrReturn}
                  onChange={(e) => patchErV1({ travelDateOrReturn: e.target.value })}
                  disabled={formDisabled}
                  required
                  style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                  placeholder={t("erTriage.v1.travelDateOrReturnPlaceholder")}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>{t("erTriage.v1.travelExposureConcern")}</label>
                <textarea
                  value={er.travelExposureConcern}
                  onChange={(e) => patchErV1({ travelExposureConcern: e.target.value })}
                  disabled={formDisabled}
                  required
                  rows={2}
                  maxLength={4000}
                  style={{ ...inputBase, minHeight: 52, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>{t("erTriage.v1.travelScreeningNotes")}</label>
                <textarea
                  value={er.travelScreeningNotes}
                  onChange={(e) => patchErV1({ travelScreeningNotes: e.target.value })}
                  disabled={formDisabled}
                  rows={2}
                  maxLength={4000}
                  style={{ ...inputBase, minHeight: 52, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                />
              </div>
            </div>
          </div>
        ) : null}
        {shouldShowSafetyAssessment(er.feelsSafeAtHome) ? (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ ...sectionHeading, margin: 0 }}>{t("erTriage.v1.safetyAssessmentTitle")}</p>
            <div style={grid2}>
              <div>
                <label style={labelStyle}>{t("erTriage.v1.safetyImmediateDanger")}</label>
                {sel("safetyImmediateDanger", ynuOptions)}
              </div>
              <div>
                <label style={labelStyle}>{t("erTriage.v1.safetyAbuseNeglect")}</label>
                {sel("safetyAbuseNeglect", ynuOptions)}
              </div>
              <div>
                <label style={labelStyle}>{t("erTriage.v1.safetyHumanTrafficking")}</label>
                {sel("safetyHumanTrafficking", ynuOptions)}
              </div>
              <div>
                <label style={labelStyle}>{t("erTriage.v1.safetySelfHarm")}</label>
                {sel("safetySelfHarm", ynuOptions)}
              </div>
              <div>
                <label style={labelStyle}>{t("erTriage.v1.safetyNeedsSocialWork")}</label>
                {sel("safetyNeedsSocialWork", ynuOptions)}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>{t("erTriage.v1.safetyAssessmentNotes")}</label>
                <textarea
                  value={er.safetyAssessmentNotes}
                  onChange={(e) => patchErV1({ safetyAssessmentNotes: e.target.value })}
                  disabled={formDisabled}
                  rows={2}
                  maxLength={4000}
                  style={{ ...inputBase, minHeight: 52, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                  placeholder={t("erTriage.v1.safetyAssessmentNotesPlaceholder")}
                />
              </div>
            </div>
          </div>
        ) : null}
      </details>

      <details style={detailsShell}>
        <summary style={summaryRow}>
          <span>{t("erTriage.v1.s3Title")}</span>
          {carryForwardMeta?.fields.homeMedications ? (
            <TriageCarryForwardSectionBadge section="homeMedications" meta={carryForwardMeta} />
          ) : null}
          {carryForwardMeta?.fields.allergies ? (
            <TriageCarryForwardSectionBadge section="allergies" meta={carryForwardMeta} />
          ) : null}
        </summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
          {onConfirmCarryForwardSection && onClearCarryForwardSection ? (
            <>
              <TriageCarryForwardSectionToolbar
                section="homeMedications"
                meta={carryForwardMeta ?? null}
                formDisabled={formDisabled}
                onConfirmSection={onConfirmCarryForwardSection}
                onClearSection={onClearCarryForwardSection}
              />
              <TriageCarryForwardSectionToolbar
                section="allergies"
                meta={carryForwardMeta ?? null}
                formDisabled={formDisabled}
                onConfirmSection={onConfirmCarryForwardSection}
                onClearSection={onClearCarryForwardSection}
              />
            </>
          ) : null}
          <div>
            <label style={labelStyle}>{t("erTriage.v1.medsSummary")}</label>
            <textarea
              value={er.medicationsSummary}
              onChange={(e) => patchErV1({ medicationsSummary: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={8000}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
            <ErTriageDocChipRow>
              {ER_TRIAGE_MEDS_CHIP_DEFS.map((def) => {
                const label = t(`erTriage.v1.${def.i18nKey}`);
                return (
                  <ErTriageDocChip
                    key={def.code}
                    label={label}
                    active={er.medicationSummarySelections.includes(def.code)}
                    disabled={formDisabled}
                    onClick={() =>
                      toggleStructuredTriageChip(
                        patchErV1,
                        er,
                        "medicationSummarySelections",
                        "medicationsSummary",
                        def.code,
                        label
                      )
                    }
                  />
                );
              })}
            </ErTriageDocChipRow>
            {facilityId?.trim() ? (
              <div style={{ marginTop: 10 }}>
                <p style={{ ...sectionHeading, fontSize: 10 }}>{t("erTriage.v1.medsHomeMedSearchLabel")}</p>
                <input
                  type="search"
                  value={medHomeSearchInput}
                  onChange={(e) => setMedHomeSearchInput(e.target.value)}
                  disabled={formDisabled}
                  placeholder={t("erTriage.v1.medsHomeMedSearchPlaceholder")}
                  autoComplete="off"
                  style={{ ...inputBase, marginTop: 6, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                />
                {medHomeSearchInput.trim().length > 0 &&
                medHomeSearchInput.trim().length < MED_HOME_SEARCH_MIN_CHARS ? (
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>
                    {t("erTriage.v1.medsCatalogMinCharsHint")}
                  </p>
                ) : null}
                {medHomeSearchLoading ? (
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>
                    {t("erTriage.v1.medsCatalogSearching")}
                  </p>
                ) : null}
                {!medHomeSearchLoading &&
                medHomeSearchInput.trim().length >= MED_HOME_SEARCH_MIN_CHARS &&
                medHomeSearchResults.length === 0 ? (
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>
                    {t("erTriage.v1.medsCatalogNoResults")}
                  </p>
                ) : null}
                {medHomeSearchResults.length > 0 ? (
                  <ul
                    style={{
                      listStyle: "none",
                      margin: "8px 0 0",
                      padding: 0,
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      maxHeight: 200,
                      overflowY: "auto",
                      backgroundColor: "#fff",
                    }}
                  >
                    {medHomeSearchResults.map((item) => {
                      const primary = getCatalogSearchItemDisplayLabel(item, language, t);
                      const subtitle = formatHomeMedicationSearchSubtitle(item, language, t);
                      return (
                      <li key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <button
                          type="button"
                          disabled={formDisabled}
                          onClick={() => openHomeMedicationEntry(item)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "8px 10px",
                            border: "none",
                            background: "transparent",
                            cursor: formDisabled ? "not-allowed" : "pointer",
                            fontSize: 13,
                            color: "#334155",
                          }}
                        >
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>{primary}</div>
                          {subtitle ? (
                            <div style={{ marginTop: 2, fontSize: 11, color: "#64748b", lineHeight: 1.35 }}>
                              {subtitle}
                            </div>
                          ) : null}
                        </button>
                      </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.medicationAllergiesDetail")}</label>
            <textarea
              value={er.medicationAllergiesDetail}
              onChange={(e) => patchErV1({ medicationAllergiesDetail: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={4000}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
            {facilityId?.trim() ? (
              <DrugAllergySearchPanel
                facilityId={facilityId.trim()}
                disabled={formDisabled}
                medicationAllergiesDetail={er.medicationAllergiesDetail}
                additionalAllergyInfo={er.additionalAllergyInfo}
                allergyDetailSelections={er.allergyDetailSelections}
                onSaveAllergies={(patch) => patchErV1(patch)}
              />
            ) : null}
            <ErTriageDocChipRow>
              {ER_TRIAGE_ALLERGY_CHIP_DEFS.filter((def) => def.code !== "DRUG_ALLERGY").map((def) => {
                const label = t(`erTriage.v1.${def.i18nKey}`);
                return (
                  <ErTriageDocChip
                    key={def.code}
                    label={label}
                    active={er.allergyDetailSelections.includes(def.code)}
                    disabled={formDisabled}
                    onClick={() =>
                      toggleStructuredTriageChip(
                        patchErV1,
                        er,
                        "allergyDetailSelections",
                        "additionalAllergyInfo",
                        def.code,
                        label
                      )
                    }
                  />
                );
              })}
            </ErTriageDocChipRow>
          </div>
          <div style={grid2}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>{t("erTriage.v1.preferredPharmacy")}</label>
              <input
                type="text"
                value={er.preferredPharmacy}
                onChange={(e) => patchErV1({ preferredPharmacy: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>{t("erTriage.v1.immuStatus")}</label>
            <input
              type="text"
              value={er.immunizationStatusNote}
              onChange={(e) => patchErV1({ immunizationStatusNote: e.target.value })}
              disabled={formDisabled}
              style={{ ...inputBase, marginTop: 6, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              placeholder={t("erTriage.v1.immuPlaceholder")}
            />
            <ErTriageDocChipRow>
              {IMMU_CHIP_I18N_KEYS.map((k) => (
                <ErTriageDocChip
                  key={k}
                  label={t(`erTriage.v1.${k}`)}
                  disabled={formDisabled}
                  onClick={() => appendImmuQuickText(k)}
                />
              ))}
            </ErTriageDocChipRow>
          </div>
        </div>
      </details>

      <details style={detailsShell}>
        <summary style={summaryRow}>
          <span>{t("erTriage.v1.s4Title")}</span>
          {carryForwardMeta?.fields.medicalHistory || carryForwardMeta?.fields.surgicalHistory ? (
            <TriageCarryForwardSectionBadge section="history" meta={carryForwardMeta} />
          ) : null}
          {carryForwardMeta?.fields.smokingHistory ||
          carryForwardMeta?.fields.alcoholUse ||
          carryForwardMeta?.fields.substanceUse ? (
            <TriageCarryForwardSectionBadge section="socialHistory" meta={carryForwardMeta} />
          ) : null}
        </summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
          {onConfirmCarryForwardSection && onClearCarryForwardSection ? (
            <>
              <TriageCarryForwardSectionToolbar
                section="history"
                meta={carryForwardMeta ?? null}
                formDisabled={formDisabled}
                onConfirmSection={onConfirmCarryForwardSection}
                onClearSection={onClearCarryForwardSection}
              />
              <TriageCarryForwardSectionToolbar
                section="socialHistory"
                meta={carryForwardMeta ?? null}
                formDisabled={formDisabled}
                onConfirmSection={onConfirmCarryForwardSection}
                onClearSection={onClearCarryForwardSection}
              />
            </>
          ) : null}
          <div style={grid2}>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.pmh")}</label>
              <textarea
                value={er.pastMedicalHistory}
                onChange={(e) => patchErV1({ pastMedicalHistory: e.target.value })}
                disabled={formDisabled}
                rows={3}
                maxLength={8000}
                style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
              <input
                type="search"
                value={pmhDiagnosisSearchInput}
                onChange={(e) => setPmhDiagnosisSearchInput(e.target.value)}
                disabled={formDisabled}
                placeholder={t("erTriage.v1.pmhDiagnosisSearchPlaceholder")}
                autoComplete="off"
                style={{ ...inputBase, marginTop: 6, fontSize: 12, padding: "6px 8px", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
              {pmhDiagnosisSearchInput.trim().length > 0 &&
              pmhDiagnosisSearchInput.trim().length < PMH_DIAGNOSIS_SEARCH_MIN_CHARS ? (
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>
                  {t("erTriage.v1.medsCatalogMinCharsHint")}
                </p>
              ) : null}
              {pmhDiagnosisSearchLoading ? (
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>
                  {t("erTriage.v1.medsCatalogSearching")}
                </p>
              ) : null}
              {!pmhDiagnosisSearchLoading &&
              pmhDiagnosisSearchInput.trim().length >= PMH_DIAGNOSIS_SEARCH_MIN_CHARS &&
              pmhDiagnosisSearchResults.length === 0 ? (
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>
                  {t("erTriage.v1.medsCatalogNoResults")}
                </p>
              ) : null}
              {pmhDiagnosisSearchResults.length > 0 ? (
                <ul
                  style={{
                    listStyle: "none",
                    margin: "8px 0 0",
                    padding: 0,
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    maxHeight: 180,
                    overflowY: "auto",
                    backgroundColor: "#fff",
                  }}
                >
                  {pmhDiagnosisSearchResults.map((hit) => (
                    <li key={hit.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <button
                        type="button"
                        disabled={formDisabled}
                        onClick={() => pickPmhDiagnosis(hit)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 10px",
                          border: "none",
                          background: "transparent",
                          cursor: formDisabled ? "not-allowed" : "pointer",
                          fontSize: 13,
                          color: "#334155",
                        }}
                      >
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>
                          {getLocalizedDiagnosisDisplayLabel(hit, language)}
                        </div>
                        {hit.code ? (
                          <div style={{ marginTop: 2, fontSize: 11, color: "#64748b" }}>{hit.code}</div>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <input
                type="search"
                value={historyPmhFilter}
                onChange={(e) => setHistoryPmhFilter(e.target.value)}
                disabled={formDisabled}
                placeholder={t("erTriage.v1.historyQuickFilterPlaceholder")}
                autoComplete="off"
                style={{ ...inputBase, marginTop: 6, fontSize: 12, padding: "6px 8px", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
              {historyPmhFilter.trim().length >= 2 ? (
                <ErTriageDocChipRow>
                  {HISTORY_PMH_I18N_KEYS.filter((k) => {
                    const lab = t(`erTriage.v1.${k}`).trim().toLowerCase();
                    const q = historyPmhFilter.trim().toLowerCase();
                    return lab.includes(q);
                  }).map((k) => (
                    <ErTriageDocChip
                      key={k}
                      label={t(`erTriage.v1.${k}`)}
                      disabled={formDisabled}
                      onClick={() => appendHistoryQuick("pastMedicalHistory", k)}
                    />
                  ))}
                </ErTriageDocChipRow>
              ) : null}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.psh")}</label>
              <textarea
                value={er.pastSurgicalHistory}
                onChange={(e) => patchErV1({ pastSurgicalHistory: e.target.value })}
                disabled={formDisabled}
                rows={3}
                maxLength={8000}
                style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
              <input
                type="search"
                value={pshTemplateSearchInput}
                onChange={(e) => setPshTemplateSearchInput(e.target.value)}
                disabled={formDisabled}
                placeholder={t("erTriage.v1.pshSearchPlaceholder")}
                autoComplete="off"
                style={{ ...inputBase, marginTop: 6, fontSize: 12, padding: "6px 8px", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
              {pshTemplateSearchInput.trim().length > 0 &&
              pshTemplateSearchInput.trim().length < SURGICAL_HISTORY_SEARCH_MIN_CHARS ? (
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>
                  {t("erTriage.v1.medsCatalogMinCharsHint")}
                </p>
              ) : null}
              {pshTemplateSearchInput.trim().length >= SURGICAL_HISTORY_SEARCH_MIN_CHARS &&
              pshTemplateMatches.length === 0 ? (
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>
                  {t("erTriage.v1.medsCatalogNoResults")}
                </p>
              ) : null}
              {pshTemplateMatches.length > 0 ? (
                <ul
                  style={{
                    listStyle: "none",
                    margin: "8px 0 0",
                    padding: 0,
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    maxHeight: 180,
                    overflowY: "auto",
                    backgroundColor: "#fff",
                  }}
                >
                  {pshTemplateMatches.map((tpl) => (
                    <li key={tpl.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <button
                        type="button"
                        disabled={formDisabled}
                        onClick={() => pickSurgicalHistoryTemplate(tpl)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 10px",
                          border: "none",
                          background: "transparent",
                          cursor: formDisabled ? "not-allowed" : "pointer",
                          fontSize: 13,
                          color: "#334155",
                        }}
                      >
                        {resolveSurgicalHistoryDisplayName(tpl, language)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.fh")}</label>
            <textarea
              value={er.familyHistory}
              onChange={(e) => patchErV1({ familyHistory: e.target.value })}
              disabled={formDisabled}
              rows={2}
              maxLength={4000}
              style={{ ...inputBase, minHeight: 52, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
            <input
              type="search"
              value={historyFhFilter}
              onChange={(e) => setHistoryFhFilter(e.target.value)}
              disabled={formDisabled}
              placeholder={t("erTriage.v1.historyQuickFilterPlaceholder")}
              autoComplete="off"
              style={{ ...inputBase, marginTop: 6, fontSize: 12, padding: "6px 8px", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
            <ErTriageDocChipRow>
              {HISTORY_FH_I18N_KEYS.filter((k) => {
                const lab = t(`erTriage.v1.${k}`).trim().toLowerCase();
                const q = historyFhFilter.trim().toLowerCase();
                return !q || lab.includes(q);
              }).map((k) => (
                <ErTriageDocChip
                  key={k}
                  label={t(`erTriage.v1.${k}`)}
                  disabled={formDisabled}
                  onClick={() => appendHistoryQuick("familyHistory", k)}
                />
              ))}
            </ErTriageDocChipRow>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.smoking")}</label>
              <input
                type="text"
                value={er.smokingStatus}
                onChange={(e) => patchErV1({ smokingStatus: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, marginTop: 6, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                placeholder={t("erTriage.v1.smokingPlaceholder")}
              />
              <ErTriageDocChipRow>
                {SMOKING_CHIP_I18N_KEYS.map((k) => (
                  <ErTriageDocChip
                    key={k}
                    label={t(`erTriage.v1.${k}`)}
                    disabled={formDisabled}
                    onClick={() => appendSubstanceFieldQuick("smokingStatus", k)}
                  />
                ))}
              </ErTriageDocChipRow>
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.alcohol")}</label>
              <input
                type="text"
                value={er.alcoholUse}
                onChange={(e) => patchErV1({ alcoholUse: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, marginTop: 6, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
              <ErTriageDocChipRow>
                {ALCOHOL_CHIP_I18N_KEYS.map((k) => (
                  <ErTriageDocChip
                    key={k}
                    label={t(`erTriage.v1.${k}`)}
                    disabled={formDisabled}
                    onClick={() => appendSubstanceFieldQuick("alcoholUse", k)}
                  />
                ))}
              </ErTriageDocChipRow>
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.cannabis")}</label>
              <input
                type="text"
                value={er.marijuanaUse}
                onChange={(e) => patchErV1({ marijuanaUse: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, marginTop: 6, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
              <ErTriageDocChipRow>
                {CANNABIS_CHIP_I18N_KEYS.map((k) => (
                  <ErTriageDocChip
                    key={k}
                    label={t(`erTriage.v1.${k}`)}
                    disabled={formDisabled}
                    onClick={() => appendSubstanceFieldQuick("marijuanaUse", k)}
                  />
                ))}
              </ErTriageDocChipRow>
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.stimulants")}</label>
              <input
                type="text"
                value={er.stimulantUse}
                onChange={(e) => patchErV1({ stimulantUse: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, marginTop: 6, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
              <ErTriageDocChipRow>
                {STIMULANT_CHIP_I18N_KEYS.map((k) => (
                  <ErTriageDocChip
                    key={k}
                    label={t(`erTriage.v1.${k}`)}
                    disabled={formDisabled}
                    onClick={() => appendSubstanceFieldQuick("stimulantUse", k)}
                  />
                ))}
              </ErTriageDocChipRow>
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.opioids")}</label>
              <input
                type="text"
                value={er.opioidHeroinUse}
                onChange={(e) => patchErV1({ opioidHeroinUse: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, marginTop: 6, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
              <ErTriageDocChipRow>
                {OPIOID_CHIP_I18N_KEYS.map((k) => (
                  <ErTriageDocChip
                    key={k}
                    label={t(`erTriage.v1.${k}`)}
                    disabled={formDisabled}
                    onClick={() => appendSubstanceFieldQuick("opioidHeroinUse", k)}
                  />
                ))}
              </ErTriageDocChipRow>
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.socialComments")}</label>
            <textarea
              value={er.historySocialComments}
              onChange={(e) => patchErV1({ historySocialComments: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={8000}
              style={{ ...inputBase, marginTop: 6, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
          </div>
        </div>
      </details>
    </div>
    {homeMedEntryCatalogItem ? (
      <HomeMedicationEntryModal
        catalogItem={homeMedEntryCatalogItem}
        disabled={formDisabled}
        onCancel={() => setHomeMedEntryCatalogItem(null)}
        onSave={saveHomeMedicationEntry}
      />
    ) : null}
    </>
  );
}
