"use client";

import React from "react";
import type { AdvancedMedicationSafetyWarning } from "@medora/shared";
import { useI18n } from "@/lib/i18n";

function severityBorder(sev: AdvancedMedicationSafetyWarning["severity"]): string {
  if (sev === "critical") return "#ef4444";
  if (sev === "warning") return "#f59e0b";
  return "#94a3b8";
}

function severityBackground(sev: AdvancedMedicationSafetyWarning["severity"]): string {
  if (sev === "critical") return "#fef2f2";
  if (sev === "warning") return "#fffbeb";
  return "#f8fafc";
}

export function AdvancedMedicationSafetyPanel({
  warnings,
  density = "default",
}: {
  warnings: AdvancedMedicationSafetyWarning[];
  density?: "default" | "compact";
}) {
  const { t } = useI18n();
  if (warnings.length === 0) return null;

  const heading =
    density === "compact" ? t("advancedMedicationSafety.panelTitleInline") : t("advancedMedicationSafety.panelTitle");
  const sub = density === "compact" ? null : t("advancedMedicationSafety.panelSubtitle");

  return (
    <div
      role="status"
      style={{
        marginTop: density === "compact" ? 8 : 10,
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid #cbd5e1",
        backgroundColor: "#f8fafc",
        fontSize: density === "compact" ? 12 : 13,
        color: "#334155",
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: sub ? 4 : 6, color: "#0f172a" }}>{heading}</div>
      {sub ? (
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{sub}</div>
      ) : null}
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {warnings.map((w) => {
          const msgKey = `advancedMedicationSafety.messages.${w.messageKey}`;
          const msg = t(msgKey);
          const text = msg === msgKey ? t("advancedMedicationSafety.messageFallback").replace("{key}", w.messageKey) : msg;
          const sevLabelKey = `advancedMedicationSafety.severityLabel.${w.severity}`;
          const sevLabelRaw = t(sevLabelKey);
          const sevLabel = sevLabelRaw === sevLabelKey ? w.severity : sevLabelRaw;
          const catKey = `advancedMedicationSafety.categoryTag.${w.category}`;
          const catRaw = t(catKey);
          const catLabel = catRaw === catKey ? w.category : catRaw;
          return (
            <li
              key={`${w.category}-${w.messageKey}-${w.severity}`}
              style={{
                marginBottom: 6,
                padding: "6px 8px",
                borderRadius: 6,
                border: `1px solid ${severityBorder(w.severity)}`,
                backgroundColor: severityBackground(w.severity),
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.02em", color: "#0f172a" }}>{sevLabel}</span>
              <span style={{ color: "#94a3b8" }}> · </span>
              <span style={{ fontWeight: 600, fontSize: 11, color: "#475569" }}>{catLabel}</span>
              <div style={{ marginTop: 4 }}>{text}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
