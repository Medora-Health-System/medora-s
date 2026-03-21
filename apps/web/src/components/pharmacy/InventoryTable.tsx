"use client";

import React from "react";
import type { InventoryItemRow } from "@/lib/pharmacyApi";

const th: React.CSSProperties = {
  padding: 12,
  textAlign: "left",
  borderBottom: "2px solid #ddd",
  fontSize: 13,
};
const td: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #eee",
  fontSize: 14,
};

export function InventoryTable({
  items,
  showActions,
  onReceive,
  onAdjust,
}: {
  items: InventoryItemRow[];
  showActions?: boolean;
  onReceive?: (id: string) => void;
  onAdjust?: (id: string) => void;
}) {
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : "—";

  return (
    <div style={{ overflowX: "auto", backgroundColor: "white", borderRadius: 4 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Médicament</th>
            <th style={th}>Code</th>
            <th style={th}>Référence</th>
            <th style={th}>Lot</th>
            <th style={th}>Péremption</th>
            <th style={th}>En stock</th>
            <th style={th}>Réappro.</th>
            <th style={th}>Unité</th>
            <th style={th}>Actif</th>
            {showActions && <th style={th}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={showActions ? 10 : 9} style={{ ...td, color: "#666" }}>
                Aucune ligne.
              </td>
            </tr>
          ) : (
            items.map((row) => (
              <tr key={row.id}>
                <td style={td}>{row.catalogMedication?.name ?? "—"}</td>
                <td style={td}>{row.catalogMedication?.code ?? "—"}</td>
                <td style={td}>{row.sku}</td>
                <td style={td}>{row.lotNumber ?? "—"}</td>
                <td style={td}>{fmtDate(row.expirationDate)}</td>
                <td style={td}>{row.quantityOnHand}</td>
                <td style={td}>{row.reorderLevel}</td>
                <td style={td}>{row.unit ?? "—"}</td>
                <td style={td}>{row.isActive ? "Oui" : "Non"}</td>
                {showActions && (
                  <td style={td}>
                    <button
                      type="button"
                      onClick={() => onReceive?.(row.id)}
                      style={{ marginRight: 8, padding: "4px 10px", fontSize: 13 }}
                    >
                      Réceptionner
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjust?.(row.id)}
                      style={{ padding: "4px 10px", fontSize: 13 }}
                    >
                      Ajuster
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
