"use client";

import React from "react";
import {
  MedicationAdministrationAdjustedBadge,
  MedicationAdministrationClockButton,
} from "@/components/encounters/MedicationAdministrationClockButton";
import { resolveLabRadMilestoneDisplay } from "@/features/orders/labRadiologyEffectiveTimeDisplay";

export function LabRadiologyEffectiveTimeRow({
  label,
  documentedAt,
  effectiveAt,
  version,
  dateLocale,
  canAdjust,
  onAdjust,
  t,
}: {
  label: string;
  documentedAt: string | Date | null | undefined;
  effectiveAt: string | Date | null | undefined;
  version: number;
  dateLocale: string;
  canAdjust: boolean;
  onAdjust: () => void;
  t: (key: string) => string;
}) {
  const display = resolveLabRadMilestoneDisplay({ documentedAt, effectiveAt, version });
  if (!display.documentedIso) return null;

  const formatWhen = (iso: string) => new Date(iso).toLocaleString(dateLocale);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: 8,
        marginTop: 6,
        fontSize: 13,
      }}
    >
      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        {display.showDualLabels ? (
          <>
            <div>
              <span style={{ fontWeight: 600, color: "#475569" }}>{t("labRadTime.historyClinicalLabel")}:</span>{" "}
              {formatWhen(display.clinicalIso!)}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              <span style={{ fontWeight: 600 }}>{t("labRadTime.historyDocumentedLabel")}:</span>{" "}
              {formatWhen(display.documentedIso)}
            </div>
          </>
        ) : (
          <div>
            <span style={{ fontWeight: 600, color: "#475569" }}>{label}:</span>{" "}
            {formatWhen(display.clinicalIso!)}
          </div>
        )}
        {display.showAdjustedBadge ? (
          <span style={{ marginLeft: 6 }}>
            <MedicationAdministrationAdjustedBadge
              label={t("labRadTime.adjustedBadge")}
              title={t("labRadTime.adjustedBadgeTooltip")}
            />
          </span>
        ) : null}
      </div>
      {canAdjust ? (
        <MedicationAdministrationClockButton
          enabled
          title={t("labRadTime.adjustCardTooltip")}
          onClick={onAdjust}
        />
      ) : null}
    </div>
  );
}
