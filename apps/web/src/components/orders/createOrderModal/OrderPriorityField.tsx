"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";

const CREATE_ORDER_PRESENTATION_CLEANUP_CSS = `
form:has([data-testid="create-order-priority-field"]) > div:has(> textarea[rows="2"]) {
  display: none !important;
}

form:has([data-testid="create-order-priority-field"]) [data-testid="enterprise-order-set-browser"] > p {
  display: none !important;
}

form:has([data-testid="create-order-priority-field"]) div[role="group"][aria-label] {
  display: none !important;
}

form:has([data-testid="create-order-priority-field"]) div[role="status"]:has(> ul) {
  display: none !important;
}
`;

export function OrderPriorityField({
  value,
  onChange,
}: {
  value: "ROUTINE" | "URGENT" | "STAT";
  onChange: (v: "ROUTINE" | "URGENT" | "STAT") => void;
}) {
  const { t } = useI18n();
  return (
    <div data-testid="create-order-priority-field" style={{ marginBottom: 12 }}>
      <style>{CREATE_ORDER_PRESENTATION_CLEANUP_CSS}</style>
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
