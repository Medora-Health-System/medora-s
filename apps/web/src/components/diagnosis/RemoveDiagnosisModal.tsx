"use client";

import React, { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { RemoveDiagnosisReasonCode } from "@/lib/chartApi";
import { DIAGNOSIS_REMOVAL_REASON_OPTIONS } from "@/lib/diagnosisRemovalReasons";

export type RemoveDiagnosisConfirmPayload = {
  reasonCode: RemoveDiagnosisReasonCode;
  reasonText?: string;
  notes?: string;
};

export type RemoveDiagnosisModalProps = {
  open: boolean;
  code: string;
  description: string | null;
  isPrimary: boolean;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (payload: RemoveDiagnosisConfirmPayload) => void | Promise<void>;
};

export function RemoveDiagnosisModal({
  open,
  code,
  description,
  isPrimary,
  submitting,
  onClose,
  onConfirm,
}: RemoveDiagnosisModalProps) {
  const { t } = useI18n();
  const [reasonCode, setReasonCode] = useState<RemoveDiagnosisReasonCode | "">("");
  const [reasonText, setReasonText] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setReasonCode("");
      setReasonText("");
      setNotes("");
    }
  }, [open, code]);

  if (!open) return null;

  const otherNeedsText = reasonCode === "OTHER" && !reasonText.trim();
  const canSubmit = Boolean(reasonCode) && !otherNeedsText && !submitting;

  const handleConfirm = () => {
    if (!canSubmit || !reasonCode) return;
    void onConfirm({
      reasonCode,
      ...(reasonText.trim() ? { reasonText: reasonText.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-diagnosis-modal-title"
      aria-busy={submitting}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        boxSizing: "border-box",
        cursor: submitting ? "wait" : "default",
      }}
      onClick={(e) => {
        if (submitting) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 8,
          maxWidth: 460,
          width: "100%",
          padding: 20,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="remove-diagnosis-modal-title" style={{ margin: "0 0 12px 0", fontSize: 17, color: "#0f172a" }}>
          {t("removeDiagnosisModal.title")}
        </h4>
        <div
          style={{
            margin: "0 0 14px 0",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            fontSize: 14,
            color: "#0f172a",
          }}
        >
          <div style={{ fontWeight: 700 }}>{code}</div>
          <div style={{ marginTop: 4, color: "#334155" }}>{description?.trim() || t("common.dash")}</div>
          {isPrimary ? (
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase" }}>
              {t("diagnosisEntry.primaryBadge")}
            </div>
          ) : null}
        </div>
        <p style={{ margin: "0 0 14px 0", fontSize: 13, lineHeight: 1.5, color: "#475569" }}>
          {t("removeDiagnosisModal.warning")}
        </p>
        <label style={{ display: "block", marginBottom: 12, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
          {t("removeDiagnosisModal.reasonLabel")}
          <select
            value={reasonCode}
            onChange={(e) => setReasonCode((e.target.value || "") as RemoveDiagnosisReasonCode | "")}
            disabled={submitting}
            aria-required
            aria-invalid={reasonCode === ""}
            style={{
              display: "block",
              width: "100%",
              marginTop: 8,
              padding: "8px 10px",
              fontSize: 14,
              borderRadius: 4,
              border: "1px solid #ccc",
              boxSizing: "border-box",
            }}
          >
            <option value="">{t("removeDiagnosisModal.reasonPlaceholder")}</option>
            {DIAGNOSIS_REMOVAL_REASON_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {t(`removeDiagnosisModal.reasons.${o.code}`)}
              </option>
            ))}
          </select>
        </label>
        {reasonCode === "OTHER" ? (
          <label style={{ display: "block", marginBottom: 12, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
            {t("removeDiagnosisModal.otherReasonLabel")}
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              disabled={submitting}
              rows={2}
              maxLength={500}
              aria-required
              style={{
                display: "block",
                width: "100%",
                marginTop: 8,
                padding: "8px 10px",
                fontSize: 14,
                borderRadius: 4,
                border: "1px solid #ccc",
                boxSizing: "border-box",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </label>
        ) : null}
        <label style={{ display: "block", marginBottom: 16, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
          {t("removeDiagnosisModal.notesLabel")}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            rows={2}
            maxLength={500}
            placeholder={t("removeDiagnosisModal.notesPlaceholder")}
            style={{
              display: "block",
              width: "100%",
              marginTop: 8,
              padding: "8px 10px",
              fontSize: 14,
              borderRadius: 4,
              border: "1px solid #ccc",
              boxSizing: "border-box",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              if (submitting) return;
              onClose();
            }}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              border: "1px solid #ccc",
              borderRadius: 4,
              background: "#fff",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleConfirm}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              border: "1px solid #b91c1c",
              borderRadius: 4,
              background: canSubmit ? "#dc2626" : "#fecaca",
              color: "#fff",
              fontWeight: 600,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {t("removeDiagnosisModal.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
