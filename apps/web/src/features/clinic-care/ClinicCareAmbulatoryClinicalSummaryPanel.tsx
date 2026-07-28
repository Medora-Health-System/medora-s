/**
 * MEDUI.D4C.5 — Right-side clinical summary for ambulatory provider documentation.
 * Reuses EmergencyClinicalDataPanel (parameterized) — no parallel clinic summary engine.
 */

"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import { EmergencyClinicalDataPanel } from "@/features/emergency/EmergencyClinicalDataPanel";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

export function ClinicCareAmbulatoryClinicalSummaryPanel({
  encounterId,
  facilityId,
  facilityTimeZone,
}: {
  encounterId: string;
  facilityId: string;
  facilityTimeZone?: string | null;
}) {
  const { t } = useI18n();

  return (
    <aside
      data-testid="clinic-care-ambulatory-clinical-summary"
      style={{
        ...MEDORA_CARD_SHELL,
        padding: 10,
        position: "sticky",
        top: 8,
        maxHeight: "calc(100vh - 96px)",
        overflow: "auto",
      }}
    >
      <h3
        style={{
          margin: "0 0 8px",
          fontSize: 13,
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        {t("clinicCareD4c5.clinicalSummaryTitle")}
      </h3>
      <p style={{ margin: "0 0 10px", fontSize: 11, color: "#64748b" }}>
        {t("clinicCareD4c5.clinicalSummarySubtitle")}
      </p>
      <EmergencyClinicalDataPanel
        encounterId={encounterId}
        facilityId={facilityId}
        facilityTimeZone={facilityTimeZone}
      />
    </aside>
  );
}
