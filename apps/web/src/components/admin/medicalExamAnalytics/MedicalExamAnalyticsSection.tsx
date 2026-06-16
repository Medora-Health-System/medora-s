"use client";

import type { ReactNode } from "react";

export type MedicalExamAnalyticsSectionProps = {
  title: string;
  testId: string;
  children: ReactNode;
};

export function MedicalExamAnalyticsSection({ title, testId, children }: MedicalExamAnalyticsSectionProps) {
  return (
    <section
      data-testid={testId}
      style={{
        marginBottom: 20,
        padding: 16,
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        background: "#fff",
      }}
    >
      <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
      {children}
    </section>
  );
}
