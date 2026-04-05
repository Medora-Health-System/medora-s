"use client";

import React from "react";

export type MedoraCardIdentityProps = {
  /** Two-letter initials inside the avatar circle */
  initials: string;
  children: React.ReactNode;
};

/**
 * Left column: 44px avatar + primary stack (title, NIR, badges…).
 */
export function MedoraCardIdentity({ initials, children }: MedoraCardIdentityProps) {
  return (
    <div style={{ display: "flex", minWidth: 0, flex: "1 1 220px", gap: 16 }}>
      <div
        aria-hidden
        style={{
          flexShrink: 0,
          width: 44,
          height: 44,
          borderRadius: "50%",
          backgroundColor: "#f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 600,
          color: "#334155",
          border: "1px solid #e2e8f0",
        }}
      >
        {initials}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>{children}</div>
    </div>
  );
}
