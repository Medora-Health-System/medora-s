"use client";

import React from "react";
import type { MedicationSearchItem } from "@/lib/pharmacyApi";
import { MedicationCanonicalBadges } from "@/components/medication/MedicationCanonicalBadges";
import { getCatalogResultOneLineDisplay } from "@/lib/catalogDisplayLabel";
import { useI18n } from "@/lib/i18n";

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
  const { t, language } = useI18n();
  return (
    <>
      {items.map((med, idx) => {
        const isSelected = idx === selectedIndex;
        const badge = stockBadge?.(med);
        const oneLine = getCatalogResultOneLineDisplay(med, language, t);
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
            <div style={{ fontWeight: 500, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span>{oneLine.primary}</span>
              {oneLine.metadata ? (
                <span style={{ fontWeight: 400, fontSize: 11, color: "#64748b" }}>{oneLine.metadata}</span>
              ) : null}
              {med.isEssential && (
                <span style={{ fontSize: 11, color: "#1976d2" }}>
                  {t("pharmacyMedicationSearch.essentialBadge")}
                </span>
              )}
              {med.isFavorite && (
                <span style={{ fontSize: 12 }} aria-hidden>
                  ★
                </span>
              )}
            </div>
            {badge ? (
              <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>{badge}</div>
            ) : null}
            <MedicationCanonicalBadges item={med} />
          </button>
        );
      })}
    </>
  );
}
