"use client";

import React, { useMemo } from "react";
import { buildClinicalDataRecentHighlights } from "@medora/shared";
import type { ClinicalDocumentationEntryRow } from "@/lib/clinicalDocumentationApi";
import { useI18n } from "@/lib/i18n";
import { formatClinicalInstantForFacility } from "@/lib/clinicalTimeDisplay";

export function EmergencyClinicalDataRecentFeed({
  entries,
  facilityTimeZone,
}: {
  entries: ClinicalDocumentationEntryRow[];
  facilityTimeZone?: string | null;
}) {
  const { t, language } = useI18n();

  const feed = useMemo(() => buildClinicalDataRecentHighlights(entries), [entries]);

  const formatTime = (iso: string) => {
    const formatted = formatClinicalInstantForFacility(iso, facilityTimeZone, language);
    const parts = formatted.split(", ");
    return parts.length > 1 ? parts[parts.length - 1]! : formatted;
  };

  const formatDate = (iso: string) => {
    const formatted = formatClinicalInstantForFacility(iso, facilityTimeZone, language);
    const parts = formatted.split(", ");
    return parts[0] ?? formatted;
  };

  const statusLabel = (status: "DOCUMENTED" | "PENDING_WITNESS" | "VOIDED") => {
    switch (status) {
      case "PENDING_WITNESS":
        return t("emergencyClinicalData.summary.status.pendingWitness");
      case "VOIDED":
        return t("emergencyClinicalData.summary.status.voided");
      default:
        return t("emergencyClinicalData.summary.status.documented");
    }
  };

  const titleFor = (item: (typeof feed)[number]) =>
    language === "fr" ? item.formTitleFr : item.formTitleEn;

  return (
    <section
      data-testid="emergency-clinical-data-recent-feed"
      style={{
        marginTop: 14,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#fff",
        padding: "10px 12px",
      }}
    >
      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
        {t("emergencyClinicalData.summary.recentDocumentation")}
      </p>
      {feed.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
          {t("clinicalDocumentation.savedEntriesEmpty")}
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {feed.slice(0, 12).map((item) => (
            <li
              key={item.id}
              data-testid="clinical-data-recent-feed-row"
              style={{
                display: "grid",
                gridTemplateColumns: "72px minmax(0, 1fr) auto",
                gap: 10,
                alignItems: "center",
                padding: "6px 0",
                borderBottom: "1px solid #f1f5f9",
                fontSize: 12,
              }}
            >
              <div style={{ color: "#64748b" }}>
                <div style={{ fontWeight: 600, color: "#334155" }}>{formatTime(item.documentedAt)}</div>
                <div>{formatDate(item.documentedAt)}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>{titleFor(item)}</div>
                <div style={{ color: "#64748b" }}>
                  {item.authorRoleTitle} {item.authorDisplayName}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 9999,
                  background: item.status === "PENDING_WITNESS" ? "#fef3c7" : "#f1f5f9",
                  color: item.status === "PENDING_WITNESS" ? "#92400e" : "#475569",
                  whiteSpace: "nowrap",
                }}
              >
                {statusLabel(item.status)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
