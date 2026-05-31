"use client";

import type { CSSProperties } from "react";

const noticeStyle: CSSProperties = {
  margin: 0,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  fontSize: 12,
  lineHeight: 1.45,
  color: "#475569",
};

export function DeptWorklistReadOnlyNotice({ message }: { message: string }) {
  return (
    <p role="status" style={noticeStyle}>
      {message}
    </p>
  );
}
