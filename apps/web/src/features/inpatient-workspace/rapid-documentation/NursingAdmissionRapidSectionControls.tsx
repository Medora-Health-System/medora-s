/**
 * MEDUI.INP.2B.2 — Rapid controls for nursing admission sections.
 * Persists stable codes into section answers (not localized labels).
 */

"use client";

import {
  ADMISSION_SOURCE_RAPID_OPTIONS,
  CONDITION_ON_ARRIVAL_RAPID_OPTIONS,
  FALL_PRECAUTION_OPTIONS,
  GENERAL_APPEARANCE_OPTIONS,
  IMMEDIATE_CONCERN_OPTIONS,
  LIVING_SITUATION_RAPID_OPTIONS,
  LOC_OPTIONS,
  MODE_OF_ARRIVAL_RAPID_OPTIONS,
  MOBILITY_CURRENT_OPTIONS,
  ORIENTATION_PRESETS,
  PAIN_PRESENCE_OPTIONS,
  PRE_ADMISSION_RESIDENCE_RAPID_OPTIONS,
  REVIEW_STATUS_RAPID_OPTIONS,
  SKIN_BASELINE_RAPID_OPTIONS,
  type ClinicalRapidOptionV1,
  type InpatientAdmissionClinicalSection,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  ClinicalConditionalText,
  ClinicalDateTimeField,
  ClinicalIconCardSelect,
  ClinicalMultiSelectChips,
  ClinicalPainScoreSelector,
  ClinicalSemanticSingleSelect,
  ClinicalSingleSelect,
  ClinicalYesNoUnknown,
  type ClinicalOption,
} from "./ClinicalRapidControls";
import { AdmissionSourceIcon, ModeOfArrivalIcon } from "./nursingAdmissionVisualIcons";

function asCodes(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function asCode(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function asNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const HANDOFF_METHOD_CODES = ["BEDSIDE", "PHONE", "WRITTEN", "ELECTRONIC", "OTHER"] as const;

const TRANSFER_SOURCES = new Set([
  "OUTSIDE_HOSPITAL_TRANSFER",
  "SNF_TRANSFER",
  "LONG_TERM_CARE",
  "REHABILITATION_TRANSFER",
]);

function painPresenceToSchema(code: string | null): string | null {
  if (code === "PAIN_PRESENT") return "YES";
  if (code === "NO_PAIN") return "NO";
  if (code === "UNABLE_SELF_REPORT" || code === "UNABLE_TO_ASSESS") return "UNKNOWN";
  return null;
}

export function NursingAdmissionRapidSectionControls({
  sectionId,
  answers,
  readOnly,
  onChange,
  onOpenBelongingsDetail,
}: {
  sectionId: InpatientAdmissionClinicalSection;
  answers: Record<string, unknown>;
  readOnly?: boolean;
  onChange: (answers: Record<string, unknown>) => void;
  onOpenBelongingsDetail?: () => void;
}) {
  const { t } = useI18n();
  const set = (key: string, value: unknown) => onChange({ ...answers, [key]: value });
  const setMulti = (patch: Record<string, unknown>) => onChange({ ...answers, ...patch });

  const handoffOpts: ClinicalOption[] = HANDOFF_METHOD_CODES.map((code) => ({
    code,
    label: t(`inpatientAdmissionInp2b2.handoffMethod.${code}`),
  }));

  if (sectionId === "OVERVIEW") {
    const admissionSource = asCode(answers.admissionSource);
    const showTransfer = admissionSource ? TRANSFER_SOURCES.has(admissionSource) : false;
    return (
      <div data-testid="rapid-overview-arrival" style={{ display: "grid", gap: 14, marginBottom: 12 }}>
        <ClinicalIconCardSelect
          label={t("inpatientAdmissionInp2b.rapid.admissionSource")}
          options={ADMISSION_SOURCE_RAPID_OPTIONS}
          value={admissionSource}
          onChange={(next) => set("admissionSource", next)}
          readOnly={readOnly}
          renderIcon={(code) => <AdmissionSourceIcon code={code} />}
          testId="rapid-admission-source-icons"
          density="source"
        />
        <ClinicalConditionalText
          label={t("inpatientAdmissionInp2b.rapid.otherDetail")}
          value={typeof answers.admissionSourceOther === "string" ? answers.admissionSourceOther : ""}
          onChange={(v) => set("admissionSourceOther", v)}
          visible={admissionSource === "OTHER"}
          disabled={readOnly}
        />
        <ClinicalIconCardSelect
          label={t("inpatientAdmissionInp2b.rapid.modeOfArrival")}
          options={MODE_OF_ARRIVAL_RAPID_OPTIONS}
          value={asCode(answers.modeOfArrival)}
          onChange={(next) => set("modeOfArrival", next)}
          readOnly={readOnly}
          renderIcon={(code) => <ModeOfArrivalIcon code={code} />}
          testId="rapid-mode-of-arrival-icons"
          density="arrival"
        />
        <ClinicalConditionalText
          label={t("inpatientAdmissionInp2b.rapid.otherDetail")}
          value={typeof answers.modeOfArrivalOther === "string" ? answers.modeOfArrivalOther : ""}
          onChange={(v) => set("modeOfArrivalOther", v)}
          visible={asCode(answers.modeOfArrival) === "OTHER"}
          disabled={readOnly}
        />
        <ClinicalSemanticSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.conditionOnArrival")}
          options={CONDITION_ON_ARRIVAL_RAPID_OPTIONS}
          value={asCode(answers.conditionOnArrival)}
          onChange={(next) => set("conditionOnArrival", next)}
          readOnly={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b.rapid.interpreterNeeded")}
          value={(asCode(answers.interpreterNeeded) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("interpreterNeeded", next)}
          readOnly={readOnly}
        />
        <ClinicalDateTimeField
          label={t("inpatientAdmissionInp2b2.arrivalAt")}
          value={typeof answers.arrivalAt === "string" ? answers.arrivalAt : ""}
          onChange={(v) => set("arrivalAt", v)}
          readOnly={readOnly}
        />
        {showTransfer ? (
          <ClinicalConditionalText
            label={t("inpatientAdmissionInp2b2.sourceFacility")}
            value={typeof answers.sourceFacility === "string" ? answers.sourceFacility : ""}
            onChange={(v) => set("sourceFacility", v)}
            visible
            disabled={readOnly}
          />
        ) : null}
        <ClinicalMultiSelectChips
          label={t("inpatientAdmissionInp2b2.immediateConcerns")}
          options={IMMEDIATE_CONCERN_OPTIONS}
          value={asCodes(answers.immediateConcerns)}
          onChange={(next) => set("immediateConcerns", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "SOURCE_ENCOUNTER_SUMMARY") {
    const discrepancies = asCode(answers.discrepanciesNoted);
    const followUp = asCode(answers.followUpRequired);
    return (
      <div data-testid="rapid-source-handoff" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b2.sourceReportReceived")}
          value={(asCode(answers.sourceReportReceived) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("sourceReportReceived", next)}
          readOnly={readOnly}
        />
        <ClinicalConditionalText
          label={t("inpatientAdmissionInp2b2.handoffReceivedFrom")}
          value={typeof answers.handoffReceivedFrom === "string" ? answers.handoffReceivedFrom : ""}
          onChange={(v) => set("handoffReceivedFrom", v)}
          visible={asCode(answers.sourceReportReceived) === "YES"}
          disabled={readOnly}
        />
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b2.handoffMethod")}
          options={handoffOpts}
          value={asCode(answers.handoffMethod)}
          onChange={(next) => set("handoffMethod", next)}
          readOnly={readOnly}
        />
        <ClinicalDateTimeField
          label={t("inpatientAdmissionInp2b2.handoffAt")}
          value={typeof answers.handoffAt === "string" ? answers.handoffAt : ""}
          onChange={(v) => set("handoffAt", v)}
          readOnly={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b2.discrepanciesNoted")}
          value={(discrepancies as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("discrepanciesNoted", next)}
          readOnly={readOnly}
        />
        <ClinicalConditionalText
          label={t("inpatientAdmissionInp2b2.discrepancyDetail")}
          value={typeof answers.discrepancyDescription === "string" ? answers.discrepancyDescription : ""}
          onChange={(v) => set("discrepancyDescription", v)}
          visible={discrepancies === "YES"}
          disabled={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b2.followUpRequired")}
          value={(followUp as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("followUpRequired", next)}
          readOnly={readOnly}
        />
        <ClinicalConditionalText
          label={t("inpatientAdmissionInp2b2.followUpDetail")}
          value={typeof answers.followUpDetail === "string" ? answers.followUpDetail : ""}
          onChange={(v) => set("followUpDetail", v)}
          visible={followUp === "YES"}
          disabled={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "IDENTITY_DEMOGRAPHICS") {
    const discrepancy = asCode(answers.discrepancyFound);
    return (
      <div data-testid="rapid-identity-verification" style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        {(
          [
            ["twoIdentifiersVerified", "inpatientAdmissionInp2b2.twoIdentifiersVerified"],
            ["wristbandPresent", "inpatientAdmissionInp2b2.wristbandPresent"],
            ["wristbandCorrect", "inpatientAdmissionInp2b2.wristbandCorrect"],
            ["allergyBandPresent", "inpatientAdmissionInp2b2.allergyBandPresent"],
            ["fallRiskBandPresent", "inpatientAdmissionInp2b2.fallRiskBandPresent"],
            ["patientConfirmsIdentity", "inpatientAdmissionInp2b2.patientConfirmsIdentity"],
            ["discrepancyFound", "inpatientAdmissionInp2b2.discrepancyFound"],
            ["registrationCorrectionRequested", "inpatientAdmissionInp2b2.registrationCorrectionRequested"],
          ] as const
        ).map(([key, labelKey]) => (
          <ClinicalYesNoUnknown
            key={key}
            label={t(labelKey)}
            value={(asCode(answers[key]) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
            onChange={(next) => set(key, next)}
            readOnly={readOnly}
          />
        ))}
        <ClinicalConditionalText
          label={t("inpatientAdmissionInp2b2.discrepancyDetail")}
          value={typeof answers.discrepancyDescription === "string" ? answers.discrepancyDescription : ""}
          onChange={(v) => set("discrepancyDescription", v)}
          visible={discrepancy === "YES"}
          disabled={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "NURSING_ADMISSION_ASSESSMENT") {
    const urgentNotify = asCode(answers.urgentProviderNotification);
    return (
      <div data-testid="rapid-nursing-assessment" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <ClinicalMultiSelectChips
          label={t("inpatientRapidConvergenceD4a27c.rapid.appearance")}
          options={GENERAL_APPEARANCE_OPTIONS}
          value={asCodes(answers.generalAppearance)}
          onChange={(next) => set("generalAppearance", next)}
          readOnly={readOnly}
        />
        <ClinicalSingleSelect
          label={t("inpatientRapidConvergenceD4a27c.rapid.loc")}
          options={LOC_OPTIONS}
          value={asCode(answers.levelOfConsciousness)}
          onChange={(next) => set("levelOfConsciousness", next)}
          readOnly={readOnly}
        />
        <ClinicalSingleSelect
          label={t("inpatientRapidConvergenceD4a27c.rapid.orientation")}
          options={ORIENTATION_PRESETS}
          value={asCode(answers.orientation)}
          onChange={(next) => set("orientation", next)}
          readOnly={readOnly}
        />
        <ClinicalMultiSelectChips
          label={t("inpatientRapidConvergenceD4a27c.rapid.concerns")}
          options={IMMEDIATE_CONCERN_OPTIONS}
          value={asCodes(answers.immediateConcerns)}
          onChange={(next) => set("immediateConcerns", next)}
          readOnly={readOnly}
        />
        {(
          [
            ["respiratoryEffort", "inpatientAdmissionInp2b2.respiratoryEffort"],
            ["immediateSafetyConcern", "inpatientAdmissionInp2b2.immediateSafetyConcern"],
            ["painPresent", "inpatientAdmissionInp2b2.painPresent"],
            ["nauseaVomiting", "inpatientAdmissionInp2b2.nauseaVomiting"],
            ["dizziness", "inpatientAdmissionInp2b2.dizziness"],
            ["weakness", "inpatientAdmissionInp2b2.weakness"],
            ["shortnessOfBreath", "inpatientAdmissionInp2b2.shortnessOfBreath"],
            ["chestDiscomfort", "inpatientAdmissionInp2b2.chestDiscomfort"],
            ["acuteNeuroConcern", "inpatientAdmissionInp2b2.acuteNeuroConcern"],
            ["urgentProviderNotification", "inpatientAdmissionInp2b2.urgentProviderNotification"],
          ] as const
        ).map(([key, labelKey]) => (
          <ClinicalYesNoUnknown
            key={key}
            label={t(labelKey)}
            value={(asCode(answers[key]) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
            onChange={(next) => set(key, next)}
            readOnly={readOnly}
          />
        ))}
        {urgentNotify === "YES" ? (
          <>
            <ClinicalYesNoUnknown
              label={t("inpatientAdmissionInp2b2.providerNotified")}
              value={(asCode(answers.providerNotified) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
              onChange={(next) => set("providerNotified", next)}
              readOnly={readOnly}
            />
            <ClinicalDateTimeField
              label={t("inpatientAdmissionInp2b2.notificationTime")}
              value={typeof answers.notificationTime === "string" ? answers.notificationTime : ""}
              onChange={(v) => set("notificationTime", v)}
              readOnly={readOnly}
            />
            <ClinicalConditionalText
              label={t("inpatientAdmissionInp2b2.providerResponse")}
              value={typeof answers.providerResponse === "string" ? answers.providerResponse : ""}
              onChange={(v) => set("providerResponse", v)}
              visible
              disabled={readOnly}
            />
          </>
        ) : null}
      </div>
    );
  }

  if (sectionId === "PAIN") {
    const painCode = asCode(answers.rapidPainPresence) ?? (asCode(answers.painPresent) === "YES" ? "PAIN_PRESENT" : asCode(answers.painPresent) === "NO" ? "NO_PAIN" : null);
    const painPresent = painCode === "PAIN_PRESENT";
    return (
      <div data-testid="rapid-pain" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientRapidConvergenceD4a27c.rapid.painPresence")}
          options={PAIN_PRESENCE_OPTIONS}
          value={painCode}
          onChange={(next) => {
            setMulti({
              rapidPainPresence: next,
              painPresent: painPresenceToSchema(next),
              painScale: next === "PAIN_PRESENT" ? answers.painScale ?? "NUMERIC_0_10" : null,
            });
          }}
          readOnly={readOnly}
        />
        <ClinicalPainScoreSelector
          label={t("inpatientAdmissionInp2b2.painScore")}
          value={asNum(answers.score)}
          onChange={(n) => setMulti({ score: n, painScale: "NUMERIC_0_10" })}
          readOnly={readOnly}
          visible={painPresent}
        />
        <ClinicalConditionalText
          label={t("inpatientAdmissionInp2b2.painLocation")}
          value={typeof answers.location === "string" ? answers.location : ""}
          onChange={(v) => set("location", v)}
          visible={painPresent}
          disabled={readOnly}
        />
        <ClinicalConditionalText
          label={t("inpatientRapidConvergenceD4a27c.terminology.painPresent")}
          value={typeof answers.rapidPainDetail === "string" ? answers.rapidPainDetail : ""}
          onChange={(v) => set("rapidPainDetail", v)}
          visible={painPresent}
          disabled={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "MEDICAL_HISTORY") {
    return (
      <div data-testid="rapid-history-review" style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.historyReviewed")}
          options={REVIEW_STATUS_RAPID_OPTIONS}
          value={asCode(answers.rapidHistoryReviewed)}
          onChange={(next) => set("rapidHistoryReviewed", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "SURGICAL_HISTORY") {
    return (
      <div data-testid="rapid-surgical-review" style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b2.deniesPriorSurgery")}
          value={(asCode(answers.patientDeniesPriorSurgery) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("patientDeniesPriorSurgery", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "ALLERGIES") {
    return (
      <div data-testid="rapid-allergy-review" style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.allergyReviewed")}
          options={REVIEW_STATUS_RAPID_OPTIONS}
          value={asCode(answers.rapidAllergyReviewed)}
          onChange={(next) => set("rapidAllergyReviewed", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "HOME_MEDICATIONS") {
    const discrepancies = asCode(answers.discrepancies);
    return (
      <div data-testid="rapid-homemed-review" style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.homeMedReviewed")}
          options={REVIEW_STATUS_RAPID_OPTIONS}
          value={asCode(answers.rapidHomeMedReviewed)}
          onChange={(next) => set("rapidHomeMedReviewed", next)}
          readOnly={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b2.medDiscrepancies")}
          value={(discrepancies as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("discrepancies", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "FALL_SAFETY") {
    return (
      <div data-testid="rapid-fall" style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        {(
          [
            ["fallPriorMonths", "inpatientAdmissionInp2b2.priorFall"],
            ["gaitImpairment", "inpatientAdmissionInp2b2.gaitImpairment"],
            ["dizziness", "inpatientAdmissionInp2b2.dizziness"],
            ["confusion", "inpatientAdmissionInp2b2.confusion"],
            ["sedatingMedication", "inpatientAdmissionInp2b2.sedatingMedication"],
            ["elopementRisk", "inpatientAdmissionInp2b2.elopementRisk"],
            ["suicideSelfHarmConcern", "inpatientAdmissionInp2b2.suicideConcern"],
            ["aspirationRisk", "inpatientAdmissionInp2b2.aspirationRisk"],
          ] as const
        ).map(([key, labelKey]) => (
          <ClinicalYesNoUnknown
            key={key}
            label={t(labelKey)}
            value={(asCode(answers[key]) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
            onChange={(next) => set(key, next)}
            readOnly={readOnly}
          />
        ))}
        <ClinicalMultiSelectChips
          label={t("inpatientRapidConvergenceD4a27c.rapid.fallPrecautions")}
          options={FALL_PRECAUTION_OPTIONS}
          value={asCodes(answers.rapidFallPrecautions ?? answers.precautionsInitiated)}
          onChange={(next) => setMulti({ rapidFallPrecautions: next, precautionsInitiated: next })}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "FUNCTIONAL_MOBILITY") {
    return (
      <div data-testid="rapid-mobility" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b2.currentMobility")}
          options={MOBILITY_CURRENT_OPTIONS}
          value={asCode(answers.rapidMobility ?? answers.currentMobility)}
          onChange={(next) => setMulti({ rapidMobility: next, currentMobility: next })}
          readOnly={readOnly}
        />
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b2.baselineMobility")}
          options={MOBILITY_CURRENT_OPTIONS}
          value={asCode(answers.baselineMobility)}
          onChange={(next) => set("baselineMobility", next)}
          readOnly={readOnly}
        />
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b2.transferAbility")}
          options={MOBILITY_CURRENT_OPTIONS}
          value={asCode(answers.transferAbility)}
          onChange={(next) => set("transferAbility", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "SKIN_WOUND") {
    return (
      <div data-testid="rapid-skin" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.skinBaseline")}
          options={SKIN_BASELINE_RAPID_OPTIONS}
          value={asCode(answers.rapidSkinStatus)}
          onChange={(next) => set("rapidSkinStatus", next)}
          readOnly={readOnly}
        />
        <ClinicalConditionalText
          label={t("inpatientAdmissionInp2b.rapid.otherDetail")}
          value={typeof answers.rapidSkinOther === "string" ? answers.rapidSkinOther : ""}
          onChange={(v) => set("rapidSkinOther", v)}
          visible={asCode(answers.rapidSkinStatus) === "OTHER"}
          disabled={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b2.pressureInjury")}
          value={(asCode(answers.pressureInjury) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("pressureInjury", next)}
          readOnly={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b2.openWound")}
          value={(asCode(answers.openWound) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("openWound", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "NUTRITION") {
    return (
      <div data-testid="rapid-nutrition" style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        <ClinicalYesNoUnknown
          label={t("inpatientRapidConvergenceD4a27c.rapid.nutrition")}
          value={(asCode(answers.rapidNutritionOk) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("rapidNutritionOk", next)}
          readOnly={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b2.swallowingDifficulty")}
          value={(asCode(answers.swallowingDifficulty) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("swallowingDifficulty", next)}
          readOnly={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b2.npoStatus")}
          value={(asCode(answers.npoStatus) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("npoStatus", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "ELIMINATION") {
    return (
      <div data-testid="rapid-elimination" style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        <ClinicalYesNoUnknown
          label={t("inpatientRapidConvergenceD4a27c.rapid.elimination")}
          value={(asCode(answers.rapidEliminationOk) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("rapidEliminationOk", next)}
          readOnly={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b2.ioMonitoring")}
          value={(asCode(answers.ioMonitoringRequired) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("ioMonitoringRequired", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "PSYCHOSOCIAL") {
    return (
      <div data-testid="rapid-psychosocial" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.livingSituation")}
          options={LIVING_SITUATION_RAPID_OPTIONS}
          value={asCode(answers.rapidLivingSituation ?? answers.livingSituation)}
          onChange={(next) => setMulti({ rapidLivingSituation: next, livingSituation: next })}
          readOnly={readOnly}
        />
        <ClinicalSingleSelect
          label={t("inpatientAdmissionInp2b.rapid.preAdmissionResidence")}
          options={PRE_ADMISSION_RESIDENCE_RAPID_OPTIONS}
          value={asCode(answers.rapidPreAdmissionResidence)}
          onChange={(next) => set("rapidPreAdmissionResidence", next)}
          readOnly={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b.rapid.socialWorkNeed")}
          value={(asCode(answers.rapidSocialWorkNeed ?? answers.socialWorkNeed) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => setMulti({ rapidSocialWorkNeed: next, socialWorkNeed: next })}
          readOnly={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b.rapid.caseManagementNeed")}
          value={(asCode(answers.rapidCaseManagementNeed) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("rapidCaseManagementNeed", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "BELONGINGS_VALUABLES") {
    return (
      <div data-testid="rapid-belongings" style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <ClinicalYesNoUnknown
          label={t("inpatientRapidConvergenceD4a27c.rapid.belongingsSummary")}
          value={(asCode(answers.rapidBelongingsPresent) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("rapidBelongingsPresent", next)}
          readOnly={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b2.inventoryReviewed")}
          value={(asCode(answers.inventoryReviewed) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("inventoryReviewed", next)}
          readOnly={readOnly}
        />
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b2.valuablesPresent")}
          value={(asCode(answers.valuablesPresent) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("valuablesPresent", next)}
          readOnly={readOnly}
        />
        {onOpenBelongingsDetail ? (
          <button
            type="button"
            onClick={onOpenBelongingsDetail}
            style={{
              justifySelf: "start",
              fontSize: 12,
              fontWeight: 600,
              padding: "7px 10px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#fff",
              cursor: "pointer",
            }}
            data-testid="open-detailed-belongings"
          >
            {t("inpatientRapidConvergenceD4a27c.rapid.openBelongings")}
          </button>
        ) : null}
      </div>
    );
  }

  if (sectionId === "LINES_DRAINS_DEVICES") {
    return (
      <div data-testid="rapid-devices" style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <ClinicalYesNoUnknown
          label={t("inpatientRapidConvergenceD4a27c.rapid.devicesConfirm")}
          value={(asCode(answers.rapidDevicesConfirmed ?? answers.devicesPresent) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => setMulti({ rapidDevicesConfirmed: next, devicesPresent: next })}
          readOnly={readOnly}
        />
        <ClinicalConditionalText
          label={t("inpatientRapidConvergenceD4a27c.rapid.devicesAdd")}
          value={typeof answers.rapidDevicesAddNote === "string" ? answers.rapidDevicesAddNote : ""}
          onChange={(v) => set("rapidDevicesAddNote", v)}
          visible={asCode(answers.rapidDevicesConfirmed ?? answers.devicesPresent) === "NO"}
          disabled={readOnly}
        />
      </div>
    );
  }

  if (sectionId === "PROVIDER_ADMISSION") {
    return null;
  }

  if (sectionId === "EDUCATION_COMMUNICATION") {
    return (
      <div data-testid="rapid-education" style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        <ClinicalYesNoUnknown
          label={t("inpatientAdmissionInp2b2.teachBack")}
          value={(asCode(answers.teachBack) as "YES" | "NO" | "UNKNOWN" | null) ?? null}
          onChange={(next) => set("teachBack", next)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  return null;
}
