"use client";

import React from "react";
import {
  resolveMedicationAdministrationDisplayTimes,
  type MedicationAdministrationTimeFields,
} from "@/features/mar/medicationAdministrationEffectiveTimeDisplay";
import { MedicationAdministrationAdjustedBadge } from "@/components/encounters/MedicationAdministrationClockButton";
import { MedicationAdministrationInfusionPhaseChip } from "@/components/encounters/MedicationAdministrationInfusionPhaseChip";
import { formatClinicalInstantForFacility } from "@/lib/clinicalTimeDisplay";
import type { SupportedLanguage } from "@/i18n/config";

/** Date/time column — clinical + documented times when adjusted; clock lives in Controls column. */
export function MedicationAdministrationTimeCell({
  row,
  facilityTimeZone,
  language,
  t,
  showPerformer,
}: {
  row: MedicationAdministrationTimeFields & {
    administeredBy?: { firstName: string; lastName: string };
    infusionPhase?: string | null;
  };
  facilityTimeZone: string | null | undefined;
  language: SupportedLanguage;
  t: (key: string) => string;
  showPerformer?: boolean;
}) {
  const displayTimes = resolveMedicationAdministrationDisplayTimes(row);
  const performerSuffix =
    showPerformer && row.administeredBy
      ? ` · ${row.administeredBy.firstName} ${row.administeredBy.lastName}`
      : "";

  const formatWhen = (iso: string) =>
    formatClinicalInstantForFacility(iso, facilityTimeZone, language);

  if (displayTimes.showDualTimeLabels) {
    return (
      <>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            color: "#334155",
            fontSize: 13,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            <span style={{ whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 600, color: "#475569" }}>
                {t("marTab.adminTime.historyClinicalLabel")}:
              </span>{" "}
              {formatWhen(displayTimes.effectiveIso)}
              {performerSuffix}
            </span>
            <MedicationAdministrationInfusionPhaseChip row={row} t={t} />
            <MedicationAdministrationAdjustedBadge
              label={t("marTab.adminTime.adjustedBadge")}
              title={t("marTab.adminTime.adjustedBadgeTooltip")}
            />
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            <span style={{ fontWeight: 600 }}>{t("marTab.adminTime.historyDocumentedLabel")}:</span>{" "}
            {formatWhen(displayTimes.originalAdministeredIso)}
          </div>
        </div>
        {displayTimes.documentedSystemIso &&
        displayTimes.documentedSystemIso !== displayTimes.originalAdministeredIso ? (
          <div style={{ color: "#94a3b8", marginTop: 4, fontSize: 11 }}>
            {t("marTab.adminTime.documentedAt").replace(
              "{when}",
              formatWhen(displayTimes.documentedSystemIso)
            )}
          </div>
        ) : null}
      </>
    );
  }

  const timeLabel = displayTimes.effectiveIso
    ? formatWhen(displayTimes.effectiveIso)
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
          {performerSuffix}
        </span>
        <MedicationAdministrationInfusionPhaseChip row={row} t={t} />
        {displayTimes.showAdjustedBadge ? (
          <MedicationAdministrationAdjustedBadge
            label={t("marTab.adminTime.adjustedBadge")}
            title={t("marTab.adminTime.adjustedBadgeTooltip")}
          />
        ) : null}
      </div>
      {displayTimes.documentedSystemIso ? (
        <div style={{ color: "#94a3b8", marginTop: 4, fontSize: 12 }}>
          {t("marTab.adminTime.documentedAt").replace(
            "{when}",
            formatWhen(displayTimes.documentedSystemIso)
          )}
        </div>
      ) : null}
    </>
  );
}
