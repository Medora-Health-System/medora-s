"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { ui } from "@/lib/uiLabels";
import {
  hydrateDischargeFormFromEncounterJson,
  emptyDischargeForm,
  type DischargeFormState,
} from "@/lib/encounterDischarge";
import {
  admissionFormToPayload,
  hydrateAdmissionFormFromEncounterJson,
  emptyAdmissionForm,
  formatPhysicianName,
  CARE_LEVEL_OPTIONS_FR,
  type AdmissionFormState,
} from "@/lib/encounterAdmission";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import {
  buildErDispositionPreviewModel,
  emptyErDispositionSupplementForm,
  erDispositionSupplementFromEncounter,
  inferOutcomeUiFromForms,
  mergeErDischargeForEncounterPatch,
  mergeErDispositionV1IntoNursingAssessment,
  outcomeUiToDischargeMode,
  readDispositionSignatureFromEncounter,
  type ErDispositionOutcomeUi,
  type ErDispositionSupplementForm,
} from "./emergencyDispositionV1";

type PhysicianLite = { id?: string; firstName?: string | null; lastName?: string | null } | null;

type EncounterLite = {
  id: string;
  status?: string | null;
  type?: string | null;
  nursingAssessment?: unknown;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  updatedAt?: string | null;
  physicianAssigned?: PhysicianLite;
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

const sectionHeading: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

const PREVIEW_ACCENTS: Record<string, string> = {
  mode: "#64748b",
  discharge: "#475569",
  admission: "#6a1b9a",
  erExtra: "#b45309",
  empty: "#cbd5e1",
};

const OUTCOME_OPTIONS: { id: ErDispositionOutcomeUi; label: string }[] = [
  { id: "HOME", label: "Sortie à domicile" },
  { id: "ADMISSION", label: "Hospitalisation / admission" },
  { id: "TRANSFER", label: "Transfert (autre établissement)" },
  { id: "AMA", label: "Contre avis médical (LAMA)" },
  { id: "LWBS", label: "Départ avant fin de prise en charge (type LWBS)" },
  { id: "DECEASED", label: "Décès" },
  { id: "OTHER", label: "Autre" },
];

export function EmergencyDispositionPanel({
  encounterId,
  facilityId,
  encounter,
  isLocked,
  onSaved,
  summaryTabHref,
  erChartHref,
  genericEncounterHref,
  hospitalisationBoardHref,
  canPrescribe,
  canEditNursingDischarge,
  canEditMedicalDischarge,
}: {
  encounterId: string;
  facilityId: string;
  encounter: EncounterLite;
  isLocked: boolean;
  onSaved: () => void | Promise<void>;
  summaryTabHref: string;
  /** Charte urgences complète (parcours principal). */
  erChartHref: string;
  /** Dossier consultation Medora générique (référence secondaire). */
  genericEncounterHref: string;
  hospitalisationBoardHref: string;
  canPrescribe: boolean;
  canEditNursingDischarge: boolean;
  canEditMedicalDischarge: boolean;
}) {
  const [dischargeForm, setDischargeForm] = useState<DischargeFormState>(() => emptyDischargeForm());
  const [admissionForm, setAdmissionForm] = useState<AdmissionFormState>(() => emptyAdmissionForm());
  const [supplementForm, setSupplementForm] = useState<ErDispositionSupplementForm>(() =>
    emptyErDispositionSupplementForm()
  );
  const [outcomeUi, setOutcomeUi] = useState<ErDispositionOutcomeUi>("HOME");
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);

  const isReadOnly = encounter.status !== "OPEN";
  const formDisabled = isReadOnly || isLocked;

  const hydrateAll = useCallback(() => {
    const d = hydrateDischargeFormFromEncounterJson(encounter.dischargeSummaryJson);
    const sup = erDispositionSupplementFromEncounter(encounter.nursingAssessment);
    const defPhys = formatPhysicianName(encounter.physicianAssigned ?? undefined);
    const a = hydrateAdmissionFormFromEncounterJson(encounter.admissionSummaryJson, defPhys);
    setDischargeForm(d);
    setAdmissionForm(a);
    setSupplementForm(sup);
    setOutcomeUi(inferOutcomeUiFromForms(d.dischargeMode, sup));
  }, [
    encounter.dischargeSummaryJson,
    encounter.admissionSummaryJson,
    encounter.nursingAssessment,
    encounter.physicianAssigned,
  ]);

  useEffect(() => {
    hydrateAll();
  }, [hydrateAll, encounter.updatedAt]);

  const setOutcomeFromUi = (o: ErDispositionOutcomeUi) => {
    setOutcomeUi(o);
    setDischargeForm((prev) => ({ ...prev, dischargeMode: outcomeUiToDischargeMode(o) }));
  };

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
        gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 380px)",
        gap: 16,
        alignItems: "start",
        width: "100%",
      }
    : { display: "flex", flexDirection: "column", gap: 16, width: "100%" };

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

  const previewModel = useMemo(
    () => buildErDispositionPreviewModel(dischargeForm, admissionForm, supplementForm, outcomeUi),
    [dischargeForm, admissionForm, supplementForm, outcomeUi]
  );

  const storedSig = useMemo(
    () => readDispositionSignatureFromEncounter(encounter.nursingAssessment),
    [encounter.nursingAssessment]
  );

  const patchDischarge = useCallback((patch: Partial<DischargeFormState>) => {
    setDischargeForm((f) => ({ ...f, ...patch }));
  }, []);

  const patchAdmission = useCallback((patch: Partial<AdmissionFormState>) => {
    setAdmissionForm((f) => ({ ...f, ...patch }));
  }, []);

  const patchSupplement = useCallback((patch: Partial<ErDispositionSupplementForm>) => {
    setSupplementForm((f) => ({ ...f, ...patch }));
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
      const signature = { savedAt: new Date().toISOString(), savedByDisplayName };

      const mergedDischarge = mergeErDischargeForEncounterPatch(
        encounter.dischargeSummaryJson,
        dischargeForm,
        canEditNursingDischarge,
        canEditMedicalDischarge
      );

      const admissionPayload = admissionFormToPayload(admissionForm);

      const body: Record<string, unknown> = {};
      if (mergedDischarge !== null) {
        body.dischargeSummaryJson = mergedDischarge;
      }
      if (canPrescribe && encounter.status === "OPEN" && Object.keys(admissionPayload).length > 0) {
        body.admissionSummaryJson = admissionPayload;
      }
      body.nursingAssessment = mergeErDispositionV1IntoNursingAssessment(
        encounter.nursingAssessment,
        supplementForm,
        signature
      );

      const res = await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      await onSaved();
      setSaveInfo(queued ? "En attente de synchronisation." : "Disposition enregistrée.");
    } catch (e) {
      console.error(e);
      setSaveInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null) || "Impossible d'enregistrer."
      );
    } finally {
      setSaving(false);
    }
  };

  const medDisabled = formDisabled || !canEditMedicalDischarge;
  const nurDisabled = formDisabled || !canEditNursingDischarge;
  const outcomeDisabled = formDisabled || (!canEditMedicalDischarge && !canEditNursingDischarge);

  const ta = (
    rows: number,
    value: string,
    onChange: (v: string) => void,
    disabledField: boolean,
    placeholder?: string
  ) => (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabledField}
      rows={rows}
      placeholder={placeholder}
      style={{
        ...inputBase,
        resize: "vertical",
        minHeight: rows * 22,
        backgroundColor: disabledField ? "#f8fafc" : "#fff",
      }}
    />
  );

  const showAdmissionFields = outcomeUi === "ADMISSION";
  const showTransferExtra = outcomeUi === "TRANSFER";
  const showAmaExtra = outcomeUi === "AMA";
  const showLwbsExtra = outcomeUi === "LWBS";
  const showDeceasedExtra = outcomeUi === "DECEASED";

  return (
    <MedoraCard leftAccentColor="#64748b" variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials="D">
          <MedoraCardTitle
            title="Disposition (urgences)"
            subline={
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                Décision d&apos;orientation opérationnelle — enregistrée dans le dossier partagé (sortie / admission).
                La clôture définitive et les contrôles documentaires restent sur le résumé de consultation.
              </p>
            }
          />
        </MedoraCardIdentity>

        <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0} alignItems="flex-start">
          <Link
            href={summaryTabHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              backgroundColor: "#f8fafc",
              color: "#334155",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Résumé et clôture (dossier)
          </Link>
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
            Consultation complète
          </Link>
          <Link
            href={genericEncounterHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              color: "#64748b",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Dossier Medora (référence)
          </Link>
          <Link
            href={hospitalisationBoardHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #e9d5ff",
              backgroundColor: "#faf5ff",
              color: "#6b21a8",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Tableau hospitalisation
          </Link>
        </MedoraCardActions>

        {encounter.type === "INPATIENT" ? (
          <p
            style={{
              margin: "10px 0 0 0",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #e9d5ff",
              backgroundColor: "#faf5ff",
              fontSize: 13,
              color: "#5b21b6",
              lineHeight: 1.45,
            }}
          >
            Cette consultation est liée à une hospitalisation (type dossier). Vérifiez le dossier complet pour le détail
            administratif et clinique.
          </p>
        ) : null}

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
              <p style={sectionHeading}>Décision principale</p>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                }}
              >
                {OUTCOME_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      fontSize: 13,
                      color: "#0f172a",
                      cursor: outcomeDisabled ? "not-allowed" : "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="er-disposition-outcome"
                      checked={outcomeUi === opt.id}
                      disabled={outcomeDisabled}
                      onChange={() => setOutcomeFromUi(opt.id)}
                      style={{ marginTop: 2 }}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                Le mode de sortie enregistré dans le dossier correspond au libellé « mode de sortie » (sortie standard
                Medora).
              </p>
              <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                Pour une prise en charge en <strong>observation</strong>, choisir « Hospitalisation / admission » puis
                renseigner le dossier d&apos;admission avec le niveau de soins « Observation » (champs Medora existants).
              </p>
            </div>

            {showAdmissionFields && canPrescribe ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #f3e8ff",
                  backgroundColor: "#faf5ff",
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#6b21a8" }}>
                  Attention — dossier d&apos;admission
                </p>
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#6b21a8", lineHeight: 1.45 }}>
                  L&apos;enregistrement d&apos;un dossier d&apos;admission sur une consultation ouverte met à jour le
                  dossier d&apos;admission côté serveur (règles métier Medora : type hospitalisation et date
                  d&apos;admission lorsque applicable). Utilisez uniquement si la décision d&apos;admission est
                  actée.
                </p>
              </div>
            ) : null}

            {showAdmissionFields && !canPrescribe ? (
              <p style={{ margin: 0, fontSize: 13, color: "#b45309", lineHeight: 1.45 }}>
                L&apos;édition du dossier d&apos;admission est réservée au médecin / administration. Ouvrez la
                consultation complète.
              </p>
            ) : null}

            <div>
              <p style={sectionHeading}>Dossier de sortie (partagé)</p>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={labelStyle}>Disposition / synthèse (médical)</label>
                  {ta(2, dischargeForm.disposition, (v) => patchDischarge({ disposition: v }), medDisabled)}
                </div>
                <div>
                  <label style={labelStyle}>Instructions de sortie (médical)</label>
                  {ta(2, dischargeForm.dischargeInstructions, (v) => patchDischarge({ dischargeInstructions: v }), medDisabled)}
                </div>
                <div>
                  <label style={labelStyle}>Suivi (médical)</label>
                  {ta(2, dischargeForm.followUp, (v) => patchDischarge({ followUp: v }), medDisabled)}
                </div>
                <div>
                  <label style={labelStyle}>Médicaments donnés / traitement (médical)</label>
                  {ta(2, dischargeForm.medicationsGiven, (v) => patchDischarge({ medicationsGiven: v }), medDisabled)}
                </div>
                <div>
                  <label style={labelStyle}>État à la sortie (infirmier)</label>
                  {ta(2, dischargeForm.exitCondition, (v) => patchDischarge({ exitCondition: v }), nurDisabled)}
                </div>
                <div>
                  <label style={labelStyle}>Destination / lieu (infirmier)</label>
                  <input
                    type="text"
                    value={dischargeForm.patientDestination}
                    onChange={(e) => patchDischarge({ patientDestination: e.target.value })}
                    disabled={nurDisabled}
                    style={{ ...inputBase, backgroundColor: nurDisabled ? "#f8fafc" : "#fff" }}
                    placeholder="Ex. domicile, transfert, service"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Réévaluation / signes d&apos;alarme (infirmier)</label>
                  {ta(2, dischargeForm.returnIfWorse, (v) => patchDischarge({ returnIfWorse: v }), nurDisabled)}
                </div>
                {!canEditMedicalDischarge ? (
                  <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                    Champs médicaux : réservés au médecin / administration sur cette page.
                  </p>
                ) : null}
                {!canEditNursingDischarge ? (
                  <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                    Champs infirmiers : réservés à l&apos;infirmier / administration sur cette page.
                  </p>
                ) : null}
              </div>
            </div>

            {showAdmissionFields && canPrescribe ? (
              <div>
                <p style={sectionHeading}>Dossier d&apos;admission (médecin)</p>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <label style={labelStyle}>Motif d&apos;admission</label>
                    {ta(2, admissionForm.admissionReason, (v) => patchAdmission({ admissionReason: v }), medDisabled)}
                  </div>
                  <div>
                    <label style={labelStyle}>Unité / service</label>
                    <input
                      type="text"
                      value={admissionForm.serviceUnit}
                      onChange={(e) => patchAdmission({ serviceUnit: e.target.value })}
                      disabled={medDisabled}
                      style={{ ...inputBase, backgroundColor: medDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Diagnostic d&apos;admission (texte)</label>
                    {ta(2, admissionForm.admissionDiagnosis, (v) => patchAdmission({ admissionDiagnosis: v }), medDisabled)}
                  </div>
                  <div>
                    <label style={labelStyle}>Niveau de soins</label>
                    <select
                      value={admissionForm.careLevel}
                      onChange={(e) => patchAdmission({ careLevel: e.target.value })}
                      disabled={medDisabled}
                      style={{
                        ...inputBase,
                        cursor: medDisabled ? "not-allowed" : "pointer",
                        backgroundColor: medDisabled ? "#f8fafc" : "#fff",
                      }}
                    >
                      <option value="">—</option>
                      {CARE_LEVEL_OPTIONS_FR.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>État à l&apos;admission</label>
                    {ta(2, admissionForm.conditionAtAdmission, (v) => patchAdmission({ conditionAtAdmission: v }), medDisabled)}
                  </div>
                  <div>
                    <label style={labelStyle}>Plan initial</label>
                    {ta(2, admissionForm.initialPlan, (v) => patchAdmission({ initialPlan: v }), medDisabled)}
                  </div>
                  <div>
                    <label style={labelStyle}>Médecin responsable (nom affiché)</label>
                    <input
                      type="text"
                      value={admissionForm.responsiblePhysicianName}
                      onChange={(e) => patchAdmission({ responsiblePhysicianName: e.target.value })}
                      disabled={medDisabled}
                      style={{ ...inputBase, backgroundColor: medDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {(showTransferExtra || showAmaExtra || showLwbsExtra || showDeceasedExtra) && (
              <div>
                <p style={sectionHeading}>Précisions urgence (V1)</p>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  {showTransferExtra ? (
                    <div>
                      <label style={labelStyle}>Transfert — transmission / main courante</label>
                      {ta(
                        2,
                        supplementForm.transferHandoffNote,
                        (v) => patchSupplement({ transferHandoffNote: v }),
                        formDisabled,
                        "Complète la destination dans « Destination / lieu » du dossier de sortie."
                      )}
                    </div>
                  ) : null}
                  {showAmaExtra ? (
                    <div>
                      <label style={labelStyle}>Risques discutés (LAMA)</label>
                      {ta(2, supplementForm.amaRisksDiscussed, (v) => patchSupplement({ amaRisksDiscussed: v }), formDisabled)}
                    </div>
                  ) : null}
                  {showLwbsExtra ? (
                    <div>
                      <label style={labelStyle}>Précision LWBS / départ anticipé</label>
                      {ta(
                        2,
                        supplementForm.lwbsNarrative,
                        (v) => patchSupplement({ lwbsNarrative: v }),
                        formDisabled,
                        "Le mode de sortie dossier est « Autre » ; décrire le contexte."
                      )}
                    </div>
                  ) : null}
                  {showDeceasedExtra ? (
                    <div>
                      <label style={labelStyle}>Décès — notes (aperçu local)</label>
                      {ta(
                        3,
                        supplementForm.deceasedPlaceholderNote,
                        (v) => patchSupplement({ deceasedPlaceholderNote: v }),
                        formDisabled,
                        "Le flux légal et la clôture complète restent sur le dossier et les procédures établies."
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={formDisabled || saving}
                style={{
                  padding: "9px 16px",
                  borderRadius: 10,
                  border: "1px solid #64748b",
                  backgroundColor: formDisabled ? "#f1f5f9" : "#475569",
                  color: formDisabled ? "#94a3b8" : "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: formDisabled || saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Enregistrement…" : "Enregistrer la décision d'orientation"}
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
            <p style={sectionHeading}>Résumé de disposition (généré)</p>
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
              Texte dérivé des champs saisis — pas d&apos;IA.
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
              {previewModel.headline ? (
                <p style={{ margin: "10px 0 0 0", fontSize: 13, color: "#0f172a", lineHeight: 1.45, fontWeight: 600 }}>
                  {previewModel.headline}
                </p>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
              }}
            >
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "#475569" }}>
                Dernière mise à jour (notes urgence V1)
              </p>
              {storedSig ? (
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
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
