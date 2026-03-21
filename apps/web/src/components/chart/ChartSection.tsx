"use client";

import React from "react";

const sectionStyle: React.CSSProperties = {
  backgroundColor: "white",
  border: "1px solid #e0e0e0",
  borderRadius: 6,
  marginBottom: 20,
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid #eee",
  backgroundColor: "#fafafa",
  fontSize: 14,
  fontWeight: 600,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const bodyStyle: React.CSSProperties = {
  padding: 16,
};

export function ChartSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={sectionStyle}>
      <div style={headerStyle}>
        <span>{title}</span>
        {action != null && <span>{action}</span>}
      </div>
      <div style={bodyStyle}>{children}</div>
    </section>
  );
}

export const tableStyles = {
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 14 },
  th: { padding: "10px 12px", textAlign: "left" as const, borderBottom: "2px solid #ddd", backgroundColor: "#f5f5f5" },
  td: { padding: "10px 12px", borderBottom: "1px solid #eee" },
};

export const btnPrimary: React.CSSProperties = {
  padding: "6px 12px",
  backgroundColor: "#1a1a1a",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
};

export const btnSecondary: React.CSSProperties = {
  padding: "6px 12px",
  backgroundColor: "#f5f5f5",
  color: "#333",
  border: "1px solid #ccc",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
};
