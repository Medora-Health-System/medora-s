"use client";

import React, { useMemo, useState } from "react";
import {
  EDOC23_PROCEDURAL_SAFETY_THROMBOLYTIC_CARD_IDS,
  LP_NEURO_STATUS_OPTIONS,
  LP_POST_PROCEDURE_POSITION_OPTIONS,
  LUMBAR_PUNCTURE_MONITORING_CARD_ID,
  PROC_TIMEOUT_PROCEDURE_TYPE_OPTIONS,
  PROC_YES_NO_NA_OPTIONS,
  PROC_YES_NO_OPTIONS,
  PROC_YES_NO_UNKNOWN_NA_OPTIONS,
  PROCEDURE_TIMEOUT_CARD_ID,
  THROMBOLYTIC_HOLD_REASON_OPTIONS,
  THROMBOLYTIC_INTERRUPTION_REASON_OPTIONS,
  TNK_ADMINISTRATION_CARD_ID,
  TPA_ADMINISTRATION_CARD_ID,
  isTpaTotalDoseConsistent,
  validateProceduralSafetyThrombolyticPayloadForCard,
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

type YesNo = (typeof PROC_YES_NO_OPTIONS)[number]["value"];
type YesNoNa = (typeof PROC_YES_NO_NA_OPTIONS)[number]["value"];
type YesNoUnknownNa = (typeof PROC_YES_NO_UNKNOWN_NA_OPTIONS)[number]["value"];

function nowLocalDatetimeValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label>
      <span style={labelStyle}>{label}</span>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label>
      <span style={labelStyle}>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
      />
    </label>
  );
}

function NotesField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <label style={{ gridColumn: "1 / -1" }}>
      <span style={labelStyle}>{t("clinicalDocumentation.forms.common.notes")}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        style={{ ...fieldStyle, minHeight: 56, resize: "vertical" }}
      />
    </label>
  );
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
  locale: "en" | "fr";
  onChange: (v: YesNo) => void;
  testId?: string;
}) {
  return (
    <ClinicalDocumentationSelectField
      label={label}
      value={value}
      options={PROC_YES_NO_OPTIONS}
      locale={locale}
      onChange={onChange}
      testId={testId}
    />
  );
}

function YesNoNaField({
  label,
  value,
  locale,
  onChange,
}: {
  label: string;
  value: YesNoNa;
  locale: "en" | "fr";
  onChange: (v: YesNoNa) => void;
}) {
  return (
    <ClinicalDocumentationSelectField
      label={label}
      value={value}
      options={PROC_YES_NO_NA_OPTIONS}
      locale={locale}
      onChange={onChange}
    />
  );
}

function YesNoUnknownNaField({
  label,
  value,
  locale,
  onChange,
}: {
  label: string;
  value: YesNoUnknownNa;
  locale: "en" | "fr";
  onChange: (v: YesNoUnknownNa) => void;
}) {
  return (
    <ClinicalDocumentationSelectField
      label={label}
      value={value}
      options={PROC_YES_NO_UNKNOWN_NA_OPTIONS}
      locale={locale}
      onChange={onChange}
    />
  );
}

export function ClinicalDocumentationProceduralSafetyForm({
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

  const [timeout, setTimeout] = useState({
    timeoutTime: nowLocalDatetimeValue(),
    procedureType: "CENTRAL_LINE" as (typeof PROC_TIMEOUT_PROCEDURE_TYPE_OPTIONS)[number]["value"],
    patientIdentityConfirmed: "YES" as YesNo,
    procedureConfirmed: "YES" as YesNo,
    siteConfirmed: "YES" as YesNoUnknownNa,
    consentVerified: "YES" as YesNoUnknownNa,
    allergiesReviewed: "YES" as YesNo,
    anticoagulationReviewed: "NOT_APPLICABLE" as YesNoUnknownNa,
    imagingReviewed: "NOT_APPLICABLE" as YesNoUnknownNa,
    labsReviewed: "NOT_APPLICABLE" as YesNoUnknownNa,
    equipmentAvailable: "YES" as YesNo,
    bloodProductsAvailable: "NOT_APPLICABLE" as YesNoUnknownNa,
    participantsPresent: "YES" as YesNo,
    providerPresent: "YES" as YesNo,
    nursePresent: "YES" as YesNo,
    timeoutCompleted: "YES" as YesNo,
    procedureHeld: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [lp, setLp] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    postProcedurePosition: "SUPINE" as (typeof LP_POST_PROCEDURE_POSITION_OPTIONS)[number]["value"],
    neuroStatus: "BASELINE" as (typeof LP_NEURO_STATUS_OPTIONS)[number]["value"],
    headachePresent: "NO" as YesNo,
    backPainPresent: "NO" as YesNo,
    bleedingPresent: "NO" as YesNo,
    csfLeakConcern: "NO" as YesNo,
    nauseaVomitingPresent: "NO" as YesNo,
    vitalSignsStable: "YES" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [tnk, setTnk] = useState({
    administrationTime: nowLocalDatetimeValue(),
    lastKnownWellTime: nowLocalDatetimeValue(),
    nihssScore: "8",
    patientWeightKg: "70",
    doseMg: "",
    doseVerified: "YES" as YesNo,
    ctHeadReviewed: "YES" as YesNo,
    contraindicationChecklistReviewed: "YES" as YesNo,
    providerOrderVerified: "YES" as YesNo,
    neurologyConsulted: "NOT_APPLICABLE" as YesNoUnknownNa,
    bloodPressureWithinParameters: "YES" as YesNo,
    anticoagulantUseReviewed: "YES" as YesNo,
    bleedingRiskReviewed: "YES" as YesNo,
    patientFamilyEducationProvided: "NOT_APPLICABLE" as YesNoUnknownNa,
    medicationAdministered: "YES" as YesNo,
    administrationHeld: "NO" as YesNo,
    holdReason: "BP_OUT_OF_RANGE" as (typeof THROMBOLYTIC_HOLD_REASON_OPTIONS)[number]["value"],
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [tpa, setTpa] = useState({
    administrationTime: nowLocalDatetimeValue(),
    lastKnownWellTime: nowLocalDatetimeValue(),
    nihssScore: "10",
    patientWeightKg: "80",
    totalDoseMg: "",
    bolusDoseMg: "",
    infusionDoseMg: "",
    bolusTime: nowLocalDatetimeValue(),
    infusionStartTime: nowLocalDatetimeValue(),
    infusionCompletionTime: "",
    doseVerified: "YES" as YesNo,
    ctHeadReviewed: "YES" as YesNo,
    contraindicationChecklistReviewed: "YES" as YesNo,
    providerOrderVerified: "YES" as YesNo,
    neurologyConsulted: "NOT_APPLICABLE" as YesNoUnknownNa,
    bloodPressureWithinParameters: "YES" as YesNo,
    anticoagulantUseReviewed: "YES" as YesNo,
    bleedingRiskReviewed: "YES" as YesNo,
    medicationAdministered: "YES" as YesNo,
    infusionInterrupted: "NO" as YesNo,
    interruptionReason: "BLEEDING" as (typeof THROMBOLYTIC_INTERRUPTION_REASON_OPTIONS)[number]["value"],
    administrationHeld: "NO" as YesNo,
    holdReason: "BP_OUT_OF_RANGE" as (typeof THROMBOLYTIC_HOLD_REASON_OPTIONS)[number]["value"],
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const tpaDoseWarning = useMemo(() => {
    const total = Number(tpa.totalDoseMg);
    const bolus = Number(tpa.bolusDoseMg);
    const infusion = Number(tpa.infusionDoseMg);
    if (!total || Number.isNaN(bolus) || Number.isNaN(infusion)) return null;
    if (!isTpaTotalDoseConsistent(total, bolus, infusion)) {
      return t("clinicalDocumentation.forms.thrombolytic.doseConsistencyWarning");
    }
    return null;
  }, [t, tpa.totalDoseMg, tpa.bolusDoseMg, tpa.infusionDoseMg]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    let payload: Record<string, unknown> = {};
    if (cardId === PROCEDURE_TIMEOUT_CARD_ID) {
      payload = {
        ...timeout,
        timeoutTime: toIsoFromLocalDatetime(timeout.timeoutTime),
        notes: timeout.notes.trim() || undefined,
      };
    } else if (cardId === LUMBAR_PUNCTURE_MONITORING_CARD_ID) {
      payload = {
        ...lp,
        assessmentTime: toIsoFromLocalDatetime(lp.assessmentTime),
        notes: lp.notes.trim() || undefined,
      };
    } else if (cardId === TNK_ADMINISTRATION_CARD_ID) {
      payload = {
        ...tnk,
        administrationTime: toIsoFromLocalDatetime(tnk.administrationTime),
        lastKnownWellTime: toIsoFromLocalDatetime(tnk.lastKnownWellTime),
        nihssScore: Number(tnk.nihssScore),
        patientWeightKg: Number(tnk.patientWeightKg),
        doseMg: Number(tnk.doseMg),
        holdReason: tnk.medicationAdministered === "NO" ? tnk.holdReason : undefined,
        notes: tnk.notes.trim() || undefined,
      };
    } else if (cardId === TPA_ADMINISTRATION_CARD_ID) {
      payload = {
        ...tpa,
        administrationTime: toIsoFromLocalDatetime(tpa.administrationTime),
        lastKnownWellTime: toIsoFromLocalDatetime(tpa.lastKnownWellTime),
        nihssScore: Number(tpa.nihssScore),
        patientWeightKg: Number(tpa.patientWeightKg),
        totalDoseMg: Number(tpa.totalDoseMg),
        bolusDoseMg: Number(tpa.bolusDoseMg),
        infusionDoseMg: Number(tpa.infusionDoseMg),
        bolusTime: tpa.medicationAdministered === "YES" ? toIsoFromLocalDatetime(tpa.bolusTime) : undefined,
        infusionStartTime:
          tpa.medicationAdministered === "YES" ? toIsoFromLocalDatetime(tpa.infusionStartTime) : undefined,
        infusionCompletionTime: tpa.infusionCompletionTime
          ? toIsoFromLocalDatetime(tpa.infusionCompletionTime)
          : undefined,
        interruptionReason: tpa.infusionInterrupted === "YES" ? tpa.interruptionReason : undefined,
        holdReason: tpa.medicationAdministered === "NO" ? tpa.holdReason : undefined,
        notes: tpa.notes.trim() || undefined,
      };
    }
    const result = validateProceduralSafetyThrombolyticPayloadForCard(cardId, payload);
    if (!result.ok) {
      setValidationError(t("clinicalDocumentation.forms.proceduralSafety.validationError"));
      return;
    }
    await onSubmit(result.data);
  }

  return (
    <form
      data-testid="clinical-documentation-procedural-safety-form"
      data-compact-layout="true"
      style={formStyle}
      onSubmit={handleSubmit}
    >
      {cardId === PROCEDURE_TIMEOUT_CARD_ID ? (
        <div style={rowStyle}>
          <DateTimeField
            label={t("clinicalDocumentation.forms.proceduralSafety.timeoutTime")}
            value={timeout.timeoutTime}
            onChange={(v) => setTimeout((s) => ({ ...s, timeoutTime: v }))}
          />
          <ClinicalDocumentationSelectField
            label={t("clinicalDocumentation.forms.proceduralSafety.procedureType")}
            value={timeout.procedureType}
            options={PROC_TIMEOUT_PROCEDURE_TYPE_OPTIONS}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, procedureType: v }))}
            testId="proc-timeout-type"
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.patientIdentityConfirmed")}
            value={timeout.patientIdentityConfirmed}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, patientIdentityConfirmed: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.procedureConfirmed")}
            value={timeout.procedureConfirmed}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, procedureConfirmed: v }))}
          />
          <YesNoUnknownNaField
            label={t("clinicalDocumentation.forms.proceduralSafety.siteConfirmed")}
            value={timeout.siteConfirmed}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, siteConfirmed: v }))}
          />
          <YesNoUnknownNaField
            label={t("clinicalDocumentation.forms.proceduralSafety.consentVerified")}
            value={timeout.consentVerified}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, consentVerified: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.allergiesReviewed")}
            value={timeout.allergiesReviewed}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, allergiesReviewed: v }))}
          />
          <YesNoUnknownNaField
            label={t("clinicalDocumentation.forms.proceduralSafety.anticoagulationReviewed")}
            value={timeout.anticoagulationReviewed}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, anticoagulationReviewed: v }))}
          />
          <YesNoUnknownNaField
            label={t("clinicalDocumentation.forms.proceduralSafety.imagingReviewed")}
            value={timeout.imagingReviewed}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, imagingReviewed: v }))}
          />
          <YesNoUnknownNaField
            label={t("clinicalDocumentation.forms.proceduralSafety.labsReviewed")}
            value={timeout.labsReviewed}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, labsReviewed: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.equipmentAvailable")}
            value={timeout.equipmentAvailable}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, equipmentAvailable: v }))}
          />
          <YesNoUnknownNaField
            label={t("clinicalDocumentation.forms.proceduralSafety.bloodProductsAvailable")}
            value={timeout.bloodProductsAvailable}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, bloodProductsAvailable: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.participantsPresent")}
            value={timeout.participantsPresent}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, participantsPresent: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.providerPresent")}
            value={timeout.providerPresent}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, providerPresent: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.nursePresent")}
            value={timeout.nursePresent}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, nursePresent: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.timeoutCompleted")}
            value={timeout.timeoutCompleted}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, timeoutCompleted: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.procedureHeld")}
            value={timeout.procedureHeld}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, procedureHeld: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.providerNotified")}
            value={timeout.providerNotified}
            locale={locale}
            onChange={(v) => setTimeout((s) => ({ ...s, providerNotified: v }))}
          />
          <NotesField value={timeout.notes} onChange={(v) => setTimeout((s) => ({ ...s, notes: v }))} />
        </div>
      ) : null}

      {cardId === LUMBAR_PUNCTURE_MONITORING_CARD_ID ? (
        <div style={rowStyle}>
          <DateTimeField
            label={t("clinicalDocumentation.forms.proceduralSafety.assessmentTime")}
            value={lp.assessmentTime}
            onChange={(v) => setLp((s) => ({ ...s, assessmentTime: v }))}
          />
          <ClinicalDocumentationSelectField
            label={t("clinicalDocumentation.forms.proceduralSafety.postProcedurePosition")}
            value={lp.postProcedurePosition}
            options={LP_POST_PROCEDURE_POSITION_OPTIONS}
            locale={locale}
            onChange={(v) => setLp((s) => ({ ...s, postProcedurePosition: v }))}
            testId="lp-position"
          />
          <ClinicalDocumentationSelectField
            label={t("clinicalDocumentation.forms.proceduralSafety.neuroStatus")}
            value={lp.neuroStatus}
            options={LP_NEURO_STATUS_OPTIONS}
            locale={locale}
            onChange={(v) => setLp((s) => ({ ...s, neuroStatus: v }))}
            testId="lp-neuro-status"
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.headachePresent")}
            value={lp.headachePresent}
            locale={locale}
            onChange={(v) => setLp((s) => ({ ...s, headachePresent: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.backPainPresent")}
            value={lp.backPainPresent}
            locale={locale}
            onChange={(v) => setLp((s) => ({ ...s, backPainPresent: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.bleedingPresent")}
            value={lp.bleedingPresent}
            locale={locale}
            onChange={(v) => setLp((s) => ({ ...s, bleedingPresent: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.csfLeakConcern")}
            value={lp.csfLeakConcern}
            locale={locale}
            onChange={(v) => setLp((s) => ({ ...s, csfLeakConcern: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.nauseaVomitingPresent")}
            value={lp.nauseaVomitingPresent}
            locale={locale}
            onChange={(v) => setLp((s) => ({ ...s, nauseaVomitingPresent: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.vitalSignsStable")}
            value={lp.vitalSignsStable}
            locale={locale}
            onChange={(v) => setLp((s) => ({ ...s, vitalSignsStable: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.proceduralSafety.providerNotified")}
            value={lp.providerNotified}
            locale={locale}
            onChange={(v) => setLp((s) => ({ ...s, providerNotified: v }))}
          />
          <NotesField value={lp.notes} onChange={(v) => setLp((s) => ({ ...s, notes: v }))} />
        </div>
      ) : null}

      {cardId === TNK_ADMINISTRATION_CARD_ID ? (
        <div style={rowStyle}>
          <DateTimeField
            label={t("clinicalDocumentation.forms.thrombolytic.administrationTime")}
            value={tnk.administrationTime}
            onChange={(v) => setTnk((s) => ({ ...s, administrationTime: v }))}
          />
          <DateTimeField
            label={t("clinicalDocumentation.forms.thrombolytic.lastKnownWellTime")}
            value={tnk.lastKnownWellTime}
            onChange={(v) => setTnk((s) => ({ ...s, lastKnownWellTime: v }))}
          />
          <NumberField
            label={t("clinicalDocumentation.forms.thrombolytic.nihssScore")}
            value={tnk.nihssScore}
            min={0}
            onChange={(v) => setTnk((s) => ({ ...s, nihssScore: v }))}
          />
          <NumberField
            label={t("clinicalDocumentation.forms.thrombolytic.patientWeightKg")}
            value={tnk.patientWeightKg}
            min={0}
            step={0.1}
            onChange={(v) => setTnk((s) => ({ ...s, patientWeightKg: v }))}
          />
          <NumberField
            label={t("clinicalDocumentation.forms.thrombolytic.doseMg")}
            value={tnk.doseMg}
            min={0}
            step={0.1}
            onChange={(v) => setTnk((s) => ({ ...s, doseMg: v }))}
          />
          <p style={{ gridColumn: "1 / -1", fontSize: 11, color: "#64748b", margin: 0 }}>
            {t("clinicalDocumentation.forms.thrombolytic.doseReferenceOnly")}
          </p>
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.doseVerified")}
            value={tnk.doseVerified}
            locale={locale}
            onChange={(v) => setTnk((s) => ({ ...s, doseVerified: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.ctHeadReviewed")}
            value={tnk.ctHeadReviewed}
            locale={locale}
            onChange={(v) => setTnk((s) => ({ ...s, ctHeadReviewed: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.contraindicationChecklistReviewed")}
            value={tnk.contraindicationChecklistReviewed}
            locale={locale}
            onChange={(v) => setTnk((s) => ({ ...s, contraindicationChecklistReviewed: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.providerOrderVerified")}
            value={tnk.providerOrderVerified}
            locale={locale}
            onChange={(v) => setTnk((s) => ({ ...s, providerOrderVerified: v }))}
          />
          <YesNoUnknownNaField
            label={t("clinicalDocumentation.forms.thrombolytic.neurologyConsulted")}
            value={tnk.neurologyConsulted}
            locale={locale}
            onChange={(v) => setTnk((s) => ({ ...s, neurologyConsulted: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.bloodPressureWithinParameters")}
            value={tnk.bloodPressureWithinParameters}
            locale={locale}
            onChange={(v) => setTnk((s) => ({ ...s, bloodPressureWithinParameters: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.anticoagulantUseReviewed")}
            value={tnk.anticoagulantUseReviewed}
            locale={locale}
            onChange={(v) => setTnk((s) => ({ ...s, anticoagulantUseReviewed: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.bleedingRiskReviewed")}
            value={tnk.bleedingRiskReviewed}
            locale={locale}
            onChange={(v) => setTnk((s) => ({ ...s, bleedingRiskReviewed: v }))}
          />
          <YesNoUnknownNaField
            label={t("clinicalDocumentation.forms.thrombolytic.patientFamilyEducationProvided")}
            value={tnk.patientFamilyEducationProvided}
            locale={locale}
            onChange={(v) => setTnk((s) => ({ ...s, patientFamilyEducationProvided: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.medicationAdministered")}
            value={tnk.medicationAdministered}
            locale={locale}
            onChange={(v) => setTnk((s) => ({ ...s, medicationAdministered: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.administrationHeld")}
            value={tnk.administrationHeld}
            locale={locale}
            onChange={(v) => setTnk((s) => ({ ...s, administrationHeld: v }))}
          />
          {tnk.medicationAdministered === "NO" ? (
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.thrombolytic.holdReason")}
              value={tnk.holdReason}
              options={THROMBOLYTIC_HOLD_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setTnk((s) => ({ ...s, holdReason: v }))}
              testId="tnk-hold-reason"
            />
          ) : null}
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.providerNotified")}
            value={tnk.providerNotified}
            locale={locale}
            onChange={(v) => setTnk((s) => ({ ...s, providerNotified: v }))}
          />
          <NotesField value={tnk.notes} onChange={(v) => setTnk((s) => ({ ...s, notes: v }))} />
        </div>
      ) : null}

      {cardId === TPA_ADMINISTRATION_CARD_ID ? (
        <div style={rowStyle}>
          <DateTimeField
            label={t("clinicalDocumentation.forms.thrombolytic.administrationTime")}
            value={tpa.administrationTime}
            onChange={(v) => setTpa((s) => ({ ...s, administrationTime: v }))}
          />
          <DateTimeField
            label={t("clinicalDocumentation.forms.thrombolytic.lastKnownWellTime")}
            value={tpa.lastKnownWellTime}
            onChange={(v) => setTpa((s) => ({ ...s, lastKnownWellTime: v }))}
          />
          <NumberField
            label={t("clinicalDocumentation.forms.thrombolytic.nihssScore")}
            value={tpa.nihssScore}
            min={0}
            onChange={(v) => setTpa((s) => ({ ...s, nihssScore: v }))}
          />
          <NumberField
            label={t("clinicalDocumentation.forms.thrombolytic.patientWeightKg")}
            value={tpa.patientWeightKg}
            min={0}
            step={0.1}
            onChange={(v) => setTpa((s) => ({ ...s, patientWeightKg: v }))}
          />
          <NumberField
            label={t("clinicalDocumentation.forms.thrombolytic.totalDoseMg")}
            value={tpa.totalDoseMg}
            min={0}
            step={0.1}
            onChange={(v) => setTpa((s) => ({ ...s, totalDoseMg: v }))}
          />
          <NumberField
            label={t("clinicalDocumentation.forms.thrombolytic.bolusDoseMg")}
            value={tpa.bolusDoseMg}
            min={0}
            step={0.1}
            onChange={(v) => setTpa((s) => ({ ...s, bolusDoseMg: v }))}
          />
          <NumberField
            label={t("clinicalDocumentation.forms.thrombolytic.infusionDoseMg")}
            value={tpa.infusionDoseMg}
            min={0}
            step={0.1}
            onChange={(v) => setTpa((s) => ({ ...s, infusionDoseMg: v }))}
          />
          {tpaDoseWarning ? (
            <p style={{ gridColumn: "1 / -1", fontSize: 11, color: "#b45309", margin: 0 }}>{tpaDoseWarning}</p>
          ) : null}
          <p style={{ gridColumn: "1 / -1", fontSize: 11, color: "#64748b", margin: 0 }}>
            {t("clinicalDocumentation.forms.thrombolytic.doseReferenceOnly")}
          </p>
          <DateTimeField
            label={t("clinicalDocumentation.forms.thrombolytic.bolusTime")}
            value={tpa.bolusTime}
            onChange={(v) => setTpa((s) => ({ ...s, bolusTime: v }))}
          />
          <DateTimeField
            label={t("clinicalDocumentation.forms.thrombolytic.infusionStartTime")}
            value={tpa.infusionStartTime}
            onChange={(v) => setTpa((s) => ({ ...s, infusionStartTime: v }))}
          />
          <DateTimeField
            label={t("clinicalDocumentation.forms.thrombolytic.infusionCompletionTime")}
            value={tpa.infusionCompletionTime}
            onChange={(v) => setTpa((s) => ({ ...s, infusionCompletionTime: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.doseVerified")}
            value={tpa.doseVerified}
            locale={locale}
            onChange={(v) => setTpa((s) => ({ ...s, doseVerified: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.ctHeadReviewed")}
            value={tpa.ctHeadReviewed}
            locale={locale}
            onChange={(v) => setTpa((s) => ({ ...s, ctHeadReviewed: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.contraindicationChecklistReviewed")}
            value={tpa.contraindicationChecklistReviewed}
            locale={locale}
            onChange={(v) => setTpa((s) => ({ ...s, contraindicationChecklistReviewed: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.providerOrderVerified")}
            value={tpa.providerOrderVerified}
            locale={locale}
            onChange={(v) => setTpa((s) => ({ ...s, providerOrderVerified: v }))}
          />
          <YesNoUnknownNaField
            label={t("clinicalDocumentation.forms.thrombolytic.neurologyConsulted")}
            value={tpa.neurologyConsulted}
            locale={locale}
            onChange={(v) => setTpa((s) => ({ ...s, neurologyConsulted: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.bloodPressureWithinParameters")}
            value={tpa.bloodPressureWithinParameters}
            locale={locale}
            onChange={(v) => setTpa((s) => ({ ...s, bloodPressureWithinParameters: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.anticoagulantUseReviewed")}
            value={tpa.anticoagulantUseReviewed}
            locale={locale}
            onChange={(v) => setTpa((s) => ({ ...s, anticoagulantUseReviewed: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.bleedingRiskReviewed")}
            value={tpa.bleedingRiskReviewed}
            locale={locale}
            onChange={(v) => setTpa((s) => ({ ...s, bleedingRiskReviewed: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.medicationAdministered")}
            value={tpa.medicationAdministered}
            locale={locale}
            onChange={(v) => setTpa((s) => ({ ...s, medicationAdministered: v }))}
          />
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.infusionInterrupted")}
            value={tpa.infusionInterrupted}
            locale={locale}
            onChange={(v) => setTpa((s) => ({ ...s, infusionInterrupted: v }))}
          />
          {tpa.infusionInterrupted === "YES" ? (
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.thrombolytic.interruptionReason")}
              value={tpa.interruptionReason}
              options={THROMBOLYTIC_INTERRUPTION_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setTpa((s) => ({ ...s, interruptionReason: v }))}
              testId="tpa-interruption-reason"
            />
          ) : null}
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.administrationHeld")}
            value={tpa.administrationHeld}
            locale={locale}
            onChange={(v) => setTpa((s) => ({ ...s, administrationHeld: v }))}
          />
          {tpa.medicationAdministered === "NO" ? (
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.thrombolytic.holdReason")}
              value={tpa.holdReason}
              options={THROMBOLYTIC_HOLD_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setTpa((s) => ({ ...s, holdReason: v }))}
              testId="tpa-hold-reason"
            />
          ) : null}
          <YesNoField
            label={t("clinicalDocumentation.forms.thrombolytic.providerNotified")}
            value={tpa.providerNotified}
            locale={locale}
            onChange={(v) => setTpa((s) => ({ ...s, providerNotified: v }))}
          />
          <NotesField value={tpa.notes} onChange={(v) => setTpa((s) => ({ ...s, notes: v }))} />
        </div>
      ) : null}

      {validationError ? (
        <p style={{ color: "#b91c1c", fontSize: 12, margin: 0 }}>{validationError}</p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        style={{
          alignSelf: "flex-start",
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          background: "#0f766e",
          color: "#fff",
          cursor: saving ? "wait" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? t("common.saving") : t("clinicalDocumentation.saveEntry")}
      </button>
    </form>
  );
}

export function isEdoc23ProceduralSafetyThrombolyticDocumentationFormCard(cardId: string): boolean {
  return (EDOC23_PROCEDURAL_SAFETY_THROMBOLYTIC_CARD_IDS as readonly string[]).includes(cardId);
}
