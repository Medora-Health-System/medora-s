"use client";

import React from "react";
import type { MedicationSearchItem } from "@/lib/pharmacyApi";
import { medicationSearchLabel } from "@/lib/pharmacyApi";
import { catalogMedicationNameForLocale } from "@/lib/orderItemDisplayFr";
import { useI18n } from "@/lib/i18n";

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
  const { language, t } = useI18n();
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
        {compact
          ? catalogMedicationNameForLocale(med, language)
          : medicationSearchLabel(med, language, t)}
      </span>
      {actionLabel && (
        <span style={{ color: "#666", fontSize: 12 }}>{actionLabel}</span>
      )}
    </button>
  );
}
