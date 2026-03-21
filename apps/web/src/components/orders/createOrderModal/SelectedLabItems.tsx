"use client";

import React from "react";
import type { CreateOrderLineItem } from "./types";

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 0",
  borderBottom: "1px solid #eee",
  fontSize: 14,
};

export function SelectedLabItems({
  items,
  onRemove,
  listHeading = "Analyses sélectionnées",
}: {
  items: CreateOrderLineItem[];
  onRemove: (index: number) => void;
  /** Surcharge du titre (ex. onglet soins). */
  listHeading?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {listHeading}
      </div>
      <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0 }}>
        {items.map((item, idx) => (
          <li key={item._lineId} style={rowStyle}>
            <span style={{ flex: 1, lineHeight: 1.35 }}>
              {item._label}
              {item.isManual && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#1565c0",
                    verticalAlign: "middle",
                  }}
                >
                  (saisie manuelle)
                </span>
              )}
              {item.notes?.trim() ? (
                <span style={{ display: "block", fontSize: 12, color: "#666", marginTop: 4, fontWeight: 400 }}>
                  {item.notes}
                </span>
              ) : null}
            </span>
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
        ))}
      </ul>
    </div>
  );
}
