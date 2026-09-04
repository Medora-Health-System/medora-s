"use client";

import React, { useMemo, useState } from "react";
import {
  ABCD2_CLINICAL_FEATURE_OPTIONS,
  ABCD2_DURATION_OPTIONS,
  CINCINNATI_ELEMENT_OPTIONS,
  deriveNihssSeverityBand,
  EDOC4_STROKE_DOCUMENTATION_CARD_IDS,
  NIHSS_FIELD_OPTIONS,
  NIHSS_SCORED_FIELD_KEYS,
  NIHSS_SEVERITY_BAND_LABEL_EN,
  NIHSS_SEVERITY_BAND_LABEL_FR,
  NEURO_CHANGES_FROM_PRIOR_OPTIONS,
  NEURO_FIELD_OPTIONS,
  SWALLOW_RESULT_OPTIONS,
  STROKE_ABCD2_CARD_ID,
  STROKE_CINCINNATI_CARD_ID,
  STROKE_NEURO_CHECKS_CARD_ID,
  STROKE_NIHSS_CARD_ID,
  STROKE_SWALLOW_SCREEN_CARD_ID,
  STROKE_TIMELINE_CARD_ID,
  STROKE_VAN_ASSESSMENT_CARD_ID,
  calculateAbcd2Total,
  calculateNihssTotal,
  deriveCincinnatiResult,
  deriveVanResult,
  validateStrokePayloadForCard,
  type NihssScoredFieldKey,
  type NeuroSelectFieldKey,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { resolveProductUiLanguageOrDefault } from "@/i18n/config";
import { formatClinicalDocumentationOptionLabel } from "@medora/shared";

import {
  ClinicalDocumentationBooleanField,
  ClinicalDocumentationScoreSelectField,
  ClinicalDocumentationSelectField,
} from "./ClinicalDocumentationFieldControls";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 8px",
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
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: 8,
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
  const trimmed = local.trim();
  if (!trimmed) return undefined;
  return toIsoFromLocalDatetime(trimmed);
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#334155" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

const defaultNihss = () => ({
  assessedAt: nowLocalDatetimeValue(),
  levelOfConsciousness: 0,
  locQuestions: 0,
  locCommands: 0,
  bestGaze: 0,
  visualFields: 0,
  facialPalsy: 0,
  motorArmLeft: 0,
  motorArmRight: 0,
  motorLegLeft: 0,
  motorLegRight: 0,
  limbAtaxia: 0,
  sensory: 0,
  bestLanguage: 0,
  dysarthria: 0,
  extinctionInattention: 0,
  unableToAssessReason: "",
  notes: "",
});

export function ClinicalDocumentationStrokeForm({
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

  const [nihss, setNihss] = useState(defaultNihss);
  const [swallow, setSwallow] = useState({
    screenedAt: nowLocalDatetimeValue(),
    alertEnoughForScreen: true,
    facialDroopOrWeakness: false,
    speechDifficulty: false,
    coughOrWetVoice: false,
    failedWaterTrial: false,
    result: "PASSED" as "PASSED" | "FAILED" | "DEFERRED",
    npoRecommended: false,
    providerNotified: false,
    notes: "",
  });
  const [cincinnati, setCincinnati] = useState({
    assessedAt: nowLocalDatetimeValue(),
    facialDroop: "NORMAL" as "NORMAL" | "ABNORMAL" | "UNABLE_TO_ASSESS",
    armDrift: "NORMAL" as "NORMAL" | "ABNORMAL" | "UNABLE_TO_ASSESS",
    speech: "NORMAL" as "NORMAL" | "ABNORMAL" | "UNABLE_TO_ASSESS",
    providerNotified: false,
    notes: "",
  });
  const [van, setVan] = useState({
    assessedAt: nowLocalDatetimeValue(),
    armWeaknessPresent: false,
    visualDisturbance: false,
    aphasia: false,
    neglect: false,
    providerNotified: false,
    notes: "",
  });
  const [abcd2, setAbcd2] = useState({
    assessedAt: nowLocalDatetimeValue(),
    age60OrOlder: false,
    bloodPressureElevated: false,
    clinicalFeature: "OTHER" as "UNILATERAL_WEAKNESS" | "SPEECH_WITHOUT_WEAKNESS" | "OTHER",
    duration: "LESS_THAN_10_MIN" as "GREATER_EQUAL_60_MIN" | "TEN_TO_59_MIN" | "LESS_THAN_10_MIN",
    diabetes: false,
    notes: "",
  });
  const [timeline, setTimeline] = useState({
    lastKnownWellTime: nowLocalDatetimeValue(),
    symptomDiscoveryTime: "",
    arrivalTime: "",
    strokeAlertCalledTime: "",
    providerEvaluationTime: "",
    ctOrderedTime: "",
    ctCompletedTime: "",
    radiologyResultTime: "",
    thrombolyticDecisionTime: "",
    thrombolyticGivenTime: "",
    transferDecisionTime: "",
    notes: "",
  });
  const [neuro, setNeuro] = useState({
    assessedAt: nowLocalDatetimeValue(),
    levelOfConsciousness: "ALERT",
    orientation: "ORIENTED_X4",
    pupils: "EQUAL_REACTIVE",
    gripLeft: "NORMAL",
    gripRight: "NORMAL",
    motorLeft: "NORMAL",
    motorRight: "NORMAL",
    sensation: "INTACT",
    speech: "NORMAL",
    changesFromPrior: "NO" as "YES" | "NO" | "UNKNOWN",
    providerNotified: false,
    notes: "",
  });

  const nihssTotal = useMemo(() => calculateNihssTotal(nihss), [nihss]);
  const nihssSeverityBand = useMemo(() => deriveNihssSeverityBand(nihssTotal), [nihssTotal]);
  const cincinnatiResult = useMemo(() => deriveCincinnatiResult(cincinnati), [cincinnati]);
  const vanResult = useMemo(() => deriveVanResult(van), [van]);
  const abcd2Total = useMemo(() => calculateAbcd2Total(abcd2), [abcd2]);

  const buildPayload = (): Record<string, unknown> => {
    switch (cardId) {
      case STROKE_NIHSS_CARD_ID:
        return {
          assessedAt: toIsoFromLocalDatetime(nihss.assessedAt),
          levelOfConsciousness: nihss.levelOfConsciousness,
          locQuestions: nihss.locQuestions,
          locCommands: nihss.locCommands,
          bestGaze: nihss.bestGaze,
          visualFields: nihss.visualFields,
          facialPalsy: nihss.facialPalsy,
          motorArmLeft: nihss.motorArmLeft,
          motorArmRight: nihss.motorArmRight,
          motorLegLeft: nihss.motorLegLeft,
          motorLegRight: nihss.motorLegRight,
          limbAtaxia: nihss.limbAtaxia,
          sensory: nihss.sensory,
          bestLanguage: nihss.bestLanguage,
          dysarthria: nihss.dysarthria,
          extinctionInattention: nihss.extinctionInattention,
          totalScore: nihss.unableToAssessReason.trim() ? nihssTotal : nihssTotal,
          ...(nihss.unableToAssessReason.trim()
            ? { unableToAssessReason: nihss.unableToAssessReason.trim() }
            : {}),
          ...(nihss.notes.trim() ? { notes: nihss.notes.trim() } : {}),
        };
      case STROKE_SWALLOW_SCREEN_CARD_ID:
        return {
          screenedAt: toIsoFromLocalDatetime(swallow.screenedAt),
          alertEnoughForScreen: swallow.alertEnoughForScreen,
          facialDroopOrWeakness: swallow.facialDroopOrWeakness,
          speechDifficulty: swallow.speechDifficulty,
          coughOrWetVoice: swallow.coughOrWetVoice,
          failedWaterTrial: swallow.failedWaterTrial,
          result: swallow.result,
          npoRecommended: swallow.npoRecommended,
          providerNotified: swallow.providerNotified,
          ...(swallow.notes.trim() ? { notes: swallow.notes.trim() } : {}),
        };
      case STROKE_CINCINNATI_CARD_ID:
        return {
          assessedAt: toIsoFromLocalDatetime(cincinnati.assessedAt),
          facialDroop: cincinnati.facialDroop,
          armDrift: cincinnati.armDrift,
          speech: cincinnati.speech,
          result: cincinnatiResult,
          providerNotified: cincinnati.providerNotified,
          ...(cincinnati.notes.trim() ? { notes: cincinnati.notes.trim() } : {}),
        };
      case STROKE_VAN_ASSESSMENT_CARD_ID:
        return {
          assessedAt: toIsoFromLocalDatetime(van.assessedAt),
          armWeaknessPresent: van.armWeaknessPresent,
          visualDisturbance: van.visualDisturbance,
          aphasia: van.aphasia,
          neglect: van.neglect,
          result: vanResult,
          providerNotified: van.providerNotified,
          ...(van.notes.trim() ? { notes: van.notes.trim() } : {}),
        };
      case STROKE_ABCD2_CARD_ID:
        return {
          assessedAt: toIsoFromLocalDatetime(abcd2.assessedAt),
          age60OrOlder: abcd2.age60OrOlder,
          bloodPressureElevated: abcd2.bloodPressureElevated,
          clinicalFeature: abcd2.clinicalFeature,
          duration: abcd2.duration,
          diabetes: abcd2.diabetes,
          totalScore: abcd2Total,
          ...(abcd2.notes.trim() ? { notes: abcd2.notes.trim() } : {}),
        };
      case STROKE_TIMELINE_CARD_ID:
        return {
          lastKnownWellTime: toIsoFromLocalDatetime(timeline.lastKnownWellTime),
          ...(optionalIso(timeline.symptomDiscoveryTime)
            ? { symptomDiscoveryTime: optionalIso(timeline.symptomDiscoveryTime) }
            : {}),
          ...(optionalIso(timeline.arrivalTime) ? { arrivalTime: optionalIso(timeline.arrivalTime) } : {}),
          ...(optionalIso(timeline.strokeAlertCalledTime)
            ? { strokeAlertCalledTime: optionalIso(timeline.strokeAlertCalledTime) }
            : {}),
          ...(optionalIso(timeline.providerEvaluationTime)
            ? { providerEvaluationTime: optionalIso(timeline.providerEvaluationTime) }
            : {}),
          ...(optionalIso(timeline.ctOrderedTime)
            ? { ctOrderedTime: optionalIso(timeline.ctOrderedTime) }
            : {}),
          ...(optionalIso(timeline.ctCompletedTime)
            ? { ctCompletedTime: optionalIso(timeline.ctCompletedTime) }
            : {}),
          ...(optionalIso(timeline.radiologyResultTime)
            ? { radiologyResultTime: optionalIso(timeline.radiologyResultTime) }
            : {}),
          ...(optionalIso(timeline.thrombolyticDecisionTime)
            ? { thrombolyticDecisionTime: optionalIso(timeline.thrombolyticDecisionTime) }
            : {}),
          ...(optionalIso(timeline.thrombolyticGivenTime)
            ? { thrombolyticGivenTime: optionalIso(timeline.thrombolyticGivenTime) }
            : {}),
          ...(optionalIso(timeline.transferDecisionTime)
            ? { transferDecisionTime: optionalIso(timeline.transferDecisionTime) }
            : {}),
          ...(timeline.notes.trim() ? { notes: timeline.notes.trim() } : {}),
        };
      case STROKE_NEURO_CHECKS_CARD_ID:
        return {
          assessedAt: toIsoFromLocalDatetime(neuro.assessedAt),
          levelOfConsciousness: neuro.levelOfConsciousness.trim(),
          orientation: neuro.orientation.trim(),
          pupils: neuro.pupils.trim(),
          gripLeft: neuro.gripLeft.trim(),
          gripRight: neuro.gripRight.trim(),
          motorLeft: neuro.motorLeft.trim(),
          motorRight: neuro.motorRight.trim(),
          sensation: neuro.sensation.trim(),
          speech: neuro.speech.trim(),
          changesFromPrior: neuro.changesFromPrior,
          providerNotified: neuro.providerNotified,
          ...(neuro.notes.trim() ? { notes: neuro.notes.trim() } : {}),
        };
      default:
        return {};
    }
  };

  const handleSubmit = async () => {
    const payload = buildPayload();
    const check = validateStrokePayloadForCard(cardId, payload);
    if (!check.ok) {
      setValidationError(t("clinicalDocumentation.forms.stroke.validationError"));
      return;
    }
    setValidationError(null);
    await onSubmit(check.data);
  };

  const enumSelect = (
    label: string,
    value: string,
    options: Array<{ value: string; label: string }>,
    onChange: (v: string) => void
  ) => (
    <ClinicalDocumentationSelectField
      label={label}
      value={value}
      options={options.map((o) => ({ value: o.value, labelEn: o.label, labelFr: o.label }))}
      locale={locale}
      onChange={onChange}
    />
  );

  const nihssFieldLabelKey: Record<NihssScoredFieldKey, string> = {
    levelOfConsciousness: "clinicalDocumentation.forms.stroke.nihss.loc",
    locQuestions: "clinicalDocumentation.forms.stroke.nihss.locQuestions",
    locCommands: "clinicalDocumentation.forms.stroke.nihss.locCommands",
    bestGaze: "clinicalDocumentation.forms.stroke.nihss.bestGaze",
    visualFields: "clinicalDocumentation.forms.stroke.nihss.visualFields",
    facialPalsy: "clinicalDocumentation.forms.stroke.nihss.facialPalsy",
    motorArmLeft: "clinicalDocumentation.forms.stroke.nihss.motorArmLeft",
    motorArmRight: "clinicalDocumentation.forms.stroke.nihss.motorArmRight",
    motorLegLeft: "clinicalDocumentation.forms.stroke.nihss.motorLegLeft",
    motorLegRight: "clinicalDocumentation.forms.stroke.nihss.motorLegRight",
    limbAtaxia: "clinicalDocumentation.forms.stroke.nihss.limbAtaxia",
    sensory: "clinicalDocumentation.forms.stroke.nihss.sensory",
    bestLanguage: "clinicalDocumentation.forms.stroke.nihss.bestLanguage",
    dysarthria: "clinicalDocumentation.forms.stroke.nihss.dysarthria",
    extinctionInattention: "clinicalDocumentation.forms.stroke.nihss.extinctionInattention",
  };

  const neuroFieldLabelKey: Record<NeuroSelectFieldKey, string> = {
    levelOfConsciousness: "clinicalDocumentation.forms.stroke.neuro.levelOfConsciousness",
    orientation: "clinicalDocumentation.forms.stroke.neuro.orientation",
    pupils: "clinicalDocumentation.forms.stroke.neuro.pupils",
    gripLeft: "clinicalDocumentation.forms.stroke.neuro.gripLeft",
    gripRight: "clinicalDocumentation.forms.stroke.neuro.gripRight",
    motorLeft: "clinicalDocumentation.forms.stroke.neuro.motorLeft",
    motorRight: "clinicalDocumentation.forms.stroke.neuro.motorRight",
    sensation: "clinicalDocumentation.forms.stroke.neuro.sensation",
    speech: "clinicalDocumentation.forms.stroke.neuro.speech",
  };

  return (
    <div
      data-testid="clinical-documentation-stroke-form"
      data-card-id={cardId}
      style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}
    >
      {cardId === STROKE_NIHSS_CARD_ID ? (
        <>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.stroke.nihss.assessedAt")}</span>
            <input
              type="datetime-local"
              value={nihss.assessedAt}
              onChange={(e) => setNihss((s) => ({ ...s, assessedAt: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div style={rowStyle}>
            {NIHSS_SCORED_FIELD_KEYS.map((fieldKey) => (
              <ClinicalDocumentationScoreSelectField
                key={fieldKey}
                label={t(nihssFieldLabelKey[fieldKey])}
                value={nihss[fieldKey]}
                options={NIHSS_FIELD_OPTIONS[fieldKey]}
                locale={locale}
                onChange={(v) => setNihss((s) => ({ ...s, [fieldKey]: v }))}
                testId={`clinical-documentation-nihss-${fieldKey}`}
              />
            ))}
          </div>
          <p data-testid="clinical-documentation-nihss-total" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
            {t("clinicalDocumentation.forms.stroke.calculatedScore")}: {nihssTotal}
          </p>
          <p
            data-testid="clinical-documentation-nihss-severity-band"
            style={{ margin: 0, fontSize: 12, color: "#475569" }}
          >
            {t("clinicalDocumentation.forms.stroke.nihss.severityBand")}:{" "}
            {locale === "fr"
              ? NIHSS_SEVERITY_BAND_LABEL_FR[nihssSeverityBand]
              : NIHSS_SEVERITY_BAND_LABEL_EN[nihssSeverityBand]}
          </p>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.stroke.nihss.unableReason")}</span>
            <input
              type="text"
              value={nihss.unableToAssessReason}
              onChange={(e) => setNihss((s) => ({ ...s, unableToAssessReason: e.target.value }))}
              style={fieldStyle}
            />
          </div>
        </>
      ) : null}

      {cardId === STROKE_SWALLOW_SCREEN_CARD_ID ? (
        <>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.stroke.swallow.screenedAt")}</span>
            <input type="datetime-local" value={swallow.screenedAt} onChange={(e) => setSwallow((s) => ({ ...s, screenedAt: e.target.value }))} style={fieldStyle} />
          </div>
          <div style={rowStyle}>
            <CheckboxField label={t("clinicalDocumentation.forms.stroke.swallow.alertEnough")} checked={swallow.alertEnoughForScreen} onChange={(v) => setSwallow((s) => ({ ...s, alertEnoughForScreen: v }))} />
            <CheckboxField label={t("clinicalDocumentation.forms.stroke.swallow.facialDroop")} checked={swallow.facialDroopOrWeakness} onChange={(v) => setSwallow((s) => ({ ...s, facialDroopOrWeakness: v }))} />
            <CheckboxField label={t("clinicalDocumentation.forms.stroke.swallow.speechDifficulty")} checked={swallow.speechDifficulty} onChange={(v) => setSwallow((s) => ({ ...s, speechDifficulty: v }))} />
            <CheckboxField label={t("clinicalDocumentation.forms.stroke.swallow.coughWetVoice")} checked={swallow.coughOrWetVoice} onChange={(v) => setSwallow((s) => ({ ...s, coughOrWetVoice: v }))} />
            <CheckboxField label={t("clinicalDocumentation.forms.stroke.swallow.failedWaterTrial")} checked={swallow.failedWaterTrial} onChange={(v) => setSwallow((s) => ({ ...s, failedWaterTrial: v }))} />
            <CheckboxField label={t("clinicalDocumentation.forms.stroke.swallow.npoRecommended")} checked={swallow.npoRecommended} onChange={(v) => setSwallow((s) => ({ ...s, npoRecommended: v }))} />
            <CheckboxField label={t("clinicalDocumentation.forms.stroke.providerNotified")} checked={swallow.providerNotified} onChange={(v) => setSwallow((s) => ({ ...s, providerNotified: v }))} />
          </div>
          {enumSelect(
            t("clinicalDocumentation.forms.stroke.result"),
            swallow.result,
            SWALLOW_RESULT_OPTIONS.map((o) => ({
              value: o.value,
              label: formatClinicalDocumentationOptionLabel(o, locale),
            })),
            (v) => setSwallow((s) => ({ ...s, result: v as typeof swallow.result }))
          )}
        </>
      ) : null}

      {cardId === STROKE_CINCINNATI_CARD_ID ? (
        <>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.stroke.cincinnati.assessedAt")}</span>
            <input type="datetime-local" value={cincinnati.assessedAt} onChange={(e) => setCincinnati((s) => ({ ...s, assessedAt: e.target.value }))} style={fieldStyle} />
          </div>
          <div style={rowStyle}>
            {(["facialDroop", "armDrift", "speech"] as const).map((key) => (
              <ClinicalDocumentationSelectField
                key={key}
                label={t(`clinicalDocumentation.forms.stroke.cincinnati.${key}`)}
                value={cincinnati[key]}
                options={CINCINNATI_ELEMENT_OPTIONS}
                locale={locale}
                onChange={(v) =>
                  setCincinnati((s) => ({ ...s, [key]: v as typeof cincinnati.facialDroop }))
                }
              />
            ))}
          </div>
          <p data-testid="clinical-documentation-cincinnati-result" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
            {t("clinicalDocumentation.forms.stroke.derivedResult")}: {t(`clinicalDocumentation.forms.stroke.enums.screen.${cincinnatiResult}`)}
          </p>
          <CheckboxField label={t("clinicalDocumentation.forms.stroke.providerNotified")} checked={cincinnati.providerNotified} onChange={(v) => setCincinnati((s) => ({ ...s, providerNotified: v }))} />
        </>
      ) : null}

      {cardId === STROKE_VAN_ASSESSMENT_CARD_ID ? (
        <>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.stroke.van.assessedAt")}</span>
            <input type="datetime-local" value={van.assessedAt} onChange={(e) => setVan((s) => ({ ...s, assessedAt: e.target.value }))} style={fieldStyle} />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.stroke.van.armWeakness")}
              value={van.armWeaknessPresent}
              locale={locale}
              onChange={(v) => setVan((s) => ({ ...s, armWeaknessPresent: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.stroke.van.visualDisturbance")}
              value={van.visualDisturbance}
              locale={locale}
              onChange={(v) => setVan((s) => ({ ...s, visualDisturbance: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.stroke.van.aphasia")}
              value={van.aphasia}
              locale={locale}
              onChange={(v) => setVan((s) => ({ ...s, aphasia: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.stroke.van.neglect")}
              value={van.neglect}
              locale={locale}
              onChange={(v) => setVan((s) => ({ ...s, neglect: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.stroke.providerNotified")}
              value={van.providerNotified}
              locale={locale}
              onChange={(v) => setVan((s) => ({ ...s, providerNotified: v }))}
            />
          </div>
          <p data-testid="clinical-documentation-van-result" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
            {t("clinicalDocumentation.forms.stroke.derivedResult")}: {t(`clinicalDocumentation.forms.stroke.enums.screen.${vanResult}`)}
          </p>
        </>
      ) : null}

      {cardId === STROKE_ABCD2_CARD_ID ? (
        <>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.stroke.abcd2.assessedAt")}</span>
            <input type="datetime-local" value={abcd2.assessedAt} onChange={(e) => setAbcd2((s) => ({ ...s, assessedAt: e.target.value }))} style={fieldStyle} />
          </div>
          <div style={rowStyle}>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.stroke.abcd2.age60")}
              value={abcd2.age60OrOlder}
              locale={locale}
              onChange={(v) => setAbcd2((s) => ({ ...s, age60OrOlder: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.stroke.abcd2.bpElevated")}
              value={abcd2.bloodPressureElevated}
              locale={locale}
              onChange={(v) => setAbcd2((s) => ({ ...s, bloodPressureElevated: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.stroke.abcd2.diabetes")}
              value={abcd2.diabetes}
              locale={locale}
              onChange={(v) => setAbcd2((s) => ({ ...s, diabetes: v }))}
            />
          </div>
          <ClinicalDocumentationSelectField
            label={t("clinicalDocumentation.forms.stroke.abcd2.clinicalFeature")}
            value={abcd2.clinicalFeature}
            options={ABCD2_CLINICAL_FEATURE_OPTIONS}
            locale={locale}
            onChange={(v) =>
              setAbcd2((s) => ({ ...s, clinicalFeature: v as typeof abcd2.clinicalFeature }))
            }
          />
          <ClinicalDocumentationSelectField
            label={t("clinicalDocumentation.forms.stroke.abcd2.duration")}
            value={abcd2.duration}
            options={ABCD2_DURATION_OPTIONS}
            locale={locale}
            onChange={(v) => setAbcd2((s) => ({ ...s, duration: v as typeof abcd2.duration }))}
          />
          <p data-testid="clinical-documentation-abcd2-total" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
            {t("clinicalDocumentation.forms.stroke.calculatedScore")}: {abcd2Total}
          </p>
        </>
      ) : null}

      {cardId === STROKE_TIMELINE_CARD_ID ? (
        <div style={rowStyle}>
          {(
            [
              ["lastKnownWellTime", "clinicalDocumentation.forms.stroke.timeline.lkw", true],
              ["symptomDiscoveryTime", "clinicalDocumentation.forms.stroke.timeline.symptomDiscovery", false],
              ["arrivalTime", "clinicalDocumentation.forms.stroke.timeline.arrival", false],
              ["strokeAlertCalledTime", "clinicalDocumentation.forms.stroke.timeline.strokeAlert", false],
              ["providerEvaluationTime", "clinicalDocumentation.forms.stroke.timeline.providerEval", false],
              ["ctOrderedTime", "clinicalDocumentation.forms.stroke.timeline.ctOrdered", false],
              ["ctCompletedTime", "clinicalDocumentation.forms.stroke.timeline.ctCompleted", false],
              ["radiologyResultTime", "clinicalDocumentation.forms.stroke.timeline.radiologyResult", false],
              ["thrombolyticDecisionTime", "clinicalDocumentation.forms.stroke.timeline.thrombolyticDecision", false],
              ["thrombolyticGivenTime", "clinicalDocumentation.forms.stroke.timeline.thrombolyticGiven", false],
              ["transferDecisionTime", "clinicalDocumentation.forms.stroke.timeline.transferDecision", false],
            ] as const
          ).map(([key, labelKey, required]) => (
            <div key={key}>
              <span style={labelStyle}>
                {t(labelKey)}
                {required ? " *" : ""}
              </span>
              <input
                type="datetime-local"
                value={timeline[key]}
                onChange={(e) => setTimeline((s) => ({ ...s, [key]: e.target.value }))}
                style={fieldStyle}
              />
            </div>
          ))}
        </div>
      ) : null}

      {cardId === STROKE_NEURO_CHECKS_CARD_ID ? (
        <>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.stroke.neuro.assessedAt")}</span>
            <input type="datetime-local" value={neuro.assessedAt} onChange={(e) => setNeuro((s) => ({ ...s, assessedAt: e.target.value }))} style={fieldStyle} />
          </div>
          <div style={rowStyle}>
            {(Object.keys(NEURO_FIELD_OPTIONS) as NeuroSelectFieldKey[]).map((key) => (
              <ClinicalDocumentationSelectField
                key={key}
                label={t(neuroFieldLabelKey[key])}
                value={neuro[key]}
                options={NEURO_FIELD_OPTIONS[key]}
                locale={locale}
                onChange={(v) => setNeuro((s) => ({ ...s, [key]: v }))}
                testId={`clinical-documentation-neuro-${key}`}
              />
            ))}
          </div>
          <ClinicalDocumentationSelectField
            label={t("clinicalDocumentation.forms.stroke.neuro.changesFromPrior")}
            value={neuro.changesFromPrior}
            options={NEURO_CHANGES_FROM_PRIOR_OPTIONS}
            locale={locale}
            onChange={(v) =>
              setNeuro((s) => ({ ...s, changesFromPrior: v as typeof neuro.changesFromPrior }))
            }
          />
          <ClinicalDocumentationBooleanField
            label={t("clinicalDocumentation.forms.stroke.providerNotified")}
            value={neuro.providerNotified}
            locale={locale}
            onChange={(v) => setNeuro((s) => ({ ...s, providerNotified: v }))}
          />
        </>
      ) : null}

      {(cardId === STROKE_NIHSS_CARD_ID ||
        cardId === STROKE_SWALLOW_SCREEN_CARD_ID ||
        cardId === STROKE_CINCINNATI_CARD_ID ||
        cardId === STROKE_VAN_ASSESSMENT_CARD_ID ||
        cardId === STROKE_ABCD2_CARD_ID ||
        cardId === STROKE_TIMELINE_CARD_ID ||
        cardId === STROKE_NEURO_CHECKS_CARD_ID) && (
        <div>
          <span style={labelStyle}>{t("clinicalDocumentation.forms.common.notes")}</span>
          <textarea
            value={
              cardId === STROKE_NIHSS_CARD_ID
                ? nihss.notes
                : cardId === STROKE_SWALLOW_SCREEN_CARD_ID
                  ? swallow.notes
                  : cardId === STROKE_CINCINNATI_CARD_ID
                    ? cincinnati.notes
                    : cardId === STROKE_VAN_ASSESSMENT_CARD_ID
                      ? van.notes
                      : cardId === STROKE_ABCD2_CARD_ID
                        ? abcd2.notes
                        : cardId === STROKE_TIMELINE_CARD_ID
                          ? timeline.notes
                          : neuro.notes
            }
            onChange={(e) => {
              const v = e.target.value;
              if (cardId === STROKE_NIHSS_CARD_ID) setNihss((s) => ({ ...s, notes: v }));
              else if (cardId === STROKE_SWALLOW_SCREEN_CARD_ID) setSwallow((s) => ({ ...s, notes: v }));
              else if (cardId === STROKE_CINCINNATI_CARD_ID) setCincinnati((s) => ({ ...s, notes: v }));
              else if (cardId === STROKE_VAN_ASSESSMENT_CARD_ID) setVan((s) => ({ ...s, notes: v }));
              else if (cardId === STROKE_ABCD2_CARD_ID) setAbcd2((s) => ({ ...s, notes: v }));
              else if (cardId === STROKE_TIMELINE_CARD_ID) setTimeline((s) => ({ ...s, notes: v }));
              else setNeuro((s) => ({ ...s, notes: v }));
            }}
            style={{ ...fieldStyle, minHeight: 48 }}
          />
        </div>
      )}

      {validationError ? (
        <p data-testid="clinical-documentation-stroke-validation-error" style={{ margin: 0, fontSize: 12, color: "#b91c1c" }}>
          {validationError}
        </p>
      ) : null}

      <button
        type="button"
        disabled={saving}
        data-testid="clinical-documentation-stroke-save"
        onClick={() => void handleSubmit()}
        style={{
          alignSelf: "flex-start",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: saving ? "#f1f5f9" : "#0f172a",
          color: saving ? "#94a3b8" : "#fff",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? t("clinicalDocumentation.saving") : t("clinicalDocumentation.saveEntry")}
      </button>
    </div>
  );
}

export function isEdoc4StrokeFormCard(cardId: string): boolean {
  return (EDOC4_STROKE_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}
