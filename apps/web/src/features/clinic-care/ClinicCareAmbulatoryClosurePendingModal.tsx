"use client";

import React from "react";
import type { D4c7fPendingItemCounts } from "@medora/shared";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

type Props = {
  open: boolean;
  pending: D4c7fPendingItemCounts;
  acknowledged: boolean;
  onAcknowledgedChange: (v: boolean) => void;
  closing: boolean;
  overrideAllowed: boolean;
  onReturnToChart: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  t: (key: string) => string;
};

function countRow(label: string, n: number) {
  return (
    <li style={{ margin: "2px 0", fontSize: 13, color: "#334155" }}>
      {label}: <strong>{n}</strong>
    </li>
  );
}

/**
 * MEDUI.D4C.7F — ambulatory closure pending-items warning modal.
 * Requires acknowledgement before override close. No raw JSON / [object Object].
 */
export function ClinicCareAmbulatoryClosurePendingModal({
  open,
  pending,
  acknowledged,
  onAcknowledgedChange,
  closing,
  overrideAllowed,
  onReturnToChart,
  onCancel,
  onConfirm,
  t,
}: Props) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clinic-care-d4c7f-closure-title"
      data-testid="clinic-care-ambulatory-closure-pending-modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{ ...MEDORA_CARD_SHELL, maxWidth: 480, width: "100%", padding: 20, background: "#fff" }}>
        <h2 id="clinic-care-d4c7f-closure-title" style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "#0f172a" }}>
          {t("clinicCareD4c7f.closure.pendingTitle")}
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#475569", lineHeight: 1.45 }}>
          {t("clinicCareD4c7f.closure.pendingBody")}
        </p>
        <ul style={{ margin: "0 0 12px", paddingLeft: 18 }}>
          {countRow(t("clinicCareD4c7f.closure.counts.laboratory"), pending.laboratory)}
          {countRow(t("clinicCareD4c7f.closure.counts.imaging"), pending.imaging)}
          {countRow(t("clinicCareD4c7f.closure.counts.medications"), pending.medications)}
          {countRow(t("clinicCareD4c7f.closure.counts.procedures"), pending.procedures)}
          {countRow(t("clinicCareD4c7f.closure.counts.results"), pending.results)}
          {countRow(t("clinicCareD4c7f.closure.counts.criticalResults"), pending.criticalResults)}
          {countRow(t("clinicCareD4c7f.closure.counts.followUps"), pending.followUps)}
        </ul>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#b45309", lineHeight: 1.4 }}>
          {t("clinicCareD4c7f.closure.preserveWarning")}
        </p>
        {overrideAllowed ? (
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 14, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => onAcknowledgedChange(e.target.checked)}
              disabled={closing}
              data-testid="clinic-care-d4c7f-closure-ack"
            />
            <span>{t("clinicCareD4c7f.closure.acknowledgement")}</span>
          </label>
        ) : (
          <p role="alert" style={{ margin: "0 0 12px", fontSize: 13, color: "#b91c1c" }}>
            {t("clinicCareD4c7f.closure.overrideDenied")}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onReturnToChart} disabled={closing} style={btnSecondary}>
            {t("clinicCareD4c7f.closure.returnToChart")}
          </button>
          <button type="button" onClick={onCancel} disabled={closing} style={btnSecondary}>
            {t("clinicCareD4c7f.closure.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={closing || !overrideAllowed || !acknowledged}
            data-testid="clinic-care-d4c7f-closure-confirm"
            style={{
              ...btnPrimary,
              opacity: closing || !overrideAllowed || !acknowledged ? 0.5 : 1,
            }}
          >
            {closing ? t("clinicCareD4c7f.pending.closing") : t("clinicCareD4c7f.closure.confirmDespite")}
          </button>
        </div>
      </div>
    </div>
  );
}

const btnSecondary: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  border: "1px solid #b45309",
  background: "#fef3c7",
  color: "#92400e",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
