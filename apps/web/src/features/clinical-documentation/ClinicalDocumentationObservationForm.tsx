"use client";

import React, { useMemo, useState } from "react";
import {
  OBS_AMBULATION_TRIAL_CARD_ID,
  OBS_BOARDING_CARD_ID,
  OBS_DISCHARGE_READINESS_CARD_ID,
  OBS_PO_CHALLENGE_CARD_ID,
  OBS_REASSESSMENT_CARD_ID,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";

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
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
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

export function ClinicalDocumentationObservationForm({
  cardId,
  saving,
  onSubmit,
}: {
  cardId: string;
  saving: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useI18n();

  const [po, setPo] = useState({
    startTime: nowLocalDatetimeValue(),
    substance: "",
    amount: "",
    tolerated: "YES" as "YES" | "NO" | "PARTIAL",
    nausea: false,
    vomiting: false,
    abdominalPain: false,
    result: "PASSED" as "PASSED" | "FAILED" | "PARTIAL" | "STOPPED",
    notes: "",
  });

  const [ambulation, setAmbulation] = useState({
    assistanceLevel: "STANDBY" as "NONE" | "STANDBY" | "ONE_PERSON" | "TWO_PERSON" | "DEVICE",
    distance: "50",
    distanceUnit: "FEET" as "FEET" | "METERS" | "STEPS",
    gaitSteady: true,
    dizziness: false,
    shortnessOfBreath: false,
    pain: false,
    oxygenDesaturation: false,
    result: "PASSED" as "PASSED" | "FAILED" | "PARTIAL" | "STOPPED",
    notes: "",
  });

  const [reassessment, setReassessment] = useState({
    reassessmentTime: nowLocalDatetimeValue(),
    patientCondition: "UNCHANGED" as "IMPROVED" | "UNCHANGED" | "WORSENED",
    painScore: "",
    vitalsReviewed: true,
    pendingResults: false,
    providerNotified: false,
    notes: "",
  });

  const [boarding, setBoarding] = useState({
    boardingReason: "",
    location: "",
    safetyCheckCompleted: false,
    comfortMeasuresOffered: false,
    nutritionOffered: false,
    toiletingOffered: false,
    providerUpdated: false,
    notes: "",
  });

  const [discharge, setDischarge] = useState({
    instructionsReviewed: false,
    medicationsReviewed: false,
    followUpReviewed: false,
    returnPrecautionsReviewed: false,
    transportationConfirmed: false,
    patientVerbalizedUnderstanding: false,
    barriersIdentified: false,
    notes: "",
  });

  const testId = useMemo(() => {
    switch (cardId) {
      case OBS_PO_CHALLENGE_CARD_ID:
        return "clinical-documentation-po-challenge-form";
      case OBS_AMBULATION_TRIAL_CARD_ID:
        return "clinical-documentation-ambulation-form";
      case OBS_REASSESSMENT_CARD_ID:
        return "clinical-documentation-reassessment-form";
      case OBS_BOARDING_CARD_ID:
        return "clinical-documentation-boarding-form";
      case OBS_DISCHARGE_READINESS_CARD_ID:
        return "clinical-documentation-discharge-readiness-form";
      default:
        return "clinical-documentation-observation-form";
    }
  }, [cardId]);

  const buildPayload = (): Record<string, unknown> | null => {
    switch (cardId) {
      case OBS_PO_CHALLENGE_CARD_ID:
        if (!po.substance.trim() || !po.amount.trim()) return null;
        return {
          startTime: toIsoFromLocalDatetime(po.startTime),
          substance: po.substance.trim(),
          amount: po.amount.trim(),
          tolerated: po.tolerated,
          nausea: po.nausea,
          vomiting: po.vomiting,
          abdominalPain: po.abdominalPain,
          result: po.result,
          ...(po.notes.trim() ? { notes: po.notes.trim() } : {}),
        };
      case OBS_AMBULATION_TRIAL_CARD_ID:
        return {
          assistanceLevel: ambulation.assistanceLevel,
          distance: Number(ambulation.distance) || 0,
          distanceUnit: ambulation.distanceUnit,
          gaitSteady: ambulation.gaitSteady,
          dizziness: ambulation.dizziness,
          shortnessOfBreath: ambulation.shortnessOfBreath,
          pain: ambulation.pain,
          oxygenDesaturation: ambulation.oxygenDesaturation,
          result: ambulation.result,
          ...(ambulation.notes.trim() ? { notes: ambulation.notes.trim() } : {}),
        };
      case OBS_REASSESSMENT_CARD_ID:
        return {
          reassessmentTime: toIsoFromLocalDatetime(reassessment.reassessmentTime),
          patientCondition: reassessment.patientCondition,
          vitalsReviewed: reassessment.vitalsReviewed,
          pendingResults: reassessment.pendingResults,
          providerNotified: reassessment.providerNotified,
          ...(reassessment.painScore !== ""
            ? { painScore: Number.parseInt(reassessment.painScore, 10) }
            : {}),
          ...(reassessment.notes.trim() ? { notes: reassessment.notes.trim() } : {}),
        };
      case OBS_BOARDING_CARD_ID:
        if (!boarding.boardingReason.trim() || !boarding.location.trim()) return null;
        return {
          boardingReason: boarding.boardingReason.trim(),
          location: boarding.location.trim(),
          safetyCheckCompleted: boarding.safetyCheckCompleted,
          comfortMeasuresOffered: boarding.comfortMeasuresOffered,
          nutritionOffered: boarding.nutritionOffered,
          toiletingOffered: boarding.toiletingOffered,
          providerUpdated: boarding.providerUpdated,
          ...(boarding.notes.trim() ? { notes: boarding.notes.trim() } : {}),
        };
      case OBS_DISCHARGE_READINESS_CARD_ID:
        return {
          instructionsReviewed: discharge.instructionsReviewed,
          medicationsReviewed: discharge.medicationsReviewed,
          followUpReviewed: discharge.followUpReviewed,
          returnPrecautionsReviewed: discharge.returnPrecautionsReviewed,
          transportationConfirmed: discharge.transportationConfirmed,
          patientVerbalizedUnderstanding: discharge.patientVerbalizedUnderstanding,
          barriersIdentified: discharge.barriersIdentified,
          ...(discharge.notes.trim() ? { notes: discharge.notes.trim() } : {}),
        };
      default:
        return null;
    }
  };

  const trialResultOptions = ["PASSED", "FAILED", "PARTIAL", "STOPPED"] as const;

  const save = async () => {
    const payload = buildPayload();
    if (!payload) return;
    await onSubmit(payload);
  };

  return (
    <div
      data-testid={testId}
      data-card-id={cardId}
      style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}
    >
      {cardId === OBS_PO_CHALLENGE_CARD_ID ? (
        <div style={rowStyle}>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.poChallenge.startTime")}</span>
            <input
              type="datetime-local"
              value={po.startTime}
              onChange={(e) => setPo((s) => ({ ...s, startTime: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.poChallenge.substance")}</span>
            <input
              type="text"
              value={po.substance}
              onChange={(e) => setPo((s) => ({ ...s, substance: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.poChallenge.amount")}</span>
            <input
              type="text"
              value={po.amount}
              onChange={(e) => setPo((s) => ({ ...s, amount: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.poChallenge.tolerated")}</span>
            <select
              value={po.tolerated}
              onChange={(e) =>
                setPo((s) => ({ ...s, tolerated: e.target.value as typeof po.tolerated }))
              }
              style={fieldStyle}
            >
              {(["YES", "NO", "PARTIAL"] as const).map((v) => (
                <option key={v} value={v}>
                  {t(`clinicalDocumentation.forms.enums.tolerated.${v}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.poChallenge.result")}</span>
            <select
              value={po.result}
              onChange={(e) => setPo((s) => ({ ...s, result: e.target.value as typeof po.result }))}
              style={fieldStyle}
            >
              {trialResultOptions.map((v) => (
                <option key={v} value={v}>
                  {t(`clinicalDocumentation.forms.enums.trialResult.${v}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {cardId === OBS_PO_CHALLENGE_CARD_ID ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <CheckboxField
            label={t("clinicalDocumentation.forms.poChallenge.nausea")}
            checked={po.nausea}
            onChange={(v) => setPo((s) => ({ ...s, nausea: v }))}
          />
          <CheckboxField
            label={t("clinicalDocumentation.forms.poChallenge.vomiting")}
            checked={po.vomiting}
            onChange={(v) => setPo((s) => ({ ...s, vomiting: v }))}
          />
          <CheckboxField
            label={t("clinicalDocumentation.forms.poChallenge.abdominalPain")}
            checked={po.abdominalPain}
            onChange={(v) => setPo((s) => ({ ...s, abdominalPain: v }))}
          />
        </div>
      ) : null}

      {cardId === OBS_AMBULATION_TRIAL_CARD_ID ? (
        <>
          <div style={rowStyle}>
            <div>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.ambulation.assistance")}</span>
              <select
                value={ambulation.assistanceLevel}
                onChange={(e) =>
                  setAmbulation((s) => ({
                    ...s,
                    assistanceLevel: e.target.value as typeof ambulation.assistanceLevel,
                  }))
                }
                style={fieldStyle}
              >
                {(["NONE", "STANDBY", "ONE_PERSON", "TWO_PERSON", "DEVICE"] as const).map((v) => (
                  <option key={v} value={v}>
                    {t(`clinicalDocumentation.forms.enums.assistance.${v}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.ambulation.distance")}</span>
              <input
                type="number"
                min={0}
                value={ambulation.distance}
                onChange={(e) => setAmbulation((s) => ({ ...s, distance: e.target.value }))}
                style={fieldStyle}
              />
            </div>
            <div>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.ambulation.distanceUnit")}</span>
              <select
                value={ambulation.distanceUnit}
                onChange={(e) =>
                  setAmbulation((s) => ({
                    ...s,
                    distanceUnit: e.target.value as typeof ambulation.distanceUnit,
                  }))
                }
                style={fieldStyle}
              >
                {(["FEET", "METERS", "STEPS"] as const).map((v) => (
                  <option key={v} value={v}>
                    {t(`clinicalDocumentation.forms.enums.distanceUnit.${v}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.ambulation.result")}</span>
              <select
                value={ambulation.result}
                onChange={(e) =>
                  setAmbulation((s) => ({ ...s, result: e.target.value as typeof ambulation.result }))
                }
                style={fieldStyle}
              >
                {trialResultOptions.map((v) => (
                  <option key={v} value={v}>
                    {t(`clinicalDocumentation.forms.enums.trialResult.${v}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <CheckboxField
              label={t("clinicalDocumentation.forms.ambulation.gaitSteady")}
              checked={ambulation.gaitSteady}
              onChange={(v) => setAmbulation((s) => ({ ...s, gaitSteady: v }))}
            />
            <CheckboxField
              label={t("clinicalDocumentation.forms.ambulation.dizziness")}
              checked={ambulation.dizziness}
              onChange={(v) => setAmbulation((s) => ({ ...s, dizziness: v }))}
            />
            <CheckboxField
              label={t("clinicalDocumentation.forms.ambulation.shortnessOfBreath")}
              checked={ambulation.shortnessOfBreath}
              onChange={(v) => setAmbulation((s) => ({ ...s, shortnessOfBreath: v }))}
            />
            <CheckboxField
              label={t("clinicalDocumentation.forms.ambulation.pain")}
              checked={ambulation.pain}
              onChange={(v) => setAmbulation((s) => ({ ...s, pain: v }))}
            />
            <CheckboxField
              label={t("clinicalDocumentation.forms.ambulation.oxygenDesaturation")}
              checked={ambulation.oxygenDesaturation}
              onChange={(v) => setAmbulation((s) => ({ ...s, oxygenDesaturation: v }))}
            />
          </div>
        </>
      ) : null}

      {cardId === OBS_REASSESSMENT_CARD_ID ? (
        <div style={rowStyle}>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.reassessment.time")}</span>
            <input
              type="datetime-local"
              value={reassessment.reassessmentTime}
              onChange={(e) => setReassessment((s) => ({ ...s, reassessmentTime: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.reassessment.condition")}</span>
            <select
              value={reassessment.patientCondition}
              onChange={(e) =>
                setReassessment((s) => ({
                  ...s,
                  patientCondition: e.target.value as typeof reassessment.patientCondition,
                }))
              }
              style={fieldStyle}
            >
              {(["IMPROVED", "UNCHANGED", "WORSENED"] as const).map((v) => (
                <option key={v} value={v}>
                  {t(`clinicalDocumentation.forms.enums.condition.${v}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.reassessment.painScore")}</span>
            <input
              type="number"
              min={0}
              max={10}
              value={reassessment.painScore}
              onChange={(e) => setReassessment((s) => ({ ...s, painScore: e.target.value }))}
              style={fieldStyle}
            />
          </div>
        </div>
      ) : null}

      {cardId === OBS_REASSESSMENT_CARD_ID ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <CheckboxField
            label={t("clinicalDocumentation.forms.reassessment.vitalsReviewed")}
            checked={reassessment.vitalsReviewed}
            onChange={(v) => setReassessment((s) => ({ ...s, vitalsReviewed: v }))}
          />
          <CheckboxField
            label={t("clinicalDocumentation.forms.reassessment.pendingResults")}
            checked={reassessment.pendingResults}
            onChange={(v) => setReassessment((s) => ({ ...s, pendingResults: v }))}
          />
          <CheckboxField
            label={t("clinicalDocumentation.forms.reassessment.providerNotified")}
            checked={reassessment.providerNotified}
            onChange={(v) => setReassessment((s) => ({ ...s, providerNotified: v }))}
          />
        </div>
      ) : null}

      {cardId === OBS_BOARDING_CARD_ID ? (
        <div style={rowStyle}>
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.boarding.reason")}</span>
            <input
              type="text"
              value={boarding.boardingReason}
              onChange={(e) => setBoarding((s) => ({ ...s, boardingReason: e.target.value }))}
              style={fieldStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>{t("clinicalDocumentation.forms.boarding.location")}</span>
            <input
              type="text"
              value={boarding.location}
              onChange={(e) => setBoarding((s) => ({ ...s, location: e.target.value }))}
              style={fieldStyle}
            />
          </div>
        </div>
      ) : null}

      {cardId === OBS_BOARDING_CARD_ID ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <CheckboxField
            label={t("clinicalDocumentation.forms.boarding.safetyCheck")}
            checked={boarding.safetyCheckCompleted}
            onChange={(v) => setBoarding((s) => ({ ...s, safetyCheckCompleted: v }))}
          />
          <CheckboxField
            label={t("clinicalDocumentation.forms.boarding.comfort")}
            checked={boarding.comfortMeasuresOffered}
            onChange={(v) => setBoarding((s) => ({ ...s, comfortMeasuresOffered: v }))}
          />
          <CheckboxField
            label={t("clinicalDocumentation.forms.boarding.nutrition")}
            checked={boarding.nutritionOffered}
            onChange={(v) => setBoarding((s) => ({ ...s, nutritionOffered: v }))}
          />
          <CheckboxField
            label={t("clinicalDocumentation.forms.boarding.toileting")}
            checked={boarding.toiletingOffered}
            onChange={(v) => setBoarding((s) => ({ ...s, toiletingOffered: v }))}
          />
          <CheckboxField
            label={t("clinicalDocumentation.forms.boarding.providerUpdated")}
            checked={boarding.providerUpdated}
            onChange={(v) => setBoarding((s) => ({ ...s, providerUpdated: v }))}
          />
        </div>
      ) : null}

      {cardId === OBS_DISCHARGE_READINESS_CARD_ID ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(
            [
              ["instructionsReviewed", "clinicalDocumentation.forms.discharge.instructions"],
              ["medicationsReviewed", "clinicalDocumentation.forms.discharge.medications"],
              ["followUpReviewed", "clinicalDocumentation.forms.discharge.followUp"],
              ["returnPrecautionsReviewed", "clinicalDocumentation.forms.discharge.returnPrecautions"],
              ["transportationConfirmed", "clinicalDocumentation.forms.discharge.transportation"],
              [
                "patientVerbalizedUnderstanding",
                "clinicalDocumentation.forms.discharge.verbalizedUnderstanding",
              ],
              ["barriersIdentified", "clinicalDocumentation.forms.discharge.barriers"],
            ] as const
          ).map(([key, labelKey]) => (
            <CheckboxField
              key={key}
              label={t(labelKey)}
              checked={discharge[key]}
              onChange={(v) => setDischarge((s) => ({ ...s, [key]: v }))}
            />
          ))}
        </div>
      ) : null}

      {(cardId === OBS_PO_CHALLENGE_CARD_ID ||
        cardId === OBS_AMBULATION_TRIAL_CARD_ID ||
        cardId === OBS_REASSESSMENT_CARD_ID ||
        cardId === OBS_BOARDING_CARD_ID ||
        cardId === OBS_DISCHARGE_READINESS_CARD_ID) && (
        <div>
          <span style={labelStyle}>{t("clinicalDocumentation.forms.common.notes")}</span>
          <textarea
            value={
              cardId === OBS_PO_CHALLENGE_CARD_ID
                ? po.notes
                : cardId === OBS_AMBULATION_TRIAL_CARD_ID
                  ? ambulation.notes
                  : cardId === OBS_REASSESSMENT_CARD_ID
                    ? reassessment.notes
                    : cardId === OBS_BOARDING_CARD_ID
                      ? boarding.notes
                      : discharge.notes
            }
            onChange={(e) => {
              const v = e.target.value;
              if (cardId === OBS_PO_CHALLENGE_CARD_ID) setPo((s) => ({ ...s, notes: v }));
              else if (cardId === OBS_AMBULATION_TRIAL_CARD_ID)
                setAmbulation((s) => ({ ...s, notes: v }));
              else if (cardId === OBS_REASSESSMENT_CARD_ID)
                setReassessment((s) => ({ ...s, notes: v }));
              else if (cardId === OBS_BOARDING_CARD_ID) setBoarding((s) => ({ ...s, notes: v }));
              else setDischarge((s) => ({ ...s, notes: v }));
            }}
            rows={2}
            style={{ ...fieldStyle, resize: "vertical" }}
          />
        </div>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        style={{
          alignSelf: "flex-start",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          background: "#0f172a",
          color: "#fff",
          cursor: saving ? "wait" : "pointer",
        }}
      >
        {saving ? t("clinicalDocumentation.saving") : t("clinicalDocumentation.saveEntry")}
      </button>
    </div>
  );
}

export function isEdoc3ObservationFormCard(cardId: string): boolean {
  return (
    cardId === OBS_PO_CHALLENGE_CARD_ID ||
    cardId === OBS_AMBULATION_TRIAL_CARD_ID ||
    cardId === OBS_REASSESSMENT_CARD_ID ||
    cardId === OBS_BOARDING_CARD_ID ||
    cardId === OBS_DISCHARGE_READINESS_CARD_ID
  );
}
