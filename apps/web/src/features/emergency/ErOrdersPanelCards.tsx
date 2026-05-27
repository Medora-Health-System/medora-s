"use client";

import React from "react";
import {
  diagnosisOrdersLabelWrapStyle,
  diagnosisOrdersOrderCardShellStyle,
  diagnosisOrdersOrderGroupHeaderStyle,
  diagnosisOrdersTouchButtonStyle,
  type DiagnosisOrdersLayoutMode,
} from "@/features/emergency/diagnosisOrdersResponsiveLayout";

export function ErOrderGroupHeaderCard({ children }: { children: React.ReactNode }) {
  return <div style={diagnosisOrdersOrderGroupHeaderStyle()}>{children}</div>;
}

export function ErOrderLineCard({
  layoutMode,
  categoryLabel,
  issuedPrimary,
  timeStr,
  orderTitle,
  orderSubLines,
  statusSection,
  titleSection,
  actions,
  cancelControl,
  pendingCancelSection,
  highlightPending,
  fieldLabels,
}: {
  layoutMode: DiagnosisOrdersLayoutMode;
  categoryLabel: string;
  issuedPrimary: string;
  timeStr: string;
  orderTitle: React.ReactNode;
  orderSubLines?: React.ReactNode;
  statusSection: React.ReactNode;
  titleSection?: React.ReactNode;
  actions?: React.ReactNode;
  cancelControl?: React.ReactNode;
  pendingCancelSection?: React.ReactNode;
  highlightPending?: boolean;
  fieldLabels: { status: string; time: string; issued: string; attribution: string };
}) {
  const metaLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 2,
  };

  return (
    <div
      style={{
        ...diagnosisOrdersOrderCardShellStyle(),
        ...(highlightPending ? { backgroundColor: "rgba(254, 243, 199, 0.28)" } : {}),
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ minWidth: 0, flex: "1 1 160px" }}>
          <div style={metaLabel}>{categoryLabel}</div>
          <div style={{ ...diagnosisOrdersLabelWrapStyle(), fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
            {orderTitle}
          </div>
          {orderSubLines}
        </div>
        {cancelControl ? <div style={{ flexShrink: 0 }}>{cancelControl}</div> : null}
      </div>

      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
        <div>
          <div style={metaLabel}>{fieldLabels.status}</div>
          <div style={{ fontSize: 12, color: "#334155", ...diagnosisOrdersLabelWrapStyle() }}>{statusSection}</div>
        </div>
        <div>
          <div style={metaLabel}>{fieldLabels.time}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{timeStr}</div>
        </div>
        <div>
          <div style={metaLabel}>{fieldLabels.issued}</div>
          <div style={{ fontSize: 12, color: "#64748b", ...diagnosisOrdersLabelWrapStyle() }}>{issuedPrimary}</div>
        </div>
        {titleSection ? (
          <div>
            <div style={metaLabel}>{fieldLabels.attribution}</div>
            <div style={{ fontSize: 12, color: "#64748b", ...diagnosisOrdersLabelWrapStyle() }}>{titleSection}</div>
          </div>
        ) : null}
      </div>

      {actions ? (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            width: "100%",
            minWidth: 0,
          }}
        >
          {actions}
        </div>
      ) : null}
      {pendingCancelSection}
    </div>
  );
}

export function ErOrderEventCard({
  layoutMode,
  categoryLabel,
  issuedPrimary,
  timeStr,
  orderTitle,
  orderSubLines,
  statusSection,
  titleSection,
  fieldLabels,
}: {
  layoutMode: DiagnosisOrdersLayoutMode;
  categoryLabel: string;
  issuedPrimary: string;
  timeStr: string;
  orderTitle: React.ReactNode;
  orderSubLines?: React.ReactNode;
  statusSection: React.ReactNode;
  titleSection: React.ReactNode;
  fieldLabels: { status: string; time: string; issued: string; attribution: string };
}) {
  return (
    <ErOrderLineCard
      layoutMode={layoutMode}
      categoryLabel={categoryLabel}
      issuedPrimary={issuedPrimary}
      timeStr={timeStr}
      orderTitle={orderTitle}
      orderSubLines={orderSubLines}
      statusSection={statusSection}
      titleSection={titleSection}
      fieldLabels={fieldLabels}
    />
  );
}

export function erOrdersTouchButtonStyle(
  base: React.CSSProperties,
  layoutMode: DiagnosisOrdersLayoutMode
): React.CSSProperties {
  return diagnosisOrdersTouchButtonStyle(base, layoutMode);
}
