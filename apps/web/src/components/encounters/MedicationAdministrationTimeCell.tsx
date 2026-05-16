"use client";

import React from "react";
import { resolveMedicationAdministrationDisplayTimes, type MedicationAdministrationTimeFields } from "@/features/mar/medicationAdministrationEffectiveTimeDisplay";
import { MedicationAdministrationAdjustedBadge } from "@/components/encounters/MedicationAdministrationClockButton";

/** Date/time column — effective + documented times; clock lives in Controls column. */
export function MedicationAdministrationTimeCell({
  row,
  dateLocale,
  t,
  showPerformer,
}: {
  row: MedicationAdministrationTimeFields & {
    administeredBy?: { firstName: string; lastName: string };
  };
  dateLocale: string;
  t: (key: string) => string;
  showPerformer?: boolean;
}) {
  const displayTimes = resolveMedicationAdministrationDisplayTimes(row);
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
        {displayTimes.showAdjustedBadge ? (
          <MedicationAdministrationAdjustedBadge label={t("marTab.adminTime.adjustedBadgeLong")} />
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
