"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
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
  buildErNursingReassessmentPreviewModel,
  ER_NURSING_REASSESSMENT_V1_KEY,
  erNursingReassessmentFormFromEncounter,
  mergeErNursingReassessmentIntoNursingAssessment,
  vitalsLineFromTriageVitalsJson,
  type ErAbcOption,
  type ErNursingReassessmentForm,
  type ErTrend,
} from "./emergencyNursingReassessmentV1";
import {
  buildErTraumaSurveyV1PreviewModel,
  erTraumaSurveyV1FormFromEncounter,
  mergeErTraumaSurveyV1IntoNursingAssessment,
  type ErAbcdeOption,
  type ErTraumaSurveyV1,
} from "./erTraumaSurveyV1";

type EncounterLite = {
  id: string;
  status?: string | null;
  nursingAssessment?: unknown;
  updatedAt?: string | null;
};

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

  const abcSelect = (value: ErAbcOption, onChange: (v: ErAbcOption) => void, disabled: boolean): React.ReactNode => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ErAbcOption)}
      disabled={disabled}
      style={{ ...inputBase, cursor: disabled ? "not-allowed" : "pointer", backgroundColor: disabled ? "#f8fafc" : "#fff" }}
    >
      <option value="">—</option>
      <option value="wnl">{t("emergencyNursingReassessment.abcOptionWnl")}</option>
      <option value="yes">{t("emergencyNursingReassessment.abcOptionYes")}</option>
      <option value="no">{t("emergencyNursingReassessment.abcOptionNo")}</option>
      <option value="unknown">{t("emergencyNursingReassessment.abcOptionUnknown")}</option>
    </select>
  );

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
  const [form, setForm] = useState<ErNursingReassessmentForm>(() =>
    erNursingReassessmentFormFromEncounter(encounter.nursingAssessment)
  );
  const [traumaForm, setTraumaForm] = useState<ErTraumaSurveyV1>(() =>
    erTraumaSurveyV1FormFromEncounter(encounter.nursingAssessment)
  );
  const [loadingTriage, setLoadingTriage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);

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

  useEffect(() => {
    void loadTriage();
  }, [loadTriage]);

  useEffect(() => {
    setForm(erNursingReassessmentFormFromEncounter(encounter.nursingAssessment));
    setTraumaForm(erTraumaSurveyV1FormFromEncounter(encounter.nursingAssessment));
  }, [encounter.nursingAssessment, encounter.updatedAt]);

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

  const patchForm = useCallback((patch: Partial<ErNursingReassessmentForm>) => {
    setForm((f) => ({ ...f, ...patch }));
  }, []);

  const patchTraumaForm = useCallback((patch: Partial<ErTraumaSurveyV1>) => {
    setTraumaForm((f) => ({ ...f, ...patch }));
  }, []);

  const handleSave = async () => {
    if (formDisabled) return;
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
      const res = await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingAssessment: finalNav }),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      await onSaved();
      setSaveInfo(queued ? t("emergencyNursingReassessment.saveQueued") : t("emergencyNursingReassessment.saveOk"));
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
                <div>
                  <p style={sectionHeading}>{t("emergencyNursingReassessment.sectionReassess")}</p>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>{t("emergencyNursingReassessment.labelReassessmentTime")}</label>
                      <input
                        type="datetime-local"
                        value={form.reassessmentAt}
                        onChange={(e) => patchForm({ reassessmentAt: e.target.value })}
                        disabled={formDisabled}
                        style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
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
                    </div>
                    <div style={grid2}>
                      <div>
                        <label style={labelStyle}>{t("emergencyNursingReassessment.labelPain")}</label>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={form.pain0to10}
                          onChange={(e) => patchForm({ pain0to10: e.target.value })}
                          disabled={formDisabled}
                          style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
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
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p style={sectionHeading}>{t("emergencyNursingReassessment.sectionAbc")}</p>
                  <div style={{ marginTop: 10, ...grid3 }}>
                    <div>
                      <label style={labelStyle}>{t("emergencyNursingReassessment.labelAirway")}</label>
                      {abcSelect(form.airway, (v) => patchForm({ airway: v }), formDisabled)}
                    </div>
                    <div>
                      <label style={labelStyle}>{t("emergencyNursingReassessment.labelBreathing")}</label>
                      {abcSelect(form.breathing, (v) => patchForm({ breathing: v }), formDisabled)}
                    </div>
                    <div>
                      <label style={labelStyle}>{t("emergencyNursingReassessment.labelCirculation")}</label>
                      {abcSelect(form.circulation, (v) => patchForm({ circulation: v }), formDisabled)}
                    </div>
                  </div>
                </div>

                <div>
                  <p style={sectionHeading}>{t("emergencyNursingReassessment.sectionVitalsRecheck")}</p>
                  <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                    {t("emergencyNursingReassessment.vitalsRecheckHelp")}
                  </p>
                  <div style={{ marginTop: 10 }}>
                    <label style={labelStyle}>{t("emergencyNursingReassessment.labelVitalsSummary")}</label>
                    <textarea
                      value={form.vitalsSummaryNote}
                      onChange={(e) => patchForm({ vitalsSummaryNote: e.target.value })}
                      disabled={formDisabled}
                      rows={3}
                      style={{ ...inputBase, resize: "vertical", minHeight: 72, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      placeholder={t("emergencyNursingReassessment.placeholderVitalsSummary")}
                    />
                  </div>
                </div>

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
                    </div>
                    <div>
                      <label style={labelStyle}>{t("emergencyNursingReassessment.labelPatientTrend")}</label>
                      <select
                        value={form.trend}
                        onChange={(e) => patchForm({ trend: e.target.value as ErTrend })}
                        disabled={formDisabled}
                        style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      >
                        <option value="">—</option>
                        <option value="improved">{t("emergencyNursingReassessment.trendImproved")}</option>
                        <option value="unchanged">{t("emergencyNursingReassessment.trendUnchanged")}</option>
                        <option value="worse">{t("emergencyNursingReassessment.trendWorse")}</option>
                      </select>
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

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={formDisabled || saving}
                    style={{
                      padding: "10px 18px",
                      borderRadius: 10,
                      border: "1px solid #0ea5e9",
                      backgroundColor: formDisabled ? "#f1f5f9" : "#0ea5e9",
                      color: formDisabled ? "#94a3b8" : "#fff",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: formDisabled || saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? t("emergencyNursingReassessment.saveButtonSaving") : t("emergencyNursingReassessment.saveButton")}
                  </button>
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
