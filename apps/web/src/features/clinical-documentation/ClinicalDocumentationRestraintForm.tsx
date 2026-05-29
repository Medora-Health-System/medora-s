"use client";

import React, { useMemo, useState } from "react";
import {
  ALTERNATIVES_ATTEMPTED_OPTIONS,
  DISCONTINUATION_CRITERIA_OPTIONS,
  EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS,
  NORMAL_ABNORMAL_OPTIONS,
  REASON_FOR_RESTRAINT_OPTIONS,
  RESTRAINT_DISCONTINUATION_CARD_ID,
  RESTRAINT_FACE_TO_FACE_CARD_ID,
  RESTRAINT_INITIATION_CARD_ID,
  RESTRAINT_REASSESSMENT_CARD_ID,
  RESTRAINT_RENEWAL_CARD_ID,
  RESTRAINT_TYPE_OPTIONS,
  validateRestraintPayloadForCard,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  ClinicalDocumentationBooleanField,
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

export function ClinicalDocumentationRestraintForm({
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

  const [initiation, setInitiation] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    restraintType: "BEHAVIORAL" as "PHYSICAL" | "BEHAVIORAL" | "MEDICAL" | "SECLUSION",
    reasonForRestraint: "VIOLENT_BEHAVIOR" as (typeof REASON_FOR_RESTRAINT_OPTIONS)[number]["value"],
    alternativesAttempted: ["VERBAL_DEESCALATION"] as string[],
    continuedNeed: true,
    injuryPresent: false,
    circulationAssessment: "NORMAL" as "NORMAL" | "ABNORMAL",
    mentalStatusAssessment: "",
    physicianOrderVerified: true,
    orderingProviderId: "",
    notes: "",
  });

  const [faceToFace, setFaceToFace] = useState({
    evaluationTime: nowLocalDatetimeValue(),
    behaviorAssessment: "",
    dangerToSelf: false,
    dangerToOthers: false,
    continuedNeedForRestraint: true,
    medicalConditionAssessment: "",
    behavioralConditionAssessment: "",
    providerEvaluatorId: "",
    notes: "",
  });

  const [reassessment, setReassessment] = useState({
    assessmentTime: nowLocalDatetimeValue(),
    airway: "NORMAL" as "NORMAL" | "ABNORMAL",
    circulation: "NORMAL" as "NORMAL" | "ABNORMAL",
    skinIntegrity: "NORMAL" as "NORMAL" | "ABNORMAL",
    nutritionNeedsMet: true,
    hydrationNeedsMet: true,
    eliminationNeedsMet: true,
    rangeOfMotionPerformed: false,
    continuedNeed: true,
    patientResponse: "",
    notes: "",
  });

  const [renewal, setRenewal] = useState({
    renewalTime: nowLocalDatetimeValue(),
    orderingProviderId: "",
    continuedNeed: true,
    renewalReason: "",
    notes: "",
  });

  const [discontinuation, setDiscontinuation] = useState({
    discontinuedTime: nowLocalDatetimeValue(),
    criteriaMet: [] as string[],
    conditionAtDiscontinuation: "",
    notes: "",
  });

  const toggleMulti = (current: string[], value: string): string[] =>
    current.includes(value) ? current.filter((v) => v !== value) : [...current, value];

  const buildPayload = (): Record<string, unknown> | null => {
    const note = (s: string) => (s.trim() ? { notes: s.trim() } : {});

    switch (cardId) {
      case RESTRAINT_INITIATION_CARD_ID:
        if (
          !initiation.mentalStatusAssessment.trim() ||
          !initiation.orderingProviderId.trim() ||
          initiation.alternativesAttempted.length === 0
        ) {
          return null;
        }
        return {
          assessmentTime: toIsoFromLocalDatetime(initiation.assessmentTime),
          restraintType: initiation.restraintType,
          reasonForRestraint: initiation.reasonForRestraint,
          alternativesAttempted: initiation.alternativesAttempted,
          continuedNeed: initiation.continuedNeed,
          injuryPresent: initiation.injuryPresent,
          circulationAssessment: initiation.circulationAssessment,
          mentalStatusAssessment: initiation.mentalStatusAssessment.trim(),
          physicianOrderVerified: initiation.physicianOrderVerified,
          orderingProviderId: initiation.orderingProviderId.trim(),
          ...note(initiation.notes),
        };
      case RESTRAINT_FACE_TO_FACE_CARD_ID:
        if (
          !faceToFace.behaviorAssessment.trim() ||
          !faceToFace.medicalConditionAssessment.trim() ||
          !faceToFace.behavioralConditionAssessment.trim() ||
          !faceToFace.providerEvaluatorId.trim()
        ) {
          return null;
        }
        return {
          evaluationTime: toIsoFromLocalDatetime(faceToFace.evaluationTime),
          behaviorAssessment: faceToFace.behaviorAssessment.trim(),
          dangerToSelf: faceToFace.dangerToSelf,
          dangerToOthers: faceToFace.dangerToOthers,
          continuedNeedForRestraint: faceToFace.continuedNeedForRestraint,
          medicalConditionAssessment: faceToFace.medicalConditionAssessment.trim(),
          behavioralConditionAssessment: faceToFace.behavioralConditionAssessment.trim(),
          providerEvaluatorId: faceToFace.providerEvaluatorId.trim(),
          ...note(faceToFace.notes),
        };
      case RESTRAINT_REASSESSMENT_CARD_ID:
        if (!reassessment.patientResponse.trim()) return null;
        return {
          assessmentTime: toIsoFromLocalDatetime(reassessment.assessmentTime),
          airway: reassessment.airway,
          circulation: reassessment.circulation,
          skinIntegrity: reassessment.skinIntegrity,
          nutritionNeedsMet: reassessment.nutritionNeedsMet,
          hydrationNeedsMet: reassessment.hydrationNeedsMet,
          eliminationNeedsMet: reassessment.eliminationNeedsMet,
          rangeOfMotionPerformed: reassessment.rangeOfMotionPerformed,
          continuedNeed: reassessment.continuedNeed,
          patientResponse: reassessment.patientResponse.trim(),
          ...note(reassessment.notes),
        };
      case RESTRAINT_RENEWAL_CARD_ID:
        if (!renewal.orderingProviderId.trim() || !renewal.renewalReason.trim()) return null;
        return {
          renewalTime: toIsoFromLocalDatetime(renewal.renewalTime),
          orderingProviderId: renewal.orderingProviderId.trim(),
          continuedNeed: renewal.continuedNeed,
          renewalReason: renewal.renewalReason.trim(),
          ...note(renewal.notes),
        };
      case RESTRAINT_DISCONTINUATION_CARD_ID:
        if (!discontinuation.conditionAtDiscontinuation.trim() || discontinuation.criteriaMet.length === 0) {
          return null;
        }
        return {
          discontinuedTime: toIsoFromLocalDatetime(discontinuation.discontinuedTime),
          criteriaMet: discontinuation.criteriaMet,
          conditionAtDiscontinuation: discontinuation.conditionAtDiscontinuation.trim(),
          ...note(discontinuation.notes),
        };
      default:
        return null;
    }
  };

  const save = async () => {
    setValidationError(null);
    const payload = buildPayload();
    if (!payload) {
      setValidationError(t("clinicalDocumentation.forms.restraint.validationError"));
      return;
    }
    const validated = validateRestraintPayloadForCard(cardId, payload);
    if (!validated.ok) {
      setValidationError(t("clinicalDocumentation.forms.restraint.validationError"));
      return;
    }
    await onSubmit(validated.data);
  };

  const datetimeField = (label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <span style={labelStyle}>{label}</span>
      <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} style={fieldStyle} />
    </div>
  );

  const textAreaField = (label: string, value: string, onChange: (v: string) => void) => (
    <div style={{ gridColumn: "1 / -1" }}>
      <span style={labelStyle}>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} style={{ ...fieldStyle, resize: "vertical" }} />
    </div>
  );

  const multiSelectGroup = (
    label: string,
    options: typeof ALTERNATIVES_ATTEMPTED_OPTIONS,
    selected: string[],
    onToggle: (value: string) => void
  ) => (
    <div style={{ gridColumn: "1 / -1" }}>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => (
          <label key={String(option.value)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={selected.includes(String(option.value))}
              onChange={() => onToggle(String(option.value))}
            />
            {locale === "fr" ? option.labelFr : option.labelEn}
          </label>
        ))}
      </div>
    </div>
  );

  const testId = useMemo(() => {
    if (cardId === RESTRAINT_INITIATION_CARD_ID) return "clinical-documentation-restraint-initiation-form";
    if (cardId === RESTRAINT_FACE_TO_FACE_CARD_ID) return "clinical-documentation-restraint-face-to-face-form";
    if (cardId === RESTRAINT_REASSESSMENT_CARD_ID) return "clinical-documentation-restraint-reassessment-form";
    if (cardId === RESTRAINT_RENEWAL_CARD_ID) return "clinical-documentation-restraint-renewal-form";
    if (cardId === RESTRAINT_DISCONTINUATION_CARD_ID) return "clinical-documentation-restraint-discontinuation-form";
    return "clinical-documentation-restraint-form";
  }, [cardId]);

  return (
    <div
      data-testid={testId}
      data-card-id={cardId}
      style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}
    >
      {cardId === RESTRAINT_INITIATION_CARD_ID ? (
        <p
          data-testid="clinical-documentation-restraint-witness-notice"
          style={{
            margin: 0,
            padding: "6px 8px",
            fontSize: 11,
            borderRadius: 8,
            background: "#eff6ff",
            color: "#1e40af",
            border: "1px solid #bfdbfe",
          }}
        >
          {t("clinicalDocumentation.forms.restraint.initiationWitnessNotice")}
        </p>
      ) : null}

      <div style={rowStyle}>
        {cardId === RESTRAINT_INITIATION_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.restraint.assessmentTime"),
              initiation.assessmentTime,
              (v) => setInitiation((s) => ({ ...s, assessmentTime: v }))
            )}
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.restraint.restraintType")}
              value={initiation.restraintType}
              options={RESTRAINT_TYPE_OPTIONS}
              locale={locale}
              onChange={(v) => setInitiation((s) => ({ ...s, restraintType: v as typeof initiation.restraintType }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.restraint.reasonForRestraint")}
              value={initiation.reasonForRestraint}
              options={REASON_FOR_RESTRAINT_OPTIONS}
              locale={locale}
              onChange={(v) =>
                setInitiation((s) => ({ ...s, reasonForRestraint: v as typeof initiation.reasonForRestraint }))
              }
            />
            {multiSelectGroup(
              t("clinicalDocumentation.forms.restraint.alternativesAttempted"),
              ALTERNATIVES_ATTEMPTED_OPTIONS,
              initiation.alternativesAttempted,
              (value) => setInitiation((s) => ({ ...s, alternativesAttempted: toggleMulti(s.alternativesAttempted, value) }))
            )}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.restraint.continuedNeed")}
              value={initiation.continuedNeed}
              locale={locale}
              onChange={(v) => setInitiation((s) => ({ ...s, continuedNeed: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.restraint.injuryPresent")}
              value={initiation.injuryPresent}
              locale={locale}
              onChange={(v) => setInitiation((s) => ({ ...s, injuryPresent: v }))}
            />
            <ClinicalDocumentationSelectField
              label={t("clinicalDocumentation.forms.restraint.circulationAssessment")}
              value={initiation.circulationAssessment}
              options={NORMAL_ABNORMAL_OPTIONS}
              locale={locale}
              onChange={(v) =>
                setInitiation((s) => ({ ...s, circulationAssessment: v as typeof initiation.circulationAssessment }))
              }
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.restraint.physicianOrderVerified")}
              value={initiation.physicianOrderVerified}
              locale={locale}
              onChange={(v) => setInitiation((s) => ({ ...s, physicianOrderVerified: v }))}
            />
            <div>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.restraint.orderingProviderId")}</span>
              <input
                type="text"
                value={initiation.orderingProviderId}
                onChange={(e) => setInitiation((s) => ({ ...s, orderingProviderId: e.target.value }))}
                style={fieldStyle}
              />
            </div>
            {textAreaField(
              t("clinicalDocumentation.forms.restraint.mentalStatusAssessment"),
              initiation.mentalStatusAssessment,
              (v) => setInitiation((s) => ({ ...s, mentalStatusAssessment: v }))
            )}
            {textAreaField(t("clinicalDocumentation.forms.common.notes"), initiation.notes, (v) =>
              setInitiation((s) => ({ ...s, notes: v }))
            )}
          </>
        ) : null}

        {cardId === RESTRAINT_FACE_TO_FACE_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.restraint.evaluationTime"),
              faceToFace.evaluationTime,
              (v) => setFaceToFace((s) => ({ ...s, evaluationTime: v }))
            )}
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.restraint.dangerToSelf")}
              value={faceToFace.dangerToSelf}
              locale={locale}
              onChange={(v) => setFaceToFace((s) => ({ ...s, dangerToSelf: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.restraint.dangerToOthers")}
              value={faceToFace.dangerToOthers}
              locale={locale}
              onChange={(v) => setFaceToFace((s) => ({ ...s, dangerToOthers: v }))}
            />
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.restraint.continuedNeedForRestraint")}
              value={faceToFace.continuedNeedForRestraint}
              locale={locale}
              onChange={(v) => setFaceToFace((s) => ({ ...s, continuedNeedForRestraint: v }))}
            />
            <div>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.restraint.providerEvaluatorId")}</span>
              <input
                type="text"
                value={faceToFace.providerEvaluatorId}
                onChange={(e) => setFaceToFace((s) => ({ ...s, providerEvaluatorId: e.target.value }))}
                style={fieldStyle}
              />
            </div>
            {textAreaField(
              t("clinicalDocumentation.forms.restraint.behaviorAssessment"),
              faceToFace.behaviorAssessment,
              (v) => setFaceToFace((s) => ({ ...s, behaviorAssessment: v }))
            )}
            {textAreaField(
              t("clinicalDocumentation.forms.restraint.medicalConditionAssessment"),
              faceToFace.medicalConditionAssessment,
              (v) => setFaceToFace((s) => ({ ...s, medicalConditionAssessment: v }))
            )}
            {textAreaField(
              t("clinicalDocumentation.forms.restraint.behavioralConditionAssessment"),
              faceToFace.behavioralConditionAssessment,
              (v) => setFaceToFace((s) => ({ ...s, behavioralConditionAssessment: v }))
            )}
          </>
        ) : null}

        {cardId === RESTRAINT_REASSESSMENT_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.restraint.assessmentTime"),
              reassessment.assessmentTime,
              (v) => setReassessment((s) => ({ ...s, assessmentTime: v }))
            )}
            {(["airway", "circulation", "skinIntegrity"] as const).map((key) => (
              <ClinicalDocumentationSelectField
                key={key}
                label={t(`clinicalDocumentation.forms.restraint.${key}`)}
                value={reassessment[key]}
                options={NORMAL_ABNORMAL_OPTIONS}
                locale={locale}
                onChange={(v) => setReassessment((s) => ({ ...s, [key]: v as typeof reassessment.airway }))}
              />
            ))}
            {(
              [
                "nutritionNeedsMet",
                "hydrationNeedsMet",
                "eliminationNeedsMet",
                "rangeOfMotionPerformed",
                "continuedNeed",
              ] as const
            ).map((key) => (
              <ClinicalDocumentationBooleanField
                key={key}
                label={t(`clinicalDocumentation.forms.restraint.${key}`)}
                value={reassessment[key]}
                locale={locale}
                onChange={(v) => setReassessment((s) => ({ ...s, [key]: v }))}
              />
            ))}
            {textAreaField(
              t("clinicalDocumentation.forms.restraint.patientResponse"),
              reassessment.patientResponse,
              (v) => setReassessment((s) => ({ ...s, patientResponse: v }))
            )}
          </>
        ) : null}

        {cardId === RESTRAINT_RENEWAL_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.restraint.renewalTime"),
              renewal.renewalTime,
              (v) => setRenewal((s) => ({ ...s, renewalTime: v }))
            )}
            <div>
              <span style={labelStyle}>{t("clinicalDocumentation.forms.restraint.orderingProviderId")}</span>
              <input
                type="text"
                value={renewal.orderingProviderId}
                onChange={(e) => setRenewal((s) => ({ ...s, orderingProviderId: e.target.value }))}
                style={fieldStyle}
              />
            </div>
            <ClinicalDocumentationBooleanField
              label={t("clinicalDocumentation.forms.restraint.continuedNeed")}
              value={renewal.continuedNeed}
              locale={locale}
              onChange={(v) => setRenewal((s) => ({ ...s, continuedNeed: v }))}
            />
            {textAreaField(
              t("clinicalDocumentation.forms.restraint.renewalReason"),
              renewal.renewalReason,
              (v) => setRenewal((s) => ({ ...s, renewalReason: v }))
            )}
          </>
        ) : null}

        {cardId === RESTRAINT_DISCONTINUATION_CARD_ID ? (
          <>
            {datetimeField(
              t("clinicalDocumentation.forms.restraint.discontinuedTime"),
              discontinuation.discontinuedTime,
              (v) => setDiscontinuation((s) => ({ ...s, discontinuedTime: v }))
            )}
            {multiSelectGroup(
              t("clinicalDocumentation.forms.restraint.criteriaMet"),
              DISCONTINUATION_CRITERIA_OPTIONS,
              discontinuation.criteriaMet,
              (value) => setDiscontinuation((s) => ({ ...s, criteriaMet: toggleMulti(s.criteriaMet, value) }))
            )}
            {textAreaField(
              t("clinicalDocumentation.forms.restraint.conditionAtDiscontinuation"),
              discontinuation.conditionAtDiscontinuation,
              (v) => setDiscontinuation((s) => ({ ...s, conditionAtDiscontinuation: v }))
            )}
          </>
        ) : null}
      </div>

      {validationError ? (
        <p
          data-testid="clinical-documentation-restraint-validation-error"
          style={{ margin: 0, fontSize: 12, color: "#b91c1c" }}
        >
          {validationError}
        </p>
      ) : null}

      <button
        type="button"
        data-testid="clinical-documentation-restraint-save"
        disabled={saving}
        onClick={() => void save()}
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

export function isEdoc6RestraintFormCard(cardId: string): boolean {
  return (EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}
