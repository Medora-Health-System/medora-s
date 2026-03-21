"use client";

import React from "react";
import type { OrderModalTab } from "./types";

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "8px 14px",
  border: "none",
  backgroundColor: active ? "#1a1a1a" : "transparent",
  color: active ? "white" : "#555",
  cursor: "pointer",
  borderRadius: 4,
  fontSize: 13,
  fontWeight: active ? 600 : 500,
});

export function OrderTypeTabs({
  orderTypes,
  activeTab,
  onChange,
}: {
  orderTypes: OrderModalTab[];
  activeTab: OrderModalTab;
  onChange: (tab: OrderModalTab) => void;
}) {
  const label = (t: OrderModalTab) =>
    t === "LAB" ? "Analyses" : t === "IMAGING" ? "Imagerie" : "Médicaments";

  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 6,
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: "1px solid #e5e5e5",
      }}
    >
      {orderTypes.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          onClick={() => onChange(tab)}
          style={tabBtn(activeTab === tab)}
        >
          {label(tab)}
        </button>
      ))}
    </div>
  );
}
