"use client";

import React from "react";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 8,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              fontSize: 22,
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 4,
  border: "1px solid #ccc",
  fontSize: 14,
  marginBottom: 14,
  boxSizing: "border-box",
};

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export { inputStyle };
