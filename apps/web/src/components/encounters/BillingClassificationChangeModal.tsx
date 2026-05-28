"use client";

import { useState } from "react";
import {
  UC_TO_ED_ACKNOWLEDGMENT_PLACEHOLDER_FR,
  UC_TO_ED_OPERATIONAL_REASON_PRESETS,
  type BillingClassification,
  type BillingClassificationAcknowledgmentMethod,
  type BillingClassificationChangeReasonCode,
} from "@medora/shared";
import { patchBillingClassification } from "@/lib/billingClassificationApi";
import { useI18n } from "@/lib/i18n";

type Props = {
  encounterId: string;
  facilityId: string;
  currentClassification: string;
  targetClassification: BillingClassification;
  onUpdated: () => void | Promise<void>;
  onClose: () => void;
};

const ACK_METHODS: BillingClassificationAcknowledgmentMethod[] = [
  "SIGNED_FORM",
  "ELECTRONIC_ACKNOWLEDGMENT",
  "VERBAL_WITH_WITNESS",
  "NOT_APPLICABLE_PER_POLICY",
];

export function BillingClassificationChangeModal({
  encounterId,
  facilityId,
  currentClassification,
  targetClassification,
  onUpdated,
  onClose,
}: Props) {
  const { t, language } = useI18n();
  const isUcToEd = currentClassification === "URGENT_CARE" && targetClassification === "EMERGENCY_DEPARTMENT";
  const [presetKey, setPresetKey] = useState<string>(UC_TO_ED_OPERATIONAL_REASON_PRESETS[0].presetKey);
  const [reasonCode, setReasonCode] = useState<BillingClassificationChangeReasonCode>(
    UC_TO_ED_OPERATIONAL_REASON_PRESETS[0].reasonCode,
  );
  const [ackMethod, setAckMethod] = useState<BillingClassificationAcknowledgmentMethod>("SIGNED_FORM");
  const [patientAcknowledged, setPatientAcknowledged] = useState(false);
  const [operationalNote, setOperationalNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ackText =
    language === "fr" ? UC_TO_ED_ACKNOWLEDGMENT_PLACEHOLDER_FR : t("billingClassification.acknowledgmentPlaceholder");

  function onPresetChange(key: string) {
    setPresetKey(key);
    const preset = UC_TO_ED_OPERATIONAL_REASON_PRESETS.find((p) => p.presetKey === key);
    if (preset) setReasonCode(preset.reasonCode);
  }

  async function submit() {
    setError(null);
    if (isUcToEd && !patientAcknowledged) {
      setError(t("billingClassification.errorAckRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await patchBillingClassification(facilityId, encounterId, {
        classification: targetClassification,
        reasonCode,
        acknowledgmentMethod: ackMethod,
        patientAcknowledged: isUcToEd ? true : patientAcknowledged,
        changeReason: operationalNote.trim() || undefined,
      });
      await onUpdated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("billingClassification.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  const title = isUcToEd
    ? t("billingClassification.ucToEdModalTitle")
    : t("billingClassification.conversionTitle");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1600,
        padding: 16,
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="billing-class-change-title"
      >
        <h2 id="billing-class-change-title" style={{ marginTop: 0, fontSize: 18 }}>
          {title}
        </h2>
        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
          {t("billingClassification.conversionIntro")
            .replace("{from}", t(`encounterChrome.billingClassification.${currentClassification}`))
            .replace("{to}", t(`encounterChrome.billingClassification.${targetClassification}`))}
        </p>
        <ul style={{ fontSize: 12, color: "#64748b", paddingLeft: 18, margin: "0 0 16px" }}>
          <li>{t("billingClassification.sameChartBullet")}</li>
          <li>{t("billingClassification.docsUnchangedBullet")}</li>
          {isUcToEd ? <li>{t("billingClassification.edBillingBullet")}</li> : null}
        </ul>

        {isUcToEd ? (
          <label style={{ display: "block", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
            {t("billingClassification.operationalReasonLabel")}
            <select
              value={presetKey}
              onChange={(e) => onPresetChange(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
            >
              {UC_TO_ED_OPERATIONAL_REASON_PRESETS.map((p) => (
                <option key={p.presetKey} value={p.presetKey}>
                  {t(`billingClassification.operationalPresets.${p.presetKey}`)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label style={{ display: "block", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
            {t("billingClassification.reasonLabel")}
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value as BillingClassificationChangeReasonCode)}
              style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
            >
              {(["HIGHER_ACUITY_WORKUP_REQUIRED", "PROVIDER_DIRECTED_ED_EVALUATION", "PATIENT_AGREED_TO_ED_BILLING", "FACILITY_POLICY", "OTHER"] as const).map(
                (code) => (
                  <option key={code} value={code}>
                    {t(`billingClassification.reasonCodes.${code}`)}
                  </option>
                ),
              )}
            </select>
          </label>
        )}

        <label style={{ display: "block", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
          {t("billingClassification.operationalNoteLabel")}
          <textarea
            value={operationalNote}
            onChange={(e) => setOperationalNote(e.target.value)}
            maxLength={512}
            rows={2}
            placeholder={t("billingClassification.operationalNotePlaceholder")}
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
          />
        </label>

        {isUcToEd ? (
          <>
            <label style={{ display: "block", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
              {t("billingClassification.ackMethodLabel")}
              <select
                value={ackMethod}
                onChange={(e) => setAckMethod(e.target.value as BillingClassificationAcknowledgmentMethod)}
                style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
              >
                {ACK_METHODS.map((code) => (
                  <option key={code} value={code}>
                    {t(`billingClassification.ackMethods.${code}`)}
                  </option>
                ))}
              </select>
            </label>
            <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45, margin: "0 0 12px" }}>{ackText}</p>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={patientAcknowledged}
                onChange={(e) => setPatientAcknowledged(e.target.checked)}
              />
              <span>{t("billingClassification.patientAckCheckbox")}</span>
            </label>
          </>
        ) : null}

        {error ? <p style={{ color: "#b91c1c", fontSize: 13 }}>{error}</p> : null}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} disabled={submitting} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff" }}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#c2410c", color: "#fff", fontWeight: 700 }}
          >
            {submitting ? t("common.loading") : isUcToEd ? t("billingClassification.confirmUcToEd") : t("billingClassification.confirmConversion")}
          </button>
        </div>
      </div>
    </div>
  );
}
