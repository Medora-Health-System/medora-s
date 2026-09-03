"use client";

import React from "react";
import { resolveMarMedicationTimingOverrideReasonLabelKey } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { formatMarShiftTimelineClinicalDateTime } from "@medora/shared";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";
import { productUiBcp47Tag } from "@/i18n/config";

export type MedicationTimingOverrideJustificationPanelProps = {
  item: MarShiftTimelineCellItem;
  facilityTimeZone?: string | null;
};

export function MedicationTimingOverrideJustificationPanel({
  item,
  facilityTimeZone = null,
}: MedicationTimingOverrideJustificationPanelProps) {
  const { t, language } = useI18n();
  const dateLocale = productUiBcp47Tag(language);

  const variance = item.administrationVariance;
  const reschedule = item.scheduleAdjustment;
  const showReschedule = reschedule?.isRescheduled === true;
  const showVariance = variance?.hasVariance === true;

  if (!showReschedule && !showVariance) return null;

  const formatTime = (iso: string | null | undefined) =>
    iso?.trim()
      ? formatMarShiftTimelineClinicalDateTime(iso, dateLocale, facilityTimeZone ?? undefined)
      : null;

  const rescheduleReasonKey = showReschedule
    ? resolveMarMedicationTimingOverrideReasonLabelKey(reschedule?.lastReasonCode)
    : null;
  const rescheduleReasonLabel = rescheduleReasonKey
    ? t(rescheduleReasonKey)
    : reschedule?.lastReasonDetail?.trim() || null;

  const varianceReasonKey = variance?.reasonCode
    ? resolveMarMedicationTimingOverrideReasonLabelKey(variance.reasonCode)
    : null;
  const varianceReasonLabel = varianceReasonKey ? t(varianceReasonKey) : null;

  const classificationKey =
    variance?.classification != null
      ? `marAdministrationVariance.classification.${variance.classification}`
      : variance?.badgeLabel === "EARLY"
        ? "marAdministrationVariance.classification.EARLY_ADMINISTRATION"
        : variance?.badgeLabel === "LATE"
          ? "marAdministrationVariance.classification.LATE_ADMINISTRATION"
          : variance?.badgeLabel === "ON_TIME"
            ? "marAdministrationVariance.classification.ON_TIME_ADMINISTRATION"
            : null;

  const severityKey =
    variance?.severity != null ? `marAdministrationVariance.severity.${variance.severity}` : null;

  return (
    <div
      data-testid="mar-timing-override-justification-panel"
      style={{
        marginTop: 12,
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        backgroundColor: "#f8fafc",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
        {t("marTimingOverride.panel.title")}
      </div>

      {showReschedule ? (
        <div data-testid="mar-timing-override-reschedule-section">
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8" }}>
            {t("marReschedule.badge")}
          </div>
          {rescheduleReasonLabel ? (
            <div style={{ fontSize: 12, marginTop: 4, color: "#64748b" }}>
              {t("marTimingOverride.panel.reason")}: {rescheduleReasonLabel}
            </div>
          ) : null}
          {reschedule?.lastReasonDetail?.trim() ? (
            <div style={{ fontSize: 12, marginTop: 2, color: "#64748b" }}>
              {t("marTimingOverride.panel.detail")}: {reschedule.lastReasonDetail.trim()}
            </div>
          ) : null}
          {reschedule?.lastChangedByDisplay?.trim() ? (
            <div style={{ fontSize: 12, marginTop: 2, color: "#64748b" }}>
              {t("marTimingOverride.panel.by")}: {reschedule.lastChangedByDisplay.trim()}
            </div>
          ) : null}
          {reschedule?.lastChangedAt ? (
            <div style={{ fontSize: 12, marginTop: 2, color: "#64748b" }}>
              {t("marTimingOverride.panel.when")}: {formatTime(reschedule.lastChangedAt)}
            </div>
          ) : null}
        </div>
      ) : null}

      {showVariance ? (
        <div
          data-testid="mar-timing-override-variance-section"
          style={{ marginTop: showReschedule ? 10 : 0 }}
        >
          <div
            data-testid="mar-variance-panel-heading"
            style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}
          >
            {t("marTimingOverride.panel.varianceTitle")}
          </div>
          {classificationKey ? (
            <div
              data-testid="mar-variance-classification"
              style={{ fontSize: 12, marginTop: 6, color: "#64748b" }}
            >
              {t("marTimingOverride.panel.classification")}: {t(classificationKey)}
            </div>
          ) : null}
          {variance?.varianceMinutes != null ? (
            <div
              data-testid="mar-variance-minutes"
              style={{ fontSize: 12, marginTop: 4, color: "#64748b" }}
            >
              {t("marAdministrationVariance.timeline.variance")}:{" "}
              {variance.varianceMinutes > 0 ? "+" : ""}
              {variance.varianceMinutes} {t("marTimingOverride.panel.minutesUnit")}
            </div>
          ) : null}
          <div style={{ fontSize: 12, marginTop: 4, color: "#64748b" }}>
            {t("marAdministrationVariance.timeline.scheduled")}:{" "}
            {formatTime(variance?.scheduledAt ?? variance?.effectiveScheduledAt)}
          </div>
          <div style={{ fontSize: 12, marginTop: 2, color: "#64748b" }}>
            {t("marTimingOverride.panel.administered")}:{" "}
            {formatTime(variance?.administeredAt ?? variance?.actualAdministrationAt)}
          </div>
          {varianceReasonLabel ? (
            <div
              data-testid="mar-variance-reason"
              style={{ fontSize: 12, marginTop: 4, color: "#64748b" }}
            >
              {t("marTimingOverride.panel.reason")}: {varianceReasonLabel}
            </div>
          ) : null}
          {variance?.reasonDetail?.trim() ? (
            <div
              data-testid="mar-variance-reason-detail"
              style={{ fontSize: 12, marginTop: 2, color: "#64748b" }}
            >
              {t("marTimingOverride.panel.detail")}: {variance.reasonDetail.trim()}
            </div>
          ) : null}
          {variance?.performedByDisplay?.trim() ? (
            <div
              data-testid="mar-variance-performer"
              style={{ fontSize: 12, marginTop: 4, color: "#64748b" }}
            >
              {t("marTimingOverride.panel.administeredBy")}: {variance.performedByDisplay.trim()}
            </div>
          ) : null}
          {variance?.performedAt ? (
            <div
              data-testid="mar-variance-performed-at"
              style={{ fontSize: 12, marginTop: 2, color: "#64748b" }}
            >
              {t("marTimingOverride.panel.administeredAt")}: {formatTime(variance.performedAt)}
            </div>
          ) : null}
          {severityKey ? (
            <div
              data-testid="mar-variance-severity"
              style={{ fontSize: 12, marginTop: 4, color: "#64748b" }}
            >
              {t("marTimingOverride.panel.risk")}: {t(severityKey)}
            </div>
          ) : null}
          {variance?.severity === "HIGH" ? (
            <div
              data-testid="mar-variance-high-risk"
              style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: "#b45309" }}
            >
              {t("marTimingOverride.panel.highRiskOverride")}
            </div>
          ) : null}
          {variance?.reviewRecommended ? (
            <div
              data-testid="mar-timing-override-review-recommended"
              style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: "#1d4ed8" }}
            >
              {t("marTimingOverride.reviewRecommended")}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
