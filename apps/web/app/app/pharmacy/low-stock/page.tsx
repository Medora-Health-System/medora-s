"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchLowStock, type InventoryItemRow } from "@/lib/pharmacyApi";
import { InventoryTable } from "@/components/pharmacy/InventoryTable";
import { useI18n } from "@/lib/i18n";

export default function PharmacyLowStockPage() {
  const { t } = useI18n();
  const { facilityId, ready, canViewPharmacy, canManagePharmacy } =
    useFacilityAndRoles();
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !facilityId || !canViewPharmacy) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchLowStock(facilityId)
      .then(setItems)
      .catch((e) => setError(e?.message || t("common.loadError")))
      .finally(() => setLoading(false));
  }, [ready, facilityId, canViewPharmacy]);

  if (!ready) return <p>{t("common.loading")}</p>;
  if (!canViewPharmacy) {
    return (
      <div>
        <h1>{t("pharmacyLowStockPage.title")}</h1>
        <p>{t("pharmacyLowStockPage.accessDenied")}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t("pharmacyLowStockPage.title")}</h1>
      <p style={{ color: "#555", fontSize: 14 }}>
        {t("pharmacyLowStockPage.introBefore")}
        <Link href="/app/pharmacy/inventory">{t("pharmacyHomePage.linkInventory")}</Link>
        {t("pharmacyLowStockPage.introAfter")}
      </p>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <InventoryTable
          items={items}
          showActions={canManagePharmacy}
          onReceive={(id) => {
            window.location.href = `/app/pharmacy/inventory?receive=${id}`;
          }}
          onAdjust={(id) => {
            window.location.href = `/app/pharmacy/inventory?adjust=${id}`;
          }}
        />
      )}
      {canManagePharmacy && (
        <p style={{ fontSize: 13, color: "#666", marginTop: 16 }}>
          {t("pharmacyLowStockPage.footnoteBefore")}
          <Link href="/app/pharmacy/inventory">{t("pharmacyHomePage.linkInventory")}</Link>
          {t("pharmacyLowStockPage.footnoteAfter")}
        </p>
      )}
    </div>
  );
}
