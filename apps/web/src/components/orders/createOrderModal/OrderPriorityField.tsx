"use client";

import React from "react";
import { getOrderPriorityLabelFr } from "@/lib/uiLabels";

export function OrderPriorityField({
  value,
  onChange,
}: {
  value: "ROUTINE" | "URGENT" | "STAT";
  onChange: (v: "ROUTINE" | "URGENT" | "STAT") => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 12, color: "#333" }}>
        Priorité
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as "ROUTINE" | "URGENT" | "STAT")}
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14 }}
      >
        <option value="ROUTINE">{getOrderPriorityLabelFr("ROUTINE")}</option>
        <option value="URGENT">{getOrderPriorityLabelFr("URGENT")}</option>
        <option value="STAT">{getOrderPriorityLabelFr("STAT")}</option>
      </select>
    </div>
  );
}
