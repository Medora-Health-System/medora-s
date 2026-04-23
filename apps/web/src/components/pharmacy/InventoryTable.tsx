"use client";

import React from "react";
import type { InventoryItemRow } from "@/lib/pharmacyApi";
import { useI18n } from "@/lib/i18n";
import { catalogMedicationNameForLocale } from "@/lib/orderItemDisplayFr";

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
  const { t, language } = useI18n();
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : t("common.dash");

  return (
    <div style={{ overflowX: "auto", backgroundColor: "white", borderRadius: 4 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>{t("pharmacyInventoryTable.medication")}</th>
            <th style={th}>{t("pharmacyInventoryTable.code")}</th>
            <th style={th}>{t("pharmacyInventoryTable.reference")}</th>
            <th style={th}>{t("pharmacyInventoryTable.lot")}</th>
            <th style={th}>{t("pharmacyInventoryTable.expiration")}</th>
            <th style={th}>{t("pharmacyInventoryTable.onHand")}</th>
            <th style={th}>{t("pharmacyInventoryTable.reorder")}</th>
            <th style={th}>{t("pharmacyInventoryTable.unit")}</th>
            <th style={th}>{t("pharmacyInventoryTable.active")}</th>
            {showActions && <th style={th}>{t("pharmacyInventoryTable.actions")}</th>}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={showActions ? 10 : 9} style={{ ...td, color: "#666" }}>
                {t("pharmacyInventoryTable.empty")}
              </td>
            </tr>
          ) : (
            items.map((row) => (
              <tr key={row.id}>
                <td style={td}>
                  {catalogMedicationNameForLocale(row.catalogMedication ?? null, language) ||
                    row.catalogMedication?.code ||
                    "—"}
                </td>
                <td style={td}>{row.catalogMedication?.code ?? "—"}</td>
                <td style={td}>{row.sku}</td>
                <td style={td}>{row.lotNumber ?? "—"}</td>
                <td style={td}>{fmtDate(row.expirationDate)}</td>
                <td style={td}>{row.quantityOnHand}</td>
                <td style={td}>{row.reorderLevel}</td>
                <td style={td}>{row.unit ?? "—"}</td>
                <td style={td}>{row.isActive ? t("pharmacyInventoryTable.yes") : t("pharmacyInventoryTable.no")}</td>
                {showActions && (
                  <td style={td}>
                    <button
                      type="button"
                      onClick={() => onReceive?.(row.id)}
                      style={{ marginRight: 8, padding: "4px 10px", fontSize: 13 }}
                    >
                      {t("pharmacyInventoryTable.receive")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjust?.(row.id)}
                      style={{ padding: "4px 10px", fontSize: 13 }}
                    >
                      {t("pharmacyInventoryTable.adjust")}
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
