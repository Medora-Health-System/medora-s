// src/features/pathways/components/PathwayMilestoneRow.tsx
"use client";

import React from "react";
import type { MilestoneTimerView } from "../hooks/usePathwayTimers";

type Props = {
  milestone: MilestoneTimerView;
  pathwayStatus: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  onMarkMet: (milestoneId: string) => Promise<void> | void;
  /** Consultation fermée ou dossier signé : pas d’action sur les jalons. */
  pathwayControlsLocked?: boolean;
  isNextDue?: boolean;
  isFlashing?: boolean;
};

export const PathwayMilestoneRow = React.forwardRef<HTMLDivElement, Props>(
  (
    { milestone, pathwayStatus, onMarkMet, pathwayControlsLocked = false, isNextDue = false, isFlashing = false },
    ref
  ) => {
  const disabled =
    pathwayControlsLocked ||
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
    // Add ring for next due / flash
    outline: isFlashing ? "4px solid #f59e0b" : isNextDue ? "2px solid #fcd34d" : "none",
    outlineOffset: (isFlashing || isNextDue) ? 2 : 0,
    transition: isFlashing ? "outline 0.2s ease-in-out" : "outline 0.3s ease-in-out",
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
    <div ref={ref} style={rowStyles}>
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
            {milestone.uiStatus === "PENDING"
              ? "En attente"
              : milestone.uiStatus === "MET"
                ? "Atteint"
                : milestone.uiStatus === "WAIVED"
                  ? "Reporté"
                  : milestone.uiStatus === "CANCELLED"
                    ? "Annulé"
                    : milestone.uiStatus === "MISSED"
                      ? "Manqué"
                      : "—"}
          </span>
          {milestone.overdue && milestone.uiStatus === "PENDING" && (
            <span style={{ fontSize: 12, fontWeight: 500, color: "#be123c" }}>EN RETARD</span>
          )}
          {milestone.uiStatus === "MET" && milestone.metOnTime === false && (
            <span style={{ fontSize: 12, fontWeight: 500, color: "#be123c" }}>Atteint en retard</span>
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
          Marquer atteint
        </button>
      </div>
    </div>
  );
});

PathwayMilestoneRow.displayName = "PathwayMilestoneRow";

