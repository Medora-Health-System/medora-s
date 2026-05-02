"use client";

import React, { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { CANCEL_ORDER_MODAL_REASON_OPTIONS, type CancelOrderModalReasonCode } from "@/lib/orderCancelModalReasons";

export type CancelOrderConfirmPayload = {
  cancellationReason: string;
  cancellationDetails?: string;
};

export type CancelOrderModalProps = {
  open: boolean;
  orderId: string | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (payload: CancelOrderConfirmPayload) => void | Promise<void>;
  /** `orderLine` = single line (POST /orders/items/:id/cancel); default = whole parent order. */
  variant?: "parentOrder" | "orderLine";
};

/**
 * Required-reason cancel — parent POST /orders/:id/cancel or line POST /orders/items/:id/cancel (same body).
 */
export function CancelOrderModal({
  open,
  orderId,
  submitting,
  onClose,
  onConfirm,
  variant = "parentOrder",
}: CancelOrderModalProps) {
  const { t } = useI18n();
  const [reasonCode, setReasonCode] = useState<CancelOrderModalReasonCode | "">("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (open) {
      setReasonCode("");
      setDetails("");
    }
  }, [open, orderId]);

  const titleKey = variant === "orderLine" ? "cancelOrderModal.cancelOrderLineTitle" : "cancelOrderModal.cancelReasonTitle";
  const scopeKey =
    variant === "orderLine" ? "cancelOrderModal.cancelOrderLineWarning" : "cancelOrderModal.cancelScopeWarning";
  const confirmKey =
    variant === "orderLine" ? "cancelOrderModal.cancelOrderLineConfirm" : "cancelOrderModal.confirm";

  if (!open || !orderId) return null;

  const selectedApiValue =
    reasonCode === ""
      ? ""
      : CANCEL_ORDER_MODAL_REASON_OPTIONS.find((o) => o.code === reasonCode)?.apiValue ?? "";

  const canSubmit = Boolean(selectedApiValue.trim()) && !submitting;

  const handleConfirm = () => {
    if (!canSubmit || !selectedApiValue) return;
    const trimmedDetails = details.trim();
    void onConfirm({
      cancellationReason: selectedApiValue,
      ...(trimmedDetails ? { cancellationDetails: trimmedDetails } : {}),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-order-modal-title"
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
          maxWidth: 440,
          width: "100%",
          padding: 20,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="cancel-order-modal-title" style={{ margin: "0 0 12px 0", fontSize: 17, color: "#0f172a" }}>
          {t(titleKey)}
        </h4>
        <p style={{ margin: "0 0 16px 0", fontSize: 14, lineHeight: 1.5, color: "#424242" }}>
          {t(scopeKey)}
        </p>
        <label style={{ display: "block", marginBottom: 12, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
          {t("cancelOrderModal.cancelReasonLabel")}
          <select
            value={reasonCode}
            onChange={(e) => setReasonCode((e.target.value || "") as CancelOrderModalReasonCode | "")}
            disabled={submitting}
            aria-required
            aria-invalid={reasonCode === ""}
            aria-describedby={reasonCode === "" ? "cancel-reason-required-hint" : undefined}
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
            <option value="">{t("cancelOrderModal.cancelReasonPlaceholder")}</option>
            {CANCEL_ORDER_MODAL_REASON_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {t(`cancelOrderModal.cancelReasons.${o.code}`)}
              </option>
            ))}
          </select>
        </label>
        {reasonCode === "" ? (
          <p id="cancel-reason-required-hint" style={{ margin: "0 0 12px 0", fontSize: 12, color: "#64748b" }}>
            {t("cancelOrderModal.cancelReasonRequired")}
          </p>
        ) : null}
        <label style={{ display: "block", marginBottom: 16, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
          {t("cancelOrderModal.commentLabel")}
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            disabled={submitting}
            rows={3}
            maxLength={500}
            placeholder={t("cancelOrderModal.commentPlaceholder")}
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
        <p style={{ margin: "0 0 16px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          {t("cancelOrderModal.commentNonPhiHint")}
        </p>
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
            onClick={() => void handleConfirm()}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              border: "none",
              borderRadius: 4,
              background: "#c62828",
              color: "white",
              fontWeight: 600,
              cursor: !canSubmit ? "not-allowed" : "pointer",
              opacity: !canSubmit ? 0.7 : 1,
            }}
          >
            {submitting ? t("cancelOrderModal.confirmBusy") : t(confirmKey)}
          </button>
        </div>
      </div>
    </div>
  );
}
