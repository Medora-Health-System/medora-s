"use client";

import React from "react";
import {
  canShowMedicationAdministrationTimeClock,
  resolveMedicationAdministrationDisplayTimes,
  type MedicationAdministrationTimeFields,
} from "@/features/mar/medicationAdministrationEffectiveTimeDisplay";

export function MedicationAdministrationTimeCell({
  row,
  encounterOpen,
  canAdjust,
  dateLocale,
  t,
  onAdjustClick,
  showPerformer,
}: {
  row: MedicationAdministrationTimeFields & {
    administeredBy?: { firstName: string; lastName: string };
  };
  encounterOpen: boolean;
  canAdjust: boolean;
  dateLocale: string;
  t: (key: string) => string;
  onAdjustClick: () => void;
  showPerformer?: boolean;
}) {
  const displayTimes = resolveMedicationAdministrationDisplayTimes(row);
  const showClock = canShowMedicationAdministrationTimeClock(row, { encounterOpen, canAdjust });
  const timeLabel = displayTimes.effectiveIso
    ? new Date(displayTimes.effectiveIso).toLocaleString(dateLocale)
    : t("common.dash");

  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
          color: "#555",
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>
          {timeLabel}
          {showPerformer && row.administeredBy
            ? ` · ${row.administeredBy.firstName} ${row.administeredBy.lastName}`
            : null}
        </span>
        {showClock ? (
          <button
            type="button"
            title={t("marTab.adminTime.adjustTooltip")}
            aria-label={t("marTab.adminTime.adjustTooltip")}
            onClick={onAdjustClick}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "0 2px",
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            🧭
          </button>
        ) : null}
        {displayTimes.showAdjustedBadge ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 9999,
              background: "#fef3c7",
              color: "#92400e",
              border: "1px solid #fcd34d",
            }}
          >
            {t("marTab.adminTime.adjustedBadgeLong")}
          </span>
        ) : null}
      </div>
      {displayTimes.documentedSystemIso ? (
        <div style={{ color: "#94a3b8", marginTop: 4, fontSize: 12 }}>
          {t("marTab.adminTime.documentedAt").replace(
            "{when}",
            new Date(displayTimes.documentedSystemIso).toLocaleString(dateLocale)
          )}
        </div>
      ) : null}
    </>
  );
}
