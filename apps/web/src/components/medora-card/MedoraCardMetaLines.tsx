"use client";

import React from "react";

/** Optional stacked meta lines below badges (médecin, arrivée, etc.) */
export function MedoraCardMetaLines({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>{children}</div>;
}
