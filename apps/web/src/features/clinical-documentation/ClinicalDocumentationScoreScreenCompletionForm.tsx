"use client";

import React, { useMemo, useState } from "react";
import {
  calculateCiwaArTotal,
  calculateCowsTotal,
  calculateGad7Total,
  calculateGenevaTotal,
  calculateHeartTotal,
  calculatePercNegative,
  calculatePhq9Total,
  calculateRtsTotal,
  calculateWellsPeTotal,
  CIWA_ITEM_SCORE_OPTIONS,
  CIWA_ORIENTATION_SCORE_OPTIONS,
  COWS_ITEM_0_4_SCORE_OPTIONS,
  COWS_ITEM_0_5_SCORE_OPTIONS,
  deriveCiwaArSeverity,
  deriveCowsSeverity,
  deriveCssrsRiskLevel,
  deriveGad7Severity,
  deriveGenevaRiskLevel,
  deriveHeartRiskLevel,
  derivePhq9Severity,
  derivePhq9SuicidalIdeationPositive,
  deriveRtsRiskFlag,
  deriveWellsPeRiskLevel,
  EDOC23B_SCORE_SCREEN_COMPLETION_CARD_IDS,
  FOUNDATION_YES_NO_OPTIONS,
  GCS_SCORE_OPTIONS,
  GENEVA_HEART_RATE_CATEGORY_OPTIONS,
  HEART_COMPONENT_SCORE_OPTIONS,
  PHQ_GAD_ITEM_SCORE_OPTIONS,
  RTS_RESPIRATORY_RATE_CATEGORY_OPTIONS,
  RTS_SYSTOLIC_BP_CATEGORY_OPTIONS,
  SCORE_ABUSE_CARD_ID,
  SCORE_CIWA_AR_CARD_ID,
  SCORE_COWS_CARD_ID,
  SCORE_CSSRS_CARD_ID,
  SCORE_GAD7_CARD_ID,
  SCORE_GENEVA_CARD_ID,
  SCORE_HEART_CARD_ID,
  SCORE_HUMAN_TRAFFICKING_CARD_ID,
  SCORE_PERC_CARD_ID,
  SCORE_PHQ9_CARD_ID,
  SCORE_RTS_CARD_ID,
  SCORE_SDOH_CARD_ID,
  SCORE_WELLS_PE_CARD_ID,
  validateFoundationCatalogCompletionPayloadForCard,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  ClinicalDocumentationScoreSelectField,
  ClinicalDocumentationSelectField,
} from "./ClinicalDocumentationFieldControls";

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

const noticeStyle: React.CSSProperties = {
  margin: 0,
  padding: "6px 8px",
  fontSize: 11,
  borderRadius: 8,
  background: "#eff6ff",
  color: "#1e40af",
  border: "1px solid #bfdbfe",
};

type YesNo = (typeof FOUNDATION_YES_NO_OPTIONS)[number]["value"];

function nowLocalDatetimeValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
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
      options={FOUNDATION_YES_NO_OPTIONS}
      locale={locale}
      onChange={onChange}
      testId={testId}
    />
  );
}

export function ClinicalDocumentationScoreScreenCompletionForm({
  cardId,
  saving,
  onSubmit,
}: {
  cardId: string;
  saving: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en" : "fr";
  const [validationError, setValidationError] = useState<string | null>(null);

  const [ciwa, setCiwa] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    nauseaVomiting: 0,
    tremor: 0,
    paroxysmalSweats: 0,
    anxiety: 0,
    agitation: 0,
    tactileDisturbances: 0,
    auditoryDisturbances: 0,
    visualDisturbances: 0,
    headache: 0,
    orientationClouding: 0,
    providerNotified: "NO" as YesNo,
  });

  const ciwaCalc = useMemo(() => {
    const totalScore = calculateCiwaArTotal(ciwa);
    const severity = deriveCiwaArSeverity(totalScore);
    return { totalScore, severity };
  }, [ciwa]);

  const [cows, setCows] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    restingPulse: 0,
    sweating: 0,
    restlessness: 0,
    pupilSize: 0,
    boneJointAches: 0,
    runnyNoseTearing: 0,
    giUpset: 0,
    tremor: 0,
    yawning: 0,
    anxietyIrritability: 0,
    goosefleshSkin: 0,
    providerNotified: "NO" as YesNo,
  });

  const cowsCalc = useMemo(() => {
    const totalScore = calculateCowsTotal(cows);
    const severity = deriveCowsSeverity(totalScore);
    return { totalScore, severity };
  }, [cows]);

  const [cssrs, setCssrs] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    wishToBeDead: "NO" as YesNo,
    suicidalThoughts: "NO" as YesNo,
    methodThoughts: "NO" as YesNo,
    intentWithoutPlan: "NO" as YesNo,
    intentWithPlan: "NO" as YesNo,
    suicidalBehavior: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
    safetyPrecautionsInitiated: "NO" as YesNo,
  });

  const cssrsCalc = useMemo(() => deriveCssrsRiskLevel(cssrs), [cssrs]);

  const [phq9, setPhq9] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    littleInterest: 0,
    feelingDown: 0,
    sleepTrouble: 0,
    fatigue: 0,
    appetite: 0,
    feelingBad: 0,
    concentration: 0,
    psychomotor: 0,
    suicidalIdeation: 0,
    providerNotified: "NO" as YesNo,
  });

  const phq9Calc = useMemo(() => {
    const totalScore = calculatePhq9Total(phq9);
    const severity = derivePhq9Severity(totalScore);
    const suicidalIdeationItemPositive = derivePhq9SuicidalIdeationPositive(phq9.suicidalIdeation);
    return { totalScore, severity, suicidalIdeationItemPositive };
  }, [phq9]);

  const [gad7, setGad7] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    feelingNervous: 0,
    cantStopWorrying: 0,
    worryingTooMuch: 0,
    troubleRelaxing: 0,
    restlessness: 0,
    irritability: 0,
    afraidSomethingAwful: 0,
    providerNotified: "NO" as YesNo,
  });

  const gad7Calc = useMemo(() => {
    const totalScore = calculateGad7Total(gad7);
    const severity = deriveGad7Severity(totalScore);
    return { totalScore, severity };
  }, [gad7]);

  const [rts, setRts] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    gcsScore: 15,
    systolicBpCategory: "GT_89" as (typeof RTS_SYSTOLIC_BP_CATEGORY_OPTIONS)[number]["value"],
    respiratoryRateCategory: "10_29" as (typeof RTS_RESPIRATORY_RATE_CATEGORY_OPTIONS)[number]["value"],
    providerNotified: "NO" as YesNo,
  });

  const rtsCalc = useMemo(() => {
    const totalScore = calculateRtsTotal(rts);
    const riskFlag = deriveRtsRiskFlag(totalScore);
    return { totalScore, riskFlag };
  }, [rts]);

  const [heart, setHeart] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    history: 0,
    ecg: 0,
    age: 0,
    riskFactors: 0,
    troponin: 0,
    providerNotified: "NO" as YesNo,
  });

  const heartCalc = useMemo(() => {
    const totalScore = calculateHeartTotal(heart);
    const riskLevel = deriveHeartRiskLevel(totalScore);
    return { totalScore, riskLevel };
  }, [heart]);

  const [wellsPe, setWellsPe] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    clinicalSignsDvt: "NO" as YesNo,
    peMostLikely: "NO" as YesNo,
    heartRateOver100: "NO" as YesNo,
    immobilizationOrSurgery: "NO" as YesNo,
    previousDvtPe: "NO" as YesNo,
    hemoptysis: "NO" as YesNo,
    malignancy: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
  });

  const wellsCalc = useMemo(() => {
    const totalScore = calculateWellsPeTotal(wellsPe);
    const riskLevel = deriveWellsPeRiskLevel(totalScore);
    return { totalScore, riskLevel };
  }, [wellsPe]);

  const [perc, setPerc] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    ageUnder50: "YES" as YesNo,
    heartRateUnder100: "YES" as YesNo,
    oxygenSaturationAtLeast95: "YES" as YesNo,
    noHemoptysis: "YES" as YesNo,
    noEstrogenUse: "YES" as YesNo,
    noPriorDvtPe: "YES" as YesNo,
    noUnilateralLegSwelling: "YES" as YesNo,
    noRecentSurgeryTrauma: "YES" as YesNo,
    providerNotified: "NO" as YesNo,
  });

  const percCalc = useMemo(() => calculatePercNegative(perc), [perc]);

  const [geneva, setGeneva] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    ageOver65: "NO" as YesNo,
    previousDvtPe: "NO" as YesNo,
    surgeryOrFractureRecent: "NO" as YesNo,
    activeMalignancy: "NO" as YesNo,
    unilateralLowerLimbPain: "NO" as YesNo,
    hemoptysis: "NO" as YesNo,
    heartRateCategory: "LESS_75" as (typeof GENEVA_HEART_RATE_CATEGORY_OPTIONS)[number]["value"],
    painOnPalpationAndEdema: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
  });

  const genevaCalc = useMemo(() => {
    const totalScore = calculateGenevaTotal(geneva);
    const riskLevel = deriveGenevaRiskLevel(totalScore);
    return { totalScore, riskLevel };
  }, [geneva]);

  const [abuse, setAbuse] = useState({
    screenTime: nowLocalDatetimeValue(),
    screenPerformed: "YES" as YesNo,
    patientFeelsUnsafe: "NO" as YesNo,
    physicalAbuseConcern: "NO" as YesNo,
    emotionalAbuseConcern: "NO" as YesNo,
    sexualAbuseConcern: "NO" as YesNo,
    neglectConcern: "NO" as YesNo,
    resourcesOffered: "NO" as YesNo,
    mandatoryReportConsidered: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
  });

  const abuseConcern = useMemo(
    () =>
      abuse.patientFeelsUnsafe === "YES" ||
      abuse.physicalAbuseConcern === "YES" ||
      abuse.emotionalAbuseConcern === "YES" ||
      abuse.sexualAbuseConcern === "YES" ||
      abuse.neglectConcern === "YES",
    [abuse]
  );

  const [trafficking, setTrafficking] = useState({
    screenTime: nowLocalDatetimeValue(),
    screenPerformed: "YES" as YesNo,
    unableToSpeakFreely: "NO" as YesNo,
    identificationControlledByOther: "NO" as YesNo,
    fearfulOrCoerced: "NO" as YesNo,
    workLivingControlConcern: "NO" as YesNo,
    physicalSafetyConcern: "NO" as YesNo,
    resourcesOffered: "NO" as YesNo,
    mandatoryReportConsidered: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
  });

  const traffickingConcern = useMemo(
    () =>
      trafficking.unableToSpeakFreely === "YES" ||
      trafficking.identificationControlledByOther === "YES" ||
      trafficking.fearfulOrCoerced === "YES" ||
      trafficking.workLivingControlConcern === "YES" ||
      trafficking.physicalSafetyConcern === "YES",
    [trafficking]
  );

  const [sdoh, setSdoh] = useState({
    screenTime: nowLocalDatetimeValue(),
    foodInsecurity: "NO" as YesNo,
    housingInstability: "NO" as YesNo,
    transportationNeed: "NO" as YesNo,
    utilityNeed: "NO" as YesNo,
    medicationAffordabilityConcern: "NO" as YesNo,
    interpersonalSafetyConcern: "NO" as YesNo,
    resourcesOffered: "NO" as YesNo,
    caseManagementReferral: "NO" as YesNo,
    providerNotified: "NO" as YesNo,
  });

  const sdohNeed = useMemo(
    () =>
      sdoh.foodInsecurity === "YES" ||
      sdoh.housingInstability === "YES" ||
      sdoh.transportationNeed === "YES" ||
      sdoh.utilityNeed === "YES" ||
      sdoh.medicationAffordabilityConcern === "YES" ||
      sdoh.interpersonalSafetyConcern === "YES",
    [sdoh]
  );

  const providerNotice = useMemo(() => {
    switch (cardId) {
      case SCORE_CIWA_AR_CARD_ID:
        return ciwaCalc.totalScore >= 16 && ciwa.providerNotified !== "YES";
      case SCORE_COWS_CARD_ID:
        return cowsCalc.severity === "SEVERE" && cows.providerNotified !== "YES";
      case SCORE_CSSRS_CARD_ID:
        return (
          (cssrsCalc === "HIGH" || cssrs.intentWithPlan === "YES" || cssrs.suicidalBehavior === "YES") &&
          cssrs.providerNotified !== "YES"
        );
      case SCORE_PHQ9_CARD_ID:
        return (
          (phq9Calc.suicidalIdeationItemPositive === "YES" || phq9Calc.totalScore >= 20) &&
          phq9.providerNotified !== "YES"
        );
      case SCORE_GAD7_CARD_ID:
        return gad7Calc.severity === "SEVERE" && gad7.providerNotified !== "YES";
      case SCORE_RTS_CARD_ID:
        return rtsCalc.riskFlag === "HIGH" && rts.providerNotified !== "YES";
      case SCORE_HEART_CARD_ID:
        return heartCalc.riskLevel === "HIGH" && heart.providerNotified !== "YES";
      case SCORE_WELLS_PE_CARD_ID:
        return wellsCalc.riskLevel === "PE_LIKELY" && wellsPe.providerNotified !== "YES";
      case SCORE_GENEVA_CARD_ID:
        return genevaCalc.riskLevel === "HIGH" && geneva.providerNotified !== "YES";
      case SCORE_ABUSE_CARD_ID:
        return abuseConcern && abuse.providerNotified !== "YES";
      case SCORE_HUMAN_TRAFFICKING_CARD_ID:
        return traffickingConcern && trafficking.providerNotified !== "YES";
      case SCORE_SDOH_CARD_ID:
        return sdoh.interpersonalSafetyConcern === "YES" && sdoh.providerNotified !== "YES";
      default:
        return false;
    }
  }, [
    cardId,
    ciwa.providerNotified,
    ciwaCalc,
    cows.providerNotified,
    cowsCalc,
    cssrs,
    cssrsCalc,
    phq9.providerNotified,
    phq9Calc,
    gad7.providerNotified,
    gad7Calc,
    rts.providerNotified,
    rtsCalc,
    heart.providerNotified,
    heartCalc,
    wellsPe.providerNotified,
    wellsCalc,
    geneva.providerNotified,
    genevaCalc,
    abuse.providerNotified,
    abuseConcern,
    trafficking.providerNotified,
    traffickingConcern,
    sdoh.providerNotified,
    sdoh.interpersonalSafetyConcern,
  ]);

  function buildPayload(): Record<string, unknown> {
    switch (cardId) {
      case SCORE_CIWA_AR_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(ciwa.assessmentTime),
          nauseaVomiting: ciwa.nauseaVomiting,
          tremor: ciwa.tremor,
          paroxysmalSweats: ciwa.paroxysmalSweats,
          anxiety: ciwa.anxiety,
          agitation: ciwa.agitation,
          tactileDisturbances: ciwa.tactileDisturbances,
          auditoryDisturbances: ciwa.auditoryDisturbances,
          visualDisturbances: ciwa.visualDisturbances,
          headache: ciwa.headache,
          orientationClouding: ciwa.orientationClouding,
          totalScore: ciwaCalc.totalScore,
          severity: ciwaCalc.severity,
          providerNotified: ciwa.providerNotified,
        };
      case SCORE_COWS_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(cows.assessmentTime),
          restingPulse: cows.restingPulse,
          sweating: cows.sweating,
          restlessness: cows.restlessness,
          pupilSize: cows.pupilSize,
          boneJointAches: cows.boneJointAches,
          runnyNoseTearing: cows.runnyNoseTearing,
          giUpset: cows.giUpset,
          tremor: cows.tremor,
          yawning: cows.yawning,
          anxietyIrritability: cows.anxietyIrritability,
          goosefleshSkin: cows.goosefleshSkin,
          providerNotified: cows.providerNotified,
          totalScore: cowsCalc.totalScore,
          severity: cowsCalc.severity,
        };
      case SCORE_CSSRS_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(cssrs.assessmentTime),
          wishToBeDead: cssrs.wishToBeDead,
          suicidalThoughts: cssrs.suicidalThoughts,
          methodThoughts: cssrs.methodThoughts,
          intentWithoutPlan: cssrs.intentWithoutPlan,
          intentWithPlan: cssrs.intentWithPlan,
          suicidalBehavior: cssrs.suicidalBehavior,
          riskLevel: cssrsCalc,
          providerNotified: cssrs.providerNotified,
          safetyPrecautionsInitiated: cssrs.safetyPrecautionsInitiated,
        };
      case SCORE_PHQ9_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(phq9.assessmentTime),
          littleInterest: phq9.littleInterest,
          feelingDown: phq9.feelingDown,
          sleepTrouble: phq9.sleepTrouble,
          fatigue: phq9.fatigue,
          appetite: phq9.appetite,
          feelingBad: phq9.feelingBad,
          concentration: phq9.concentration,
          psychomotor: phq9.psychomotor,
          suicidalIdeation: phq9.suicidalIdeation,
          totalScore: phq9Calc.totalScore,
          severity: phq9Calc.severity,
          suicidalIdeationItemPositive: phq9Calc.suicidalIdeationItemPositive,
          providerNotified: phq9.providerNotified,
        };
      case SCORE_GAD7_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(gad7.assessmentTime),
          feelingNervous: gad7.feelingNervous,
          cantStopWorrying: gad7.cantStopWorrying,
          worryingTooMuch: gad7.worryingTooMuch,
          troubleRelaxing: gad7.troubleRelaxing,
          restlessness: gad7.restlessness,
          irritability: gad7.irritability,
          afraidSomethingAwful: gad7.afraidSomethingAwful,
          totalScore: gad7Calc.totalScore,
          severity: gad7Calc.severity,
          providerNotified: gad7.providerNotified,
        };
      case SCORE_RTS_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(rts.assessmentTime),
          gcsScore: rts.gcsScore,
          systolicBpCategory: rts.systolicBpCategory,
          respiratoryRateCategory: rts.respiratoryRateCategory,
          totalScore: rtsCalc.totalScore,
          riskFlag: rtsCalc.riskFlag,
          providerNotified: rts.providerNotified,
        };
      case SCORE_HEART_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(heart.assessmentTime),
          history: heart.history,
          ecg: heart.ecg,
          age: heart.age,
          riskFactors: heart.riskFactors,
          troponin: heart.troponin,
          totalScore: heartCalc.totalScore,
          riskLevel: heartCalc.riskLevel,
          providerNotified: heart.providerNotified,
        };
      case SCORE_WELLS_PE_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(wellsPe.assessmentTime),
          clinicalSignsDvt: wellsPe.clinicalSignsDvt,
          peMostLikely: wellsPe.peMostLikely,
          heartRateOver100: wellsPe.heartRateOver100,
          immobilizationOrSurgery: wellsPe.immobilizationOrSurgery,
          previousDvtPe: wellsPe.previousDvtPe,
          hemoptysis: wellsPe.hemoptysis,
          malignancy: wellsPe.malignancy,
          totalScore: wellsCalc.totalScore,
          riskLevel: wellsCalc.riskLevel,
          providerNotified: wellsPe.providerNotified,
        };
      case SCORE_PERC_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(perc.assessmentTime),
          ageUnder50: perc.ageUnder50,
          heartRateUnder100: perc.heartRateUnder100,
          oxygenSaturationAtLeast95: perc.oxygenSaturationAtLeast95,
          noHemoptysis: perc.noHemoptysis,
          noEstrogenUse: perc.noEstrogenUse,
          noPriorDvtPe: perc.noPriorDvtPe,
          noUnilateralLegSwelling: perc.noUnilateralLegSwelling,
          noRecentSurgeryTrauma: perc.noRecentSurgeryTrauma,
          percNegative: percCalc,
          providerNotified: perc.providerNotified,
        };
      case SCORE_GENEVA_CARD_ID:
        return {
          assessmentTime: toIsoFromLocalDatetime(geneva.assessmentTime),
          ageOver65: geneva.ageOver65,
          previousDvtPe: geneva.previousDvtPe,
          surgeryOrFractureRecent: geneva.surgeryOrFractureRecent,
          activeMalignancy: geneva.activeMalignancy,
          unilateralLowerLimbPain: geneva.unilateralLowerLimbPain,
          hemoptysis: geneva.hemoptysis,
          heartRateCategory: geneva.heartRateCategory,
          painOnPalpationAndEdema: geneva.painOnPalpationAndEdema,
          totalScore: genevaCalc.totalScore,
          riskLevel: genevaCalc.riskLevel,
          providerNotified: geneva.providerNotified,
        };
      case SCORE_ABUSE_CARD_ID:
        return {
          screenTime: toIsoFromLocalDatetime(abuse.screenTime),
          screenPerformed: abuse.screenPerformed,
          patientFeelsUnsafe: abuse.patientFeelsUnsafe,
          physicalAbuseConcern: abuse.physicalAbuseConcern,
          emotionalAbuseConcern: abuse.emotionalAbuseConcern,
          sexualAbuseConcern: abuse.sexualAbuseConcern,
          neglectConcern: abuse.neglectConcern,
          resourcesOffered: abuse.resourcesOffered,
          mandatoryReportConsidered: abuse.mandatoryReportConsidered,
          providerNotified: abuse.providerNotified,
        };
      case SCORE_HUMAN_TRAFFICKING_CARD_ID:
        return {
          screenTime: toIsoFromLocalDatetime(trafficking.screenTime),
          screenPerformed: trafficking.screenPerformed,
          unableToSpeakFreely: trafficking.unableToSpeakFreely,
          identificationControlledByOther: trafficking.identificationControlledByOther,
          fearfulOrCoerced: trafficking.fearfulOrCoerced,
          workLivingControlConcern: trafficking.workLivingControlConcern,
          physicalSafetyConcern: trafficking.physicalSafetyConcern,
          resourcesOffered: trafficking.resourcesOffered,
          mandatoryReportConsidered: trafficking.mandatoryReportConsidered,
          providerNotified: trafficking.providerNotified,
        };
      case SCORE_SDOH_CARD_ID:
        return {
          screenTime: toIsoFromLocalDatetime(sdoh.screenTime),
          foodInsecurity: sdoh.foodInsecurity,
          housingInstability: sdoh.housingInstability,
          transportationNeed: sdoh.transportationNeed,
          utilityNeed: sdoh.utilityNeed,
          medicationAffordabilityConcern: sdoh.medicationAffordabilityConcern,
          interpersonalSafetyConcern: sdoh.interpersonalSafetyConcern,
          resourcesOffered: sdoh.resourcesOffered,
          caseManagementReferral: sdoh.caseManagementReferral,
          providerNotified: sdoh.providerNotified,
        };
      default:
        return {};
    }
  }

  const save = async () => {
    setValidationError(null);
    const payload = buildPayload();
    const validated = validateFoundationCatalogCompletionPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.scoreScreenCompletion.validationError"));
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

  const scoreField = (
    label: string,
    value: number,
    options: typeof CIWA_ITEM_SCORE_OPTIONS,
    onChange: (v: number) => void
  ) => (
    <ClinicalDocumentationScoreSelectField
      label={label}
      value={value}
      options={options}
      locale={locale}
      onChange={onChange}
    />
  );

  const severityLabel = (band: string) =>
    t(`clinicalDocumentation.forms.scoreScreenCompletion.severity.${band}` as never);

  return (
    <div
      data-testid="clinical-documentation-score-screen-completion-form"
      data-card-id={cardId}
      data-compact-layout="true"
      style={formStyle}
    >
      {validationError ? (
        <p style={{ margin: 0, fontSize: 11, color: "#b91c1c" }}>{validationError}</p>
      ) : null}

      {providerNotice ? (
        <p data-testid="score-provider-notification-banner" style={noticeStyle}>
          {t("clinicalDocumentation.forms.scoreScreenCompletion.providerNotificationRequired")}
        </p>
      ) : null}

      <div style={rowStyle}>
        {cardId === SCORE_CIWA_AR_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.assessmentTime"),
              ciwa.assessmentTime,
              (v) => setCiwa({ ...ciwa, assessmentTime: v }),
              "score-ciwa-time"
            )}
            {scoreField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.nauseaVomiting"),
              ciwa.nauseaVomiting,
              CIWA_ITEM_SCORE_OPTIONS,
              (v) => setCiwa({ ...ciwa, nauseaVomiting: v })
            )}
            {scoreField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.tremor"),
              ciwa.tremor,
              CIWA_ITEM_SCORE_OPTIONS,
              (v) => setCiwa({ ...ciwa, tremor: v })
            )}
            {scoreField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.anxiety"),
              ciwa.anxiety,
              CIWA_ITEM_SCORE_OPTIONS,
              (v) => setCiwa({ ...ciwa, anxiety: v })
            )}
            {scoreField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.orientationClouding"),
              ciwa.orientationClouding,
              CIWA_ORIENTATION_SCORE_OPTIONS,
              (v) => setCiwa({ ...ciwa, orientationClouding: v })
            )}
            <p style={calcStyle} data-testid="score-ciwa-calculated">
              {t("clinicalDocumentation.forms.scoreScreenCompletion.totalScore")}: {ciwaCalc.totalScore}{" "}
              — {t("clinicalDocumentation.forms.scoreScreenCompletion.severityBand")}:{" "}
              {severityLabel(ciwaCalc.severity)}
            </p>
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.providerNotified")}
              value={ciwa.providerNotified}
              locale={locale}
              onChange={(v) => setCiwa({ ...ciwa, providerNotified: v })}
            />
          </>
        ) : null}

        {cardId === SCORE_COWS_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.assessmentTime"),
              cows.assessmentTime,
              (v) => setCows({ ...cows, assessmentTime: v })
            )}
            {scoreField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.restingPulse"),
              cows.restingPulse,
              COWS_ITEM_0_4_SCORE_OPTIONS,
              (v) => setCows({ ...cows, restingPulse: v })
            )}
            {scoreField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.restlessness"),
              cows.restlessness,
              COWS_ITEM_0_5_SCORE_OPTIONS,
              (v) => setCows({ ...cows, restlessness: v })
            )}
            <p style={calcStyle} data-testid="score-cows-calculated">
              {t("clinicalDocumentation.forms.scoreScreenCompletion.totalScore")}: {cowsCalc.totalScore}{" "}
              — {t("clinicalDocumentation.forms.scoreScreenCompletion.severityBand")}:{" "}
              {severityLabel(cowsCalc.severity)}
            </p>
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.providerNotified")}
              value={cows.providerNotified}
              locale={locale}
              onChange={(v) => setCows({ ...cows, providerNotified: v })}
            />
          </>
        ) : null}

        {cardId === SCORE_CSSRS_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.assessmentTime"),
              cssrs.assessmentTime,
              (v) => setCssrs({ ...cssrs, assessmentTime: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.wishToBeDead")}
              value={cssrs.wishToBeDead}
              locale={locale}
              onChange={(v) => setCssrs({ ...cssrs, wishToBeDead: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.suicidalThoughts")}
              value={cssrs.suicidalThoughts}
              locale={locale}
              onChange={(v) => setCssrs({ ...cssrs, suicidalThoughts: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.intentWithPlan")}
              value={cssrs.intentWithPlan}
              locale={locale}
              onChange={(v) => setCssrs({ ...cssrs, intentWithPlan: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.suicidalBehavior")}
              value={cssrs.suicidalBehavior}
              locale={locale}
              onChange={(v) => setCssrs({ ...cssrs, suicidalBehavior: v })}
            />
            <p style={calcStyle} data-testid="score-cssrs-calculated">
              {t("clinicalDocumentation.forms.scoreScreenCompletion.riskLevel")}:{" "}
              {severityLabel(cssrsCalc)}
            </p>
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.safetyPrecautionsInitiated")}
              value={cssrs.safetyPrecautionsInitiated}
              locale={locale}
              onChange={(v) => setCssrs({ ...cssrs, safetyPrecautionsInitiated: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.providerNotified")}
              value={cssrs.providerNotified}
              locale={locale}
              onChange={(v) => setCssrs({ ...cssrs, providerNotified: v })}
            />
          </>
        ) : null}

        {cardId === SCORE_PHQ9_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.assessmentTime"),
              phq9.assessmentTime,
              (v) => setPhq9({ ...phq9, assessmentTime: v })
            )}
            {scoreField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.littleInterest"),
              phq9.littleInterest,
              PHQ_GAD_ITEM_SCORE_OPTIONS,
              (v) => setPhq9({ ...phq9, littleInterest: v })
            )}
            {scoreField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.feelingDown"),
              phq9.feelingDown,
              PHQ_GAD_ITEM_SCORE_OPTIONS,
              (v) => setPhq9({ ...phq9, feelingDown: v })
            )}
            {scoreField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.suicidalIdeation"),
              phq9.suicidalIdeation,
              PHQ_GAD_ITEM_SCORE_OPTIONS,
              (v) => setPhq9({ ...phq9, suicidalIdeation: v })
            )}
            <p style={calcStyle} data-testid="score-phq9-calculated">
              {t("clinicalDocumentation.forms.scoreScreenCompletion.totalScore")}: {phq9Calc.totalScore}{" "}
              — {t("clinicalDocumentation.forms.scoreScreenCompletion.severityBand")}:{" "}
              {severityLabel(phq9Calc.severity)}
            </p>
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.providerNotified")}
              value={phq9.providerNotified}
              locale={locale}
              onChange={(v) => setPhq9({ ...phq9, providerNotified: v })}
            />
          </>
        ) : null}

        {cardId === SCORE_GAD7_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.assessmentTime"),
              gad7.assessmentTime,
              (v) => setGad7({ ...gad7, assessmentTime: v })
            )}
            {scoreField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.feelingNervous"),
              gad7.feelingNervous,
              PHQ_GAD_ITEM_SCORE_OPTIONS,
              (v) => setGad7({ ...gad7, feelingNervous: v })
            )}
            <p style={calcStyle} data-testid="score-gad7-calculated">
              {t("clinicalDocumentation.forms.scoreScreenCompletion.totalScore")}: {gad7Calc.totalScore}{" "}
              — {t("clinicalDocumentation.forms.scoreScreenCompletion.severityBand")}:{" "}
              {severityLabel(gad7Calc.severity)}
            </p>
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.providerNotified")}
              value={gad7.providerNotified}
              locale={locale}
              onChange={(v) => setGad7({ ...gad7, providerNotified: v })}
            />
          </>
        ) : null}

        {cardId === SCORE_RTS_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.assessmentTime"),
              rts.assessmentTime,
              (v) => setRts({ ...rts, assessmentTime: v })
            )}
            <ClinicalDocumentationScoreSelectField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.gcsScore")}
              value={rts.gcsScore}
              options={GCS_SCORE_OPTIONS}
              locale={locale}
              onChange={(v) => setRts({ ...rts, gcsScore: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.systolicBpCategory")}
              value={rts.systolicBpCategory}
              options={RTS_SYSTOLIC_BP_CATEGORY_OPTIONS}
              locale={locale}
              onChange={(v) => setRts({ ...rts, systolicBpCategory: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.respiratoryRateCategory")}
              value={rts.respiratoryRateCategory}
              options={RTS_RESPIRATORY_RATE_CATEGORY_OPTIONS}
              locale={locale}
              onChange={(v) => setRts({ ...rts, respiratoryRateCategory: v })}
            />
            <p style={calcStyle} data-testid="score-rts-calculated">
              {t("clinicalDocumentation.forms.scoreScreenCompletion.totalScore")}: {rtsCalc.totalScore}{" "}
              — {t("clinicalDocumentation.forms.scoreScreenCompletion.riskBand")}:{" "}
              {severityLabel(rtsCalc.riskFlag)}
            </p>
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.providerNotified")}
              value={rts.providerNotified}
              locale={locale}
              onChange={(v) => setRts({ ...rts, providerNotified: v })}
            />
          </>
        ) : null}

        {cardId === SCORE_HEART_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.assessmentTime"),
              heart.assessmentTime,
              (v) => setHeart({ ...heart, assessmentTime: v })
            )}
            {scoreField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.history"),
              heart.history,
              HEART_COMPONENT_SCORE_OPTIONS,
              (v) => setHeart({ ...heart, history: v })
            )}
            {scoreField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.ecg"),
              heart.ecg,
              HEART_COMPONENT_SCORE_OPTIONS,
              (v) => setHeart({ ...heart, ecg: v })
            )}
            <p style={calcStyle} data-testid="score-heart-calculated">
              {t("clinicalDocumentation.forms.scoreScreenCompletion.totalScore")}: {heartCalc.totalScore}{" "}
              — {t("clinicalDocumentation.forms.scoreScreenCompletion.riskBand")}:{" "}
              {severityLabel(heartCalc.riskLevel)}
            </p>
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.providerNotified")}
              value={heart.providerNotified}
              locale={locale}
              onChange={(v) => setHeart({ ...heart, providerNotified: v })}
            />
          </>
        ) : null}

        {cardId === SCORE_WELLS_PE_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.assessmentTime"),
              wellsPe.assessmentTime,
              (v) => setWellsPe({ ...wellsPe, assessmentTime: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.clinicalSignsDvt")}
              value={wellsPe.clinicalSignsDvt}
              locale={locale}
              onChange={(v) => setWellsPe({ ...wellsPe, clinicalSignsDvt: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.peMostLikely")}
              value={wellsPe.peMostLikely}
              locale={locale}
              onChange={(v) => setWellsPe({ ...wellsPe, peMostLikely: v })}
            />
            <p style={calcStyle} data-testid="score-wells-calculated">
              {t("clinicalDocumentation.forms.scoreScreenCompletion.totalScore")}: {wellsCalc.totalScore}{" "}
              — {t("clinicalDocumentation.forms.scoreScreenCompletion.riskBand")}:{" "}
              {severityLabel(wellsCalc.riskLevel)}
            </p>
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.providerNotified")}
              value={wellsPe.providerNotified}
              locale={locale}
              onChange={(v) => setWellsPe({ ...wellsPe, providerNotified: v })}
            />
          </>
        ) : null}

        {cardId === SCORE_PERC_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.assessmentTime"),
              perc.assessmentTime,
              (v) => setPerc({ ...perc, assessmentTime: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.ageUnder50")}
              value={perc.ageUnder50}
              locale={locale}
              onChange={(v) => setPerc({ ...perc, ageUnder50: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.noHemoptysis")}
              value={perc.noHemoptysis}
              locale={locale}
              onChange={(v) => setPerc({ ...perc, noHemoptysis: v })}
            />
            <p style={calcStyle} data-testid="score-perc-calculated">
              {t("clinicalDocumentation.forms.scoreScreenCompletion.percNegative")}: {percCalc}
            </p>
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.providerNotified")}
              value={perc.providerNotified}
              locale={locale}
              onChange={(v) => setPerc({ ...perc, providerNotified: v })}
            />
          </>
        ) : null}

        {cardId === SCORE_GENEVA_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.assessmentTime"),
              geneva.assessmentTime,
              (v) => setGeneva({ ...geneva, assessmentTime: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.ageOver65")}
              value={geneva.ageOver65}
              locale={locale}
              onChange={(v) => setGeneva({ ...geneva, ageOver65: v })}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.heartRateCategory")}
              value={geneva.heartRateCategory}
              options={GENEVA_HEART_RATE_CATEGORY_OPTIONS}
              locale={locale}
              onChange={(v) => setGeneva({ ...geneva, heartRateCategory: v })}
            />
            <p style={calcStyle} data-testid="score-geneva-calculated">
              {t("clinicalDocumentation.forms.scoreScreenCompletion.totalScore")}: {genevaCalc.totalScore}{" "}
              — {t("clinicalDocumentation.forms.scoreScreenCompletion.riskBand")}:{" "}
              {severityLabel(genevaCalc.riskLevel)}
            </p>
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.providerNotified")}
              value={geneva.providerNotified}
              locale={locale}
              onChange={(v) => setGeneva({ ...geneva, providerNotified: v })}
            />
          </>
        ) : null}

        {cardId === SCORE_ABUSE_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.screenTime"),
              abuse.screenTime,
              (v) => setAbuse({ ...abuse, screenTime: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.screenPerformed")}
              value={abuse.screenPerformed}
              locale={locale}
              onChange={(v) => setAbuse({ ...abuse, screenPerformed: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.patientFeelsUnsafe")}
              value={abuse.patientFeelsUnsafe}
              locale={locale}
              onChange={(v) => setAbuse({ ...abuse, patientFeelsUnsafe: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.resourcesOffered")}
              value={abuse.resourcesOffered}
              locale={locale}
              onChange={(v) => setAbuse({ ...abuse, resourcesOffered: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.providerNotified")}
              value={abuse.providerNotified}
              locale={locale}
              onChange={(v) => setAbuse({ ...abuse, providerNotified: v })}
            />
          </>
        ) : null}

        {cardId === SCORE_HUMAN_TRAFFICKING_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.screenTime"),
              trafficking.screenTime,
              (v) => setTrafficking({ ...trafficking, screenTime: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.unableToSpeakFreely")}
              value={trafficking.unableToSpeakFreely}
              locale={locale}
              onChange={(v) => setTrafficking({ ...trafficking, unableToSpeakFreely: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.resourcesOffered")}
              value={trafficking.resourcesOffered}
              locale={locale}
              onChange={(v) => setTrafficking({ ...trafficking, resourcesOffered: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.providerNotified")}
              value={trafficking.providerNotified}
              locale={locale}
              onChange={(v) => setTrafficking({ ...trafficking, providerNotified: v })}
            />
          </>
        ) : null}

        {cardId === SCORE_SDOH_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.scoreScreenCompletion.screenTime"),
              sdoh.screenTime,
              (v) => setSdoh({ ...sdoh, screenTime: v })
            )}
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.foodInsecurity")}
              value={sdoh.foodInsecurity}
              locale={locale}
              onChange={(v) => setSdoh({ ...sdoh, foodInsecurity: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.interpersonalSafetyConcern")}
              value={sdoh.interpersonalSafetyConcern}
              locale={locale}
              onChange={(v) => setSdoh({ ...sdoh, interpersonalSafetyConcern: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.resourcesOffered")}
              value={sdoh.resourcesOffered}
              locale={locale}
              onChange={(v) => setSdoh({ ...sdoh, resourcesOffered: v })}
            />
            <YesNoField
              label={t("clinicalDocumentation.forms.scoreScreenCompletion.providerNotified")}
              value={sdoh.providerNotified}
              locale={locale}
              onChange={(v) => setSdoh({ ...sdoh, providerNotified: v })}
            />
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

export function isEdoc23bScoreScreenCompletionFormCard(cardId: string): boolean {
  return (EDOC23B_SCORE_SCREEN_COMPLETION_CARD_IDS as readonly string[]).includes(cardId);
}
