"use client";

import React from "react";
import type { ObservationEncounterDisplayStatus } from "@medora/shared";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import type { SupportedLanguage } from "@/i18n/config";

const toneStyles = {
  discharged: { backgroundColor: "#dcfce7", borderColor: "#86efac", color: "#166534" },
  dischargeDoc: { backgroundColor: "#fef9c3", borderColor: "#fde047", color: "#854d0e" },
};

export function ObservationEncounterDisplayPill({
  status,
  t,
  language,
}: {
  status: ObservationEncounterDisplayStatus;
  t: (key: string) => string;
  language: SupportedLanguage;
}) {
  if (status.phase === "NOT_OBSERVATION" || status.phase === "ACTIVE") return null;

  if (status.phase === "DISCHARGED") {
    const when = status.closedOrDischargedAtIso
      ? formatEncounterChromeDateTime(status.closedOrDischargedAtIso, language)
      : null;
    const label = t("encounterChrome.observationWorkflow.displayStatus.dischargedObservation");
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 10px",
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 700,
          border: `1px solid ${toneStyles.discharged.borderColor}`,
          backgroundColor: toneStyles.discharged.backgroundColor,
          color: toneStyles.discharged.color,
        }}
        title={when ? `${label} — ${when}` : label}
      >
        {label}
        {status.dischargeMode ? (
          <span style={{ fontWeight: 500, marginLeft: 6, opacity: 0.9 }}>· {status.dischargeMode}</span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 700,
        border: `1px solid ${toneStyles.dischargeDoc.borderColor}`,
        backgroundColor: toneStyles.dischargeDoc.backgroundColor,
        color: toneStyles.dischargeDoc.color,
      }}
    >
      {t("encounterChrome.observationWorkflow.displayStatus.dischargeDocumented")}
    </span>
  );
}
