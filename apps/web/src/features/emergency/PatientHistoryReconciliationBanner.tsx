"use client";

import React from "react";
import type { PatientHistoryProfileDiff } from "@/features/emergency/patientClinicalHistoryProfile";
import type { PatientHistoryReconciliationResult } from "@/features/emergency/patientClinicalHistoryProfile";
import { useI18n } from "@/lib/i18n";

export function PatientHistoryReconciliationBanner({
  diffs,
  saveResult,
}: {
  diffs?: PatientHistoryProfileDiff[];
  saveResult?: PatientHistoryReconciliationResult | null;
}) {
  const { t } = useI18n();
  const messages: string[] = [];

  if (saveResult?.changedSections.length) {
    messages.push(t("erTriage.longitudinalHistory.profileUpdated"));
    for (const section of saveResult.changedSections) {
      const action = saveResult.sectionActions[section];
      if (action === "promoted") {
        messages.push(t("erTriage.longitudinalHistory.sectionPromoted").replace("{section}", section));
      }
      if (action === "removed") {
        messages.push(t("erTriage.longitudinalHistory.sectionRemovedFromProfile").replace("{section}", section));
      }
    }
  }

  if (diffs?.some((d) => d.kind === "differs")) {
    messages.push(t("erTriage.longitudinalHistory.encounterDiffersFromProfile"));
  }
  if (diffs?.some((d) => d.kind === "new_in_encounter")) {
    messages.push(t("erTriage.longitudinalHistory.newAllergyOrHistory"));
  }

  if (!messages.length) return null;

  return (
    <div
      role="note"
      data-testid="patient-history-reconciliation-banner"
      style={{
        marginBottom: 12,
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #bfdbfe",
        background: "#eff6ff",
        color: "#1e3a8a",
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      {messages.map((msg) => (
        <div key={msg}>{msg}</div>
      ))}
    </div>
  );
}
