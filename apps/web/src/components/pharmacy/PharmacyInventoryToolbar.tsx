"use client";

import React from "react";
import Link from "next/link";

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
        <h1 style={{ margin: "0 0 8px 0" }}>Inventaire pharmacie</h1>
        <p style={{ margin: 0, color: "#555", fontSize: 14 }}>
          Recherchez un médicament, ajoutez du stock, réceptionnez ou ajustez.{" "}
          <Link href="/app/pharmacy/dispense">Dispensation</Link>
          {" · "}
          <Link href="/app/pharmacy/low-stock">Stock faible</Link>
          {" · "}
          <Link href="/app/pharmacy/expiring">Expiration proche</Link>
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Link href="/app/pharmacy/low-stock" style={{ ...btnPrimary, backgroundColor: "#444" }}>
          Voir alertes
        </Link>
        <button type="button" onClick={onRefresh} style={btnPrimary}>
          Actualiser
        </button>
        {canManage && (
          <>
            <button type="button" onClick={onQuickAdd} style={btnPrimary}>
              Ajout rapide au stock
            </button>
            {onAdvancedCreate && (
              <button type="button" onClick={onAdvancedCreate} style={{ ...btnPrimary, backgroundColor: "#444" }}>
                Créer un article (avancé)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
