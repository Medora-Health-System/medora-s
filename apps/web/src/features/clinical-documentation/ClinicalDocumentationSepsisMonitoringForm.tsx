"use client";

import React, { useMemo, useState } from "react";
import {
  calculateQsofaScore,
  calculateSirsCriteriaCount,
  deriveQsofaPositive,
  deriveSirsPositive,
  EDOC18_SEPSIS_MONITORING_DOCUMENTATION_CARD_IDS,
  FLUID_RESUSCITATION_MONITORING_CARD_ID,
  LACTATE_MONITORING_CARD_ID,
  QSOFA_ASSESSMENT_CARD_ID,
  SEPSIS_BUNDLE_TRACKING_CARD_ID,
  SEPSIS_ESCALATION_EVENT_CARD_ID,
  SEPSIS_SCREENING_CARD_ID,
  SEPSIS_SUSPECTED_SOURCE_OPTIONS,
  SEPSIS_BUNDLE_TYPE_OPTIONS,
  SEPSIS_ESCALATION_REASON_OPTIONS,
  SEPSIS_FLUID_TYPE_OPTIONS,
  SEPSIS_BLOOD_PRESSURE_RESPONSE_OPTIONS,
  SEPSIS_YES_NO_OPTIONS,
  SEPSIS_YES_NO_UNKNOWN_OPTIONS,
  SEPSIS_YES_NO_NOT_APPLICABLE_OPTIONS,
  SIRS_ASSESSMENT_CARD_ID,
  SUSPECTED_INFECTION_ASSESSMENT_CARD_ID,
  BLOOD_CULTURE_DOCUMENTATION_CARD_ID,
  ANTIBIOTIC_TIMING_REFERENCE_CARD_ID,
  SEPTIC_SHOCK_REASSESSMENT_CARD_ID,
  validateSepsisMonitoringDocumentationPayloadForCard,
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
  fontSize: 11,
  color: "#0f766e",
  fontWeight: 600,
};

function nowLocalDatetimeValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

function optionalIso(local: string): string | undefined {
  return local.trim() ? toIsoFromLocalDatetime(local) : undefined;
}

type YesNo = (typeof SEPSIS_YES_NO_OPTIONS)[number]["value"];
type YesNoUnknown = (typeof SEPSIS_YES_NO_UNKNOWN_OPTIONS)[number]["value"];
type YesNoNa = (typeof SEPSIS_YES_NO_NOT_APPLICABLE_OPTIONS)[number]["value"];

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
      options={SEPSIS_YES_NO_OPTIONS}
      locale={locale}
      onChange={onChange}
      testId={testId}
    />
  );
}

export function ClinicalDocumentationSepsisMonitoringForm({
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

  const [screening, setScreening] = useState({
    screeningTime: nowLocalDatetimeValue(),
    suspectedInfection: "NO" as YesNoUnknown,
    temperatureAbnormal: "NO" as YesNo,
    heartRateAbnormal: "NO" as YesNo,
    respiratoryRateAbnormal: "NO" as YesNo,
    wbcAbnormalOrUnknown: "NO" as YesNoUnknown,
    alteredMentalStatus: "NO" as YesNo,
    hypotensionPresent: "NO" as YesNo,
    lactateConcern: "NO" as YesNoUnknown,
    screenPositive: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    providerNotificationTime: "",
    notes: "",
  });

  const [sirs, setSirs] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    temperatureCriteriaMet: "NO" as YesNo,
    heartRateCriteriaMet: "NO" as YesNo,
    respiratoryCriteriaMet: "NO" as YesNo,
    wbcCriteriaMet: "NO" as YesNoUnknown,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const sirsCalc = useMemo(() => {
    const criteriaCount = calculateSirsCriteriaCount(sirs);
    const sirsPositive = deriveSirsPositive(criteriaCount);
    return { criteriaCount, sirsPositive };
  }, [sirs]);

  const [qsofa, setQsofa] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    respiratoryRateHigh: "NO" as YesNo,
    alteredMentation: "NO" as YesNo,
    systolicBpLow: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const qsofaCalc = useMemo(() => {
    const score = calculateQsofaScore(qsofa);
    const qsofaPositive = deriveQsofaPositive(score);
    return { score, qsofaPositive };
  }, [qsofa]);

  const [infection, setInfection] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    suspectedSource: "UNKNOWN" as (typeof SEPSIS_SUSPECTED_SOURCE_OPTIONS)[number]["value"],
    infectionSignsPresent: "NO" as YesNo,
    culturesConsidered: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [bundle, setBundle] = useState({
    bundleStartTime: nowLocalDatetimeValue(),
    bundleType: "THREE_HOUR" as (typeof SEPSIS_BUNDLE_TYPE_OPTIONS)[number]["value"],
    lactateOrderedOrResulted: "NO" as YesNo,
    bloodCulturesBeforeAntibiotics: "UNKNOWN" as YesNoUnknown,
    antibioticsDocumentedInMar: "NO" as YesNo,
    fluidsOrderedOrStarted: "NO" as YesNo,
    vasopressorsOrderedOrStarted: "NOT_APPLICABLE" as YesNoNa,
    providerNotified: "NO" as YesNo,
    bundleVariancePresent: "NO" as YesNo,
    varianceReason: "",
    notes: "",
  });

  const [lactate, setLactate] = useState({
    documentedAt: nowLocalDatetimeValue(),
    lactateValue: "",
    lactateResultAvailable: "NO" as YesNo,
    repeatLactateNeeded: "UNKNOWN" as YesNoUnknown,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [fluid, setFluid] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    fluidBolusOrderedOrStarted: "NO" as YesNo,
    fluidType: "NORMAL_SALINE" as (typeof SEPSIS_FLUID_TYPE_OPTIONS)[number]["value"],
    volumeMl: "",
    thirtyMlPerKgTargetConsidered: "NOT_APPLICABLE" as YesNoNa,
    bloodPressureResponse: "UNKNOWN" as (typeof SEPSIS_BLOOD_PRESSURE_RESPONSE_OPTIONS)[number]["value"],
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [escalation, setEscalation] = useState({
    eventTime: nowLocalDatetimeValue(),
    reason: "SCREEN_POSITIVE" as (typeof SEPSIS_ESCALATION_REASON_OPTIONS)[number]["value"],
    providerNotified: "YES" as YesNo,
    providerNotificationTime: nowLocalDatetimeValue(),
    responseReceived: "NO" as YesNo,
    rapidResponseActivated: "NO" as YesNo,
    notes: "",
  });

  const [bloodCulture, setBloodCulture] = useState({
    documentedAt: nowLocalDatetimeValue(),
    culturesCollected: "NO" as YesNo,
    collectionTime: "",
    numberOfSets: "2",
    collectedBeforeAntibiotics: "UNKNOWN" as YesNoUnknown,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [antibiotic, setAntibiotic] = useState({
    documentedAt: nowLocalDatetimeValue(),
    antibioticsDocumentedInMar: "NO" as YesNo,
    firstAntibioticTime: "",
    delayOrVariancePresent: "NO" as YesNo,
    varianceReason: "",
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  const [septicShock, setSepticShock] = useState({
    reassessmentTime: nowLocalDatetimeValue(),
    hypotensionPersistent: "NO" as YesNo,
    lactateFourOrGreater: "UNKNOWN" as YesNoUnknown,
    vasopressorsStartedOrOrdered: "NOT_APPLICABLE" as YesNoNa,
    mentalStatusChanged: "NO" as YesNo,
    urineOutputConcern: "UNKNOWN" as YesNoUnknown,
    providerAtBedside: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    notes: "",
  });

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case SEPSIS_SCREENING_CARD_ID:
        return {
          screeningTime: toIsoFromLocalDatetime(screening.screeningTime),
          suspectedInfection: screening.suspectedInfection,
          temperatureAbnormal: screening.temperatureAbnormal,
          heartRateAbnormal: screening.heartRateAbnormal,
          respiratoryRateAbnormal: screening.respiratoryRateAbnormal,
          wbcAbnormalOrUnknown: screening.wbcAbnormalOrUnknown,
          alteredMentalStatus: screening.alteredMentalStatus,
          hypotensionPresent: screening.hypotensionPresent,
          lactateConcern: screening.lactateConcern,
          screenPositive: screening.screenPositive,
          providerNotified: screening.providerNotified,
          providerNotificationTime: optionalIso(screening.providerNotificationTime),
          notes: screening.notes.trim() || undefined,
        };
      case SIRS_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(sirs.assessmentTime),
          temperatureCriteriaMet: sirs.temperatureCriteriaMet,
          heartRateCriteriaMet: sirs.heartRateCriteriaMet,
          respiratoryCriteriaMet: sirs.respiratoryCriteriaMet,
          wbcCriteriaMet: sirs.wbcCriteriaMet,
          criteriaCount: sirsCalc.criteriaCount,
          sirsPositive: sirsCalc.sirsPositive,
          providerNotified: sirs.providerNotified,
          notes: sirs.notes.trim() || undefined,
        };
      case QSOFA_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(qsofa.assessmentTime),
          respiratoryRateHigh: qsofa.respiratoryRateHigh,
          alteredMentation: qsofa.alteredMentation,
          systolicBpLow: qsofa.systolicBpLow,
          score: qsofaCalc.score,
          qsofaPositive: qsofaCalc.qsofaPositive,
          providerNotified: qsofa.providerNotified,
          notes: qsofa.notes.trim() || undefined,
        };
      case SUSPECTED_INFECTION_ASSESSMENT_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(infection.assessmentTime),
          suspectedSource: infection.suspectedSource,
          infectionSignsPresent: infection.infectionSignsPresent,
          culturesConsidered: infection.culturesConsidered,
          providerNotified: infection.providerNotified,
          notes: infection.notes.trim() || undefined,
        };
      case SEPSIS_BUNDLE_TRACKING_CARD_ID:
        return {
          bundleStartTime: toIsoFromLocalDatetime(bundle.bundleStartTime),
          bundleType: bundle.bundleType,
          lactateOrderedOrResulted: bundle.lactateOrderedOrResulted,
          bloodCulturesBeforeAntibiotics: bundle.bloodCulturesBeforeAntibiotics,
          antibioticsDocumentedInMar: bundle.antibioticsDocumentedInMar,
          fluidsOrderedOrStarted: bundle.fluidsOrderedOrStarted,
          vasopressorsOrderedOrStarted: bundle.vasopressorsOrderedOrStarted,
          providerNotified: bundle.providerNotified,
          bundleVariancePresent: bundle.bundleVariancePresent,
          varianceReason: bundle.varianceReason.trim() || undefined,
          notes: bundle.notes.trim() || undefined,
        };
      case LACTATE_MONITORING_CARD_ID:
        return {
          documentedAt: toIsoFromLocalDatetime(lactate.documentedAt),
          lactateValue: lactate.lactateValue.trim() ? Number(lactate.lactateValue) : undefined,
          lactateUnit: "MMOL_L",
          lactateResultAvailable: lactate.lactateResultAvailable,
          repeatLactateNeeded: lactate.repeatLactateNeeded,
          providerNotified: lactate.providerNotified,
          notes: lactate.notes.trim() || undefined,
        };
      case FLUID_RESUSCITATION_MONITORING_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(fluid.assessmentTime),
          fluidBolusOrderedOrStarted: fluid.fluidBolusOrderedOrStarted,
          fluidType: fluid.fluidType,
          volumeMl: fluid.volumeMl.trim() ? Number(fluid.volumeMl) : undefined,
          thirtyMlPerKgTargetConsidered: fluid.thirtyMlPerKgTargetConsidered,
          bloodPressureResponse: fluid.bloodPressureResponse,
          providerNotified: fluid.providerNotified,
          notes: fluid.notes.trim() || undefined,
        };
      case SEPSIS_ESCALATION_EVENT_CARD_ID:
        return {
          eventTime: toIsoFromLocalDatetime(escalation.eventTime),
          reason: escalation.reason,
          providerNotified: escalation.providerNotified,
          providerNotificationTime: toIsoFromLocalDatetime(escalation.providerNotificationTime),
          responseReceived: escalation.responseReceived,
          rapidResponseActivated: escalation.rapidResponseActivated,
          notes: escalation.notes.trim() || undefined,
        };
      case BLOOD_CULTURE_DOCUMENTATION_CARD_ID:
        return {
          documentedAt: toIsoFromLocalDatetime(bloodCulture.documentedAt),
          culturesCollected: bloodCulture.culturesCollected,
          collectionTime: optionalIso(bloodCulture.collectionTime),
          numberOfSets:
            bloodCulture.culturesCollected === "YES"
              ? Number(bloodCulture.numberOfSets)
              : undefined,
          collectedBeforeAntibiotics: bloodCulture.collectedBeforeAntibiotics,
          providerNotified: bloodCulture.providerNotified,
          notes: bloodCulture.notes.trim() || undefined,
        };
      case ANTIBIOTIC_TIMING_REFERENCE_CARD_ID:
        return {
          documentedAt: toIsoFromLocalDatetime(antibiotic.documentedAt),
          antibioticsDocumentedInMar: antibiotic.antibioticsDocumentedInMar,
          firstAntibioticTime: optionalIso(antibiotic.firstAntibioticTime),
          providerNotified: antibiotic.providerNotified,
          delayOrVariancePresent: antibiotic.delayOrVariancePresent,
          varianceReason: antibiotic.varianceReason.trim() || undefined,
          notes: antibiotic.notes.trim() || undefined,
        };
      case SEPTIC_SHOCK_REASSESSMENT_CARD_ID:
        return {
          reassessmentTime: toIsoFromLocalDatetime(septicShock.reassessmentTime),
          hypotensionPersistent: septicShock.hypotensionPersistent,
          lactateFourOrGreater: septicShock.lactateFourOrGreater,
          vasopressorsStartedOrOrdered: septicShock.vasopressorsStartedOrOrdered,
          mentalStatusChanged: septicShock.mentalStatusChanged,
          urineOutputConcern: septicShock.urineOutputConcern,
          providerAtBedside: septicShock.providerAtBedside,
          providerNotified: septicShock.providerNotified,
          notes: septicShock.notes.trim() || undefined,
        };
      default:
        return {};
    }
  }

  const save = async () => {
    setValidationError(null);
    const payload = buildPayload();
    const validated = validateSepsisMonitoringDocumentationPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.sepsisMonitoring.validationError"));
      return;
    }
    await onSubmit(validated.data);
  };

  const datetimeField = (label: string, value: string, onChange: (v: string) => void, testId?: string) => (
    <div>
      <span style={labelStyle}>{label}</span>
      <input
        type="datetime-local"
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={fieldStyle}
      />
    </div>
  );

  const notesField = (value: string, onChange: (v: string) => void) => (
    <div style={{ gridColumn: "1 / -1" }}>
      <span style={labelStyle}>{t("clinicalDocumentation.forms.common.notes")}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        style={{ ...fieldStyle, resize: "vertical" }}
      />
    </div>
  );

  return (
    <div
      data-testid="clinical-documentation-sepsis-form"
      data-card-id={cardId}
      data-compact-layout="true"
      style={formStyle}
    >
      {validationError ? (
        <p style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>{validationError}</p>
      ) : null}

      <div style={rowStyle}>
        {cardId === SEPSIS_SCREENING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.sepsisMonitoring.screeningTime"),
              screening.screeningTime,
              (v) => setScreening({ ...screening, screeningTime: v }),
              "sepsis-screening-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.suspectedInfection")}
              value={screening.suspectedInfection}
              options={SEPSIS_YES_NO_UNKNOWN_OPTIONS}
              locale={locale}
              onChange={(v) => setScreening({ ...screening, suspectedInfection: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.screenPositive")}
              value={screening.screenPositive}
              locale={locale}
              onChange={(v) => setScreening({ ...screening, screenPositive: v })}
              testId="sepsis-screen-positive"
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.providerNotified")}
              value={screening.providerNotified}
              locale={locale}
              onChange={(v) => setScreening({ ...screening, providerNotified: v })}
            />
            {screening.screenPositive === "YES" ? (
              datetimeField(
                t("clinicalDocumentation.forms.sepsisMonitoring.providerNotificationTime"),
                screening.providerNotificationTime,
                (v) => setScreening({ ...screening, providerNotificationTime: v })
              )
            ) : null}
            {notesField(screening.notes, (notes) => setScreening({ ...screening, notes }))}
          </>
        ) : null}

        {cardId === SIRS_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.sepsisMonitoring.assessmentTime"),
              sirs.assessmentTime,
              (v) => setSirs({ ...sirs, assessmentTime: v }),
              "sepsis-sirs-time"
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.temperatureCriteriaMet")}
              value={sirs.temperatureCriteriaMet}
              locale={locale}
              onChange={(v) => setSirs({ ...sirs, temperatureCriteriaMet: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.heartRateCriteriaMet")}
              value={sirs.heartRateCriteriaMet}
              locale={locale}
              onChange={(v) => setSirs({ ...sirs, heartRateCriteriaMet: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.respiratoryCriteriaMet")}
              value={sirs.respiratoryCriteriaMet}
              locale={locale}
              onChange={(v) => setSirs({ ...sirs, respiratoryCriteriaMet: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.wbcCriteriaMet")}
              value={sirs.wbcCriteriaMet}
              options={SEPSIS_YES_NO_UNKNOWN_OPTIONS}
              locale={locale}
              onChange={(v) => setSirs({ ...sirs, wbcCriteriaMet: v })}
            />
            <p style={calcStyle} data-testid="sepsis-sirs-calculated">
              {t("clinicalDocumentation.forms.sepsisMonitoring.sirsCalculated")}:{" "}
              {sirsCalc.criteriaCount} / {sirsCalc.sirsPositive}
            </p>
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.providerNotified")}
              value={sirs.providerNotified}
              locale={locale}
              onChange={(v) => setSirs({ ...sirs, providerNotified: v })}
            />
            {notesField(sirs.notes, (notes) => setSirs({ ...sirs, notes }))}
          </>
        ) : null}

        {cardId === QSOFA_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.sepsisMonitoring.assessmentTime"),
              qsofa.assessmentTime,
              (v) => setQsofa({ ...qsofa, assessmentTime: v }),
              "sepsis-qsofa-time"
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.respiratoryRateHigh")}
              value={qsofa.respiratoryRateHigh}
              locale={locale}
              onChange={(v) => setQsofa({ ...qsofa, respiratoryRateHigh: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.alteredMentation")}
              value={qsofa.alteredMentation}
              locale={locale}
              onChange={(v) => setQsofa({ ...qsofa, alteredMentation: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.systolicBpLow")}
              value={qsofa.systolicBpLow}
              locale={locale}
              onChange={(v) => setQsofa({ ...qsofa, systolicBpLow: v })}
            />
            <p style={calcStyle} data-testid="sepsis-qsofa-calculated">
              {t("clinicalDocumentation.forms.sepsisMonitoring.qsofaCalculated")}: {qsofaCalc.score}{" "}
              / {qsofaCalc.qsofaPositive}
            </p>
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.providerNotified")}
              value={qsofa.providerNotified}
              locale={locale}
              onChange={(v) => setQsofa({ ...qsofa, providerNotified: v })}
            />
            {notesField(qsofa.notes, (notes) => setQsofa({ ...qsofa, notes }))}
          </>
        ) : null}

        {cardId === SUSPECTED_INFECTION_ASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.sepsisMonitoring.assessmentTime"),
              infection.assessmentTime,
              (v) => setInfection({ ...infection, assessmentTime: v })
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.suspectedSource")}
              value={infection.suspectedSource}
              options={SEPSIS_SUSPECTED_SOURCE_OPTIONS}
              locale={locale}
              onChange={(v) => setInfection({ ...infection, suspectedSource: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.infectionSignsPresent")}
              value={infection.infectionSignsPresent}
              locale={locale}
              onChange={(v) => setInfection({ ...infection, infectionSignsPresent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.providerNotified")}
              value={infection.providerNotified}
              locale={locale}
              onChange={(v) => setInfection({ ...infection, providerNotified: v })}
            />
            {notesField(infection.notes, (notes) => setInfection({ ...infection, notes }))}
          </>
        ) : null}

        {cardId === SEPSIS_BUNDLE_TRACKING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.sepsisMonitoring.bundleStartTime"),
              bundle.bundleStartTime,
              (v) => setBundle({ ...bundle, bundleStartTime: v }),
              "sepsis-bundle-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.bundleType")}
              value={bundle.bundleType}
              options={SEPSIS_BUNDLE_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setBundle({ ...bundle, bundleType: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.antibioticsDocumentedInMar")}
              value={bundle.antibioticsDocumentedInMar}
              locale={locale}
              onChange={(v) => setBundle({ ...bundle, antibioticsDocumentedInMar: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.bundleVariancePresent")}
              value={bundle.bundleVariancePresent}
              locale={locale}
              onChange={(v) => setBundle({ ...bundle, bundleVariancePresent: v })}
            />
            {bundle.bundleVariancePresent === "YES" ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={labelStyle}>
                  {t("clinicalDocumentation.forms.sepsisMonitoring.varianceReason")}
                </span>
                <input
                  type="text"
                  value={bundle.varianceReason}
                  onChange={(e) => setBundle({ ...bundle, varianceReason: e.target.value })}
                  style={fieldStyle}
                />
              </div>
            ) : null}
            {notesField(bundle.notes, (notes) => setBundle({ ...bundle, notes }))}
          </>
        ) : null}

        {cardId === LACTATE_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.sepsisMonitoring.documentedAt"),
              lactate.documentedAt,
              (v) => setLactate({ ...lactate, documentedAt: v }),
              "sepsis-lactate-time"
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.lactateResultAvailable")}
              value={lactate.lactateResultAvailable}
              locale={locale}
              onChange={(v) => setLactate({ ...lactate, lactateResultAvailable: v })}
            />
            {lactate.lactateResultAvailable === "YES" ? (
              <div>
                <span style={labelStyle}>
                  {t("clinicalDocumentation.forms.sepsisMonitoring.lactateValue")}
                </span>
                <input
                  type="number"
                  step="0.1"
                  data-testid="sepsis-lactate-value"
                  value={lactate.lactateValue}
                  onChange={(e) => setLactate({ ...lactate, lactateValue: e.target.value })}
                  style={fieldStyle}
                />
              </div>
            ) : null}
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.providerNotified")}
              value={lactate.providerNotified}
              locale={locale}
              onChange={(v) => setLactate({ ...lactate, providerNotified: v })}
            />
            {notesField(lactate.notes, (notes) => setLactate({ ...lactate, notes }))}
          </>
        ) : null}

        {cardId === FLUID_RESUSCITATION_MONITORING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.sepsisMonitoring.assessmentTime"),
              fluid.assessmentTime,
              (v) => setFluid({ ...fluid, assessmentTime: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.fluidBolusOrderedOrStarted")}
              value={fluid.fluidBolusOrderedOrStarted}
              locale={locale}
              onChange={(v) => setFluid({ ...fluid, fluidBolusOrderedOrStarted: v })}
            />
            {fluid.fluidBolusOrderedOrStarted === "YES" ? (
              <div>
                <span style={labelStyle}>
                  {t("clinicalDocumentation.forms.sepsisMonitoring.volumeMl")}
                </span>
                <input
                  type="number"
                  value={fluid.volumeMl}
                  onChange={(e) => setFluid({ ...fluid, volumeMl: e.target.value })}
                  style={fieldStyle}
                />
              </div>
            ) : null}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.bloodPressureResponse")}
              value={fluid.bloodPressureResponse}
              options={SEPSIS_BLOOD_PRESSURE_RESPONSE_OPTIONS}
              locale={locale}
              onChange={(v) => setFluid({ ...fluid, bloodPressureResponse: v })}
            />
            {notesField(fluid.notes, (notes) => setFluid({ ...fluid, notes }))}
          </>
        ) : null}

        {cardId === SEPSIS_ESCALATION_EVENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.sepsisMonitoring.eventTime"),
              escalation.eventTime,
              (v) => setEscalation({ ...escalation, eventTime: v }),
              "sepsis-escalation-time"
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.escalationReason")}
              value={escalation.reason}
              options={SEPSIS_ESCALATION_REASON_OPTIONS}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, reason: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.providerNotified")}
              value={escalation.providerNotified}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, providerNotified: v })}
            />
            {datetimeField(
              t("clinicalDocumentation.forms.sepsisMonitoring.providerNotificationTime"),
              escalation.providerNotificationTime,
              (v) => setEscalation({ ...escalation, providerNotificationTime: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.responseReceived")}
              value={escalation.responseReceived}
              locale={locale}
              onChange={(v) => setEscalation({ ...escalation, responseReceived: v })}
            />
            {notesField(escalation.notes, (notes) => setEscalation({ ...escalation, notes }))}
          </>
        ) : null}

        {cardId === BLOOD_CULTURE_DOCUMENTATION_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.sepsisMonitoring.documentedAt"),
              bloodCulture.documentedAt,
              (v) => setBloodCulture({ ...bloodCulture, documentedAt: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.culturesCollected")}
              value={bloodCulture.culturesCollected}
              locale={locale}
              onChange={(v) => setBloodCulture({ ...bloodCulture, culturesCollected: v })}
            />
            {bloodCulture.culturesCollected === "YES" ? (
              <>
                {datetimeField(
                  t("clinicalDocumentation.forms.sepsisMonitoring.collectionTime"),
                  bloodCulture.collectionTime,
                  (v) => setBloodCulture({ ...bloodCulture, collectionTime: v })
                )}
                <div>
                  <span style={labelStyle}>
                    {t("clinicalDocumentation.forms.sepsisMonitoring.numberOfSets")}
                  </span>
                  <input
                    type="number"
                    value={bloodCulture.numberOfSets}
                    onChange={(e) => setBloodCulture({ ...bloodCulture, numberOfSets: e.target.value })}
                    style={fieldStyle}
                  />
                </div>
              </>
            ) : null}
            {notesField(bloodCulture.notes, (notes) => setBloodCulture({ ...bloodCulture, notes }))}
          </>
        ) : null}

        {cardId === ANTIBIOTIC_TIMING_REFERENCE_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.sepsisMonitoring.documentedAt"),
              antibiotic.documentedAt,
              (v) => setAntibiotic({ ...antibiotic, documentedAt: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.antibioticsDocumentedInMar")}
              value={antibiotic.antibioticsDocumentedInMar}
              locale={locale}
              onChange={(v) => setAntibiotic({ ...antibiotic, antibioticsDocumentedInMar: v })}
            />
            {antibiotic.antibioticsDocumentedInMar === "YES" ? (
              datetimeField(
                t("clinicalDocumentation.forms.sepsisMonitoring.firstAntibioticTime"),
                antibiotic.firstAntibioticTime,
                (v) => setAntibiotic({ ...antibiotic, firstAntibioticTime: v })
              )
            ) : null}
            {notesField(antibiotic.notes, (notes) => setAntibiotic({ ...antibiotic, notes }))}
          </>
        ) : null}

        {cardId === SEPTIC_SHOCK_REASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.sepsisMonitoring.reassessmentTime"),
              septicShock.reassessmentTime,
              (v) => setSepticShock({ ...septicShock, reassessmentTime: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.hypotensionPersistent")}
              value={septicShock.hypotensionPersistent}
              locale={locale}
              onChange={(v) => setSepticShock({ ...septicShock, hypotensionPersistent: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.mentalStatusChanged")}
              value={septicShock.mentalStatusChanged}
              locale={locale}
              onChange={(v) => setSepticShock({ ...septicShock, mentalStatusChanged: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.sepsisMonitoring.providerNotified")}
              value={septicShock.providerNotified}
              locale={locale}
              onChange={(v) => setSepticShock({ ...septicShock, providerNotified: v })}
            />
            {notesField(septicShock.notes, (notes) => setSepticShock({ ...septicShock, notes }))}
          </>
        ) : null}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        style={{
          alignSelf: "flex-start",
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          background: saving ? "#94a3b8" : "#0f766e",
          color: "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? t("common.saving") : t("clinicalDocumentation.actionSave")}
      </button>
    </div>
  );
}

export function isEdoc18SepsisMonitoringDocumentationFormCard(cardId: string): boolean {
  return (EDOC18_SEPSIS_MONITORING_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}
