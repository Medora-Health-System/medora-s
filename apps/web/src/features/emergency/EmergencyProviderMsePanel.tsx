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
  MedoraCardTitle,
} from "@/components/medora-card";
import {
  buildErProviderMsePreviewModel,
  ER_PROVIDER_MSE_V1_KEY,
  erProviderMseFormFromEncounter,
  mergeErProviderMseIntoNursingAssessment,
  type ErProviderMseForm,
} from "./emergencyProviderMseV1";
import { ClinicalUserRoleAutocomplete } from "@/components/clinical/ClinicalUserRoleAutocomplete";
import type { ClinicalUserRoleOption } from "@/components/clinical/ClinicalUserRoleAutocomplete";
import {
  buildErMseSmartAssistSuggestions,
  type ErMseSmartAssistContext,
} from "./erMseSmartAssist";
import {
  ER_PHYSICAL_EXAM_TEMPLATE_KEYS,
  ER_PHYSICAL_EXAM_TEMPLATE_ORDER,
  getErPhysicalExamTemplatePreset,
  type ErPhysicalExamTemplateId,
} from "./erPhysicalExamTemplatePresets";

type EncounterLite = {
  id: string;
  status?: string | null;
  nursingAssessment?: unknown;
  updatedAt?: string | null;
};

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  color: "#0f172a",
  backgroundColor: "#fff",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontWeight: 600,
  fontSize: 12,
  color: "#475569",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
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
  presentation: "#4f46e5",
  review: "#b45309",
  exam: "#059669",
  mdm: "#7c3aed",
  empty: "#cbd5e1",
};

const EXAM_PRESET_I18N_KEY: Record<ErPhysicalExamTemplateId, string> = {
  normal: "erMseExamTemplates.presetNormal",
  chest_pain: "erMseExamTemplates.presetChestPain",
  stroke: "erMseExamTemplates.presetStroke",
  trauma: "erMseExamTemplates.presetTrauma",
  respiratory: "erMseExamTemplates.presetRespiratory",
  abdominal: "erMseExamTemplates.presetAbdominal",
};

function datetimeLocalToIsoOrNull(local: string): string | null {
  if (!local.trim()) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return "__invalid__";
  return d.toISOString();
}

export function EmergencyProviderMsePanel({
  encounterId,
  facilityId,
  encounter,
  isLocked,
  onSaved,
  clinicTabHref: _clinicTabHref,
  erChartHref,
  genericEncounterHref: _genericEncounterHref,
  mseAssistContext,
}: {
  encounterId: string;
  facilityId: string;
  encounter: EncounterLite;
  isLocked: boolean;
  onSaved: () => void | Promise<void>;
  /** Onglet évaluation clinique du dossier (référence complète). */
  clinicTabHref: string;
  /** Charte urgences complète (parcours principal). */
  erChartHref: string;
  /** Dossier consultation Medora générique (référence secondaire). */
  genericEncounterHref: string;
  /** Données déjà chargées dans le flux urgences (aucun GET supplémentaire). */
  mseAssistContext?: ErMseSmartAssistContext | null;
}) {
  const { t, language } = useI18n();
  const [form, setForm] = useState<ErProviderMseForm>(() => erProviderMseFormFromEncounter(encounter.nursingAssessment));
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [handoffToId, setHandoffToId] = useState<string | null>(null);
  const [handoffToDisplay, setHandoffToDisplay] = useState("");
  const [handoffReportAtLocal, setHandoffReportAtLocal] = useState("");
  const [handoffNotes, setHandoffNotes] = useState("");
  const [handoffSaving, setHandoffSaving] = useState(false);
  const [handoffFeedback, setHandoffFeedback] = useState<{ variant: "success" | "error"; message: string } | null>(null);

  const isReadOnly = encounter.status !== "OPEN";
  const formDisabled = isReadOnly || isLocked;

  useEffect(() => {
    setForm(erProviderMseFormFromEncounter(encounter.nursingAssessment));
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
        gap: 16,
        alignItems: "start",
        width: "100%",
      }
    : {
        display: "flex",
        flexDirection: "column",
        gap: 16,
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

  const storedSig = useMemo(() => {
    const nav = encounter.nursingAssessment;
    if (!nav || typeof nav !== "object" || Array.isArray(nav)) return null;
    const raw = (nav as Record<string, unknown>)[ER_PROVIDER_MSE_V1_KEY];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const s = (raw as Record<string, unknown>).signature;
    if (!s || typeof s !== "object") return null;
    const at = (s as { savedAt?: unknown }).savedAt;
    const by = (s as { savedByDisplayName?: unknown }).savedByDisplayName;
    if (typeof at !== "string" || typeof by !== "string") return null;
    return { savedAt: at, savedByDisplayName: by };
  }, [encounter.nursingAssessment]);

  const previewModel = useMemo(() => buildErProviderMsePreviewModel(form, language), [form, language]);

  const patchForm = useCallback((patch: Partial<ErProviderMseForm>) => {
    setForm((f) => ({ ...f, ...patch }));
  }, []);

  const assistApplicable = useMemo(() => {
    if (!mseAssistContext || formDisabled) return false;
    const sug = buildErMseSmartAssistSuggestions(mseAssistContext, language);
    for (const k of Object.keys(sug) as (keyof ErProviderMseForm)[]) {
      const val = sug[k];
      if (typeof val !== "string" || !val.trim()) continue;
      const cur = form[k];
      if (typeof cur === "string" && cur.trim() !== "") continue;
      return true;
    }
    return false;
  }, [mseAssistContext, formDisabled, form, language]);

  const applyPrefillFromTriage = useCallback(() => {
    if (formDisabled || !mseAssistContext) return;
    const sug = buildErMseSmartAssistSuggestions(mseAssistContext, language);
    setForm((f) => {
      const next = { ...f };
      for (const k of Object.keys(sug) as (keyof ErProviderMseForm)[]) {
        const val = sug[k];
        if (typeof val !== "string" || !val.trim()) continue;
        const cur = f[k];
        if (typeof cur === "string" && cur.trim() !== "") continue;
        next[k] = val;
      }
      return next;
    });
  }, [formDisabled, mseAssistContext, language]);

  const applyPhysicalExamPreset = useCallback(
    (id: ErPhysicalExamTemplateId) => {
      if (formDisabled) return;
      const preset = getErPhysicalExamTemplatePreset(id, language);
      setForm((f) => {
        const next = { ...f };
        for (const k of ER_PHYSICAL_EXAM_TEMPLATE_KEYS) {
          const val = preset[k];
          if (typeof val !== "string" || !val.trim()) continue;
          const cur = f[k];
          if (typeof cur === "string" && cur.trim() !== "") continue;
          next[k] = val;
        }
        return next;
      });
    },
    [formDisabled, language]
  );

  const handleSave = async () => {
    if (formDisabled) return;
    setSaving(true);
    setSaveFeedback(null);
    try {
      let savedByDisplayName = t("erMseProviderPanel.defaultSignerFallback");
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
      const mergedNav = mergeErProviderMseIntoNursingAssessment(encounter.nursingAssessment, form, signature);
      const res = await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingAssessment: mergedNav }),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      await onSaved();
      setSaveFeedback({
        variant: "success",
        message: queued ? t("erMseProviderPanel.saveQueued") : t("erMseProviderPanel.saveSuccess"),
      });
    } catch (e) {
      console.error(e);
      setSaveFeedback({
        variant: "error",
        message:
          normalizeUserFacingError(e instanceof Error ? e.message : null) ||
          t("erMseProviderPanel.saveErrorFallback"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRecordProviderHandoff = useCallback(async () => {
    if (formDisabled) return;
    if (!handoffToId) {
      setHandoffFeedback({ variant: "error", message: t("erMseProviderPanel.handoffRecipientRequired") });
      return;
    }
    const reportIso = datetimeLocalToIsoOrNull(handoffReportAtLocal);
    if (reportIso === "__invalid__") {
      setHandoffFeedback({ variant: "error", message: t("erMseProviderPanel.handoffInvalidDate") });
      return;
    }
    setHandoffSaving(true);
    setHandoffFeedback(null);
    try {
      await apiFetch(`/encounters/${encounterId}/provider-handoff`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: handoffToId,
          reportGivenAt: reportIso,
          notes: handoffNotes.trim() ? handoffNotes.trim() : null,
        }),
      });
      setHandoffFeedback({ variant: "success", message: t("erMseProviderPanel.handoffSuccess") });
      setHandoffNotes("");
      setHandoffReportAtLocal("");
      setHandoffToDisplay("");
      setHandoffToId(null);
      await onSaved();
    } catch (e) {
      console.error(e);
      setHandoffFeedback({
        variant: "error",
        message:
          normalizeUserFacingError(e instanceof Error ? e.message : null) || t("erMseProviderPanel.handoffError"),
      });
    } finally {
      setHandoffSaving(false);
    }
  }, [
    encounterId,
    facilityId,
    formDisabled,
    handoffNotes,
    handoffReportAtLocal,
    handoffToId,
    onSaved,
    t,
  ]);

  const ta = (rows: number, key: keyof ErProviderMseForm, placeholder?: string) => (
    <textarea
      value={form[key] as string}
      onChange={(e) => patchForm({ [key]: e.target.value } as Partial<ErProviderMseForm>)}
      disabled={formDisabled}
      rows={rows}
      placeholder={placeholder}
      style={{
        ...inputBase,
        resize: "vertical",
        minHeight: rows * 22,
        backgroundColor: formDisabled ? "#f8fafc" : "#fff",
      }}
    />
  );

  return (
    <MedoraCard leftAccentColor="#4f46e5" variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials="M">
          <MedoraCardTitle
            title={t("erMseProviderPanel.title")}
            subline={
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                {t("erMseProviderPanel.subline")}
              </p>
            }
          />
        </MedoraCardIdentity>

        <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0} alignItems="flex-start">
          <Link
            href={erChartHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #bfdbfe",
              backgroundColor: "#eff6ff",
              color: "#1d4ed8",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {t("erMseProviderPanel.linkFullEncounter")}
          </Link>
        </MedoraCardActions>

        {mseAssistContext ? (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => applyPrefillFromTriage()}
              disabled={formDisabled || !assistApplicable}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid #c7d2fe",
                backgroundColor: formDisabled || !assistApplicable ? "#f1f5f9" : "#eef2ff",
                color: formDisabled || !assistApplicable ? "#94a3b8" : "#4338ca",
                fontSize: 13,
                fontWeight: 600,
                cursor: formDisabled || !assistApplicable ? "not-allowed" : "pointer",
              }}
            >
              {t("erMseAssist.prefillFromTriage")}
            </button>
            <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45, maxWidth: 480 }}>
              {t("erMseAssist.helperNote")}
            </span>
          </div>
        ) : null}

        {saveFeedback ? (
          <p
            style={{
              margin: "10px 0 0 0",
              fontSize: 13,
              color: saveFeedback.variant === "error" ? "#b91c1c" : "#15803d",
              lineHeight: 1.45,
            }}
          >
            {saveFeedback.message}
          </p>
        ) : null}

        <div style={{ ...workspaceStyle, marginTop: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            <div>
              <p style={sectionHeading}>{t("erMseProviderPanel.sectionPresentation")}</p>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelChiefConcern")}</label>
                  <textarea
                    value={form.chiefConcern}
                    onChange={(e) => patchForm({ chiefConcern: e.target.value })}
                    disabled={formDisabled}
                    rows={2}
                    style={{ ...inputBase, resize: "vertical", minHeight: 48, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelHpi")}</label>
                  {ta(3, "hpiNarrative")}
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>{t("erMseProviderPanel.labelOnsetTiming")}</label>
                    {ta(2, "onsetTimingContext")}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("erMseProviderPanel.labelAssociatedSymptoms")}</label>
                    {ta(2, "associatedSymptoms")}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelSeverityKeyConcern")}</label>
                  <input
                    type="text"
                    value={form.severityKeyConcern}
                    onChange={(e) => patchForm({ severityKeyConcern: e.target.value })}
                    disabled={formDisabled}
                    style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                  />
                </div>
              </div>
            </div>

            <div>
              <p style={sectionHeading}>{t("erMseProviderPanel.sectionReview")}</p>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelFocusedImpression")}</label>
                  {ta(2, "focusedImpression")}
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>{t("erMseProviderPanel.labelImportantPositives")}</label>
                    {ta(2, "importantPositives")}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("erMseProviderPanel.labelImportantNegatives")}</label>
                    {ta(2, "importantNegatives")}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelRedFlags")}</label>
                  {ta(2, "redFlagsText")}
                </div>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelDifferential")}</label>
                  {ta(3, "differentialAssessmentText", t("erMseProviderPanel.placeholderDifferential"))}
                </div>
              </div>
            </div>

            <div>
              <p style={sectionHeading}>{t("erMseProviderPanel.sectionExam")}</p>
              <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                {t("erMseExamTemplates.helperLine")}
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 8,
                  alignItems: "center",
                }}
              >
                {ER_PHYSICAL_EXAM_TEMPLATE_ORDER.map((pid) => (
                  <button
                    key={pid}
                    type="button"
                    disabled={formDisabled}
                    onClick={() => applyPhysicalExamPreset(pid)}
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      backgroundColor: formDisabled ? "#f1f5f9" : "#fff",
                      color: formDisabled ? "#94a3b8" : "#334155",
                      fontWeight: 600,
                      cursor: formDisabled ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                    }}
                  >
                    {t(EXAM_PRESET_I18N_KEY[pid])}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>{t("erMseProviderPanel.labelExamGeneralAppearance")}</label>
                    {ta(2, "examGeneralAppearance")}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("erMseProviderPanel.labelExamNeuroMental")}</label>
                    {ta(2, "examNeuroMental")}
                  </div>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>{t("erMseProviderPanel.labelExamHeent")}</label>
                    {ta(2, "examHeent")}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("erMseProviderPanel.labelExamCardiac")}</label>
                    {ta(2, "examCardiac")}
                  </div>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>{t("erMseProviderPanel.labelExamRespiratory")}</label>
                    {ta(2, "examRespiratory")}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("erMseProviderPanel.labelExamAbdomen")}</label>
                    {ta(2, "examAbdomen")}
                  </div>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>{t("erMseProviderPanel.labelExamMusculoskeletal")}</label>
                    {ta(2, "examMusculoskeletal")}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("erMseProviderPanel.labelExamSkin")}</label>
                    {ta(2, "examSkin")}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelExamPsychBehavior")}</label>
                  {ta(2, "examPsychBehavior")}
                </div>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelExamReassessmentExtra")}</label>
                  {ta(2, "examReassessmentExtra")}
                </div>
              </div>
            </div>

            <div>
              <p style={sectionHeading}>{t("erMseProviderPanel.sectionMdm")}</p>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelMdmWorkingAssessment")}</label>
                  {ta(2, "mdmWorkingAssessment")}
                </div>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelMdmPlanSummary")}</label>
                  {ta(2, "mdmPlanSummary")}
                </div>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelMdmImmediateActions")}</label>
                  {ta(2, "mdmImmediateActionsRationale")}
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>{t("erMseProviderPanel.labelMdmConsultsDiscussed")}</label>
                    {ta(2, "mdmConsultsDiscussed")}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("erMseProviderPanel.labelMdmAdmitObserveDischarge")}</label>
                    {ta(2, "mdmAdmitObserveDischarge", t("erMseProviderPanel.placeholderMdmAdmitObserveDischarge"))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelMdmProviderAddendum")}</label>
                  {ta(2, "mdmProviderAddendum")}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <p style={sectionHeading}>{t("erMseProviderPanel.sectionProviderHandoff")}</p>
              <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelHandoffRecipient")}</label>
                  <ClinicalUserRoleAutocomplete
                    facilityId={facilityId}
                    role="PROVIDER"
                    disabled={formDisabled || handoffSaving}
                    placeholder={t("erMseProviderPanel.handoffRecipientPlaceholder")}
                    ariaLabel={t("erMseProviderPanel.labelHandoffRecipient")}
                    displayValue={handoffToDisplay}
                    onChangeDisplay={(v) => {
                      setHandoffToDisplay(v);
                      setHandoffToId(null);
                    }}
                    selectedUserId={handoffToId}
                    onSelectUser={(u: ClinicalUserRoleOption | null) => {
                      setHandoffToId(u?.id ?? null);
                      if (u) setHandoffToDisplay(`${u.firstName} ${u.lastName}`.trim());
                    }}
                  />
                  <p style={{ margin: "6px 0 0 0", fontSize: 11, color: "#94a3b8" }}>
                    {t("clinicalUserRoleAutocomplete.minCharsHint")}
                  </p>
                </div>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelHandoffReportAt")}</label>
                  <input
                    type="datetime-local"
                    value={handoffReportAtLocal}
                    onChange={(e) => setHandoffReportAtLocal(e.target.value)}
                    disabled={formDisabled || handoffSaving}
                    style={{
                      ...inputBase,
                      maxWidth: 280,
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t("erMseProviderPanel.labelHandoffNotes")}</label>
                  <textarea
                    value={handoffNotes}
                    onChange={(e) => setHandoffNotes(e.target.value)}
                    disabled={formDisabled || handoffSaving}
                    rows={3}
                    style={{ ...inputBase, minHeight: 72, resize: "vertical" as const }}
                  />
                </div>
                <button
                  type="button"
                  disabled={formDisabled || handoffSaving || !handoffToId}
                  onClick={() => void handleRecordProviderHandoff()}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 10,
                    border: "1px solid #0f766e",
                    backgroundColor: formDisabled || !handoffToId ? "#f1f5f9" : "#0d9488",
                    color: formDisabled || !handoffToId ? "#94a3b8" : "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                    alignSelf: "flex-start",
                    cursor: formDisabled || !handoffToId ? "not-allowed" : "pointer",
                  }}
                >
                  {handoffSaving ? t("erMseProviderPanel.handoffSaving") : t("erMseProviderPanel.handoffSaveButton")}
                </button>
                {handoffFeedback ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: handoffFeedback.variant === "success" ? "#15803d" : "#b45309",
                    }}
                  >
                    {handoffFeedback.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={formDisabled || saving}
                style={{
                  padding: "9px 16px",
                  borderRadius: 10,
                  border: "1px solid #4f46e5",
                  backgroundColor: formDisabled ? "#f1f5f9" : "#4f46e5",
                  color: formDisabled ? "#94a3b8" : "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: formDisabled || saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? t("erMseProviderPanel.saving") : t("erMseProviderPanel.saveButton")}
              </button>
              {isLocked ? (
                <span style={{ fontSize: 12, color: "#b45309" }}>{t("erMseProviderPanel.lockedDocumentation")}</span>
              ) : null}
              {isReadOnly ? (
                <span style={{ fontSize: 12, color: "#64748b" }}>{t("erMseProviderPanel.readOnlyEncounter")}</span>
              ) : null}
            </div>
          </div>

          <div style={resumeColumnStyle}>
            <p style={sectionHeading}>{t("erMseProviderPanel.previewHeading")}</p>
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
              {t("erMseProviderPanel.previewSubline")}
            </p>
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                backgroundColor: "#fff",
              }}
            >
              {previewModel.sections.map((sec, idx) => (
                <div key={sec.id} style={{ marginBottom: idx === previewModel.sections.length - 1 ? 0 : 12 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: PREVIEW_ACCENTS[sec.id] ?? "#64748b",
                    }}
                  >
                    {sec.title}
                  </p>
                  <ul style={{ margin: "6px 0 0 0", paddingLeft: 16, fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
                    {sec.lines.map((line, i) => (
                      <li key={i} style={{ marginBottom: 3 }}>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {previewModel.oneLineSummary ? (
                <p style={{ margin: "10px 0 0 0", fontSize: 13, color: "#0f172a", lineHeight: 1.45, fontWeight: 600 }}>
                  {previewModel.oneLineSummary}
                </p>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #c7d2fe",
                backgroundColor: "#eef2ff",
              }}
            >
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "#4338ca" }}>
                {t("erMseProviderPanel.lastSavedHeading")}
              </p>
              {storedSig ? (
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#312e81", lineHeight: 1.45 }}>
                  {storedSig.savedByDisplayName}
                  <br />
                  {new Date(storedSig.savedAt).toLocaleString(language === "en" ? "en-US" : "fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              ) : (
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#64748b" }}>{t("common.dash")}</p>
              )}
            </div>
          </div>
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}
