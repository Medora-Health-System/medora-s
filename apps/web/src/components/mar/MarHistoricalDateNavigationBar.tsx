"use client";

import React from "react";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  addFacilityLocalDays,
  formatMarHistoricalDateLabel,
} from "@/lib/marHistoricalTimeline";
import { useI18n } from "@/lib/i18n";
import { CLINICAL_MIN_TOUCH_TARGET_PX } from "@/lib/clinicalViewport";

export type MarHistoricalDateNavigationBarProps = {
  selectedDateLocal: string;
  facilityTimeZone: string;
  isToday: boolean;
  compact?: boolean;
  onDateChange: (dateLocal: string) => void;
  onToday: () => void;
};

/** Top MAR toolbar row: previous / date / next (left) and Today (right). */
export function MarHistoricalDateNavigationBar({
  selectedDateLocal,
  facilityTimeZone,
  isToday,
  compact = false,
  onDateChange,
  onToday,
}: MarHistoricalDateNavigationBarProps) {
  const { t, language } = useI18n();
  const dateLabel = formatMarHistoricalDateLabel(
    selectedDateLocal,
    language,
    facilityTimeZone
  );

  const goPrevious = () => {
    onDateChange(addFacilityLocalDays(selectedDateLocal, -1, facilityTimeZone));
  };

  const goNext = () => {
    onDateChange(addFacilityLocalDays(selectedDateLocal, 1, facilityTimeZone));
  };

  return (
    <div
      data-testid="mar-historical-date-navigation"
      style={{
        ...MEDORA_CARD_SHELL,
        padding: compact ? "8px 10px" : "10px 12px",
        marginBottom: compact ? 8 : 10,
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            flex: 1,
            minWidth: 0,
          }}
        >
          <button
            type="button"
            data-testid="mar-historical-date-prev"
            aria-label={t("marHistorical.previousDay")}
            onClick={goPrevious}
            style={{
              minHeight: CLINICAL_MIN_TOUCH_TARGET_PX,
              minWidth: CLINICAL_MIN_TOUCH_TARGET_PX,
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
              fontSize: compact ? 13 : 14,
              color: "#334155",
            }}
          >
            {t("marHistorical.previousDay")}
          </button>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              minWidth: 0,
            }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                fontSize: compact ? 13 : 14,
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              <span className="sr-only">{t("marHistorical.datePickerLabel")}</span>
              <span data-testid="mar-historical-date-label" aria-hidden="true">
                {dateLabel}
              </span>
              <input
                type="date"
                data-testid="mar-historical-date-picker"
                value={selectedDateLocal}
                onChange={(event) => {
                  const next = event.target.value?.trim();
                  if (next) onDateChange(next);
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  background: "#fff",
                  minHeight: CLINICAL_MIN_TOUCH_TARGET_PX,
                }}
              />
            </label>
          </div>

          <button
            type="button"
            data-testid="mar-historical-date-next"
            aria-label={t("marHistorical.nextDay")}
            onClick={goNext}
            style={{
              minHeight: CLINICAL_MIN_TOUCH_TARGET_PX,
              minWidth: CLINICAL_MIN_TOUCH_TARGET_PX,
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
              fontSize: compact ? 13 : 14,
              color: "#334155",
            }}
          >
            {t("marHistorical.nextDay")}
          </button>
        </div>

        <button
          type="button"
          data-testid="mar-historical-today"
          aria-label={t("marHistorical.todayAriaLabel")}
          disabled={isToday}
          onClick={onToday}
          style={{
            minHeight: CLINICAL_MIN_TOUCH_TARGET_PX,
            padding: "6px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            background: isToday ? "#e2e8f0" : "#fff",
            cursor: isToday ? "default" : "pointer",
            fontSize: compact ? 13 : 14,
            fontWeight: 600,
            color: "#334155",
            flexShrink: 0,
          }}
        >
          {t("marHistorical.today")}
        </button>
      </div>
    </div>
  );
}
