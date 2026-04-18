"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
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
  type ErDispositionPreviewLabels,
  type ErDispositionSupplementForm,
} from "./emergencyDispositionV1";

type PhysicianLite = { id?: string; firstName?: string | null; lastName?: string | null } | null;

type EncounterLite = {
  id: string;
  status?: string | null;
  type?: string | null;
  patient?: { id?: string } | null;
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

export function EmergencyDispositionPanel({
  encounterId,
  facilityId,
  encounter,
  isLocked,
  onSaved,
  summaryTabHref,
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
  canPrescribe: boolean;
  canEditNursingDischarge: boolean;
  canEditMedicalDischarge: boolean;
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";

  const OUTCOME_OPTIONS = useMemo(
    (): { id: ErDispositionOutcomeUi; label: string }[] => [
      { id: "HOME", label: t("emergencyDisposition.outcomeHOME") },
      { id: "ADMISSION", label: t("emergencyDisposition.outcomeADMISSION") },
      { id: "TRANSFER", label: t("emergencyDisposition.outcomeTRANSFER") },
      { id: "AMA", label: t("emergencyDisposition.outcomeAMA") },
      { id: "LWBS", label: t("emergencyDisposition.outcomeLWBS") },
      { id: "DECEASED", label: t("emergencyDisposition.outcomeDECEASED") },
      { id: "OTHER", label: t("emergencyDisposition.outcomeOTHER") },
    ],
    [t]
  );

  const dispositionPreviewLabels = useMemo(
    (): ErDispositionPreviewLabels => ({
      dischargeModeLinePrefix: t("emergencyDisposition.preview.dischargeModeLinePrefix"),
      sectionDecisionShared: t("emergencyDisposition.preview.sectionDecisionShared"),
      sectionDischargeFields: t("emergencyDisposition.preview.sectionDischargeFields"),
      lineDispositionSummary: t("emergencyDisposition.preview.lineDispositionSummary"),
      lineExitCondition: t("emergencyDisposition.preview.lineExitCondition"),
      lineInstructions: t("emergencyDisposition.preview.lineInstructions"),
      lineMedicationsGiven: t("emergencyDisposition.preview.lineMedicationsGiven"),
      lineFollowUp: t("emergencyDisposition.preview.lineFollowUp"),
      lineReturnIfWorse: t("emergencyDisposition.preview.lineReturnIfWorse"),
      linePatientDestination: t("emergencyDisposition.preview.linePatientDestination"),
      sectionAdmission: t("emergencyDisposition.preview.sectionAdmission"),
      lineAdmissionReason: t("emergencyDisposition.preview.lineAdmissionReason"),
      lineServiceUnit: t("emergencyDisposition.preview.lineServiceUnit"),
      lineAdmissionDiagnosis: t("emergencyDisposition.preview.lineAdmissionDiagnosis"),
      lineCareLevel: t("emergencyDisposition.preview.lineCareLevel"),
      lineConditionAdmission: t("emergencyDisposition.preview.lineConditionAdmission"),
      lineInitialPlan: t("emergencyDisposition.preview.lineInitialPlan"),
      lineResponsiblePhysician: t("emergencyDisposition.preview.lineResponsiblePhysician"),
      sectionErExtra: t("emergencyDisposition.preview.sectionErExtra"),
      lineTransferNote: t("emergencyDisposition.preview.lineTransferNote"),
      lineAmaRisks: t("emergencyDisposition.preview.lineAmaRisks"),
      lineLwbsDetail: t("emergencyDisposition.preview.lineLwbsDetail"),
      lineDeceasedNote: t("emergencyDisposition.preview.lineDeceasedNote"),
      sectionEmptyTitle: t("emergencyDisposition.preview.sectionEmptyTitle"),
      sectionEmptyLine: t("emergencyDisposition.preview.sectionEmptyLine"),
      headlinePrefix: t("emergencyDisposition.preview.headlinePrefix"),
    }),
    [t]
  );

  const careLevelDisplayOptions = useMemo(
    () => t("emergencyDisposition.careLevelOptions").split("\n").filter(Boolean),
    [t]
  );

  const patientDossierPrintHref =
    encounter.patient?.id != null && String(encounter.patient.id).trim() !== ""
      ? `/app/patients/${encodeURIComponent(encounter.patient.id)}?tab=summary`
      : undefined;
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

  const dischargeModeDisplayLabel = useMemo(() => {
    const opt = OUTCOME_OPTIONS.find((o) => o.id === outcomeUi);
    return opt?.label ?? dischargeForm.dischargeMode.trim();
  }, [OUTCOME_OPTIONS, outcomeUi, dischargeForm.dischargeMode]);

  const previewModel = useMemo(
    () =>
      buildErDispositionPreviewModel(
        dischargeForm,
        admissionForm,
        supplementForm,
        outcomeUi,
        dispositionPreviewLabels,
        dischargeModeDisplayLabel
      ),
    [
      dischargeForm,
      admissionForm,
      supplementForm,
      outcomeUi,
      dispositionPreviewLabels,
      dischargeModeDisplayLabel,
    ]
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
      let savedByDisplayName = t("emergencyDisposition.signerFallback");
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
      if (
        outcomeUi === "ADMISSION" &&
        canPrescribe &&
        encounter.status === "OPEN" &&
        Object.keys(admissionPayload).length > 0
      ) {
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
      setSaveInfo(queued ? t("emergencyDisposition.saveQueued") : t("emergencyDisposition.saveOk"));
    } catch (e) {
      console.error(e);
      setSaveInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null) || t("emergencyDisposition.saveFailed")
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
            title={t("emergencyDisposition.cardTitle")}
            subline={
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                {t("emergencyDisposition.cardSubline")}
              </p>
            }
          />
        </MedoraCardIdentity>

        <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0} alignItems="flex-start">
          {patientDossierPrintHref ? (
            <Link
              href={patientDossierPrintHref}
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
              {t("emergencyDisposition.printChart")}
            </Link>
          ) : null}
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
            {t("emergencyDisposition.summaryClosureLink")}
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
            {t("emergencyDisposition.inpatientBanner")}
          </p>
        ) : null}

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

        <div style={{ ...workspaceStyle, marginTop: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            <div>
              <p style={sectionHeading}>{t("emergencyDisposition.sectionPrimaryDecision")}</p>
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
                {t("emergencyDisposition.outcomeHint1")}
              </p>
              <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                {t("emergencyDisposition.outcomeHint2")}
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
                  {t("emergencyDisposition.admissionWarningTitle")}
                </p>
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#6b21a8", lineHeight: 1.45 }}>
                  {t("emergencyDisposition.admissionWarningBody")}
                </p>
              </div>
            ) : null}

            {showAdmissionFields && !canPrescribe ? (
              <p style={{ margin: 0, fontSize: 13, color: "#b45309", lineHeight: 1.45 }}>
                {t("emergencyDisposition.admissionRoleHint")}
              </p>
            ) : null}

            <div>
              <p style={sectionHeading}>{t("emergencyDisposition.sectionDischargeShared")}</p>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={labelStyle}>{t("emergencyDisposition.labelDispositionMedical")}</label>
                  {ta(2, dischargeForm.disposition, (v) => patchDischarge({ disposition: v }), medDisabled)}
                </div>
                <div>
                  <label style={labelStyle}>{t("emergencyDisposition.labelDischargeInstructionsMedical")}</label>
                  {ta(2, dischargeForm.dischargeInstructions, (v) => patchDischarge({ dischargeInstructions: v }), medDisabled)}
                </div>
                <div>
                  <label style={labelStyle}>{t("emergencyDisposition.labelFollowUpMedical")}</label>
                  {ta(2, dischargeForm.followUp, (v) => patchDischarge({ followUp: v }), medDisabled)}
                </div>
                <div>
                  <label style={labelStyle}>{t("emergencyDisposition.labelMedicationsMedical")}</label>
                  {ta(2, dischargeForm.medicationsGiven, (v) => patchDischarge({ medicationsGiven: v }), medDisabled)}
                </div>
                <div>
                  <label style={labelStyle}>{t("emergencyDisposition.labelExitConditionNursing")}</label>
                  {ta(2, dischargeForm.exitCondition, (v) => patchDischarge({ exitCondition: v }), nurDisabled)}
                </div>
                <div>
                  <label style={labelStyle}>{t("emergencyDisposition.labelDestinationNursing")}</label>
                  <input
                    type="text"
                    value={dischargeForm.patientDestination}
                    onChange={(e) => patchDischarge({ patientDestination: e.target.value })}
                    disabled={nurDisabled}
                    style={{ ...inputBase, backgroundColor: nurDisabled ? "#f8fafc" : "#fff" }}
                    placeholder={t("emergencyDisposition.placeholderDestination")}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t("emergencyDisposition.labelReturnIfWorseNursing")}</label>
                  {ta(2, dischargeForm.returnIfWorse, (v) => patchDischarge({ returnIfWorse: v }), nurDisabled)}
                </div>
                {!canEditMedicalDischarge ? (
                  <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("emergencyDisposition.hintMedicalFields")}</p>
                ) : null}
                {!canEditNursingDischarge ? (
                  <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("emergencyDisposition.hintNursingFields")}</p>
                ) : null}
              </div>
            </div>

            {showAdmissionFields && canPrescribe ? (
              <div>
                <p style={sectionHeading}>{t("emergencyDisposition.sectionAdmissionPhysician")}</p>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.labelAdmissionReason")}</label>
                    {ta(2, admissionForm.admissionReason, (v) => patchAdmission({ admissionReason: v }), medDisabled)}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.labelServiceUnit")}</label>
                    <input
                      type="text"
                      value={admissionForm.serviceUnit}
                      onChange={(e) => patchAdmission({ serviceUnit: e.target.value })}
                      disabled={medDisabled}
                      style={{ ...inputBase, backgroundColor: medDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.labelAdmissionDiagnosis")}</label>
                    {ta(2, admissionForm.admissionDiagnosis, (v) => patchAdmission({ admissionDiagnosis: v }), medDisabled)}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.labelCareLevel")}</label>
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
                      {CARE_LEVEL_OPTIONS_FR.map((o, i) => (
                        <option key={o} value={o}>
                          {careLevelDisplayOptions[i] ?? o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.labelConditionAdmission")}</label>
                    {ta(2, admissionForm.conditionAtAdmission, (v) => patchAdmission({ conditionAtAdmission: v }), medDisabled)}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.labelInitialPlan")}</label>
                    {ta(2, admissionForm.initialPlan, (v) => patchAdmission({ initialPlan: v }), medDisabled)}
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.labelResponsiblePhysician")}</label>
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
                <p style={sectionHeading}>{t("emergencyDisposition.sectionErSupplement")}</p>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  {showTransferExtra ? (
                    <div>
                      <label style={labelStyle}>{t("emergencyDisposition.labelTransferHandoff")}</label>
                      {ta(
                        2,
                        supplementForm.transferHandoffNote,
                        (v) => patchSupplement({ transferHandoffNote: v }),
                        formDisabled,
                        t("emergencyDisposition.transferPlaceholder")
                      )}
                    </div>
                  ) : null}
                  {showAmaExtra ? (
                    <div>
                      <label style={labelStyle}>{t("emergencyDisposition.labelAmaRisks")}</label>
                      {ta(2, supplementForm.amaRisksDiscussed, (v) => patchSupplement({ amaRisksDiscussed: v }), formDisabled)}
                    </div>
                  ) : null}
                  {showLwbsExtra ? (
                    <div>
                      <label style={labelStyle}>{t("emergencyDisposition.labelLwbs")}</label>
                      {ta(
                        2,
                        supplementForm.lwbsNarrative,
                        (v) => patchSupplement({ lwbsNarrative: v }),
                        formDisabled,
                        t("emergencyDisposition.lwbsPlaceholder")
                      )}
                    </div>
                  ) : null}
                  {showDeceasedExtra ? (
                    <div>
                      <label style={labelStyle}>{t("emergencyDisposition.labelDeceasedNotes")}</label>
                      {ta(
                        3,
                        supplementForm.deceasedPlaceholderNote,
                        (v) => patchSupplement({ deceasedPlaceholderNote: v }),
                        formDisabled,
                        t("emergencyDisposition.deceasedPlaceholder")
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
                {saving ? t("emergencyDisposition.saveButtonSaving") : t("emergencyDisposition.saveButton")}
              </button>
              {isLocked ? (
                <span style={{ fontSize: 12, color: "#b45309" }}>{t("emergencyDisposition.lockedSigned")}</span>
              ) : null}
              {isReadOnly ? (
                <span style={{ fontSize: 12, color: "#64748b" }}>{t("emergencyDisposition.readOnlyClosed")}</span>
              ) : null}
            </div>
          </div>

          <div style={resumeColumnStyle}>
            <p style={sectionHeading}>{t("emergencyDisposition.previewColumnTitle")}</p>
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
              {t("emergencyDisposition.previewColumnHint")}
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
                {t("emergencyDisposition.signatureHeading")}
              </p>
              {storedSig ? (
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
                  {storedSig.savedByDisplayName}
                  <br />
                  {new Date(storedSig.savedAt).toLocaleString(dateLocale, { dateStyle: "short", timeStyle: "short" })}
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
