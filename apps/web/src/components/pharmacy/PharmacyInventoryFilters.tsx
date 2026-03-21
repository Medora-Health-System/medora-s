"use client";

import React from "react";

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 4,
  border: "1px solid #ccc",
  fontSize: 14,
  flex: "1 1 200px",
  maxWidth: 320,
  minWidth: 0,
  boxSizing: "border-box",
};

export function PharmacyInventoryFilters({
  search,
  onSearchChange,
  activeOnly,
  onActiveOnlyChange,
  lowStockOnly,
  onLowStockOnlyChange,
  expiringOnly,
  onExpiringOnlyChange,
  onApply,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  activeOnly: boolean;
  onActiveOnlyChange: (v: boolean) => void;
  lowStockOnly: boolean;
  onLowStockOnlyChange: (v: boolean) => void;
  expiringOnly?: boolean;
  onExpiringOnlyChange?: (v: boolean) => void;
  onApply: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        marginBottom: 16,
        padding: 16,
        backgroundColor: "white",
        borderRadius: 8,
        border: "1px solid #ddd",
      }}
    >
      <input
        type="text"
        placeholder="Rechercher un médicament"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={inputStyle}
      />
      <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <input type="checkbox" checked={activeOnly} onChange={(e) => onActiveOnlyChange(e.target.checked)} />
        Actifs seulement
      </label>
      <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <input type="checkbox" checked={lowStockOnly} onChange={(e) => onLowStockOnlyChange(e.target.checked)} />
        Stock faible
      </label>
      <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="checkbox"
          checked={expiringOnly ?? false}
          onChange={(e) => onExpiringOnlyChange?.(e.target.checked)}
          disabled={!onExpiringOnlyChange}
          style={!onExpiringOnlyChange ? { opacity: 0.6 } : undefined}
        />
        Expiration proche
      </label>
      <button
        type="button"
        onClick={onApply}
        style={{
          padding: "8px 16px",
          backgroundColor: "#1a1a1a",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        Appliquer
      </button>
    </div>
  );
}
