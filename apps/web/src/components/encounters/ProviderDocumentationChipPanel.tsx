"use client";

import React, { useId, useState } from "react";

export function ProviderDocumentationChipPanel({
  title,
  selectedCount = 0,
  defaultExpanded = false,
  tone,
  children,
}: {
  title: string;
  selectedCount?: number;
  defaultExpanded?: boolean;
  tone?: "warn" | "green" | "default";
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const borderColor = tone === "warn" ? "#fcd34d" : tone === "green" ? "#bbf7d0" : "#e2e8f0";
  const background = tone === "warn" ? "#fffbeb" : tone === "green" ? "#f0fdf4" : "#f8fafc";

  return (
    <div
      style={{
        marginTop: 8,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        background,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "8px 10px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span aria-hidden style={{ color: "#64748b", fontSize: 12, flexShrink: 0 }}>
            {expanded ? "▾" : "▸"}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{title}</span>
        </span>
        {selectedCount > 0 ? (
          <span
            style={{
              borderRadius: 9999,
              padding: "2px 8px",
              fontSize: 10,
              fontWeight: 700,
              color: "#1d4ed8",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {selectedCount}
          </span>
        ) : null}
      </button>
      {expanded ? (
        <div id={panelId} style={{ padding: "0 10px 10px" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
