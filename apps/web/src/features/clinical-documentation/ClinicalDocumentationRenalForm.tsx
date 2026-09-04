"use client";

import React, { useMemo, useState } from "react";
import {
  calculateRenalNetBalance,
  calculateRenalWeightChange,
  CRRT_MONITORING_REFERENCE_CARD_ID,
  DAILY_WEIGHT_EDEMA_MONITORING_CARD_ID,
  DIALYSIS_ACCESS_ASSESSMENT_CARD_ID,
  EDOC21_DIALYSIS_RENAL_FLUID_MANAGEMENT_DOCUMENTATION_CARD_IDS,
  FLUID_RESTRICTION_MONITORING_CARD_ID,
  HEMODIALYSIS_MONITORING_REFERENCE_CARD_ID,
  PERITONEAL_DIALYSIS_MONITORING_REFERENCE_CARD_ID,
  RENAL_ACCESS_LOCATION_OPTIONS,
  RENAL_ACCESS_TYPE_OPTIONS,
  RENAL_CRRT_ACCESS_STATUS_OPTIONS,
  RENAL_CRRT_STATUS_OPTIONS,
  RENAL_DRESSING_STATUS_OPTIONS,
  RENAL_EDEMA_LOCATION_OPTIONS,
  RENAL_EDEMA_SEVERITY_OPTIONS,
  RENAL_EFFLUENT_APPEARANCE_OPTIONS,
  RENAL_ESCALATION_REASON_OPTIONS,
  RENAL_HEMODIALYSIS_STATUS_OPTIONS,
  RENAL_PD_STATUS_OPTIONS,
  RENAL_REVIEW_PERIOD_OPTIONS,
  RENAL_SITE_STATUS_OPTIONS,
  RENAL_URINE_CONCERN_TYPE_OPTIONS,
  RENAL_YES_NO_NA_OPTIONS,
  RENAL_YES_NO_OPTIONS,
  RENAL_YES_NO_UNKNOWN_OPTIONS,
  RENAL_ESCALATION_EVENT_CARD_ID,
  RENAL_INTAKE_OUTPUT_REVIEW_CARD_ID,
  RENAL_MEDICATION_SAFETY_REVIEW_CARD_ID,
  URINE_OUTPUT_CONCERN_CARD_ID,
  validateDialysisRenalFluidManagementDocumentationPayloadForCard,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { ClinicalDocumentationSelectField } from "./ClinicalDocumentationFieldControls";

import { resolveProductUiLanguageOrDefault } from "@/i18n/config";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  minHeight: 36,
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 2,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
  gap: 8,
};

const formStyle: React.CSSProperties = {
  marginTop: 8,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const calcStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  margin: 0,
  padding: "6px 8px",
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 8,
  background: "#eff6ff",
  color: "#1e40af",
  border: "1px solid #bfdbfe",
};

type YesNo = (typeof RENAL_YES_NO_OPTIONS)[number]["value"];
type YesNoUnknown = (typeof RENAL_YES_NO_UNKNOWN_OPTIONS)[number]["value"];
type YesNoNa = (typeof RENAL_YES_NO_NA_OPTIONS)[number]["value"];

function nowLocalDatetimeValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

function optionalNum(s: string): number | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function YesNoField({
  label,
  value,
  locale,
  onChange,
  testId,
}: {
  label: string;
  value: YesNo;
  locale: string;
  onChange: (v: YesNo) => void;
  testId?: string;
}) {
  return (
    <ClinicalDocumentationSelectField
      label={label}
      value={value}
      options={RENAL_YES_NO_OPTIONS}
      locale={locale}
      onChange={onChange}
      testId={testId}
    />
  );
}

export function ClinicalDocumentationRenalForm({
  cardId,
  saving,
  onSubmit,
}: {
  cardId: string;
  saving: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const { t, language } = useI18n();
  const locale = resolveProductUiLanguageOrDefault(language);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [access, setAccess] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    accessType: "TUNNELED_CATHETER" as (typeof RENAL_ACCESS_TYPE_OPTIONS)[number]["value"],
    accessLocation: "LEFT_CHEST" as (typeof RENAL_ACCESS_LOCATION_OPTIONS)[number]["value"],
    thrillPresent: "NOT_APPLICABLE" as YesNoNa,
    bruitPresent: "NOT_APPLICABLE" as YesNoNa,
    siteStatus: "NORMAL" as (typeof RENAL_SITE_STATUS_OPTIONS)[number]["value"],
    dressingStatus: "CLEAN_DRY_INTACT" as (typeof RENAL_DRESSING_STATUS_OPTIONS)[number]["value"],
    infectionConcern: "NO" as YesNo,
    bleedingConcern: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [hd, setHd] = useState({
    documentationTime: nowLocalDatetimeValue(),
    dialysisStatus: "SCHEDULED" as (typeof RENAL_HEMODIALYSIS_STATUS_OPTIONS)[number]["value"],
    preDialysisWeightKg: "",
    postDialysisWeightKg: "",
    estimatedFluidRemovedMl: "",
    bloodPressureConcern: "NO" as YesNo,
    crampingReported: "NO" as YesNo,
    accessIssueObserved: "NO" as YesNo,
    dialysisNurseNotified: "NOT_APPLICABLE" as YesNoNa,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [pd, setPd] = useState({
    documentationTime: nowLocalDatetimeValue(),
    pdStatus: "SCHEDULED" as (typeof RENAL_PD_STATUS_OPTIONS)[number]["value"],
    effluentAppearance: "CLEAR" as (typeof RENAL_EFFLUENT_APPEARANCE_OPTIONS)[number]["value"],
    abdominalPain: "NO" as YesNo,
    exitSiteConcern: "NO" as YesNo,
    exchangeCompleted: "NOT_APPLICABLE" as YesNoNa,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [crrt, setCrrt] = useState({
    documentationTime: nowLocalDatetimeValue(),
    crrtStatus: "IN_PROGRESS" as (typeof RENAL_CRRT_STATUS_OPTIONS)[number]["value"],
    accessStatus: "PATENT" as (typeof RENAL_CRRT_ACCESS_STATUS_OPTIONS)[number]["value"],
    fluidRemovalGoalMlPerHr: "",
    actualFluidRemovalMlPerHr: "",
    filterConcern: "NO" as YesNo,
    hemodynamicInstability: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [renalIo, setRenalIo] = useState({
    reviewTime: nowLocalDatetimeValue(),
    reviewPeriod: "SHIFT" as (typeof RENAL_REVIEW_PERIOD_OPTIONS)[number]["value"],
    totalIntakeMl: "",
    totalOutputMl: "",
    urineOutputMl: "",
    fluidBalanceConcern: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const renalNetBalance = useMemo(() => {
    const intake = optionalNum(renalIo.totalIntakeMl);
    const output = optionalNum(renalIo.totalOutputMl);
    if (intake === undefined || output === undefined) return null;
    return calculateRenalNetBalance(intake, output);
  }, [renalIo.totalIntakeMl, renalIo.totalOutputMl]);

  const [fluidRestriction, setFluidRestriction] = useState({
    documentationTime: nowLocalDatetimeValue(),
    fluidRestrictionOrdered: "UNKNOWN" as YesNoUnknown,
    restrictionAmountMlPerDay: "",
    intakeThisShiftMl: "",
    patientEducationProvided: "NO" as YesNo,
    complianceConcern: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [weightEdema, setWeightEdema] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    weightKg: "",
    previousWeightKg: "",
    edemaPresent: "NO" as YesNo,
    edemaLocation: "NONE" as (typeof RENAL_EDEMA_LOCATION_OPTIONS)[number]["value"],
    edemaSeverity: "NONE" as (typeof RENAL_EDEMA_SEVERITY_OPTIONS)[number]["value"],
    fluidOverloadConcern: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const renalWeightChange = useMemo(() => {
    const w = optionalNum(weightEdema.weightKg);
    const prev = optionalNum(weightEdema.previousWeightKg);
    if (w === undefined || prev === undefined) return null;
    return calculateRenalWeightChange(w, prev);
  }, [weightEdema.weightKg, weightEdema.previousWeightKg]);

  const [urineConcern, setUrineConcern] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    concernType: "OLIGURIA" as (typeof RENAL_URINE_CONCERN_TYPE_OPTIONS)[number]["value"],
    urineOutputMl: "",
    timePeriodHours: "",
    foleyPresent: "UNKNOWN" as YesNoUnknown,
    bladderScanPerformed: "NOT_APPLICABLE" as YesNoNa,
    bladderScanVolumeMl: "",
    providerNotified: "YES" as YesNo,
    notes: "",
  });

  const [medSafety, setMedSafety] = useState({
    reviewTime: nowLocalDatetimeValue(),
    renalFunctionConcern: "NO" as YesNo,
    nephrotoxicMedicationConcern: "NO" as YesNo,
    doseAdjustmentConcern: "NO" as YesNo,
    contrastExposureConcern: "NO" as YesNo,
    pharmacyNotified: "NOT_APPLICABLE" as YesNoNa,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [escalation, setEscalation] = useState({
    eventTime: nowLocalDatetimeValue(),
    reason: "FLUID_OVERLOAD" as (typeof RENAL_ESCALATION_REASON_OPTIONS)[number]["value"],
    providerNotified: "YES" as YesNo,
    providerNotificationTime: nowLocalDatetimeValue(),
    nephrologyNotified: "NOT_APPLICABLE" as YesNoNa,
    responseReceived: "NO" as YesNo,
    responseTime: "",
    rapidResponseActivated: "NO" as YesNo,
    notes: "",
  });

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case DIALYSIS_ACCESS_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(access.assessmentTime),
          accessType: access.accessType,
          accessLocation: access.accessLocation,
          thrillPresent: access.thrillPresent,
          bruitPresent: access.bruitPresent,
          siteStatus: access.siteStatus,
          dressingStatus: access.dressingStatus,
          infectionConcern: access.infectionConcern,
          bleedingConcern: access.bleedingConcern,
          providerNotified: access.providerNotified,
          notes: access.notes.trim() || undefined,
        };
      case HEMODIALYSIS_MONITORING_REFERENCE_CARD_ID:
        return {
          documentationTime: toIsoFromLocalDatetime(hd.documentationTime),
          dialysisStatus: hd.dialysisStatus,
          ...(optionalNum(hd.preDialysisWeightKg) !== undefined
            ? { preDialysisWeightKg: optionalNum(hd.preDialysisWeightKg) }
            : {}),
          ...(optionalNum(hd.postDialysisWeightKg) !== undefined
            ? { postDialysisWeightKg: optionalNum(hd.postDialysisWeightKg) }
            : {}),
          ...(optionalNum(hd.estimatedFluidRemovedMl) !== undefined
            ? { estimatedFluidRemovedMl: optionalNum(hd.estimatedFluidRemovedMl) }
            : {}),
          bloodPressureConcern: hd.bloodPressureConcern,
          crampingReported: hd.crampingReported,
          accessIssueObserved: hd.accessIssueObserved,
          dialysisNurseNotified: hd.dialysisNurseNotified,
          providerNotified: hd.providerNotified,
          notes: hd.notes.trim() || undefined,
        };
      case PERITONEAL_DIALYSIS_MONITORING_REFERENCE_CARD_ID:
        return {
          documentationTime: toIsoFromLocalDatetime(pd.documentationTime),
          pdStatus: pd.pdStatus,
          effluentAppearance: pd.effluentAppearance,
          abdominalPain: pd.abdominalPain,
          exitSiteConcern: pd.exitSiteConcern,
          exchangeCompleted: pd.exchangeCompleted,
          providerNotified: pd.providerNotified,
          notes: pd.notes.trim() || undefined,
        };
      case CRRT_MONITORING_REFERENCE_CARD_ID:
        return {
          documentationTime: toIsoFromLocalDatetime(crrt.documentationTime),
          crrtStatus: crrt.crrtStatus,
          accessStatus: crrt.accessStatus,
          ...(optionalNum(crrt.fluidRemovalGoalMlPerHr) !== undefined
            ? { fluidRemovalGoalMlPerHr: optionalNum(crrt.fluidRemovalGoalMlPerHr) }
            : {}),
          ...(optionalNum(crrt.actualFluidRemovalMlPerHr) !== undefined
            ? { actualFluidRemovalMlPerHr: optionalNum(crrt.actualFluidRemovalMlPerHr) }
            : {}),
          filterConcern: crrt.filterConcern,
          hemodynamicInstability: crrt.hemodynamicInstability,
          providerNotified: crrt.providerNotified,
          notes: crrt.notes.trim() || undefined,
        };
      case RENAL_INTAKE_OUTPUT_REVIEW_CARD_ID:
        return {
          reviewTime: toIsoFromLocalDatetime(renalIo.reviewTime),
          reviewPeriod: renalIo.reviewPeriod,
          ...(optionalNum(renalIo.totalIntakeMl) !== undefined
            ? { totalIntakeMl: optionalNum(renalIo.totalIntakeMl) }
            : {}),
          ...(optionalNum(renalIo.totalOutputMl) !== undefined
            ? { totalOutputMl: optionalNum(renalIo.totalOutputMl) }
            : {}),
          ...(renalNetBalance !== null ? { netBalanceMl: renalNetBalance } : {}),
          ...(optionalNum(renalIo.urineOutputMl) !== undefined
            ? { urineOutputMl: optionalNum(renalIo.urineOutputMl) }
            : {}),
          fluidBalanceConcern: renalIo.fluidBalanceConcern,
          providerNotified: renalIo.providerNotified,
          notes: renalIo.notes.trim() || undefined,
        };
      case FLUID_RESTRICTION_MONITORING_CARD_ID:
        return {
          documentationTime: toIsoFromLocalDatetime(fluidRestriction.documentationTime),
          fluidRestrictionOrdered: fluidRestriction.fluidRestrictionOrdered,
          ...(optionalNum(fluidRestriction.restrictionAmountMlPerDay) !== undefined
            ? { restrictionAmountMlPerDay: optionalNum(fluidRestriction.restrictionAmountMlPerDay) }
            : {}),
          ...(optionalNum(fluidRestriction.intakeThisShiftMl) !== undefined
            ? { intakeThisShiftMl: optionalNum(fluidRestriction.intakeThisShiftMl) }
            : {}),
          patientEducationProvided: fluidRestriction.patientEducationProvided,
          complianceConcern: fluidRestriction.complianceConcern,
          providerNotified: fluidRestriction.providerNotified,
          notes: fluidRestriction.notes.trim() || undefined,
        };
      case DAILY_WEIGHT_EDEMA_MONITORING_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(weightEdema.assessmentTime),
          ...(optionalNum(weightEdema.weightKg) !== undefined
            ? { weightKg: optionalNum(weightEdema.weightKg) }
            : {}),
          ...(optionalNum(weightEdema.previousWeightKg) !== undefined
            ? { previousWeightKg: optionalNum(weightEdema.previousWeightKg) }
            : {}),
          ...(renalWeightChange !== null ? { weightChangeKg: renalWeightChange } : {}),
          edemaPresent: weightEdema.edemaPresent,
          edemaLocation: weightEdema.edemaLocation,
          edemaSeverity: weightEdema.edemaSeverity,
          fluidOverloadConcern: weightEdema.fluidOverloadConcern,
          providerNotified: weightEdema.providerNotified,
          notes: weightEdema.notes.trim() || undefined,
        };
      case URINE_OUTPUT_CONCERN_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(urineConcern.assessmentTime),
          concernType: urineConcern.concernType,
          ...(optionalNum(urineConcern.urineOutputMl) !== undefined
            ? { urineOutputMl: optionalNum(urineConcern.urineOutputMl) }
            : {}),
          ...(optionalNum(urineConcern.timePeriodHours) !== undefined
            ? { timePeriodHours: optionalNum(urineConcern.timePeriodHours) }
            : {}),
          foleyPresent: urineConcern.foleyPresent,
          bladderScanPerformed: urineConcern.bladderScanPerformed,
          ...(urineConcern.bladderScanPerformed === "YES" &&
          optionalNum(urineConcern.bladderScanVolumeMl) !== undefined
            ? { bladderScanVolumeMl: optionalNum(urineConcern.bladderScanVolumeMl) }
            : {}),
          providerNotified: urineConcern.providerNotified,
          notes: urineConcern.notes.trim() || undefined,
        };
      case RENAL_MEDICATION_SAFETY_REVIEW_CARD_ID:
        return {
          reviewTime: toIsoFromLocalDatetime(medSafety.reviewTime),
          renalFunctionConcern: medSafety.renalFunctionConcern,
          nephrotoxicMedicationConcern: medSafety.nephrotoxicMedicationConcern,
          doseAdjustmentConcern: medSafety.doseAdjustmentConcern,
          contrastExposureConcern: medSafety.contrastExposureConcern,
          pharmacyNotified: medSafety.pharmacyNotified,
          providerNotified: medSafety.providerNotified,
          notes: medSafety.notes.trim() || undefined,
        };
      case RENAL_ESCALATION_EVENT_CARD_ID:
        return {
          eventTime: toIsoFromLocalDatetime(escalation.eventTime),
          reason: escalation.reason,
          providerNotified: escalation.providerNotified,
          providerNotificationTime: toIsoFromLocalDatetime(escalation.providerNotificationTime),
          nephrologyNotified: escalation.nephrologyNotified,
          responseReceived: escalation.responseReceived,
          ...(escalation.responseTime.trim()
            ? { responseTime: toIsoFromLocalDatetime(escalation.responseTime) }
            : {}),
          rapidResponseActivated: escalation.rapidResponseActivated,
          notes: escalation.notes.trim() || undefined,
        };
      default:
        return {};
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    const payload = buildPayload();
    const validated = validateDialysisRenalFluidManagementDocumentationPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.renal.validationError"));
      return;
    }
    await onSubmit(validated.data);
  }

  function NotesField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <label style={{ gridColumn: "1 / -1" }}>
        <span style={labelStyle}>{t("clinicalDocumentation.forms.renal.notes")}</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          style={{ ...fieldStyle, minHeight: 56, resize: "vertical" }}
        />
      </label>
    );
  }

  function DateTimeField({
    label,
    value,
    onChange,
    testId,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    testId?: string;
  }) {
    return (
      <label>
        <span style={labelStyle}>{label}</span>
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={fieldStyle}
          data-testid={testId}
        />
      </label>
    );
  }

  function renderFields() {
    switch (cardId) {
      case DIALYSIS_ACCESS_ASSESSMENT_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.renal.assessmentTime")}
              value={access.assessmentTime}
              onChange={(v) => setAccess((s) => ({ ...s, assessmentTime: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.accessType")}
              value={access.accessType}
              options={RENAL_ACCESS_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setAccess((s) => ({ ...s, accessType: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.accessLocation")}
              value={access.accessLocation}
              options={RENAL_ACCESS_LOCATION_OPTIONS}
              locale={locale}
              onChange={(v) => setAccess((s) => ({ ...s, accessLocation: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.thrillPresent")}
              value={access.thrillPresent}
              options={RENAL_YES_NO_NA_OPTIONS}
              locale={locale}
              onChange={(v) => setAccess((s) => ({ ...s, thrillPresent: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.bruitPresent")}
              value={access.bruitPresent}
              options={RENAL_YES_NO_NA_OPTIONS}
              locale={locale}
              onChange={(v) => setAccess((s) => ({ ...s, bruitPresent: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.siteStatus")}
              value={access.siteStatus}
              options={RENAL_SITE_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setAccess((s) => ({ ...s, siteStatus: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.dressingStatus")}
              value={access.dressingStatus}
              options={RENAL_DRESSING_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setAccess((s) => ({ ...s, dressingStatus: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.infectionConcern")}
              value={access.infectionConcern}
              locale={locale}
              onChange={(v) => setAccess((s) => ({ ...s, infectionConcern: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.bleedingConcern")}
              value={access.bleedingConcern}
              locale={locale}
              onChange={(v) => setAccess((s) => ({ ...s, bleedingConcern: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.providerNotified")}
              value={access.providerNotified}
              locale={locale}
              onChange={(v) => setAccess((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={access.notes} onChange={(v) => setAccess((s) => ({ ...s, notes: v }))} />
          </>
        );
      case HEMODIALYSIS_MONITORING_REFERENCE_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.renal.documentationTime")}
              value={hd.documentationTime}
              onChange={(v) => setHd((s) => ({ ...s, documentationTime: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.dialysisStatus")}
              value={hd.dialysisStatus}
              options={RENAL_HEMODIALYSIS_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setHd((s) => ({ ...s, dialysisStatus: v }))}
            />
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.renal.estimatedFluidRemovedMl")}</span>
              <input
                type="number"
                min={0}
                value={hd.estimatedFluidRemovedMl}
                onChange={(e) => setHd((s) => ({ ...s, estimatedFluidRemovedMl: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.bloodPressureConcern")}
              value={hd.bloodPressureConcern}
              locale={locale}
              onChange={(v) => setHd((s) => ({ ...s, bloodPressureConcern: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.accessIssueObserved")}
              value={hd.accessIssueObserved}
              locale={locale}
              onChange={(v) => setHd((s) => ({ ...s, accessIssueObserved: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.dialysisNurseNotified")}
              value={hd.dialysisNurseNotified}
              options={RENAL_YES_NO_NA_OPTIONS}
              locale={locale}
              onChange={(v) => setHd((s) => ({ ...s, dialysisNurseNotified: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.providerNotified")}
              value={hd.providerNotified}
              locale={locale}
              onChange={(v) => setHd((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={hd.notes} onChange={(v) => setHd((s) => ({ ...s, notes: v }))} />
          </>
        );
      case PERITONEAL_DIALYSIS_MONITORING_REFERENCE_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.renal.documentationTime")}
              value={pd.documentationTime}
              onChange={(v) => setPd((s) => ({ ...s, documentationTime: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.pdStatus")}
              value={pd.pdStatus}
              options={RENAL_PD_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setPd((s) => ({ ...s, pdStatus: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.effluentAppearance")}
              value={pd.effluentAppearance}
              options={RENAL_EFFLUENT_APPEARANCE_OPTIONS}
              locale={locale}
              onChange={(v) => setPd((s) => ({ ...s, effluentAppearance: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.abdominalPain")}
              value={pd.abdominalPain}
              locale={locale}
              onChange={(v) => setPd((s) => ({ ...s, abdominalPain: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.exitSiteConcern")}
              value={pd.exitSiteConcern}
              locale={locale}
              onChange={(v) => setPd((s) => ({ ...s, exitSiteConcern: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.providerNotified")}
              value={pd.providerNotified}
              locale={locale}
              onChange={(v) => setPd((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={pd.notes} onChange={(v) => setPd((s) => ({ ...s, notes: v }))} />
          </>
        );
      case CRRT_MONITORING_REFERENCE_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.renal.documentationTime")}
              value={crrt.documentationTime}
              onChange={(v) => setCrrt((s) => ({ ...s, documentationTime: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.crrtStatus")}
              value={crrt.crrtStatus}
              options={RENAL_CRRT_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setCrrt((s) => ({ ...s, crrtStatus: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.accessStatus")}
              value={crrt.accessStatus}
              options={RENAL_CRRT_ACCESS_STATUS_OPTIONS}
              locale={locale}
              onChange={(v) => setCrrt((s) => ({ ...s, accessStatus: v }))}
            />
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.renal.fluidRemovalGoalMlPerHr")}</span>
              <input
                type="number"
                min={0}
                value={crrt.fluidRemovalGoalMlPerHr}
                onChange={(e) => setCrrt((s) => ({ ...s, fluidRemovalGoalMlPerHr: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.renal.actualFluidRemovalMlPerHr")}</span>
              <input
                type="number"
                min={0}
                value={crrt.actualFluidRemovalMlPerHr}
                onChange={(e) => setCrrt((s) => ({ ...s, actualFluidRemovalMlPerHr: e.target.value }))}
                style={fieldStyle}
              />
            </label>
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.filterConcern")}
              value={crrt.filterConcern}
              locale={locale}
              onChange={(v) => setCrrt((s) => ({ ...s, filterConcern: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.hemodynamicInstability")}
              value={crrt.hemodynamicInstability}
              locale={locale}
              onChange={(v) => setCrrt((s) => ({ ...s, hemodynamicInstability: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.providerNotified")}
              value={crrt.providerNotified}
              locale={locale}
              onChange={(v) => setCrrt((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={crrt.notes} onChange={(v) => setCrrt((s) => ({ ...s, notes: v }))} />
          </>
        );
      case RENAL_INTAKE_OUTPUT_REVIEW_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.renal.reviewTime")}
              value={renalIo.reviewTime}
              onChange={(v) => setRenalIo((s) => ({ ...s, reviewTime: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.reviewPeriod")}
              value={renalIo.reviewPeriod}
              options={RENAL_REVIEW_PERIOD_OPTIONS}
              locale={locale}
              onChange={(v) => setRenalIo((s) => ({ ...s, reviewPeriod: v }))}
            />
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.renal.totalIntakeMl")}</span>
              <input
                type="number"
                min={0}
                value={renalIo.totalIntakeMl}
                onChange={(e) => setRenalIo((s) => ({ ...s, totalIntakeMl: e.target.value }))}
                style={fieldStyle}
                data-testid="renal-total-intake-ml"
              />
            </label>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.renal.totalOutputMl")}</span>
              <input
                type="number"
                min={0}
                value={renalIo.totalOutputMl}
                onChange={(e) => setRenalIo((s) => ({ ...s, totalOutputMl: e.target.value }))}
                style={fieldStyle}
                data-testid="renal-total-output-ml"
              />
            </label>
            {renalNetBalance !== null ? (
              <p style={calcStyle} data-testid="renal-net-balance-calculated">
                {t("clinicalDocumentation.forms.renal.netBalanceCalculated")}: {renalNetBalance} mL
              </p>
            ) : null}
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.fluidBalanceConcern")}
              value={renalIo.fluidBalanceConcern}
              locale={locale}
              onChange={(v) => setRenalIo((s) => ({ ...s, fluidBalanceConcern: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.providerNotified")}
              value={renalIo.providerNotified}
              locale={locale}
              onChange={(v) => setRenalIo((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={renalIo.notes} onChange={(v) => setRenalIo((s) => ({ ...s, notes: v }))} />
          </>
        );
      case FLUID_RESTRICTION_MONITORING_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.renal.documentationTime")}
              value={fluidRestriction.documentationTime}
              onChange={(v) => setFluidRestriction((s) => ({ ...s, documentationTime: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.fluidRestrictionOrdered")}
              value={fluidRestriction.fluidRestrictionOrdered}
              options={RENAL_YES_NO_UNKNOWN_OPTIONS}
              locale={locale}
              onChange={(v) => setFluidRestriction((s) => ({ ...s, fluidRestrictionOrdered: v }))}
            />
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.renal.restrictionAmountMlPerDay")}</span>
              <input
                type="number"
                min={0}
                value={fluidRestriction.restrictionAmountMlPerDay}
                onChange={(e) =>
                  setFluidRestriction((s) => ({ ...s, restrictionAmountMlPerDay: e.target.value }))
                }
                style={fieldStyle}
              />
            </label>
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.complianceConcern")}
              value={fluidRestriction.complianceConcern}
              locale={locale}
              onChange={(v) => setFluidRestriction((s) => ({ ...s, complianceConcern: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.providerNotified")}
              value={fluidRestriction.providerNotified}
              locale={locale}
              onChange={(v) => setFluidRestriction((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField
              value={fluidRestriction.notes}
              onChange={(v) => setFluidRestriction((s) => ({ ...s, notes: v }))}
            />
          </>
        );
      case DAILY_WEIGHT_EDEMA_MONITORING_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.renal.assessmentTime")}
              value={weightEdema.assessmentTime}
              onChange={(v) => setWeightEdema((s) => ({ ...s, assessmentTime: v }))}
            />
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.renal.weightKg")}</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={weightEdema.weightKg}
                onChange={(e) => setWeightEdema((s) => ({ ...s, weightKg: e.target.value }))}
                style={fieldStyle}
                data-testid="renal-weight-kg"
              />
            </label>
            <label>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.renal.previousWeightKg")}</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={weightEdema.previousWeightKg}
                onChange={(e) => setWeightEdema((s) => ({ ...s, previousWeightKg: e.target.value }))}
                style={fieldStyle}
                data-testid="renal-previous-weight-kg"
              />
            </label>
            {renalWeightChange !== null ? (
              <p style={calcStyle} data-testid="renal-weight-change-calculated">
                {t("clinicalDocumentation.forms.renal.weightChangeCalculated")}: {renalWeightChange} kg
              </p>
            ) : null}
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.edemaPresent")}
              value={weightEdema.edemaPresent}
              locale={locale}
              onChange={(v) => setWeightEdema((s) => ({ ...s, edemaPresent: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.edemaLocation")}
              value={weightEdema.edemaLocation}
              options={RENAL_EDEMA_LOCATION_OPTIONS}
              locale={locale}
              onChange={(v) => setWeightEdema((s) => ({ ...s, edemaLocation: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.fluidOverloadConcern")}
              value={weightEdema.fluidOverloadConcern}
              locale={locale}
              onChange={(v) => setWeightEdema((s) => ({ ...s, fluidOverloadConcern: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.providerNotified")}
              value={weightEdema.providerNotified}
              locale={locale}
              onChange={(v) => setWeightEdema((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField
              value={weightEdema.notes}
              onChange={(v) => setWeightEdema((s) => ({ ...s, notes: v }))}
            />
          </>
        );
      case URINE_OUTPUT_CONCERN_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.renal.assessmentTime")}
              value={urineConcern.assessmentTime}
              onChange={(v) => setUrineConcern((s) => ({ ...s, assessmentTime: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.concernType")}
              value={urineConcern.concernType}
              options={RENAL_URINE_CONCERN_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setUrineConcern((s) => ({ ...s, concernType: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.providerNotified")}
              value={urineConcern.providerNotified}
              locale={locale}
              onChange={(v) => setUrineConcern((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField
              value={urineConcern.notes}
              onChange={(v) => setUrineConcern((s) => ({ ...s, notes: v }))}
            />
          </>
        );
      case RENAL_MEDICATION_SAFETY_REVIEW_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.renal.reviewTime")}
              value={medSafety.reviewTime}
              onChange={(v) => setMedSafety((s) => ({ ...s, reviewTime: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.renalFunctionConcern")}
              value={medSafety.renalFunctionConcern}
              locale={locale}
              onChange={(v) => setMedSafety((s) => ({ ...s, renalFunctionConcern: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.nephrotoxicMedicationConcern")}
              value={medSafety.nephrotoxicMedicationConcern}
              locale={locale}
              onChange={(v) => setMedSafety((s) => ({ ...s, nephrotoxicMedicationConcern: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.pharmacyNotified")}
              value={medSafety.pharmacyNotified}
              options={RENAL_YES_NO_NA_OPTIONS}
              locale={locale}
              onChange={(v) => setMedSafety((s) => ({ ...s, pharmacyNotified: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.providerNotified")}
              value={medSafety.providerNotified}
              locale={locale}
              onChange={(v) => setMedSafety((s) => ({ ...s, providerNotified: v }))}
            />
            <NotesField value={medSafety.notes} onChange={(v) => setMedSafety((s) => ({ ...s, notes: v }))} />
          </>
        );
      case RENAL_ESCALATION_EVENT_CARD_ID:
        return (
          <>
            <DateTimeField
              label={t("clinicalDocumentation.forms.renal.eventTime")}
              value={escalation.eventTime}
              onChange={(v) => setEscalation((s) => ({ ...s, eventTime: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.escalationReason")}
              value={escalation.reason}
              options={RENAL_ESCALATION_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setEscalation((s) => ({ ...s, reason: v }))}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.renal.providerNotified")}
              value={escalation.providerNotified}
              locale={locale}
              onChange={(v) => setEscalation((s) => ({ ...s, providerNotified: v }))}
            />
            <DateTimeField
              label={t("clinicalDocumentation.forms.renal.providerNotificationTime")}
              value={escalation.providerNotificationTime}
              onChange={(v) => setEscalation((s) => ({ ...s, providerNotificationTime: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.renal.nephrologyNotified")}
              value={escalation.nephrologyNotified}
              options={RENAL_YES_NO_NA_OPTIONS}
              locale={locale}
              onChange={(v) => setEscalation((s) => ({ ...s, nephrologyNotified: v }))}
            />
            <NotesField
              value={escalation.notes}
              onChange={(v) => setEscalation((s) => ({ ...s, notes: v }))}
            />
          </>
        );
      default:
        return null;
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={formStyle}
      data-testid="clinical-documentation-renal-form"
      data-compact-layout="true"
    >
      <div style={rowStyle}>{renderFields()}</div>
      {validationError ? (
        <p style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>{validationError}</p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        style={{
          alignSelf: "flex-start",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "1px solid #0f766e",
          background: saving ? "#99f6e4" : "#0f766e",
          color: "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? t("common.saving") : t("clinicalDocumentation.saveEntry")}
      </button>
    </form>
  );
}

export function isEdoc21DialysisRenalFluidManagementDocumentationFormCard(cardId: string): boolean {
  return (EDOC21_DIALYSIS_RENAL_FLUID_MANAGEMENT_DOCUMENTATION_CARD_IDS as readonly string[]).includes(
    cardId
  );
}
