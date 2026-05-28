"use client";

import { useState } from "react";
import {
  UC_TO_ED_ACKNOWLEDGMENT_PLACEHOLDER_FR,
  type BillingClassificationAcknowledgmentMethod,
  type BillingClassificationChangeReasonCode,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/apiClient";

type Props = {
  encounterId: string;
  facilityId: string;
  currentClassification: string;
  onUpdated: () => void | Promise<void>;
  onClose: () => void;
};

const REASON_CODES: BillingClassificationChangeReasonCode[] = [
  "HIGHER_ACUITY_WORKUP_REQUIRED",
  "PROVIDER_DIRECTED_ED_EVALUATION",
  "PATIENT_AGREED_TO_ED_BILLING",
  "FACILITY_POLICY",
  "OTHER",
];

const ACK_METHODS: BillingClassificationAcknowledgmentMethod[] = [
  "SIGNED_FORM",
  "ELECTRONIC_ACKNOWLEDGMENT",
  "VERBAL_WITH_WITNESS",
  "NOT_APPLICABLE_PER_POLICY",
];

export function BillingClassificationConversionModal({
  encounterId,
  facilityId,
  currentClassification,
  onUpdated,
  onClose,
}: Props) {
  const { t, language } = useI18n();
  const [reasonCode, setReasonCode] = useState<BillingClassificationChangeReasonCode>(
    "HIGHER_ACUITY_WORKUP_REQUIRED",
  );
  const [ackMethod, setAckMethod] = useState<BillingClassificationAcknowledgmentMethod>("SIGNED_FORM");
  const [patientAcknowledged, setPatientAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ackText =
    language === "fr" ? UC_TO_ED_ACKNOWLEDGMENT_PLACEHOLDER_FR : t("billingClassification.acknowledgmentPlaceholder");

  async function submit() {
    setError(null);
    if (!patientAcknowledged) {
      setError(t("billingClassification.errorAckRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/encounters/${encounterId}/billing-classification`, {
        facilityId,
        method: "PATCH",
        body: JSON.stringify({
          classification: "EMERGENCY_DEPARTMENT",
          reasonCode,
          acknowledgmentMethod: ackMethod,
          patientAcknowledged: true,
        }),
      });
      await onUpdated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("billingClassification.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-classification-conversion-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          maxWidth: 520,
          width: "100%",
          padding: 20,
        }}
      >
        <h2 id="billing-classification-conversion-title" style={{ margin: "0 0 12px", fontSize: 18 }}>
          {t("billingClassification.conversionTitle")}
        </h2>
        <p style={{ fontSize: 14, color: "#475569", marginBottom: 12 }}>
          {t("billingClassification.conversionIntro")
            .replace("{from}", t(`encounterChrome.billingClassification.${currentClassification}`))
            .replace("{to}", t("encounterChrome.billingClassification.EMERGENCY_DEPARTMENT"))}
        </p>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.45 }}>{ackText}</p>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          {t("billingClassification.reasonLabel")}
        </label>
        <select
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value as BillingClassificationChangeReasonCode)}
          style={{ width: "100%", padding: 8, marginBottom: 12, borderRadius: 8, border: "1px solid #cbd5e1" }}
        >
          {REASON_CODES.map((code) => (
            <option key={code} value={code}>
              {t(`billingClassification.reasonCodes.${code}`)}
            </option>
          ))}
        </select>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          {t("billingClassification.ackMethodLabel")}
        </label>
        <select
          value={ackMethod}
          onChange={(e) => setAckMethod(e.target.value as BillingClassificationAcknowledgmentMethod)}
          style={{ width: "100%", padding: 8, marginBottom: 12, borderRadius: 8, border: "1px solid #cbd5e1" }}
        >
          {ACK_METHODS.map((code) => (
            <option key={code} value={code}>
              {t(`billingClassification.ackMethods.${code}`)}
            </option>
          ))}
        </select>

        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={patientAcknowledged}
            onChange={(e) => setPatientAcknowledged(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span>{t("billingClassification.patientAckCheckbox")}</span>
        </label>

        {error ? (
          <p role="alert" style={{ color: "#b91c1c", fontSize: 13, marginBottom: 12 }}>
            {error}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} disabled={submitting} style={{ padding: "8px 14px" }}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            style={{ padding: "8px 14px", fontWeight: 600, background: "#c2410c", color: "#fff", border: "none", borderRadius: 8 }}
          >
            {submitting ? t("common.loading") : t("billingClassification.confirmConversion")}
          </button>
        </div>
      </div>
    </div>
  );
}
