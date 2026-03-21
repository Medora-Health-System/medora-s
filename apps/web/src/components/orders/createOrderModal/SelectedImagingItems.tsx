"use client";

import React from "react";
import type { CreateOrderLineItem } from "./types";

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 0",
  borderBottom: "1px solid #eee",
  fontSize: 14,
};

function metaLine(item: CreateOrderLineItem): string | null {
  const parts = [item._modality, item._bodyRegion, item.manualSecondaryText].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function SelectedImagingItems({
  items,
  onRemove,
}: {
  items: CreateOrderLineItem[];
  onRemove: (index: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Examens sélectionnés
      </div>
      <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0 }}>
        {items.map((item, idx) => {
          const meta = metaLine(item);
          return (
            <li key={item._lineId} style={rowStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, lineHeight: 1.35 }}>
                  {item._label}
                  {item.isManual && (
                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: "#1565c0" }}>
                      (saisie manuelle)
                    </span>
                  )}
                </div>
                {meta && (
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{meta}</div>
                )}
                {item.notes?.trim() ? (
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>Indication : {item.notes}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                style={{
                  fontSize: 12,
                  color: "#b00020",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  padding: "4px 0",
                }}
              >
                Retirer
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
