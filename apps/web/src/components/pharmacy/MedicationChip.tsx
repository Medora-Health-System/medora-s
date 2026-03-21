"use client";

import React from "react";
import type { MedicationSearchItem } from "@/lib/pharmacyApi";
import { medicationSearchLabel } from "@/lib/pharmacyApi";

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 20,
  border: "1px solid #ddd",
  backgroundColor: "#fafafa",
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export function MedicationChip({
  med,
  onClick,
  actionLabel,
  compact,
}: {
  med: MedicationSearchItem;
  onClick: () => void;
  actionLabel?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={chipStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#f0f0f0";
        e.currentTarget.style.borderColor = "#ccc";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#fafafa";
        e.currentTarget.style.borderColor = "#ddd";
      }}
    >
      <span style={{ fontWeight: 500 }}>
        {compact ? med.displayNameFr : medicationSearchLabel(med)}
      </span>
      {actionLabel && (
        <span style={{ color: "#666", fontSize: 12 }}>{actionLabel}</span>
      )}
    </button>
  );
}
