"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";

export function OrderPriorityField({
  value,
  onChange,
}: {
  value: "ROUTINE" | "URGENT" | "STAT";
  onChange: (v: "ROUTINE" | "URGENT" | "STAT") => void;
}) {
  const { t } = useI18n();
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 12, color: "#333" }}>
        {t("encounterChrome.ordersTab.tableHeaderPriority")}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as "ROUTINE" | "URGENT" | "STAT")}
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14 }}
      >
        <option value="ROUTINE">{t("encounterChrome.orderPriorities.ROUTINE")}</option>
        <option value="URGENT">{t("encounterChrome.orderPriorities.URGENT")}</option>
        <option value="STAT">{t("encounterChrome.orderPriorities.STAT")}</option>
      </select>
    </div>
  );
}
