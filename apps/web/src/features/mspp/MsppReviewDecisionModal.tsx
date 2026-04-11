"use client";

import React, { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Field, inputStyle } from "@/components/pharmacy/Modal";
import type { MsppReviewActionBody } from "@/lib/msppApi";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";

const OVERLAY: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const PANEL: React.CSSProperties = {
  background: MEDORA_CARD_SHELL.background,
  border: MEDORA_CARD_SHELL.border,
  borderRadius: MEDORA_CARD_SHELL.radius,
  boxShadow: MEDORA_CARD_SHELL.boxShadow,
  maxWidth: 480,
  width: "100%",
  maxHeight: "90vh",
  overflow: "auto",
  padding: "20px 22px",
};

const BTN_ROW: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 16,
  flexWrap: "wrap",
};

const BTN_PRIMARY: React.CSSProperties = {
  padding: "10px 18px",
  backgroundColor: "#1a1a1a",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

const BTN_GHOST: React.CSSProperties = {
  ...BTN_PRIMARY,
  backgroundColor: "#f1f5f9",
  color: "#0f172a",
};

const RADIO_ROW: React.CSSProperties = {
  display: "flex",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "center",
};

export type MsppReviewDecisionModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: (body: MsppReviewActionBody) => Promise<void>;
  submitting: boolean;
};

const EXPOSURE_VALUES = ["LOW", "MEDIUM", "HIGH", "UNKNOWN"] as const;

export function MsppReviewDecisionModal({
  open,
  title,
  onClose,
  onConfirm,
  submitting,
}: MsppReviewDecisionModalProps) {
  const { t } = useI18n();
  const [fever, setFever] = useState<boolean | null>(null);
  const [duration, setDuration] = useState("");
  const [labConfirmed, setLabConfirmed] = useState<boolean | null>(null);
  const [exposureRisk, setExposureRisk] = useState<(typeof EXPOSURE_VALUES)[number]>("UNKNOWN");
  const [comment, setComment] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFever(null);
    setDuration("");
    setLabConfirmed(null);
    setExposureRisk("UNKNOWN");
    setComment("");
    setLocalError(null);
  }, [open]);

  if (!open) return null;

  const exposureLabel = (code: string) => {
    const key = `msppValidation.exposureRisk.${code}`;
    const out = t(key);
    return out === key ? code : out;
  };

  const handleSubmit = async () => {
    setLocalError(null);
    if (fever === null) {
      setLocalError(t("msppValidation.checklistErrorFever"));
      return;
    }
    if (labConfirmed === null) {
      setLocalError(t("msppValidation.checklistErrorLab"));
      return;
    }
    if (!duration.trim()) {
      setLocalError(t("msppValidation.checklistErrorDuration"));
      return;
    }
    if (!comment.trim()) {
      setLocalError(t("msppValidation.checklistErrorComment"));
      return;
    }
    const body: MsppReviewActionBody = {
      comment: comment.trim(),
      fever,
      duration: duration.trim(),
      labConfirmed,
      exposureRisk,
    };
    await onConfirm(body);
  };

  return (
    <div
      style={OVERLAY}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mspp-decision-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={PANEL} onClick={(e) => e.stopPropagation()}>
        <h2 id="mspp-decision-title" style={{ marginTop: 0, fontSize: "1.1rem", fontWeight: 700 }}>
          {title}
        </h2>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, marginBottom: 14 }}>
          {t("msppValidation.checklistIntro")}
        </p>

        <Field label={`${t("msppValidation.checklistFever")} *`}>
          <div style={RADIO_ROW}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="mspp-fever"
                checked={fever === true}
                onChange={() => setFever(true)}
              />
              {t("common.yes")}
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="mspp-fever"
                checked={fever === false}
                onChange={() => setFever(false)}
              />
              {t("common.no")}
            </label>
          </div>
        </Field>

        <Field label={`${t("msppValidation.checklistDuration")} *`}>
          <input
            style={inputStyle}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder={t("msppValidation.checklistDurationPlaceholder")}
          />
        </Field>

        <Field label={`${t("msppValidation.checklistLab")} *`}>
          <div style={RADIO_ROW}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="mspp-lab"
                checked={labConfirmed === true}
                onChange={() => setLabConfirmed(true)}
              />
              {t("common.yes")}
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="mspp-lab"
                checked={labConfirmed === false}
                onChange={() => setLabConfirmed(false)}
              />
              {t("common.no")}
            </label>
          </div>
        </Field>

        <Field label={`${t("msppValidation.checklistExposure")} *`}>
          <select
            style={inputStyle}
            value={exposureRisk}
            onChange={(e) => setExposureRisk(e.target.value as (typeof EXPOSURE_VALUES)[number])}
          >
            {EXPOSURE_VALUES.map((v) => (
              <option key={v} value={v}>
                {exposureLabel(v)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={`${t("msppValidation.checklistComment")} *`}>
          <textarea
            style={{ ...inputStyle, minHeight: 88 }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("msppValidation.checklistCommentPlaceholder")}
          />
        </Field>

        {localError ? (
          <p style={{ color: "#b91c1c", fontSize: 13, fontWeight: 600, margin: "8px 0 0" }} role="alert">
            {localError}
          </p>
        ) : null}

        <div style={BTN_ROW}>
          <button type="button" style={BTN_PRIMARY} disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? t("msppValidation.checklistSubmitting") : t("msppValidation.checklistConfirm")}
          </button>
          <button type="button" style={BTN_GHOST} disabled={submitting} onClick={onClose}>
            {t("msppValidation.checklistCancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
