"use client";

import React, { useMemo } from "react";
import {
  MAR_MEDICATION_TIMING_OVERRIDE_REASON_CODES,
  resolveMarUniversalClinicalTime,
  type MarUniversalClinicalActionType,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  defaultMarClinicalDateTimeLocalValue,
  currentMarClinicalDateTimeLocalValue,
  marClinicalDateTimeLocalToUtcIso,
} from "@/features/mar/marUniversalMedicationActionTime";
import { toMarShiftTimelineDateTimeLocalValue } from "@/features/mar/marShiftTimelineDisplay";
import { productUiBcp47Tag } from "@/i18n/config";

export function MedicationClinicalDateTimeField({
  label,
  value,
  onChange,
  documentedAt,
  scheduledTime,
  currentScheduledTime,
  originalScheduledTime,
  actionType,
  facilityTimeZone,
  reasonCode,
  onReasonCodeChange,
  reasonDetail,
  onReasonDetailChange,
  required = false,
  disabled = false,
  showReasonWhenRequired = false,
  allowClear = false,
  testId = "mar-clinical-datetime-field",
}: {
  label: string;
  value: string;
  onChange: (localValue: string) => void;
  documentedAt: string;
  scheduledTime?: string | null;
  currentScheduledTime?: string | null;
  originalScheduledTime?: string | null;
  actionType: MarUniversalClinicalActionType;
  facilityTimeZone?: string | null;
  reasonCode?: string;
  onReasonCodeChange?: (code: string) => void;
  reasonDetail?: string;
  onReasonDetailChange?: (detail: string) => void;
  required?: boolean;
  disabled?: boolean;
  showReasonWhenRequired?: boolean;
  allowClear?: boolean;
  testId?: string;
}) {
  const { t, language } = useI18n();
  const dateLocale = productUiBcp47Tag(language);

  const clinicalIso = useMemo(
    () => marClinicalDateTimeLocalToUtcIso(value, facilityTimeZone),
    [value, facilityTimeZone]
  );

  const governance = useMemo(() => {
    if (!clinicalIso) return null;
    return resolveMarUniversalClinicalTime({
      actionType,
      scheduledTime,
      currentScheduledTime,
      originalScheduledTime,
      clinicalTime: clinicalIso,
      documentedAt,
      reasonCode,
      reasonDetail,
      facilityTimeZone,
    });
  }, [
    actionType,
    clinicalIso,
    currentScheduledTime,
    documentedAt,
    facilityTimeZone,
    originalScheduledTime,
    reasonCode,
    reasonDetail,
    scheduledTime,
  ]);

  const showReasonPanel =
    showReasonWhenRequired &&
    governance?.requiresReason === true &&
    onReasonCodeChange != null;

  const formatScheduleHint = (iso: string | null | undefined, key: string) => {
    if (!iso?.trim()) return null;
    const local = toMarShiftTimelineDateTimeLocalValue(iso, facilityTimeZone);
    if (!local) return null;
    const display = new Intl.DateTimeFormat(dateLocale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      ...(facilityTimeZone?.trim() ? { timeZone: facilityTimeZone.trim() } : {}),
    }).format(new Date(iso));
    return t(key).replace("{time}", display);
  };

  const handleNow = () => {
    onChange(currentMarClinicalDateTimeLocalValue(facilityTimeZone));
  };

  return (
    <div data-testid={testId} style={{ marginTop: 0 }}>
      <label
        htmlFor={`${testId}-input`}
        style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6 }}
      >
        {label}
        {required ? " *" : null}
      </label>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          id={`${testId}-input`}
          data-testid={`${testId}-input`}
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-required={required}
          style={{
            flex: "1 1 200px",
            minWidth: 0,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            fontSize: 14,
            boxSizing: "border-box",
            cursor: disabled ? "not-allowed" : "text",
          }}
        />
        <button
          type="button"
          data-testid={`${testId}-now`}
          onClick={handleNow}
          disabled={disabled}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontSize: 13,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {t("marClinicalTime.nowButton")}
        </button>
        {allowClear && value.trim() ? (
          <button
            type="button"
            data-testid={`${testId}-clear`}
            onClick={() => onChange("")}
            disabled={disabled}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              fontSize: 13,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {t("marClinicalTime.clearButton")}
          </button>
        ) : null}
      </div>
      <p
        data-testid={`${testId}-documented-at-help`}
        style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}
      >
        {t("marClinicalTime.documentedAtHelp")}
      </p>
      {formatScheduleHint(scheduledTime, "marClinicalTime.scheduledTime") ? (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>
          {formatScheduleHint(scheduledTime, "marClinicalTime.scheduledTime")}
        </p>
      ) : null}
      {formatScheduleHint(currentScheduledTime, "marClinicalTime.currentScheduledTime") ? (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>
          {formatScheduleHint(currentScheduledTime, "marClinicalTime.currentScheduledTime")}
        </p>
      ) : null}
      {formatScheduleHint(originalScheduledTime, "marClinicalTime.originalScheduledTime") ? (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>
          {formatScheduleHint(originalScheduledTime, "marClinicalTime.originalScheduledTime")}
        </p>
      ) : null}
      {showReasonPanel ? (
        <div style={{ marginTop: 12 }} data-testid={`${testId}-timing-reason`}>
          <label
            htmlFor={`${testId}-timing-reason-code`}
            style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6 }}
          >
            {t("marTimingOverride.reasonLabel")} *
          </label>
          <select
            id={`${testId}-timing-reason-code`}
            data-testid={`${testId}-timing-reason-code`}
            value={reasonCode ?? ""}
            onChange={(e) => onReasonCodeChange?.(e.target.value)}
            disabled={disabled}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 14,
              marginBottom: 8,
              boxSizing: "border-box",
            }}
          >
            <option value="">{t("marTimingOverride.reasonPlaceholder")}</option>
            {MAR_MEDICATION_TIMING_OVERRIDE_REASON_CODES.map((code) => (
              <option key={code} value={code}>
                {t(`marTimingOverride.reason.${code}`)}
              </option>
            ))}
          </select>
          {reasonCode === "OTHER" || governance?.reviewRecommended ? (
            <textarea
              data-testid={`${testId}-timing-reason-detail`}
              value={reasonDetail ?? ""}
              onChange={(e) => onReasonDetailChange?.(e.target.value)}
              disabled={disabled}
              rows={2}
              placeholder={t("marTimingOverride.detailPlaceholder")}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          ) : null}
          {!reasonCode?.trim() ? (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#b45309" }}>
              {t("marClinicalTime.reasonRequired")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
