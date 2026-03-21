"use client";

import React from "react";
import { usePharmacyFavorites } from "@/hooks/usePharmacyFavorites";
import { MedicationChip } from "./MedicationChip";
import type { MedicationSearchItem } from "@/lib/pharmacyApi";

const sectionStyle: React.CSSProperties = {
  marginBottom: 16,
};

const titleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#555",
  marginBottom: 8,
};

const chipsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

export function PharmacyFavorites({
  facilityId,
  onAddToStock,
  onDispense,
  compact = false,
  maxItems = 12,
}: {
  facilityId: string | null;
  onAddToStock?: (med: MedicationSearchItem) => void;
  onDispense?: (med: MedicationSearchItem) => void;
  compact?: boolean;
  maxItems?: number;
}) {
  const { items, loading, error } = usePharmacyFavorites(facilityId);
  const show = items.slice(0, maxItems);

  if (!facilityId || (items.length === 0 && !loading)) return null;
  if (error) return null;

  return (
    <div style={sectionStyle}>
      <div style={titleStyle}>Médicaments favoris</div>
      {loading ? (
        <div style={{ fontSize: 13, color: "#666" }}>Chargement…</div>
      ) : (
        <div style={chipsStyle}>
          {show.map((med) => (
            <span key={med.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <MedicationChip
                med={med}
                compact={compact}
                actionLabel={undefined}
                onClick={() => onAddToStock?.(med) ?? onDispense?.(med)}
              />
              {onAddToStock && (
                <button
                  type="button"
                  onClick={() => onAddToStock(med)}
                  style={{ padding: "4px 8px", fontSize: 12, border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", background: "#fff" }}
                >
                  Ajouter
                </button>
              )}
              {onDispense && (
                <button
                  type="button"
                  onClick={() => onDispense(med)}
                  style={{ padding: "4px 8px", fontSize: 12, border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", background: "#fff" }}
                >
                  Délivrer
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
