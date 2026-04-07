"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { ui } from "@/lib/uiLabels";
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

export function EmergencyProviderMsePanel({
  encounterId,
  facilityId,
  encounter,
  isLocked,
  onSaved,
  clinicTabHref,
  encounterHref,
}: {
  encounterId: string;
  facilityId: string;
  encounter: EncounterLite;
  isLocked: boolean;
  onSaved: () => void | Promise<void>;
  /** Onglet évaluation clinique du dossier (référence complète). */
  clinicTabHref: string;
  /** Lien dossier consultation (raccourci). */
  encounterHref: string;
}) {
  const [form, setForm] = useState<ErProviderMseForm>(() => erProviderMseFormFromEncounter(encounter.nursingAssessment));
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);

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

  const previewModel = useMemo(() => buildErProviderMsePreviewModel(form), [form]);

  const patchForm = useCallback((patch: Partial<ErProviderMseForm>) => {
    setForm((f) => ({ ...f, ...patch }));
  }, []);

  const handleSave = async () => {
    if (formDisabled) return;
    setSaving(true);
    setSaveInfo(null);
    try {
      let savedByDisplayName = "Professionnel";
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
      setSaveInfo(queued ? "En attente de synchronisation." : "Évaluation enregistrée.");
    } catch (e) {
      console.error(e);
      setSaveInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null) || "Impossible d'enregistrer."
      );
    } finally {
      setSaving(false);
    }
  };

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
            title="Évaluation médicale (urgences)"
            subline={
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                Documentation structurée rapide pour le médecin — enregistrée avec le dossier. Pour l&apos;évaluation clinique
                complète (parcours, ordres détaillés), utilisez les liens ci-dessous.
              </p>
            }
          />
        </MedoraCardIdentity>

        <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0} alignItems="flex-start">
          <Link
            href={clinicTabHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #c7d2fe",
              backgroundColor: "#eef2ff",
              color: "#4338ca",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Ouvrir l&apos;évaluation clinique (dossier)
          </Link>
          <Link
            href={encounterHref}
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
            Consultation complète
          </Link>
        </MedoraCardActions>

        {saveInfo ? (
          <p
            style={{
              margin: "10px 0 0 0",
              fontSize: 13,
              color: saveInfo.includes("Impossible") ? "#b91c1c" : "#15803d",
              lineHeight: 1.45,
            }}
          >
            {saveInfo}
          </p>
        ) : null}

        <div style={{ ...workspaceStyle, marginTop: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            <div>
              <p style={sectionHeading}>Présentation / motif</p>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={labelStyle}>Motif / préoccupation principale</label>
                  <textarea
                    value={form.chiefConcern}
                    onChange={(e) => patchForm({ chiefConcern: e.target.value })}
                    disabled={formDisabled}
                    rows={2}
                    style={{ ...inputBase, resize: "vertical", minHeight: 48, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>HPI / récit court (urgences)</label>
                  {ta(3, "hpiNarrative")}
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>Début / chronologie / contexte</label>
                    {ta(2, "onsetTimingContext")}
                  </div>
                  <div>
                    <label style={labelStyle}>Symptômes associés</label>
                    {ta(2, "associatedSymptoms")}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Gravité / préoccupation clé</label>
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
              <p style={sectionHeading}>Revue ciblée (médecin)</p>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={labelStyle}>Impression ciblée</label>
                  {ta(2, "focusedImpression")}
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>Positifs importants</label>
                    {ta(2, "importantPositives")}
                  </div>
                  <div>
                    <label style={labelStyle}>Négatifs importants</label>
                    {ta(2, "importantNegatives")}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Signaux d&apos;alerte</label>
                  {ta(2, "redFlagsText")}
                </div>
                <div>
                  <label style={labelStyle}>Différentiel / synthèse d&apos;évaluation (texte libre)</label>
                  {ta(3, "differentialAssessmentText", "Pas de moteur de diagnostics — texte clinique uniquement.")}
                </div>
              </div>
            </div>

            <div>
              <p style={sectionHeading}>Examen (aperçu)</p>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>Apparence générale</label>
                    {ta(2, "examGeneralAppearance")}
                  </div>
                  <div>
                    <label style={labelStyle}>Neuro / statut mental</label>
                    {ta(2, "examNeuroMental")}
                  </div>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>Tête / cou / ORL</label>
                    {ta(2, "examHeent")}
                  </div>
                  <div>
                    <label style={labelStyle}>Cardiovasculaire</label>
                    {ta(2, "examCardiac")}
                  </div>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>Respiratoire</label>
                    {ta(2, "examRespiratory")}
                  </div>
                  <div>
                    <label style={labelStyle}>Abdomen</label>
                    {ta(2, "examAbdomen")}
                  </div>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>Musculo-squelettique</label>
                    {ta(2, "examMusculoskeletal")}
                  </div>
                  <div>
                    <label style={labelStyle}>Peau</label>
                    {ta(2, "examSkin")}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Psych / comportement</label>
                  {ta(2, "examPsychBehavior")}
                </div>
                <div>
                  <label style={labelStyle}>Réévaluation / examen complémentaire</label>
                  {ta(2, "examReassessmentExtra")}
                </div>
              </div>
            </div>

            <div>
              <p style={sectionHeading}>Décision médicale (résumé)</p>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={labelStyle}>Évaluation de travail</label>
                  {ta(2, "mdmWorkingAssessment")}
                </div>
                <div>
                  <label style={labelStyle}>Plan (résumé)</label>
                  {ta(2, "mdmPlanSummary")}
                </div>
                <div>
                  <label style={labelStyle}>Actions immédiates / justification</label>
                  {ta(2, "mdmImmediateActionsRationale")}
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>Consultations évoquées</label>
                    {ta(2, "mdmConsultsDiscussed")}
                  </div>
                  <div>
                    <label style={labelStyle}>Hospitalisation / observation / sortie</label>
                    {ta(2, "mdmAdmitObserveDischarge", "Réflexion de haut niveau — pas de décision automatique.")}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Addendum médecin</label>
                  {ta(2, "mdmProviderAddendum")}
                </div>
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
                {saving ? "Enregistrement…" : "Enregistrer l&apos;évaluation"}
              </button>
              {isLocked ? (
                <span style={{ fontSize: 12, color: "#b45309" }}>Documentation signée — saisie verrouillée.</span>
              ) : null}
              {isReadOnly ? (
                <span style={{ fontSize: 12, color: "#64748b" }}>Consultation fermée — lecture seule.</span>
              ) : null}
            </div>
          </div>

          <div style={resumeColumnStyle}>
            <p style={sectionHeading}>Aperçu de la note (généré)</p>
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
              Dérivé uniquement des champs saisis — pas d&apos;IA, pas d&apos;inférence.
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
                Dernière mise à jour (enregistrement)
              </p>
              {storedSig ? (
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#312e81", lineHeight: 1.45 }}>
                  {storedSig.savedByDisplayName}
                  <br />
                  {new Date(storedSig.savedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                </p>
              ) : (
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#64748b" }}>{ui.common.dash}</p>
              )}
            </div>
          </div>
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}
