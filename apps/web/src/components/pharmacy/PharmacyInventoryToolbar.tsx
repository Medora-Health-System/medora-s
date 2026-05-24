"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const btnPrimary: React.CSSProperties = {
  padding: "10px 18px",
  backgroundColor: "#1a1a1a",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 14,
  textDecoration: "none",
};

export function PharmacyInventoryToolbar({
  onQuickAdd,
  onRefresh,
  onAdvancedCreate,
  canManage,
}: {
  onQuickAdd: () => void;
  onRefresh: () => void;
  onAdvancedCreate?: () => void;
  canManage: boolean;
}) {
  const { t } = useI18n();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 20,
      }}
    >
      <div>
        <h1 style={{ margin: "0 0 8px 0" }}>{t("pharmacyInventoryToolbar.title")}</h1>
        <p style={{ margin: 0, color: "#555", fontSize: 14 }}>
          {t("pharmacyInventoryToolbar.intro")}{" "}
          <Link href="/app/pharmacy/dispense">{t("pharmacyInventoryToolbar.linkDispense")}</Link>
          {" · "}
          <Link href="/app/pharmacy/low-stock">{t("pharmacyInventoryToolbar.linkLowStock")}</Link>
          {" · "}
          <Link href="/app/pharmacy/expiring">{t("pharmacyInventoryToolbar.linkExpiring")}</Link>
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Link href="/app/pharmacy/low-stock" style={{ ...btnPrimary, backgroundColor: "#444" }}>
          {t("pharmacyInventoryToolbar.viewAlerts")}
        </Link>
        <button type="button" onClick={onRefresh} style={btnPrimary}>
          {t("pharmacyInventoryToolbar.refresh")}
        </button>
        {canManage && (
          <>
            <button type="button" onClick={onQuickAdd} style={btnPrimary}>
              {t("pharmacyInventoryToolbar.quickAdd")}
            </button>
            {onAdvancedCreate && (
              <button type="button" onClick={onAdvancedCreate} style={{ ...btnPrimary, backgroundColor: "#444" }}>
                {t("pharmacyInventoryToolbar.advancedCreate")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
