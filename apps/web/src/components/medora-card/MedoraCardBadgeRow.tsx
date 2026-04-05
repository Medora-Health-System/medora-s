"use client";

import React from "react";

export function MedoraCardBadgeRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 10,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}
