"use client";

import React from "react";
import type { D4c7jPendingSummary, D4c7jPriorityCategory } from "@medora/shared";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { d4c7jVisiblePendingRows } from "@/features/clinic-care/clinicCareClosureAdvisoryStateMachineD4c7j";

type Props = {
  open: boolean;
  pending: D4c7jPendingSummary;
  priorityCategories: readonly D4c7jPriorityCategory[];
  acknowledged: boolean;
  onAcknowledgedChange: (v: boolean) => void;
  reason: string;
  onReasonChange: (v: string) => void;
  closing: boolean;
  /** Server-confirmed authority to acknowledge and close (role matrix is enforced server-side). */
  canCloseAfterAcknowledgement: boolean;
  onReturnToChart: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  t: (key: string) => string;
};

/**
 * MEDUI.D4C.7J — closure acknowledgement dialog.
 *
 * Pending clinical work is advisory: the provider confirms awareness and closes. Closing never
 * deletes, cancels, completes, or administers anything, so the wording states preservation
 * explicitly instead of framing the action as an override.
 */
export function ClinicCareAmbulatoryClosurePendingModal({
  open,
  pending,
  priorityCategories,
  acknowledged,
  onAcknowledgedChange,
  reason,
  onReasonChange,
  closing,
  canCloseAfterAcknowledgement,
  onReturnToChart,
  onCancel,
  onConfirm,
  t,
}: Props) {
  if (!open) return null;

  const rows = d4c7jVisiblePendingRows(pending);
  const hasPriority = priorityCategories.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clinic-care-d4c7j-closure-title"
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
      <div
        style={{
          ...MEDORA_CARD_SHELL,
          maxWidth: 520,
          width: "100%",
          padding: 20,
          background: "#fff",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h2
          id="clinic-care-d4c7j-closure-title"
          style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "#0f172a" }}
        >
          {t("clinicCareD4c7j.closure.pendingTitle")}
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#475569", lineHeight: 1.45 }}>
          {t("clinicCareD4c7j.closure.pendingBody")}
        </p>

        {hasPriority ? (
          <div
            data-testid="clinic-care-d4c7j-priority-block"
            style={{
              border: "1px solid #fca5a5",
              background: "#fef2f2",
              borderRadius: 12,
              padding: "10px 12px",
              marginBottom: 12,
            }}
          >
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>
              {t("clinicCareD4c7j.closure.priorityTitle")}
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {priorityCategories.map((category) => (
                <li key={category} style={{ margin: "2px 0", fontSize: 13, color: "#7f1d1d" }}>
                  {t(`clinicCareD4c7j.closure.priority.${category}`)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <ul style={{ margin: "0 0 12px", paddingLeft: 18 }}>
            {rows.map((row) => (
              <li key={row.category} style={{ margin: "2px 0", fontSize: 13, color: "#334155" }}>
                {t(`clinicCareD4c7j.closure.counts.${row.category}`)}: <strong>{row.count}</strong>
              </li>
            ))}
          </ul>
        ) : null}

        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#b45309", lineHeight: 1.4 }}>
          {t("clinicCareD4c7j.closure.preserveWarning")}
        </p>

        {canCloseAfterAcknowledgement ? (
          <>
            <label
              style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12, fontSize: 13 }}
            >
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => onAcknowledgedChange(e.target.checked)}
                disabled={closing}
                data-testid="clinic-care-d4c7j-closure-ack"
              />
              <span>{t("clinicCareD4c7j.closure.acknowledgement")}</span>
            </label>
            {hasPriority ? (
              <label style={{ display: "block", marginBottom: 14, fontSize: 13, color: "#334155" }}>
                <span style={{ display: "block", marginBottom: 4 }}>
                  {t("clinicCareD4c7j.closure.priorityReasonLabel")}
                </span>
                <input
                  type="text"
                  value={reason}
                  maxLength={240}
                  disabled={closing}
                  onChange={(e) => onReasonChange(e.target.value)}
                  data-testid="clinic-care-d4c7j-closure-reason"
                  placeholder={t("clinicCareD4c7j.closure.priorityReasonPlaceholder")}
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    padding: "8px 10px",
                    fontSize: 13,
                  }}
                />
              </label>
            ) : null}
          </>
        ) : (
          <p role="alert" style={{ margin: "0 0 12px", fontSize: 13, color: "#b91c1c" }}>
            {t("clinicCareD4c7j.closure.notAuthorized")}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onReturnToChart} disabled={closing} style={btnSecondary}>
            {t("clinicCareD4c7j.closure.returnToChart")}
          </button>
          <button type="button" onClick={onCancel} disabled={closing} style={btnSecondary}>
            {t("clinicCareD4c7j.closure.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={closing || !canCloseAfterAcknowledgement || !acknowledged}
            data-testid="clinic-care-d4c7j-closure-confirm"
            style={{
              ...btnPrimary,
              opacity: closing || !canCloseAfterAcknowledgement || !acknowledged ? 0.5 : 1,
            }}
          >
            {closing
              ? t("clinicCareD4c7j.closure.closing")
              : t("clinicCareD4c7j.closure.confirmClose")}
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
  border: "1px solid #0d9488",
  background: "#0d9488",
  color: "#fff",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
