"use client";

import React from "react";
import type { MarScheduleAdjustmentChainStep } from "@medora/shared";
import { resolveMarRescheduleReasonLabelKey, formatMarShiftTimelineClinicalDateTime } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { productUiBcp47Tag } from "@/i18n/config";

export type MedicationScheduleAdjustmentChainViewerProps = {
  steps: MarScheduleAdjustmentChainStep[];
  facilityTimeZone?: string | null;
};

function stepTitleKey(kind: MarScheduleAdjustmentChainStep["kind"]): string {
  if (kind === "ORIGINAL_SCHEDULED") return "marReschedule.chain.scheduled";
  if (kind === "ADMINISTERED") return "marReschedule.chain.administered";
  return "marReschedule.chain.changed";
}

export function MedicationScheduleAdjustmentChainViewer({
  steps,
  facilityTimeZone = null,
}: MedicationScheduleAdjustmentChainViewerProps) {
  const { t, language } = useI18n();
  const dateLocale = productUiBcp47Tag(language);

  if (steps.length === 0) return null;

  return (
    <div data-testid="mar-schedule-adjustment-chain-viewer" style={{ marginTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#334155" }}>
        {t("marReschedule.chain.title")}
      </div>
      <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {steps.map((step, index) => {
          const timeLabel = formatMarShiftTimelineClinicalDateTime(
            step.atIso,
            dateLocale,
            facilityTimeZone ?? undefined
          );
          const reasonKey = step.reasonCode
            ? resolveMarRescheduleReasonLabelKey(step.reasonCode)
            : null;
          const reasonLabel = reasonKey ? t(reasonKey) : step.reasonDetail?.trim() || null;

          return (
            <li key={`${step.kind}:${step.atIso}:${index}`} style={{ marginBottom: 4 }}>
              {index > 0 ? (
                <div
                  aria-hidden
                  style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, margin: "4px 0" }}
                >
                  ↓
                </div>
              ) : null}
              <div
                data-testid={`mar-schedule-adjustment-chain-step-${step.kind}`}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "8px 10px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                  {t(stepTitleKey(step.kind))}
                </div>
                <div style={{ fontSize: 13, marginTop: 4, color: "#0f172a" }}>{timeLabel}</div>
                {reasonLabel ? (
                  <div style={{ fontSize: 12, marginTop: 4, color: "#64748b" }}>{reasonLabel}</div>
                ) : null}
                {step.reviewRecommended ? (
                  <div
                    data-testid="mar-schedule-adjustment-chain-review"
                    style={{ fontSize: 11, marginTop: 6, fontWeight: 600, color: "#1d4ed8" }}
                  >
                    {t("marReschedule.reviewRecommended")}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
