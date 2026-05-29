"use client";

import React from "react";
import Link from "next/link";
import type { EnterpriseProcedureExecutionRoleCategory, ProcedureWorkQueueItem } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { ProcedureExecutionCategoryBadge } from "@/components/clinical/ProcedureExecutionCategoryBadge";
import { orderItemStatusLabelKey } from "@/lib/procedureExecutionUi";

export function ProcedureWorkQueuePanel({
  title,
  subline,
  items,
  encounterHref,
  emptyLabel,
}: {
  title: string;
  subline?: string;
  items: ProcedureWorkQueueItem[];
  encounterHref: (encounterId: string) => string;
  emptyLabel?: string;
}) {
  const { t, language } = useI18n();
  if (items.length === 0) {
    if (!emptyLabel) return null;
    return (
      <section
        data-testid="procedure-work-queue-panel"
        style={{
          marginBottom: 16,
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          backgroundColor: "#ffffff",
          padding: "12px 14px",
        }}
      >
        <h2 style={{ margin: "0 0 4px 0", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
        {subline ? (
          <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>{subline}</p>
        ) : null}
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{emptyLabel}</p>
      </section>
    );
  }

  return (
    <section
      data-testid="procedure-work-queue-panel"
      style={{
        marginBottom: 16,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        backgroundColor: "#ffffff",
        padding: "12px 14px",
      }}
    >
      <h2 style={{ margin: "0 0 4px 0", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
      {subline ? (
        <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>{subline}</p>
      ) : null}
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => {
          const label = language === "fr" ? item.displayLabelFr : item.displayLabelEn;
          const statusKey = orderItemStatusLabelKey(item.orderItemStatus);
          return (
            <li key={item.orderItemId} style={{ fontSize: 12, color: "#334155" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <strong style={{ color: "#0f172a" }}>{label}</strong>
                <ProcedureExecutionCategoryBadge
                  category={item.executionRoleCategory as EnterpriseProcedureExecutionRoleCategory}
                />
                {statusKey ? (
                  <span style={{ fontSize: 11, color: "#64748b" }}>{t(statusKey)}</span>
                ) : null}
              </div>
              <div style={{ marginTop: 4 }}>
                <Link href={encounterHref(item.encounterId)} style={{ fontSize: 11, color: "#1d4ed8" }}>
                  {t("procedureExecutionLinkage.openEncounter")}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
