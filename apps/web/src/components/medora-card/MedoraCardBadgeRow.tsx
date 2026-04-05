"use client";

import React from "react";

export type MedoraCardBadgeRowProps = {
  children: React.ReactNode;
  /** Default 10 (below title stack); use 0 when nested inside a column that already sets vertical gap (e.g. trackboard actions). */
  marginTop?: number;
};

export function MedoraCardBadgeRow({ children, marginTop = 10 }: MedoraCardBadgeRowProps) {
  return (
    <div
      style={{
        marginTop,
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
