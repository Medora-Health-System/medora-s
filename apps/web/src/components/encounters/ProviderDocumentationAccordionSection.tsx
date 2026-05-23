"use client";

import React from "react";
import type { ProviderDocumentationSectionStatus } from "@/lib/providerDocumentationModel";
import type { ProviderDocumentationAccordionSectionId } from "@/lib/providerDocumentationSectionSummary";

export function ProviderDocumentationAccordionSection({
  sectionId,
  title,
  summary,
  selectedCount,
  status,
  expanded,
  onToggle,
  children,
  t,
}: {
  sectionId: ProviderDocumentationAccordionSectionId;
  title: string;
  summary: string;
  selectedCount: number;
  status?: ProviderDocumentationSectionStatus;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  t: (key: string) => string;
}) {
  const panelId = `provider-documentation-accordion-panel-${sectionId}`;

  return (
    <section
      data-testid={`provider-documentation-accordion-${sectionId}`}
      style={{
        borderRadius: 14,
        border: expanded ? "1px solid #93c5fd" : "1px solid #e2e8f0",
        background: "#fff",
        boxShadow: expanded ? "0 0 0 1px rgba(37, 99, 235, 0.08)" : undefined,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        data-testid={`provider-documentation-accordion-toggle-${sectionId}`}
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          border: "none",
          background: expanded ? "#f8fbff" : "#fff",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <span aria-hidden style={{ color: "#64748b", fontSize: 13, flexShrink: 0, width: 14 }}>
          {expanded ? "▾" : "▸"}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{title}</span>
          {summary ? (
            <span style={{ display: "block", marginTop: 2, fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
              {summary}
            </span>
          ) : null}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {status ? <AccordionStatusPill status={status} t={t} /> : null}
          {selectedCount > 0 ? (
            <span
              style={{
                borderRadius: 9999,
                padding: "3px 8px",
                fontSize: 10,
                fontWeight: 700,
                color: "#1d4ed8",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                whiteSpace: "nowrap",
              }}
            >
              {t("providerDocumentationWorkspace.accordionSelectedCount").replace("{count}", String(selectedCount))}
            </span>
          ) : null}
        </span>
      </button>
      {expanded ? (
        <div id={panelId} data-testid={`provider-documentation-accordion-panel-${sectionId}`} style={{ padding: "0 12px 12px" }}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

function AccordionStatusPill({ status, t }: { status: ProviderDocumentationSectionStatus; t: (key: string) => string }) {
  const color =
    status === "complete" || status === "saved"
      ? "#166534"
      : status === "recommended"
        ? "#92400e"
        : "#991b1b";
  const background =
    status === "complete" || status === "saved"
      ? "#f0fdf4"
      : status === "recommended"
        ? "#fffbeb"
        : "#fef2f2";
  return (
    <span
      style={{
        borderRadius: 9999,
        padding: "3px 8px",
        fontSize: 10,
        fontWeight: 800,
        color,
        background,
        border: `1px solid ${status === "missing" ? "#fecaca" : status === "recommended" ? "#fcd34d" : "#bbf7d0"}`,
        whiteSpace: "nowrap",
      }}
    >
      {t(`providerDocumentationWorkspace.sectionStatus${status[0].toUpperCase()}${status.slice(1)}`)}
    </span>
  );
}
