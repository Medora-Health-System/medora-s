"use client";

import React from "react";

export type MedoraCardRoomBlockProps = {
  /** Uppercase label, e.g. SALLE (pass translated string from caller) */
  label: string;
  value: React.ReactNode;
};

/**
 * Center emphasis block for room / location (Soins infirmiers, trackboard, etc.).
 * Optional on worklist cards.
 */
export function MedoraCardRoomBlock({ label, value }: MedoraCardRoomBlockProps) {
  return (
    <div
      style={{
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 104,
        alignSelf: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          minWidth: 96,
          maxWidth: 140,
          padding: "12px 14px",
          borderRadius: 14,
          border: "1px solid #bae6fd",
          backgroundColor: "#f0f9ff",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#0369a1",
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#0c4a6e",
            fontVariantNumeric: "tabular-nums",
            wordBreak: "break-word",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
