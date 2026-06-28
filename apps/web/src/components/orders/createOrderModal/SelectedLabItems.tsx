"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import { careOrderClinicalDetailLines } from "@/lib/careOrderDisplayUi";
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
  listHeading,
}: {
  items: CreateOrderLineItem[];
  onRemove: (index: number) => void;
  /** Override list title (e.g. care tab). */
  listHeading?: string;
}) {
  const { t, language } = useI18n();
  const heading = listHeading ?? t("createOrderModal.selectedLabDefaultHeading");

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {heading}
      </div>
      <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0 }}>
        {items.map((item, idx) => {
          const detailLines =
            item.catalogItemType === "CARE"
              ? careOrderClinicalDetailLines(
                  {
                    catalogItemType: "CARE",
                    enterpriseProcedureId: item._enterpriseProcedureId,
                    manualLabel: item.manualLabel ?? item._label,
                    notes: item.notes,
                  },
                  language
                )
              : item.notes?.trim()
                ? [item.notes.trim()]
                : [];
          return (
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
                  {t("createOrderModal.selectedManualBadge")}
                </span>
              )}
              {detailLines.map((line) => (
                <span
                  key={line}
                  style={{ display: "block", fontSize: 12, color: "#666", marginTop: 4, fontWeight: 400 }}
                >
                  {line}
                </span>
              ))}
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
              {t("createOrderModal.selectedRowRemove")}
            </button>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
