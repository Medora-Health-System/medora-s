"use client";

import React from "react";
import type { MedicationSearchItem } from "@/lib/pharmacyApi";
import { medicationSearchLabel } from "@/lib/pharmacyApi";

const rowStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  textAlign: "left",
  border: "none",
  borderBottom: "1px solid #eee",
  backgroundColor: "transparent",
  cursor: "pointer",
  fontSize: 14,
};

export function MedicationSuggestionList({
  items,
  selectedIndex,
  onSelect,
  stockBadge,
}: {
  items: MedicationSearchItem[];
  selectedIndex: number;
  onSelect: (med: MedicationSearchItem) => void;
  stockBadge?: (med: MedicationSearchItem) => string | null;
}) {
  return (
    <>
      {items.map((med, idx) => {
        const isSelected = idx === selectedIndex;
        const badge = stockBadge?.(med);
        const meta = med.metadata;
        const sub = [meta?.dosageForm, meta?.route].filter(Boolean).join(" · ");
        return (
          <button
            key={med.id}
            type="button"
            onClick={() => onSelect(med)}
            style={{
              ...rowStyle,
              backgroundColor: isSelected ? "#f0f4ff" : undefined,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f5f5f5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isSelected ? "#f0f4ff" : "transparent";
            }}
          >
            <div style={{ fontWeight: 500 }}>
              {medicationSearchLabel(med)}
              {med.isEssential && (
                <span style={{ marginLeft: 6, fontSize: 11, color: "#1976d2" }}>Essentiel</span>
              )}
              {med.isFavorite && (
                <span style={{ marginLeft: 6, fontSize: 12 }} aria-hidden>
                  ★
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{sub || "—"}</div>
            {badge && (
              <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>{badge}</div>
            )}
          </button>
        );
      })}
    </>
  );
}
