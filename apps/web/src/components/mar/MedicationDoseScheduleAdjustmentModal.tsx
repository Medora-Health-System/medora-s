"use client";

import React, { useEffect, useState } from "react";
import { MAR_MEDICATION_TIMING_OVERRIDE_REASON_CODES } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { toMarShiftTimelineDateTimeLocalValue } from "@/features/mar/marShiftTimelineDisplay";
import { marShiftTimelineDateTimeLocalToUtcIso } from "@/features/mar/marShiftTimelineDisplay";

export type MedicationDoseScheduleAdjustmentModalProps = {
  open: boolean;
  medicationLabel: string;
  originalScheduledAt: string;
  facilityTimeZone?: string | null;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: { newScheduledAtIso: string; reasonCode: string; reasonDetail?: string }) => void;
};

export function MedicationDoseScheduleAdjustmentModal({
  open,
  medicationLabel,
  originalScheduledAt,
  facilityTimeZone = null,
  busy = false,
  error = null,
  onClose,
  onSubmit,
}: MedicationDoseScheduleAdjustmentModalProps) {
  const { t } = useI18n();
  const [newScheduledLocal, setNewScheduledLocal] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");

  useEffect(() => {
    if (!open) return;
    setNewScheduledLocal(
      toMarShiftTimelineDateTimeLocalValue(originalScheduledAt, facilityTimeZone) ||
        toMarShiftTimelineDateTimeLocalValue(new Date().toISOString(), facilityTimeZone)
    );
    setReasonCode("");
    setReasonDetail("");
  }, [open, originalScheduledAt, facilityTimeZone]);

  if (!open) return null;

  const handleSubmit = () => {
    const newScheduledAtIso =
      marShiftTimelineDateTimeLocalToUtcIso(newScheduledLocal, facilityTimeZone) ?? "";
    if (!newScheduledAtIso || !reasonCode.trim()) return;
    onSubmit({
      newScheduledAtIso,
      reasonCode: reasonCode.trim(),
      reasonDetail: reasonDetail.trim() || undefined,
    });
  };

  return (
    <div
      data-testid="mar-dose-schedule-adjustment-modal"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        zIndex: 2300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mar-dose-schedule-adjustment-title"
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          padding: "16px 18px",
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
        }}
      >
        <h2 id="mar-dose-schedule-adjustment-title" style={{ margin: "0 0 12px", fontSize: 16 }}>
          {t("marDoseScheduleAdjustment.title")}
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>{medicationLabel}</p>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          {t("marDoseScheduleAdjustment.originalScheduled")}
        </label>
        <p
          data-testid="mar-dose-schedule-adjustment-original"
          style={{ margin: "0 0 12px", fontSize: 13 }}
        >
          {toMarShiftTimelineDateTimeLocalValue(originalScheduledAt, facilityTimeZone) ||
            originalScheduledAt}
        </p>

        <label
          htmlFor="mar-dose-schedule-adjustment-new-time"
          style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}
        >
          {t("marDoseScheduleAdjustment.newScheduled")}
        </label>
        <input
          id="mar-dose-schedule-adjustment-new-time"
          data-testid="mar-dose-schedule-adjustment-new-time"
          type="datetime-local"
          value={newScheduledLocal}
          onChange={(e) => setNewScheduledLocal(e.target.value)}
          disabled={busy}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            fontSize: 14,
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        />

        <label
          htmlFor="mar-dose-schedule-adjustment-reason"
          style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}
        >
          {t("marDoseScheduleAdjustment.reasonLabel")}
        </label>
        <select
          id="mar-dose-schedule-adjustment-reason"
          data-testid="mar-dose-schedule-adjustment-reason"
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value)}
          disabled={busy}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            fontSize: 14,
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        >
          <option value="">{t("marDoseScheduleAdjustment.reasonPlaceholder")}</option>
          {MAR_MEDICATION_TIMING_OVERRIDE_REASON_CODES.map((code) => (
            <option key={code} value={code}>
              {t(`marTimingOverride.reason.${code}`)}
            </option>
          ))}
        </select>

        {reasonCode === "OTHER" ? (
          <>
            <label
              htmlFor="mar-dose-schedule-adjustment-detail"
              style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}
            >
              {t("marDoseScheduleAdjustment.detailLabel")}
            </label>
            <input
              id="mar-dose-schedule-adjustment-detail"
              data-testid="mar-dose-schedule-adjustment-detail"
              type="text"
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              disabled={busy}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 14,
                boxSizing: "border-box",
                marginBottom: 12,
              }}
            />
          </>
        ) : null}

        {error ? (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#b45309" }} role="alert">
            {error}
          </p>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            data-testid="mar-dose-schedule-adjustment-submit"
            onClick={handleSubmit}
            disabled={busy || !reasonCode.trim() || !newScheduledLocal.trim()}
          >
            {t("marDoseScheduleAdjustment.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
