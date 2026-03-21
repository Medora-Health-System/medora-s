"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchExpiring, type InventoryItemRow } from "@/lib/pharmacyApi";
import { InventoryTable } from "@/components/pharmacy/InventoryTable";
import { ui } from "@/lib/uiLabels";

export default function PharmacyExpiringPage() {
  const { facilityId, ready, canViewPharmacy, canManagePharmacy } =
    useFacilityAndRoles();
  const [withinDays, setWithinDays] = useState(90);
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!facilityId || !canViewPharmacy) return;
    setLoading(true);
    setError(null);
    fetchExpiring(facilityId, withinDays)
      .then(setItems)
      .catch((e) => setError(e?.message || "Impossible de charger"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!ready || !facilityId || !canViewPharmacy) {
      setLoading(false);
      return;
    }
    load();
  }, [ready, facilityId, canViewPharmacy, withinDays]);

  if (!ready) return <p>{ui.common.loading}</p>;
  if (!canViewPharmacy) {
    return (
      <div>
        <h1>Stock à péremption</h1>
        <p>Vous n&apos;avez pas accès.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Stock à péremption</h1>
      <p style={{ color: "#555", fontSize: 14 }}>
        Articles dont la date de péremption est dans la période choisie.{" "}
        <Link href="/app/pharmacy/inventory">Stock</Link>
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          padding: 16,
          backgroundColor: "white",
          borderRadius: 4,
        }}
      >
        <label style={{ fontSize: 14 }}>
          Péremption sous{" "}
          <input
            type="number"
            min={1}
            max={365}
            value={withinDays}
            onChange={(e) =>
              setWithinDays(Math.min(365, Math.max(1, parseInt(e.target.value, 10) || 90)))
            }
            style={{
              width: 72,
              marginLeft: 8,
              padding: "6px 8px",
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />{" "}
          jours
        </label>
        <button
          type="button"
          onClick={load}
          style={{
            padding: "8px 16px",
            backgroundColor: "#1a1a1a",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Actualiser
        </button>
      </div>
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
    </div>
  );
}
