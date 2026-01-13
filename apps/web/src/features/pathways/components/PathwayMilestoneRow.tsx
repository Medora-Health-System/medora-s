// src/features/pathways/components/PathwayMilestoneRow.tsx
"use client";

import React from "react";
import type { MilestoneTimerView } from "../hooks/usePathwayTimers";

type Props = {
  milestone: MilestoneTimerView;
  pathwayStatus: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  onMarkMet: (milestoneId: string) => Promise<void> | void;
};

export function PathwayMilestoneRow({ milestone, pathwayStatus, onMarkMet }: Props) {
  const disabled =
    pathwayStatus !== "ACTIVE" ||
    milestone.uiStatus === "MET" ||
    milestone.uiStatus === "WAIVED" ||
    milestone.uiStatus === "CANCELLED";

  // Convert Tailwind classes to inline styles
  const rowStyles: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 6,
    padding: 12,
    backgroundColor: milestone.rowClass.includes("emerald") ? "#ecfdf5" :
                     milestone.rowClass.includes("amber") ? "#fffbeb" :
                     milestone.rowClass.includes("rose") ? "#fff1f2" :
                     "#f9fafb",
  };

  const badgeStyles: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 12,
    fontWeight: 500,
    backgroundColor: milestone.badgeClass.includes("emerald") ? "#d1fae5" :
                     milestone.badgeClass.includes("amber") ? "#fef3c7" :
                     milestone.badgeClass.includes("rose") ? "#ffe4e6" :
                     "#e5e7eb",
    color: milestone.badgeClass.includes("emerald") ? "#065f46" :
           milestone.badgeClass.includes("amber") ? "#92400e" :
           milestone.badgeClass.includes("rose") ? "#991b1b" :
           "#374151",
  };

  return (
    <div style={rowStyles}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {milestone.name}
          </div>
        </div>
        {milestone.description && (
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{milestone.description}</div>
        )}
        <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={badgeStyles}>
            {milestone.uiStatus}
          </span>
          {milestone.overdue && milestone.uiStatus === "PENDING" && (
            <span style={{ fontSize: 12, fontWeight: 500, color: "#be123c" }}>OVERDUE</span>
          )}
          {milestone.uiStatus === "MET" && milestone.metOnTime === false && (
            <span style={{ fontSize: 12, fontWeight: 500, color: "#be123c" }}>MET LATE</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 14, fontWeight: 600, minWidth: 60, textAlign: "right" }}>
          {milestone.remainingLabel}
        </div>
        <button
          type="button"
          style={{
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 14,
            fontWeight: 500,
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            backgroundColor: disabled ? "#e5e7eb" : "#000",
            color: disabled ? "#6b7280" : "#fff",
            opacity: disabled ? 0.6 : 1,
          }}
          disabled={disabled}
          onClick={() => onMarkMet(milestone.id)}
        >
          Mark Met
        </button>
      </div>
    </div>
  );
}

