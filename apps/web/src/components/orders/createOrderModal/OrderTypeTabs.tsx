"use client";

import React from "react";
import type { CreateOrderModalTab } from "./types";
import { useI18n } from "@/lib/i18n";

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
  orderTypes: CreateOrderModalTab[];
  activeTab: CreateOrderModalTab;
  onChange: (tab: CreateOrderModalTab) => void;
}) {
  const { t } = useI18n();
  const label = (tab: CreateOrderModalTab) =>
    tab === "ORDER_SET"
      ? t("createOrderModal.tabOrderSets")
      : tab === "LAB"
      ? t("encounterChrome.chartTabs.orderTypeLAB")
      : tab === "IMAGING"
        ? t("encounterChrome.chartTabs.orderTypeIMAGING")
        : tab === "MEDICATION"
          ? t("encounterChrome.chartTabs.orderTypeMEDICATION")
          : t("encounterChrome.chartTabs.orderTypeCARE");

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
