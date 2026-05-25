"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { parseAdmissionSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import { MedoraCard, MedoraCardIdentity, MedoraCardInner, MedoraCardTitle } from "@/components/medora-card";
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
import {
  applyEmtalaV1ComplementToNursingAssessment,
  emptyEmtalaDispositionComplementForm,
  emtalaDispositionComplementFromNursing,
  type EmtalaDispositionComplementForm,
} from "./erEmtalaV1";
import {
  buildProviderDischargeJsonForSave,
  ProviderDischargeDocumentationSection,
  validateProviderDischargeDocumentation,
} from "@/features/emergency/ProviderDischargeDocumentationSection";
import {
  applyProviderDischargeDocumentationToDischargeForm,
  hydrateProviderDischargeDocumentationForm,
  type ProviderDischargeValidationErrors,
} from "@/features/emergency/providerDischargeDocumentationModel";
import { erHandoffV1SatisfiesInpatientTransferConfirm } from "@medora/shared";

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
  canPrescribe,
  canEditNursingDischarge,
  canEditMedicalDischarge,
}: {
  encounterId: string;
  facilityId: string;
  encounter: EncounterLite;
  isLocked: boolean;
  onSaved: () => void | Promise<void>;
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

  const [dischargeForm, setDischargeForm] = useState<DischargeFormState>(() => emptyDischargeForm());
  const [admissionForm, setAdmissionForm] = useState<AdmissionFormState>(() => emptyAdmissionForm());
  const [supplementForm, setSupplementForm] = useState<ErDispositionSupplementForm>(() =>
    emptyErDispositionSupplementForm()
  );
  const [emtalaComplement, setEmtalaComplement] = useState<EmtalaDispositionComplementForm>(() =>
    emptyEmtalaDispositionComplementForm()
  );
  const [outcomeUi, setOutcomeUi] = useState<ErDispositionOutcomeUi>("HOME");
  const [providerDischargeDoc, setProviderDischargeDoc] = useState(() =>
    hydrateProviderDischargeDocumentationForm(encounter.dischargeSummaryJson)
  );
  const [providerDischargeValidationErrors, setProviderDischargeValidationErrors] =
    useState<ProviderDischargeValidationErrors | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);

  /** Cancel-admission modal local state (admission decision is encounter-level, not an order). */
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const hasSavedAdmission = useMemo(
    () => parseAdmissionSummaryForChart(encounter.admissionSummaryJson) != null,
    [encounter.admissionSummaryJson]
  );

  const isReadOnly = encounter.status !== "OPEN";
  const formDisabled = isReadOnly || isLocked;

  const hydrateAll = useCallback(() => {
    const d = hydrateDischargeFormFromEncounterJson(encounter.dischargeSummaryJson);
    const sup = erDispositionSupplementFromEncounter(encounter.nursingAssessment);
    const defPhys = formatPhysicianName(encounter.physicianAssigned ?? undefined);
    const a = hydrateAdmissionFormFromEncounterJson(encounter.admissionSummaryJson, defPhys);
    const inferred = inferOutcomeUiFromForms(d.dischargeMode, sup);
    // Align dischargeMode with inferred outcome when JSON has no mode yet (e.g. new encounter).
    // Otherwise the radio shows HOME but form.dischargeMode stays "", and PATCH omits dischargeSummaryJson.dischargeMode
    // — the ER board badge reads dischargeMode from dischargeSummaryJson only.
    const dischargeModeSynced =
      d.dischargeMode.trim().length > 0 ? d.dischargeMode : outcomeUiToDischargeMode(inferred);
    setDischargeForm({ ...d, dischargeMode: dischargeModeSynced });
    setProviderDischargeDoc(hydrateProviderDischargeDocumentationForm(encounter.dischargeSummaryJson));
    setAdmissionForm(a);
    setSupplementForm(sup);
    setOutcomeUi(inferred);
    setEmtalaComplement(emtalaDispositionComplementFromNursing(encounter.nursingAssessment));
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

  const onProviderDischargeDocChange = useCallback((next: typeof providerDischargeDoc) => {
    setProviderDischargeDoc(next);
    setProviderDischargeValidationErrors(null);
    setDischargeForm((f) => applyProviderDischargeDocumentationToDischargeForm(f, next));
  }, []);

  const patchAdmission = useCallback((patch: Partial<AdmissionFormState>) => {
    setAdmissionForm((f) => ({ ...f, ...patch }));
  }, []);

  const patchSupplement = useCallback((patch: Partial<ErDispositionSupplementForm>) => {
    setSupplementForm((f) => ({ ...f, ...patch }));
  }, []);

  const patchEmtalaComplement = useCallback((patch: Partial<EmtalaDispositionComplementForm>) => {
    setEmtalaComplement((f) => ({ ...f, ...patch }));
  }, []);

  const handleSave = async () => {
    if (formDisabled) return;

    const showProviderDischargeOnSave =
      outcomeUi !== "ADMISSION" &&
      (outcomeUi === "HOME" ||
        outcomeUi === "AMA" ||
        outcomeUi === "LWBS" ||
        outcomeUi === "OTHER" ||
        outcomeUi === "TRANSFER");

    if (
      canEditMedicalDischarge &&
      showProviderDischargeOnSave &&
      providerDischargeDoc.diagnosisRefs.length > 0
    ) {
      const validationErrors = validateProviderDischargeDocumentation(providerDischargeDoc, {
        requiredDescription: t("providerDischargeDocumentation19Y.validation.requiredDescription"),
        requiredInstructions: t("providerDischargeDocumentation19Y.validation.requiredInstructions"),
        requiredMedication: t("providerDischargeDocumentation19Y.validation.requiredMedication"),
        requiredReturnPrecautions: t("providerDischargeDocumentation19Y.validation.requiredReturnPrecautions"),
        requiredFollowUp: t("providerDischargeDocumentation19Y.validation.requiredFollowUp"),
      });
      if (validationErrors) {
        setProviderDischargeValidationErrors(validationErrors);
        setSaveInfo(t("providerDischargeDocumentation19Y.validation.saveBlocked"));
        return;
      }
    }
    setProviderDischargeValidationErrors(null);

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
        canEditMedicalDischarge,
        outcomeUi
      );

      const admissionPayload = admissionFormToPayload(admissionForm);

      const body: Record<string, unknown> = {};
      /**
       * Phase 15F-D — observation admission must not PATCH discharge summary (avoids
       * DISCHARGE_SUMMARY_SAVED timeline noise). Trackboard disposition uses admission packet + erDispositionV1.
       */
      if (mergedDischarge !== null && outcomeUi !== "ADMISSION") {
        if (canEditMedicalDischarge) {
          body.dischargeSummaryJson = buildProviderDischargeJsonForSave(
            encounter.dischargeSummaryJson,
            providerDischargeDoc,
            { documentedAt: signature.savedAt, documentedByDisplayName: savedByDisplayName }
          );
        } else {
          body.dischargeSummaryJson = mergedDischarge;
        }
      }
      if (
        outcomeUi === "ADMISSION" &&
        canPrescribe &&
        encounter.status === "OPEN" &&
        Object.keys(admissionPayload).length > 0
      ) {
        body.admissionSummaryJson = admissionPayload;
      }
      const naWithDisp = mergeErDispositionV1IntoNursingAssessment(
        encounter.nursingAssessment,
        supplementForm,
        signature
      );
      body.nursingAssessment = applyEmtalaV1ComplementToNursingAssessment(naWithDisp, {
        outcome: outcomeUi,
        complement: emtalaComplement,
        dispositionDecidedAtIso: signature.savedAt,
      });

      const res = await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      await onSaved();
      setSaveInfo(
        queued
          ? t("emergencyDisposition.saveQueued")
          : outcomeUi === "ADMISSION"
            ? t("emergencyDisposition.saveOkObservationAdmission")
            : t("emergencyDisposition.saveOk")
      );
    } catch (e) {
      console.error(e);
      setSaveInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t("emergencyDisposition.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAdmissionConfirm = async () => {
    if (cancelSaving) return;
    const reason = cancelReason.trim();
    if (reason.length < 3) {
      setCancelError(t("emergencyDisposition.cancelAdmissionReasonRequired"));
      return;
    }
    if (reason.length > 500) {
      setCancelError(t("emergencyDisposition.cancelAdmissionReasonTooLong"));
      return;
    }
    setCancelSaving(true);
    setCancelError(null);
    try {
      await apiFetch(`/encounters/${encounterId}/admission/cancel`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellationReason: reason }),
      });
      await onSaved();
      setCancelOpen(false);
      setCancelReason("");
      setSaveInfo(t("emergencyDisposition.cancelAdmissionSuccess"));
    } catch (e) {
      setCancelError(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("emergencyDisposition.cancelAdmissionFailed")
      );
    } finally {
      setCancelSaving(false);
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
  const observationHandoffReady = useMemo(
    () => erHandoffV1SatisfiesInpatientTransferConfirm(encounter.nursingAssessment),
    [encounter.nursingAssessment]
  );
  const showObservationHandoffStatus = showAdmissionFields && hasSavedAdmission;
  const showProviderDischargeDocumentation =
    outcomeUi !== "ADMISSION" && (outcomeUi === "HOME" || outcomeUi === "AMA" || outcomeUi === "LWBS" || outcomeUi === "OTHER" || outcomeUi === "TRANSFER");

  const showTransferExtra = outcomeUi === "TRANSFER";
  const showAmaExtra = outcomeUi === "AMA";
  const showLwbsExtra = outcomeUi === "LWBS";
  const showDeceasedExtra = outcomeUi === "DECEASED";

  return (
    <>
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

        {showObservationHandoffStatus ? (
          <p
            style={{
              margin: "10px 0 0 0",
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${observationHandoffReady ? "#bbf7d0" : "#fde68a"}`,
              backgroundColor: observationHandoffReady ? "#f0fdf4" : "#fffbeb",
              fontSize: 13,
              color: observationHandoffReady ? "#166534" : "#92400e",
              lineHeight: 1.45,
            }}
          >
            {observationHandoffReady
              ? t("emergencyDisposition.observationActive")
              : t("emergencyDisposition.observationHandoffAwaitingRn")}
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

            {showProviderDischargeDocumentation ?
              <ProviderDischargeDocumentationSection
                facilityId={facilityId}
                patientId={encounter.patient?.id}
                encounterId={encounterId}
                providerForm={providerDischargeDoc}
                onProviderFormChange={onProviderDischargeDocChange}
                disabled={medDisabled}
                validationErrors={providerDischargeValidationErrors}
              />
            : null}

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
                  {hasSavedAdmission && !formDisabled ? (
                    <div
                      style={{
                        marginTop: 4,
                        paddingTop: 10,
                        borderTop: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCancelOpen(true);
                          setCancelError(null);
                          setCancelReason("");
                        }}
                        style={{
                          padding: "7px 12px",
                          borderRadius: 8,
                          border: "1px solid #fecaca",
                          backgroundColor: "#fff",
                          color: "#b91c1c",
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {t("emergencyDisposition.cancelAdmissionButton")}
                      </button>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {t("emergencyDisposition.cancelAdmissionHint")}
                      </span>
                    </div>
                  ) : null}
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

            <div
              style={{
                marginTop: 8,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #bae6fd",
                backgroundColor: "#f0f9ff",
              }}
            >
              <p style={sectionHeading}>{t("emergencyDisposition.emtalaBlock")}</p>
              {showTransferExtra ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelTransferRequestedAt")}</label>
                    <input
                      type="datetime-local"
                      value={emtalaComplement.transferRequestedAt}
                      onChange={(e) => patchEmtalaComplement({ transferRequestedAt: e.target.value })}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelTransferAcceptedAt")}</label>
                    <input
                      type="datetime-local"
                      value={emtalaComplement.transferAcceptedAt}
                      onChange={(e) => patchEmtalaComplement({ transferAcceptedAt: e.target.value })}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelAcceptingFacility")}</label>
                    <input
                      type="text"
                      value={emtalaComplement.acceptingFacilityName}
                      onChange={(e) => patchEmtalaComplement({ acceptingFacilityName: e.target.value })}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelAcceptingClinician")}</label>
                    <input
                      type="text"
                      value={emtalaComplement.acceptingClinicianName}
                      onChange={(e) => patchEmtalaComplement({ acceptingClinicianName: e.target.value })}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelTransferMode")}</label>
                    <input
                      type="text"
                      value={emtalaComplement.transferMode}
                      onChange={(e) => patchEmtalaComplement({ transferMode: e.target.value })}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelTransferReason")}</label>
                    {ta(
                      2,
                      emtalaComplement.transferReason,
                      (v) => patchEmtalaComplement({ transferReason: v }),
                      formDisabled
                    )}
                  </div>
                </div>
              ) : null}
              {showAmaExtra ? (
                <div style={{ marginTop: showTransferExtra ? 8 : 6 }}>
                  <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelAmaRiskDoc")}</label>
                  <select
                    value={emtalaComplement.amaRiskDiscussionDocumented}
                    onChange={(e) =>
                      patchEmtalaComplement({
                        amaRiskDiscussionDocumented: e.target.value as EmtalaDispositionComplementForm["amaRiskDiscussionDocumented"],
                      })
                    }
                    disabled={formDisabled}
                    style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                  >
                    <option value="">{t("emergencyDisposition.emtalaTriUnset")}</option>
                    <option value="true">{t("emergencyDisposition.emtalaTriYes")}</option>
                    <option value="false">{t("emergencyDisposition.emtalaTriNo")}</option>
                  </select>
                </div>
              ) : null}
              {showLwbsExtra ? (
                <div style={{ marginTop: 8 }}>
                  <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelLwbsDocumentedAt")}</label>
                  <input
                    type="datetime-local"
                    value={emtalaComplement.lwbsDocumentedAt}
                    onChange={(e) => patchEmtalaComplement({ lwbsDocumentedAt: e.target.value })}
                    disabled={formDisabled}
                    style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                  />
                </div>
              ) : null}
              <p style={{ ...sectionHeading, marginTop: 10 }}>{t("emergencyDisposition.emtalaAttestSection")}</p>
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelMsePerformed")}</label>
                  <select
                    value={emtalaComplement.msePerformed}
                    onChange={(e) =>
                      patchEmtalaComplement({ msePerformed: e.target.value as EmtalaDispositionComplementForm["msePerformed"] })
                    }
                    disabled={formDisabled}
                    style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                  >
                    <option value="">{t("emergencyDisposition.emtalaTriUnset")}</option>
                    <option value="true">{t("emergencyDisposition.emtalaTriYes")}</option>
                    <option value="false">{t("emergencyDisposition.emtalaTriNo")}</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelEmcConsidered")}</label>
                  <select
                    value={emtalaComplement.emergencyConditionConsidered}
                    onChange={(e) =>
                      patchEmtalaComplement({
                        emergencyConditionConsidered: e.target.value as EmtalaDispositionComplementForm["emergencyConditionConsidered"],
                      })
                    }
                    disabled={formDisabled}
                    style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                  >
                    <option value="">{t("emergencyDisposition.emtalaTriUnset")}</option>
                    <option value="true">{t("emergencyDisposition.emtalaTriYes")}</option>
                    <option value="false">{t("emergencyDisposition.emtalaTriNo")}</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t("emergencyDisposition.emtalaLabelStabilizing")}</label>
                  <select
                    value={emtalaComplement.stabilizingTreatmentProvidedOrNotApplicable}
                    onChange={(e) =>
                      patchEmtalaComplement({
                        stabilizingTreatmentProvidedOrNotApplicable: e.target.value as EmtalaDispositionComplementForm["stabilizingTreatmentProvidedOrNotApplicable"],
                      })
                    }
                    disabled={formDisabled}
                    style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                  >
                    <option value="">{t("emergencyDisposition.emtalaTriUnset")}</option>
                    <option value="true">{t("emergencyDisposition.emtalaTriYes")}</option>
                    <option value="false">{t("emergencyDisposition.emtalaTriNo")}</option>
                  </select>
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
    {cancelOpen ? (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("emergencyDisposition.cancelAdmissionTitle")}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 16,
        }}
        onClick={() => {
          if (!cancelSaving) setCancelOpen(false);
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 460,
            backgroundColor: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.18)",
            padding: 18,
            boxSizing: "border-box",
          }}
        >
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
            {t("emergencyDisposition.cancelAdmissionTitle")}
          </p>
          <p style={{ margin: "6px 0 12px 0", fontSize: 13, color: "#475569", lineHeight: 1.45 }}>
            {t("emergencyDisposition.cancelAdmissionBody")}
          </p>
          <label style={labelStyle}>{t("emergencyDisposition.cancelAdmissionReasonLabel")}</label>
          <textarea
            value={cancelReason}
            onChange={(e) => {
              setCancelReason(e.target.value);
              if (cancelError) setCancelError(null);
            }}
            disabled={cancelSaving}
            rows={3}
            maxLength={500}
            placeholder={t("emergencyDisposition.cancelAdmissionReasonPlaceholder")}
            style={{
              ...inputBase,
              minHeight: 76,
              resize: "vertical",
              backgroundColor: cancelSaving ? "#f8fafc" : "#fff",
            }}
          />
          {cancelError ? (
            <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#b91c1c" }}>{cancelError}</p>
          ) : null}
          <div
            style={{
              marginTop: 14,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setCancelOpen(false)}
              disabled={cancelSaving}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                backgroundColor: "#fff",
                color: "#0f172a",
                fontWeight: 600,
                fontSize: 13,
                cursor: cancelSaving ? "not-allowed" : "pointer",
              }}
            >
              {t("emergencyDisposition.cancelAdmissionKeep")}
            </button>
            <button
              type="button"
              onClick={() => void handleCancelAdmissionConfirm()}
              disabled={cancelSaving}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "1px solid #b91c1c",
                backgroundColor: cancelSaving ? "#fecaca" : "#b91c1c",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: cancelSaving ? "not-allowed" : "pointer",
              }}
            >
              {cancelSaving
                ? t("emergencyDisposition.cancelAdmissionSaving")
                : t("emergencyDisposition.cancelAdmissionConfirm")}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
