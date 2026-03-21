"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchLowStock, type InventoryItemRow } from "@/lib/pharmacyApi";
import { InventoryTable } from "@/components/pharmacy/InventoryTable";
import { ui } from "@/lib/uiLabels";

export default function PharmacyLowStockPage() {
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
      .catch((e) => setError(e?.message || "Impossible de charger"))
      .finally(() => setLoading(false));
  }, [ready, facilityId, canViewPharmacy]);

  if (!ready) return <p>{ui.common.loading}</p>;
  if (!canViewPharmacy) {
    return (
      <div>
        <h1>Stock faible</h1>
        <p>Vous n&apos;avez pas accès.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Stock faible</h1>
      <p style={{ color: "#555", fontSize: 14 }}>
        Articles dont la quantité en stock ≤ seuil de réappro.{" "}
        <Link href="/app/pharmacy/inventory">Stock</Link>
      </p>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      {loading ? (
        <p>Chargement…</p>
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
          Utilisez Réceptionner / Ajuster depuis la page{" "}
          <Link href="/app/pharmacy/inventory">Stock</Link> pour les modales complètes, ou ouvrez le stock et utilisez les actions sur les lignes.
        </p>
      )}
    </div>
  );
}
