"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import {
  hasVitalsJson,
  MEDORA_PATIENT_VITALS_UPDATED,
  type PatientTriageVitalsSnapshot,
} from "@/lib/patientVitals";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import {
  buildTriageDocumentationPreviewModel,
  emptySepsisScreenForm,
  emptyStrokeScreenForm,
  gcsEvmTriadForTriagePreview,
  type ErSepsisScreenForm,
  type ErScreeningYnu,
  type ErStrokeScreenForm,
  sepsisScreenFormToJson,
  sepsisScreenFromUnknown,
  strokeScreenFormToJson,
  strokeScreenFromUnknown,
  type TriageDocPreviewFormSlice,
  triagePreviewSliceFromTriageGet,
} from "./emergencyTriageDocPreview";
import { EmergencyTriageV1Sections } from "./EmergencyTriageV1Sections";
import { mergeVitalsJsonForSave } from "./emergencyTriageVitalsMerge";
import { flipHeightInputMode } from "@/lib/vitalsEntryFlip";
import { temperatureHintPairCelsiusFahrenheit, weightHintPairKgPounds } from "@medora/shared";
import {
  emptyErTriageV1Form,
  erTriageV1FormFromVitalsJson,
  type ErTriageV1Form,
} from "./medoraErTriageV1";
import {
  filterErChiefComplaintTemplates,
  pickChiefComplaintLocale,
  type ErChiefComplaintBilingual,
  type ErChiefComplaintTemplate,
} from "./erChiefComplaintTemplates";
import {
  chiefComplaintSuggestsChestPain,
  draftTriageHasAllergyDocumentation,
  erTriageV1HasHighAcuityArrivalSource,
} from "./erTriageSafetyPrompts";
import type { VitalsJsonMergeFormInput } from "./emergencyTriageVitalsMerge";
import type { SupportedLanguage } from "@/i18n/config";

function applyTemplateBilingualIfFieldEmpty(
  current: string,
  bilingual: ErChiefComplaintBilingual | undefined,
  language: SupportedLanguage
): string {
  if (!bilingual) return current;
  if (current.trim()) return current;
  return pickChiefComplaintLocale(bilingual, language);
}

type EncounterLite = {
  id: string;
  status?: string | null;
  type?: string | null;
  patient?: { id?: string; firstName?: string | null; lastName?: string | null } | null;
};

/** Form state aligned with `TriageVitalsTab` in `encounters/[id]/page.tsx` (same PUT body). */
type TriageFormState = {
  chiefComplaint: string;
  onsetAt: string;
  esi: string;
  tempC: string;
  hr: string;
  rr: string;
  bpSys: string;
  bpDia: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
  tempInputUnit: "C" | "F";
  weightInputUnit: "kg" | "lb";
  heightInputMode: "cm" | "ftin";
  heightFeet: string;
  heightInches: string;
  allergyNote: string;
  strokeScreen: ErStrokeScreenForm;
  sepsisScreen: ErSepsisScreenForm;
  triageCompleteAt: string;
  erV1: ErTriageV1Form;
};

const emptyForm = (): TriageFormState => ({
  chiefComplaint: "",
  onsetAt: "",
  esi: "",
  tempC: "",
  hr: "",
  rr: "",
  bpSys: "",
  bpDia: "",
  spo2: "",
  weightKg: "",
  heightCm: "",
  tempInputUnit: "C",
  weightInputUnit: "kg",
  heightInputMode: "cm",
  heightFeet: "",
  heightInches: "",
  allergyNote: "",
  strokeScreen: emptyStrokeScreenForm(),
  sepsisScreen: emptySepsisScreenForm(),
  triageCompleteAt: "",
  erV1: emptyErTriageV1Form(),
});

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
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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

const PREVIEW_SECTION_ACCENTS: Record<string, string> = {
  presentation: "#6366f1",
  etat_initial: "#b91c1c",
  signes_vitaux: "#059669",
  securite: "#7c3aed",
  meds: "#d97706",
  histoire: "#64748b",
  empty: "#cbd5e1",
};

export function EmergencyTriagePanel({
  encounterId: _encounterId,
  facilityId,
  encounter,
  isLocked,
  encounterTriageTabHref,
  patientChartHref,
  onSaved,
  /** When set, shows a non-blocking control to open procedure documentation (e.g. ECG). */
  onRequestDocumentEcg,
}: {
  encounterId: string;
  facilityId: string;
  encounter: EncounterLite;
  isLocked: boolean;
  encounterTriageTabHref: string;
  /** Lien vers le dossier patient pour antécédents structurés (optionnel). */
  patientChartHref?: string;
  onSaved: () => void | Promise<void>;
  onRequestDocumentEcg?: () => void;
}) {
  const { t, language } = useI18n();
  const [triage, setTriage] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState<TriageFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [complaintTemplateQuery, setComplaintTemplateQuery] = useState("");
  const [templateAppliedHint, setTemplateAppliedHint] = useState<string | null>(null);
  const [docPreviewOpen, setDocPreviewOpen] = useState(false);

  const isReadOnly = encounter.status !== "OPEN";
  const formDisabled = isReadOnly || isLocked;

  const screeningYnuOptions: { value: ErScreeningYnu; label: string }[] = useMemo(
    () => [
      { value: "", label: t("erTriage.preview.emptyOption") },
      { value: "yes", label: t("erTriage.preview.ynuYes") },
      { value: "no", label: t("erTriage.preview.ynuNo") },
      { value: "unknown", label: t("erTriage.preview.ynuUnknown") },
    ],
    [t]
  );

  const screeningYnOptions: { value: "" | "yes" | "no"; label: string }[] = useMemo(
    () => [
      { value: "", label: t("erTriage.preview.emptyOption") },
      { value: "yes", label: t("erTriage.preview.ynuYes") },
      { value: "no", label: t("erTriage.preview.ynuNo") },
    ],
    [t]
  );

  const complaintTemplateMatches = useMemo(
    () => filterErChiefComplaintTemplates(complaintTemplateQuery, language),
    [complaintTemplateQuery, language]
  );

  const applyChiefComplaintTemplate = useCallback(
    (tpl: ErChiefComplaintTemplate) => {
      setTemplateAppliedHint(t("erTriage.panel.templateAppliedHint"));
      setFormData((f) => {
        const er = f.erV1;
        const nextEr: ErTriageV1Form = {
          ...er,
          triageNarrative: applyTemplateBilingualIfFieldEmpty(er.triageNarrative, tpl.triageNarrativeStarter, language),
          ppeNote: applyTemplateBilingualIfFieldEmpty(er.ppeNote, tpl.ppePrecautions, language),
          referralSource: applyTemplateBilingualIfFieldEmpty(er.referralSource, tpl.sourceRouting, language),
          triageExceptionsNote: applyTemplateBilingualIfFieldEmpty(
            er.triageExceptionsNote,
            tpl.exceptionsToExpectedProfile,
            language
          ),
          nursingCareNote: applyTemplateBilingualIfFieldEmpty(er.nursingCareNote, tpl.careMonitoringSummary, language),
          medicationsSummary: applyTemplateBilingualIfFieldEmpty(er.medicationsSummary, tpl.medicationSummary, language),
          additionalAllergyInfo: applyTemplateBilingualIfFieldEmpty(
            er.additionalAllergyInfo,
            tpl.additionalAllergyInfo,
            language
          ),
          historySocialComments: applyTemplateBilingualIfFieldEmpty(
            er.historySocialComments,
            tpl.historySocialComments,
            language
          ),
        };
        return {
          ...f,
          chiefComplaint: pickChiefComplaintLocale(tpl.chiefComplaint, language),
          erV1: nextEr,
        };
      });
    },
    [language, t]
  );

  const patchErV1 = useCallback((patch: Partial<ErTriageV1Form>) => {
    setFormData((f) => ({ ...f, erV1: { ...f.erV1, ...patch } }));
  }, []);

  const loadTriage = useCallback(async () => {
    setLoading(true);
    setSaveInfo(null);
    setTemplateAppliedHint(null);
    try {
      const data = await apiFetch(`/encounters/${encounter.id}/triage`, { facilityId });
      setTriage(data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const d = data as Record<string, unknown>;
        const parsed = triagePreviewSliceFromTriageGet(d, language);
        const s = parsed?.slice;
        const v = (d.vitalsJson || {}) as Record<string, number | string | null>;
        setFormData({
          chiefComplaint: (d.chiefComplaint as string) || "",
          onsetAt: d.onsetAt ? new Date(d.onsetAt as string).toISOString().slice(0, 16) : "",
          esi: d.esi != null ? String(d.esi) : "",
          tempC: s?.tempC ?? v.tempC?.toString() ?? "",
          hr: v.hr?.toString() ?? "",
          rr: v.rr?.toString() ?? "",
          bpSys: v.bpSys?.toString() ?? "",
          bpDia: v.bpDia?.toString() ?? "",
          spo2: v.spo2?.toString() ?? "",
          weightKg: s?.weightKg ?? v.weightKg?.toString() ?? "",
          heightCm: s?.heightCm ?? v.heightCm?.toString() ?? "",
          tempInputUnit: s?.tempInputUnit ?? "C",
          weightInputUnit: s?.weightInputUnit ?? "kg",
          heightInputMode: s?.heightInputMode ?? "cm",
          heightFeet: s?.heightFeet ?? "",
          heightInches: s?.heightInches ?? "",
          allergyNote: (v as { allergyNote?: string | null }).allergyNote ?? "",
          strokeScreen: strokeScreenFromUnknown(d.strokeScreen),
          sepsisScreen: sepsisScreenFromUnknown(d.sepsisScreen),
          triageCompleteAt: d.triageCompleteAt
            ? new Date(d.triageCompleteAt as string).toISOString().slice(0, 16)
            : "",
          erV1: erTriageV1FormFromVitalsJson(d.vitalsJson),
        });
      } else {
        setFormData(emptyForm());
      }
    } catch (e) {
      console.error(e);
      setTriage(null);
      setFormData(emptyForm());
      setSaveInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null) || t("erTriage.panel.loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [encounter.id, facilityId, language, t]);

  useEffect(() => {
    void loadTriage();
  }, [loadTriage]);

  const handleSave = async () => {
    if (formDisabled) return;
    setSaving(true);
    setSaveInfo(null);
    setTemplateAppliedHint(null);

    const strokeJson = strokeScreenFormToJson(formData.strokeScreen, triage?.strokeScreen);
    const sepsisJson = sepsisScreenFormToJson(formData.sepsisScreen, triage?.sepsisScreen);
    const strokeScreenParsed = Object.keys(strokeJson).length > 0 ? strokeJson : null;
    const sepsisScreenParsed = Object.keys(sepsisJson).length > 0 ? sepsisJson : null;

    try {
      const vitalsMerged = mergeVitalsJsonForSave(triage?.vitalsJson, formData);

      const payload: Record<string, unknown> = {
        chiefComplaint: formData.chiefComplaint.trim() || null,
        onsetAt: formData.onsetAt ? new Date(formData.onsetAt).toISOString() : null,
        esi: formData.esi ? parseInt(formData.esi, 10) : null,
        vitalsJson: vitalsMerged,
        strokeScreen: strokeScreenParsed,
        sepsisScreen: sepsisScreenParsed,
        triageCompleteAt: formData.triageCompleteAt ? new Date(formData.triageCompleteAt).toISOString() : null,
      };

      const res = await apiFetch(`/encounters/${encounter.id}/triage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      });

      const patientIdForEvent = encounter.patient?.id as string | undefined;
      let supersededSnapshot: PatientTriageVitalsSnapshot | null = null;
      if (
        patientIdForEvent &&
        triage &&
        hasVitalsJson(triage.vitalsJson) &&
        triage.id
      ) {
        const u = triage.updatedAt;
        supersededSnapshot = {
          encounterId: encounter.id,
          encounterType: encounter.type ?? "—",
          triageId: triage.id as string,
          updatedAt: typeof u === "string" ? u : new Date(u as string).toISOString(),
          triageCompleteAt: triage.triageCompleteAt
            ? new Date(triage.triageCompleteAt as string).toISOString()
            : null,
          vitalsJson: { ...(triage.vitalsJson as object) } as Record<string, unknown>,
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
      await onSaved();
      const baseMsg =
        res && typeof res === "object" && (res as { queued?: boolean }).queued === true
          ? t("erTriage.panel.saveQueued")
          : t("erTriage.panel.saveOk");
      setSaveInfo(baseMsg);
    } catch (e) {
      console.error(e);
      setSaveInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null) || t("erTriage.panel.saveError")
      );
    } finally {
      setSaving(false);
    }
  };

  const updatedLine =
    triage?.updatedByDisplayFr && triage?.updatedAt
      ? t("erTriage.panel.updatedLine")
          .replace("{user}", String(triage.updatedByDisplayFr).trim())
          .replace(
            "{datetime}",
            new Date(triage.updatedAt as string).toLocaleString(language === "en" ? "en-US" : "fr-FR")
          )
      : null;

  const previewModel = useMemo(() => {
    const slice: TriageDocPreviewFormSlice = {
      chiefComplaint: formData.chiefComplaint,
      onsetAt: formData.onsetAt,
      esi: formData.esi,
      tempC: formData.tempC,
      hr: formData.hr,
      rr: formData.rr,
      bpSys: formData.bpSys,
      bpDia: formData.bpDia,
      spo2: formData.spo2,
      weightKg: formData.weightKg,
      heightCm: formData.heightCm,
      allergyNote: formData.allergyNote,
      triageCompleteAt: formData.triageCompleteAt,
      tempInputUnit: formData.tempInputUnit,
      weightInputUnit: formData.weightInputUnit,
      heightInputMode: formData.heightInputMode,
      heightFeet: formData.heightFeet,
      heightInches: formData.heightInches,
    };
    return buildTriageDocumentationPreviewModel(slice, {
      strokeScreen: formData.strokeScreen,
      sepsisScreen: formData.sepsisScreen,
      erV1: formData.erV1,
      locale: language,
    });
  }, [formData, language]);

  const triageDraftMergeInput: VitalsJsonMergeFormInput = useMemo(
    () => ({
      tempC: formData.tempC,
      hr: formData.hr,
      rr: formData.rr,
      bpSys: formData.bpSys,
      bpDia: formData.bpDia,
      spo2: formData.spo2,
      weightKg: formData.weightKg,
      heightCm: formData.heightCm,
      allergyNote: formData.allergyNote,
      erV1: formData.erV1,
      tempInputUnit: formData.tempInputUnit,
      weightInputUnit: formData.weightInputUnit,
      heightInputMode: formData.heightInputMode,
      heightFeet: formData.heightFeet,
      heightInches: formData.heightInches,
    }),
    [formData]
  );

  const safetyPromptFlags = useMemo(
    () => ({
      chestPainEcg: chiefComplaintSuggestsChestPain(formData.chiefComplaint),
      allergyMissing: !draftTriageHasAllergyDocumentation(triage?.vitalsJson, triageDraftMergeInput),
      highAcuityArrival: erTriageV1HasHighAcuityArrivalSource(formData.erV1),
    }),
    [formData.chiefComplaint, formData.erV1, triage?.vitalsJson, triageDraftMergeInput]
  );

  const documentationReviewMissing = useMemo(() => {
    const er = formData.erV1;
    const anyGcs = Boolean(er.gcsEye.trim() || er.gcsVerbal.trim() || er.gcsMotor.trim());
    const gcsTriad = gcsEvmTriadForTriagePreview(er);
    return {
      chiefComplaint: !formData.chiefComplaint.trim(),
      triageCompleteAt: !formData.triageCompleteAt.trim(),
      allergies: !draftTriageHasAllergyDocumentation(triage?.vitalsJson, triageDraftMergeInput),
      gcsIncomplete: anyGcs && gcsTriad == null,
    };
  }, [formData.chiefComplaint, formData.triageCompleteAt, formData.erV1, triage?.vitalsJson, triageDraftMergeInput]);

  const documentationReviewMissingAny =
    documentationReviewMissing.chiefComplaint ||
    documentationReviewMissing.triageCompleteAt ||
    documentationReviewMissing.allergies ||
    documentationReviewMissing.gcsIncomplete;

  const showSafetyPrompts =
    safetyPromptFlags.chestPainEcg ||
    safetyPromptFlags.allergyMissing ||
    safetyPromptFlags.highAcuityArrival;

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

  return (
    <MedoraCard leftAccentColor="#b91c1c" variant="default">
      <MedoraCardInner>
        <MedoraCardTitle
          title={t("erTriage.panel.title")}
          subline={
            <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
              {t("erTriage.panel.sublineSameAsEncounter")}
            </p>
          }
        />

        {loading ? (
          <p style={{ margin: "12px 0 0 0", fontSize: 14, color: "#64748b" }}>{t("common.loading")}</p>
        ) : (
          <>
            {saveInfo ? (
              <p
                style={{
                  margin: "10px 0 0 0",
                  fontSize: 13,
                  color:
                    saveInfo === t("erTriage.panel.saveError") || saveInfo === t("erTriage.panel.loadError")
                      ? "#b91c1c"
                      : "#15803d",
                  lineHeight: 1.45,
                }}
              >
                {saveInfo}
              </p>
            ) : null}

            {showSafetyPrompts ? (
              <aside
                aria-label={t("erTriage.panel.safetyPromptsTitle")}
                style={{
                  marginTop: saveInfo ? 10 : 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #fde68a",
                  backgroundColor: "#fffbeb",
                }}
              >
                <p style={{ ...sectionHeading, color: "#92400e", letterSpacing: "0.04em" }}>
                  {t("erTriage.panel.safetyPromptsTitle")}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#a16207", lineHeight: 1.4 }}>
                  {t("erTriage.panel.safetyPromptsDisclaimer")}
                </p>
                <ul
                  style={{
                    margin: "10px 0 0",
                    paddingLeft: 18,
                    fontSize: 13,
                    color: "#78350f",
                    lineHeight: 1.5,
                  }}
                >
                  {safetyPromptFlags.chestPainEcg ? (
                    <li style={{ marginBottom: 8 }}>
                      <span>{t("erTriage.panel.safetyChestPainEcg")}</span>
                      {onRequestDocumentEcg ? (
                        <button
                          type="button"
                          onClick={onRequestDocumentEcg}
                          disabled={formDisabled}
                          style={{
                            display: "inline-block",
                            marginTop: 6,
                            marginLeft: 0,
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "1px solid #d97706",
                            backgroundColor: formDisabled ? "#f8fafc" : "#fff",
                            color: "#92400e",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: formDisabled ? "not-allowed" : "pointer",
                          }}
                        >
                          {t("erTriage.panel.safetyDocumentEcgButton")}
                        </button>
                      ) : null}
                    </li>
                  ) : null}
                  {safetyPromptFlags.allergyMissing ? (
                    <li style={{ marginBottom: safetyPromptFlags.highAcuityArrival ? 8 : 0 }}>
                      {t("erTriage.panel.safetyAllergiesMissing")}
                    </li>
                  ) : null}
                  {safetyPromptFlags.highAcuityArrival ? (
                    <li style={{ margin: 0 }}>{t("erTriage.panel.safetyHighAcuityArrival")}</li>
                  ) : null}
                </ul>
              </aside>
            ) : null}

            <div style={{ ...workspaceStyle, marginTop: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                <div>
                <p style={sectionHeading}>{t("erTriage.panel.sectionPlainteGravite")}</p>
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>{t("erTriage.panel.motifPrincipal")}</label>
                    <input
                      type="text"
                      value={formData.chiefComplaint}
                      onChange={(e) => setFormData((f) => ({ ...f, chiefComplaint: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      placeholder={t("erTriage.panel.placeholderMotif")}
                    />
                    {!formDisabled ? (
                      <div style={{ marginTop: 8 }}>
                        <p style={{ margin: "0 0 6px 0", fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                          {t("erTriageComplaintTemplates.helper")}
                        </p>
                        <input
                          type="search"
                          value={complaintTemplateQuery}
                          onChange={(e) => setComplaintTemplateQuery(e.target.value)}
                          placeholder={t("erTriageComplaintTemplates.searchPlaceholder")}
                          style={{
                            ...inputBase,
                            fontSize: 13,
                            padding: "8px 10px",
                            marginBottom: 8,
                            backgroundColor: "#fff",
                          }}
                          autoComplete="off"
                        />
                        {complaintTemplateMatches.length === 0 ? (
                          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
                            {t("erTriageComplaintTemplates.noResults")}
                          </p>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                              maxHeight: 132,
                              overflowY: "auto",
                            }}
                          >
                            {complaintTemplateMatches.map((tpl) => (
                              <button
                                key={tpl.id}
                                type="button"
                                onClick={() => applyChiefComplaintTemplate(tpl)}
                                style={{
                                  border: "1px solid #e2e8f0",
                                  background: "#f8fafc",
                                  borderRadius: 9999,
                                  padding: "4px 10px",
                                  fontSize: 12,
                                  color: "#334155",
                                  cursor: "pointer",
                                  lineHeight: 1.3,
                                }}
                              >
                                {pickChiefComplaintLocale(tpl.label, language)}
                              </button>
                            ))}
                          </div>
                        )}
                        {templateAppliedHint ? (
                          <p
                            role="status"
                            style={{
                              margin: "8px 0 0",
                              fontSize: 12,
                              color: "#64748b",
                              lineHeight: 1.35,
                            }}
                          >
                            {templateAppliedHint}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div style={grid2}>
                    <div>
                      <label style={labelStyle}>{t("erTriage.panel.esiLabel")}</label>
                      <select
                        value={formData.esi}
                        onChange={(e) => setFormData((f) => ({ ...f, esi: e.target.value }))}
                        disabled={formDisabled}
                        style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                      >
                        <option value="">{t("erTriage.preview.emptyOption")}</option>
                        <option value="1">{t("erTriage.panel.esi1")}</option>
                        <option value="2">{t("erTriage.panel.esi2")}</option>
                        <option value="3">{t("erTriage.panel.esi3")}</option>
                        <option value="4">{t("erTriage.panel.esi4")}</option>
                        <option value="5">{t("erTriage.panel.esi5")}</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>{t("erTriage.panel.onsetAt")}</label>
                      <input
                        type="datetime-local"
                        value={formData.onsetAt}
                        onChange={(e) => setFormData((f) => ({ ...f, onsetAt: e.target.value }))}
                        disabled={formDisabled}
                        style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{t("erTriage.panel.triageCompleteAt")}</label>
                      <input
                        type="datetime-local"
                        value={formData.triageCompleteAt}
                        onChange={(e) => setFormData((f) => ({ ...f, triageCompleteAt: e.target.value }))}
                        disabled={formDisabled}
                        style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p style={sectionHeading}>{t("erTriage.panel.sectionVitals")}</p>
                <div style={{ marginTop: 10, ...grid3 }}>
                  <div>
                    <label style={labelStyle}>{t("vitalsUnits.tempLabel")}</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <select
                        value={formData.tempInputUnit}
                        onChange={(e) => {
                          const u = e.target.value as "C" | "F";
                          setFormData((f) => ({ ...f, tempInputUnit: u }));
                        }}
                        disabled={formDisabled}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #e2e8f0",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#334155",
                          backgroundColor: formDisabled ? "#f8fafc" : "#fff",
                          cursor: formDisabled ? "not-allowed" : "pointer",
                        }}
                      >
                        <option value="F">{t("vitalsUnits.unitF")}</option>
                        <option value="C">{t("vitalsUnits.unitC")}</option>
                      </select>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.tempC}
                        onChange={(e) => setFormData((f) => ({ ...f, tempC: e.target.value }))}
                        disabled={formDisabled}
                        style={{ ...inputBase, flex: 1, minWidth: 0, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
                    {(() => {
                      if (!formData.tempC.trim()) return null;
                      const pair = temperatureHintPairCelsiusFahrenheit(formData.tempC, formData.tempInputUnit);
                      if (!pair) return null;
                      return (
                        <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "#64748b" }}>
                          {formData.tempInputUnit === "F"
                            ? t("vitalsUnits.tempHintC").replace("{n}", pair.celsius.toFixed(1))
                            : t("vitalsUnits.tempHintF").replace("{n}", pair.fahrenheit.toFixed(1))}
                        </p>
                      );
                    })()}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("erTriage.panel.hr")}</label>
                    <input
                      type="number"
                      value={formData.hr}
                      onChange={(e) => setFormData((f) => ({ ...f, hr: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("erTriage.panel.rr")}</label>
                    <input
                      type="number"
                      value={formData.rr}
                      onChange={(e) => setFormData((f) => ({ ...f, rr: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("erTriage.panel.bpSys")}</label>
                    <input
                      type="number"
                      value={formData.bpSys}
                      onChange={(e) => setFormData((f) => ({ ...f, bpSys: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("erTriage.panel.bpDia")}</label>
                    <input
                      type="number"
                      value={formData.bpDia}
                      onChange={(e) => setFormData((f) => ({ ...f, bpDia: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("erTriage.panel.spo2")}</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.spo2}
                      onChange={(e) => setFormData((f) => ({ ...f, spo2: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("vitalsUnits.weightLabel")}</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <select
                        value={formData.weightInputUnit}
                        onChange={(e) => {
                          const u = e.target.value as "kg" | "lb";
                          setFormData((f) => ({ ...f, weightInputUnit: u }));
                        }}
                        disabled={formDisabled}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #e2e8f0",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#334155",
                          backgroundColor: formDisabled ? "#f8fafc" : "#fff",
                          cursor: formDisabled ? "not-allowed" : "pointer",
                        }}
                      >
                        <option value="lb">{t("vitalsUnits.unitLb")}</option>
                        <option value="kg">{t("vitalsUnits.unitKg")}</option>
                      </select>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.weightKg}
                        onChange={(e) => setFormData((f) => ({ ...f, weightKg: e.target.value }))}
                        disabled={formDisabled}
                        style={{ ...inputBase, flex: 1, minWidth: 0, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
                    {(() => {
                      if (!formData.weightKg.trim()) return null;
                      const pair = weightHintPairKgPounds(formData.weightKg, formData.weightInputUnit);
                      if (!pair) return null;
                      return (
                        <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "#64748b" }}>
                          {formData.weightInputUnit === "lb"
                            ? t("vitalsUnits.weightHintKg").replace("{n}", pair.kg.toFixed(1))
                            : t("vitalsUnits.weightHintLb").replace("{n}", pair.pounds.toFixed(1))}
                        </p>
                      );
                    })()}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("vitalsUnits.heightLabel")}</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <select
                        value={formData.heightInputMode}
                        onChange={(e) => {
                          const m = e.target.value as "cm" | "ftin";
                          setFormData((f) => {
                            const h = flipHeightInputMode({
                              heightCmStr: f.heightCm,
                              heightFeetStr: f.heightFeet,
                              heightInchesStr: f.heightInches,
                              from: f.heightInputMode,
                              to: m,
                            });
                            return { ...f, heightInputMode: m, ...h };
                          });
                        }}
                        disabled={formDisabled}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #e2e8f0",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#334155",
                          backgroundColor: formDisabled ? "#f8fafc" : "#fff",
                          cursor: formDisabled ? "not-allowed" : "pointer",
                        }}
                      >
                        <option value="ftin">{t("vitalsUnits.unitFtIn")}</option>
                        <option value="cm">{t("vitalsUnits.unitCm")}</option>
                      </select>
                      {formData.heightInputMode === "cm" ? (
                        <input
                          type="number"
                          step="0.1"
                          value={formData.heightCm}
                          onChange={(e) => setFormData((f) => ({ ...f, heightCm: e.target.value }))}
                          disabled={formDisabled}
                          style={{ ...inputBase, flex: 1, minWidth: 0, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                        />
                      ) : (
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1, minWidth: 0 }}>
                          <input
                            type="number"
                            min={0}
                            step="1"
                            placeholder={t("vitalsUnits.feetPh")}
                            value={formData.heightFeet}
                            onChange={(e) => setFormData((f) => ({ ...f, heightFeet: e.target.value }))}
                            disabled={formDisabled}
                            style={{ ...inputBase, width: 72, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                          />
                          <span style={{ fontSize: 12, color: "#64748b" }}>′</span>
                          <input
                            type="number"
                            min={0}
                            max={11.9}
                            step="0.1"
                            placeholder={t("vitalsUnits.inchesPh")}
                            value={formData.heightInches}
                            onChange={(e) => setFormData((f) => ({ ...f, heightInches: e.target.value }))}
                            disabled={formDisabled}
                            style={{ ...inputBase, width: 72, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                          />
                          <span style={{ fontSize: 12, color: "#64748b" }}>″</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p style={sectionHeading}>{t("erTriage.panel.sectionV1")}</p>
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  {t("erTriage.panel.v1StorageHint")}
                </p>
                <div style={{ marginTop: 12 }}>
                  <EmergencyTriageV1Sections
                    er={formData.erV1}
                    patchErV1={patchErV1}
                    formDisabled={formDisabled}
                    inputBase={inputBase}
                    labelStyle={labelStyle}
                    grid2={grid2}
                    grid3={grid3}
                    sectionHeading={sectionHeading}
                    patientChartHref={patientChartHref}
                    facilityId={facilityId}
                  />
                </div>
              </div>

              <details style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", backgroundColor: "#fff" }}>
                <summary style={{ cursor: formDisabled ? "default" : "pointer", fontWeight: 600, fontSize: 13, color: "#334155" }}>
                  {t("erTriage.panel.sectionScreenings")}
                </summary>
                <p style={{ margin: "10px 0 8px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  {t("erTriage.panel.screeningsHint")}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <p style={{ ...sectionHeading, marginBottom: 8 }}>{t("erTriage.panel.strokeTitle")}</p>
                    <div style={{ ...grid2 }}>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.strokeFace")}</label>
                        <select
                          value={formData.strokeScreen.faceDroop}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: { ...f.strokeScreen, faceDroop: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.strokeArm")}</label>
                        <select
                          value={formData.strokeScreen.armWeakness}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: { ...f.strokeScreen, armWeakness: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.strokeSpeech")}</label>
                        <select
                          value={formData.strokeScreen.speechDifficulty}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: { ...f.strokeScreen, speechDifficulty: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.strokeLkw")}</label>
                        <input
                          type="datetime-local"
                          value={formData.strokeScreen.lastKnownWell}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: { ...f.strokeScreen, lastKnownWell: e.target.value },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.strokeAlert")}</label>
                        <select
                          value={formData.strokeScreen.strokeAlertActivated}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: {
                                ...f.strokeScreen,
                                strokeAlertActivated: e.target.value as "" | "yes" | "no",
                              },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <label style={labelStyle}>{t("erTriage.panel.strokeComments")}</label>
                      <textarea
                        value={formData.strokeScreen.comments}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            strokeScreen: { ...f.strokeScreen, comments: e.target.value },
                          }))
                        }
                        disabled={formDisabled}
                        rows={2}
                        style={{ ...inputBase, resize: "vertical", minHeight: 56, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
                  </div>

                  <div>
                    <p style={{ ...sectionHeading, marginBottom: 8 }}>{t("erTriage.panel.sepsisTitle")}</p>
                    <div style={{ ...grid2 }}>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.sepsisSuspected")}</label>
                        <select
                          value={formData.sepsisScreen.suspectedInfection}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, suspectedInfection: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.sepsisRr")}</label>
                        <select
                          value={formData.sepsisScreen.rrGte22}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, rrGte22: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.sepsisSbp")}</label>
                        <select
                          value={formData.sepsisScreen.sbpLte100}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, sbpLte100: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.sepsisAms")}</label>
                        <select
                          value={formData.sepsisScreen.alteredMentalStatus}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, alteredMentalStatus: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.sepsisLactate")}</label>
                        <select
                          value={formData.sepsisScreen.lactateOrdered}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, lactateOrdered: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.sepsisAlert")}</label>
                        <select
                          value={formData.sepsisScreen.sepsisAlertActivated}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: {
                                ...f.sepsisScreen,
                                sepsisAlertActivated: e.target.value as "" | "yes" | "no",
                              },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <label style={labelStyle}>{t("erTriage.panel.sepsisComments")}</label>
                      <textarea
                        value={formData.sepsisScreen.comments}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            sepsisScreen: { ...f.sepsisScreen, comments: e.target.value },
                          }))
                        }
                        disabled={formDisabled}
                        rows={2}
                        style={{ ...inputBase, resize: "vertical", minHeight: 56, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
                  </div>
                </div>
              </details>
              </div>

              <div style={resumeColumnStyle}>
                <p style={sectionHeading}>{t("erTriage.panel.sectionResume")}</p>
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  {t("erTriage.panel.resumeHint")}
                </p>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }} aria-live="polite">
                  {previewModel.sections.map((sec) => (
                    <MedoraCard
                      key={sec.id}
                      leftAccentColor={PREVIEW_SECTION_ACCENTS[sec.id] ?? "#94a3b8"}
                      variant="default"
                    >
                      <MedoraCardInner>
                        <MedoraCardIdentity initials={sec.title.charAt(0)}>
                          <MedoraCardTitle title={sec.title} />
                        </MedoraCardIdentity>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                          {sec.lines.map((line, i) => (
                            <p
                              key={`${sec.id}-${i}`}
                              style={{
                                margin: 0,
                                fontSize: 13,
                                color: "#334155",
                                lineHeight: 1.6,
                                wordBreak: "break-word",
                              }}
                            >
                              {line}
                            </p>
                          ))}
                        </div>
                      </MedoraCardInner>
                    </MedoraCard>
                  ))}
                  {previewModel.narrative.trim() ? (
                    <MedoraCard leftAccentColor="#0f172a" variant="default">
                      <MedoraCardInner>
                        <MedoraCardIdentity initials="R">
                          <MedoraCardTitle
                            title={t("erTriage.panel.synthTitle")}
                            subline={
                              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                                {t("erTriage.panel.synthSubline")}
                              </p>
                            }
                          />
                        </MedoraCardIdentity>
                        <p style={{ margin: "10px 0 0 0", fontSize: 14, color: "#0f172a", lineHeight: 1.55 }}>
                          {previewModel.narrative}
                        </p>
                      </MedoraCardInner>
                    </MedoraCard>
                  ) : null}

                  <MedoraCard leftAccentColor="#475569" variant="default">
                    <MedoraCardInner>
                      <MedoraCardIdentity initials="S">
                        <MedoraCardTitle
                          title={t("erTriage.panel.signatureTitle")}
                          subline={
                            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                              {t("erTriage.panel.signatureSubline")}
                            </p>
                          }
                        />
                      </MedoraCardIdentity>
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                        <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
                          {updatedLine ?? t("erTriage.panel.noServerUpdate")}
                        </p>
                        {formData.triageCompleteAt ? (
                          <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                            {t("erTriage.panel.triageCompleteEntered").replace(
                              "{datetime}",
                              new Date(formData.triageCompleteAt).toLocaleString(
                                language === "en" ? "en-US" : "fr-FR",
                                {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                }
                              )
                            )}
                          </p>
                        ) : null}
                      </div>
                    </MedoraCardInner>
                  </MedoraCard>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, rowGap: 8 }}>
                <p style={{ ...sectionHeading, margin: 0 }}>{t("erTriage.panel.docPreviewTitle")}</p>
                <button
                  type="button"
                  onClick={() => setDocPreviewOpen((o) => !o)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#fff",
                    color: "#334155",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    lineHeight: 1.3,
                  }}
                >
                  {docPreviewOpen ? t("erTriage.panel.docPreviewHideButton") : t("erTriage.panel.docPreviewReviewButton")}
                </button>
              </div>
              {docPreviewOpen ? (
                <div style={{ marginTop: 12 }}>
                  {documentationReviewMissingAny ? (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600, lineHeight: 1.4 }}>
                        {t("erTriage.panel.docPreviewMissingDisclaimer")}
                      </p>
                      <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                        {documentationReviewMissing.chiefComplaint ? (
                          <li>{t("erTriage.panel.docPreviewMissingChief")}</li>
                        ) : null}
                        {documentationReviewMissing.triageCompleteAt ? (
                          <li>{t("erTriage.panel.docPreviewMissingCompleteAt")}</li>
                        ) : null}
                        {documentationReviewMissing.allergies ? (
                          <li>{t("erTriage.panel.docPreviewMissingAllergies")}</li>
                        ) : null}
                        {documentationReviewMissing.gcsIncomplete ? (
                          <li>{t("erTriage.panel.docPreviewMissingGcs")}</li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}
                  <div
                    style={{
                      maxHeight: 320,
                      overflowY: "auto",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: "10px 12px",
                      backgroundColor: "#fff",
                    }}
                    aria-live="polite"
                  >
                    {previewModel.sections.map((sec) => (
                      <div
                        key={sec.id}
                        style={{
                          marginBottom: 12,
                          paddingLeft: 8,
                          borderLeft: `3px solid ${PREVIEW_SECTION_ACCENTS[sec.id] ?? "#94a3b8"}`,
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.04em" }}>
                          {sec.title}
                        </p>
                        {sec.lines.map((line, i) => (
                          <p
                            key={`${sec.id}-l-${i}`}
                            style={{ margin: "6px 0 0", fontSize: 12, color: "#334155", lineHeight: 1.55, wordBreak: "break-word" }}
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    ))}
                    {previewModel.narrative.trim() ? (
                      <p
                        style={{
                          margin: previewModel.sections.length ? "12px 0 0" : 0,
                          paddingTop: previewModel.sections.length ? 10 : 0,
                          borderTop: previewModel.sections.length ? "1px solid #f1f5f9" : undefined,
                          fontSize: 12,
                          color: "#0f172a",
                          lineHeight: 1.55,
                          fontStyle: "italic",
                          wordBreak: "break-word",
                        }}
                      >
                        {previewModel.narrative}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <MedoraCardActions railBorderTopColor="#e2e8f0" gap={10} minWidth={0} alignItems="flex-start">
              {!formDisabled ? (
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "none",
                    backgroundColor: "#0f172a",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: saving ? "wait" : "pointer",
                    opacity: saving ? 0.85 : 1,
                  }}
                >
                  {saving ? t("erTriage.panel.saveSaving") : t("erTriage.panel.saveButton")}
                </button>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "#92400e", lineHeight: 1.45 }}>
                  {isReadOnly ? t("erTriage.panel.readonlyEncounter") : t("erTriage.panel.readonlyLocked")}
                </p>
              )}
              <Link href={encounterTriageTabHref} style={{ ...linkPillStyle, alignSelf: "center" }}>
                {t("erTriage.panel.linkFullTriageTab")}
              </Link>
            </MedoraCardActions>
          </>
        )}
      </MedoraCardInner>
    </MedoraCard>
  );
}

const linkPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  backgroundColor: "#f8fafc",
  color: "#334155",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
};
