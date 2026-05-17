"use client";

import React from "react";
import {
  medicationAdminTimeModalRequiresReason,
  datetimeLocalValueToUtcIso,
} from "@/features/mar/medicationAdministrationEffectiveTimeDisplay";
import { marRecordModalShowsLargeBackdateSupervisoryWarning } from "@/features/mar/marRecordModalEffectiveTime";

const ADJUST_CARD_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #93c5fd",
  background: "#f8fafc",
  cursor: "pointer",
  textAlign: "left",
  minWidth: 0,
  maxWidth: "100%",
};

export function MedicationAdministrationRecordModalAdjustTime({
  showEditor,
  onToggleEditor,
  effectiveTimeLocal,
  onEffectiveTimeLocalChange,
  effectiveTimeReason,
  onEffectiveTimeReasonChange,
  onClear,
  documentedAt,
  orderCreatedAt,
  orderItemCreatedAt,
  orderCancelledAt,
  controlledMedication,
  dateLocale,
  disabled,
  t,
}: {
  showEditor: boolean;
  onToggleEditor: () => void;
  effectiveTimeLocal: string;
  onEffectiveTimeLocalChange: (v: string) => void;
  effectiveTimeReason: string;
  onEffectiveTimeReasonChange: (v: string) => void;
  onClear: () => void;
  documentedAt: Date;
  orderCreatedAt: Date;
  orderItemCreatedAt: Date | null;
  orderCancelledAt: Date | null;
  controlledMedication: boolean;
  dateLocale: string;
  disabled?: boolean;
  t: (key: string) => string;
}) {
  const hasSelection = Boolean(effectiveTimeLocal.trim());
  const effectiveIso = hasSelection ? datetimeLocalValueToUtcIso(effectiveTimeLocal) : null;
  const needsReason =
    effectiveIso != null &&
    medicationAdminTimeModalRequiresReason({
      effectiveAdministeredTimeIso: effectiveIso,
      originalAdministeredAt: documentedAt,
      systemDocumentedAt: documentedAt,
      orderCreatedAt,
      orderItemCreatedAt,
      adjustmentVersion: 0,
      controlledMedication,
      orderCancelledAt,
    });
  const largeBackdate = marRecordModalShowsLargeBackdateSupervisoryWarning({
    effectiveTimeLocal,
    documentedAt,
    toUtcIso: datetimeLocalValueToUtcIso,
  });

  return (
    <div style={{ flex: "1 1 220px", minWidth: 0, maxWidth: 360 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggleEditor}
        title={t("marTab.adminTime.recordModalAdjustCardTooltip")}
        style={{
          ...ADJUST_CARD_STYLE,
          width: "100%",
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>
          🧭
        </span>
        <span style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a" }}>
            {t("marTab.adminTime.recordModalAdjustTitle")}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
            {t("marTab.adminTime.recordModalAdjustSubtext")}
          </div>
        </span>
      </button>

      {showEditor ? (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#fff",
          }}
        >
          <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
            {t("marTab.adminTime.warning")}
          </p>
          {largeBackdate ? (
            <div
              role="note"
              style={{
                marginBottom: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #fcd34d",
                background: "#fffbeb",
                fontSize: 12,
                color: "#92400e",
                lineHeight: 1.45,
              }}
            >
              {t("marTab.adminTime.largeBackdateSupervisoryWarning")}
            </div>
          ) : null}
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            {t("marTab.adminTime.effectiveLabel")}
          </label>
          <input
            type="datetime-local"
            value={effectiveTimeLocal}
            disabled={disabled}
            onChange={(e) => onEffectiveTimeLocalChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              fontSize: 14,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              boxSizing: "border-box",
            }}
          />
          {needsReason ? (
            <>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, margin: "10px 0 4px" }}>
                {t("marTab.adminTime.reasonLabel")}
              </label>
              <textarea
                value={effectiveTimeReason}
                disabled={disabled}
                onChange={(e) => onEffectiveTimeReasonChange(e.target.value)}
                placeholder={t("marTab.adminTime.reasonPlaceholder")}
                rows={2}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
              {controlledMedication ? (
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#b45309" }}>
                  {t("marTab.adminTime.controlledWarning")}
                </p>
              ) : null}
              {largeBackdate ? (
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#64748b" }}>
                  {t("marTab.adminTime.largeBackdateReasonHelp")}
                </p>
              ) : null}
            </>
          ) : null}
          {hasSelection && effectiveIso ? (
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 9999,
                  background: "#dbeafe",
                  color: "#1e40af",
                }}
              >
                {t("marTab.adminTime.recordModalAdjustedSelected")}
              </span>
              <span style={{ fontSize: 12, color: "#334155" }}>
                {new Date(effectiveIso).toLocaleString(dateLocale)}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={onClear}
                style={{
                  fontSize: 12,
                  padding: "4px 8px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                {t("marTab.adminTime.recordModalClearAdjusted")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
