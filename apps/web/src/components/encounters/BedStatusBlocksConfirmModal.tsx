"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";

export function BedStatusBlocksConfirmModal({
  message,
  saving,
  onConfirm,
  onCancel,
}: {
  message: string;
  saving?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();

  return (
    <div
      role="presentation"
      onClick={() => !saving && onCancel()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1001,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bed-status-blocks-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          backgroundColor: "#fff",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.18)",
          padding: "20px 22px",
        }}
      >
        <h2
          id="bed-status-blocks-title"
          style={{ margin: "0 0 10px 0", fontSize: 17, fontWeight: 700, color: "#0f172a" }}
        >
          {t("roomAssignment.bedStatusConflictTitle")}
        </h2>
        <p style={{ margin: "0 0 18px 0", fontSize: 14, color: "#334155", lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              backgroundColor: "#fff",
              color: "#334155",
              fontWeight: 600,
              fontSize: 14,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onConfirm}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              backgroundColor: "#2563eb",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving ? t("common.saving") : t("roomAssignment.bedStatusConflictConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
