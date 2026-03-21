// src/features/pathways/components/PathwaySessionSummary.tsx
"use client";

import React from "react";
import type { PathwaySessionSummary } from "../hooks/usePathwayTimers";
import { ui } from "@/lib/uiLabels";

export function PathwaySessionSummaryBar({
  summary,
  pathwayStatus,
  onJumpToNextDue,
}: {
  summary: PathwaySessionSummary;
  pathwayStatus: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  onJumpToNextDue?: () => void;
}) {
  return (
    <div style={{ marginTop: 12, borderRadius: 8, border: "1px solid #e5e7eb", backgroundColor: "white", padding: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 14 }}>
          <span style={{ fontWeight: 600 }}>Jalons</span>
          <span style={{ borderRadius: 4, backgroundColor: "#f3f4f6", padding: "2px 8px" }}>Total : {summary.total}</span>
          <span style={{ borderRadius: 4, backgroundColor: "#d1fae5", padding: "2px 8px", color: "#065f46" }}>
            Atteint : {summary.met}
          </span>
          <span style={{ borderRadius: 4, backgroundColor: "#fef3c7", padding: "2px 8px", color: "#92400e" }}>
            En attente : {summary.pending}
          </span>
          <span style={{ borderRadius: 4, backgroundColor: "#ffe4e6", padding: "2px 8px", color: "#991b1b" }}>
            En retard : {summary.overdue}
          </span>
          {summary.missed > 0 && (
            <span style={{ borderRadius: 4, backgroundColor: "#ffe4e6", padding: "2px 8px", color: "#991b1b" }}>
              Manqué : {summary.missed}
            </span>
          )}
          {summary.waivedOrCancelled > 0 && (
            <span style={{ borderRadius: 4, backgroundColor: "#e5e7eb", padding: "2px 8px", color: "#374151" }}>
              Reporté/Annulé : {summary.waivedOrCancelled}
            </span>
          )}
        </div>

        <div style={{ fontSize: 14 }}>
          <span style={{ color: "#6b7280" }}>Écoulé :</span>{" "}
          <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{summary.elapsedLabel}</span>
          <span style={{ marginLeft: 8, borderRadius: 4, backgroundColor: "#f3f4f6", padding: "2px 8px", fontSize: 12 }}>
            {pathwayStatus === "ACTIVE"
              ? "Actif"
              : pathwayStatus === "PAUSED"
                ? "En pause"
                : pathwayStatus === "COMPLETED"
                  ? "Terminé"
                  : pathwayStatus === "CANCELLED"
                    ? "Annulé"
                    : "—"}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 14 }}>
        {summary.nextDue ? (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#6b7280" }}>Prochain jalon :</span>
            <span
              style={{
                borderRadius: 12,
                padding: "2px 8px",
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: summary.nextDue.remainingSeconds < 0 ? "#fee2e2" : "#fef3c7",
                color: summary.nextDue.remainingSeconds < 0 ? "#991b1b" : "#92400e",
              }}
            >
              {ui.pathway.nextMilestoneBadge}
            </span>
            <span style={{ fontWeight: 500 }}>
              {summary.nextDue.name}{" "}
              {summary.nextDue.code && (
                <span style={{ fontSize: 12, color: "#6b7280" }}>({summary.nextDue.code})</span>
              )}
            </span>
            <span
              style={{
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 12,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                backgroundColor: summary.nextDue.remainingSeconds < 0 ? "#ffe4e6" : "#fef3c7",
                color: summary.nextDue.remainingSeconds < 0 ? "#991b1b" : "#92400e",
              }}
            >
              {summary.nextDue.remainingLabel}
            </span>
            {onJumpToNextDue && (
              <button
                type="button"
                onClick={onJumpToNextDue}
                style={{
                  marginLeft: "auto",
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
                  color: "#374151",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                }}
              >
                Aller au prochain jalon
              </button>
            )}
          </div>
        ) : (
          <div style={{ color: "#6b7280" }}>Plus aucun jalon en attente.</div>
        )}
      </div>
    </div>
  );
}

