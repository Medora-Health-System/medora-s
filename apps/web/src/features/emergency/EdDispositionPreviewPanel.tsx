"use client";

import React, { useId, useState } from "react";
import {
  edDispositionPreviewAsideStyle,
  edDispositionTouchButtonStyle,
  type EdDispositionLayoutMode,
} from "@/features/emergency/edDispositionResponsiveLayout";

const sectionHeading: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#64748b",
};

export function EdDispositionPreviewPanel({
  title,
  layoutMode,
  children,
}: {
  title: string;
  layoutMode: EdDispositionLayoutMode;
  children: React.ReactNode;
}) {
  const panelId = useId();
  const collapsible = layoutMode === "mobileStacked";
  const [expanded, setExpanded] = useState(!collapsible);

  if (layoutMode === "desktopSplit") {
    return (
      <aside
        style={edDispositionPreviewAsideStyle(layoutMode)}
        data-testid="ed-disposition-preview-aside"
        data-layout-mode={layoutMode}
      >
        <p style={sectionHeading}>{title}</p>
        {children}
      </aside>
    );
  }

  if (!collapsible) {
    return (
      <div
        style={edDispositionPreviewAsideStyle(layoutMode)}
        data-testid="ed-disposition-preview-stacked"
        data-layout-mode={layoutMode}
      >
        <p style={sectionHeading}>{title}</p>
        {children}
      </div>
    );
  }

  return (
    <div
      data-testid="ed-disposition-preview-collapsible"
      data-layout-mode={layoutMode}
      style={{ minWidth: 0, width: "100%" }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
        style={edDispositionTouchButtonStyle(
          {
            width: "100%",
            marginBottom: expanded ? 8 : 0,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            fontFamily: "inherit",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#64748b",
            textAlign: "left",
            cursor: "pointer",
          },
          layoutMode
        )}
      >
        {title}
        <span aria-hidden style={{ float: "right" }}>
          {expanded ? "▾" : "▸"}
        </span>
      </button>
      {expanded ? <div id={panelId}>{children}</div> : null}
    </div>
  );
}
