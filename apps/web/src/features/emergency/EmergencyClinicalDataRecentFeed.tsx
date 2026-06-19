"use client";

import React, { useMemo, useState } from "react";
import {
  buildClinicalDataRecentHighlights,
  formatClinicalDocumentationDetailInline,
} from "@medora/shared";
import type { ClinicalDocumentationEntryRow } from "@/lib/clinicalDocumentationApi";
import { useI18n } from "@/lib/i18n";
import { formatClinicalInstantForFacility } from "@/lib/clinicalTimeDisplay";

const rowCard: React.CSSProperties = {
  flex: "0 0 auto",
  minWidth: 260,
  maxWidth: 420,
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  background: "#fff",
  padding: "8px 10px",
  textAlign: "left",
  cursor: "pointer",
};

export function EmergencyClinicalDataRecentFeed({
  entries,
  facilityTimeZone,
  onSelectEntry,
}: {
  entries: ClinicalDocumentationEntryRow[];
  facilityTimeZone?: string | null;
  onSelectEntry: (entryId: string) => void;
}) {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en" : "fr";
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());

  const feed = useMemo(
    () => buildClinicalDataRecentHighlights(entries, locale),
    [entries, locale]
  );

  const formatTime = (iso: string) => {
    const formatted = formatClinicalInstantForFacility(iso, facilityTimeZone, language);
    const parts = formatted.split(", ");
    return parts.length > 1 ? parts[parts.length - 1]! : formatted;
  };

  const titleFor = (item: (typeof feed)[number]) =>
    language === "fr" ? item.formTitleFr : item.formTitleEn;

  return (
    <section
      data-testid="emergency-clinical-data-recent-feed"
      style={{ marginTop: 10, minWidth: 0 }}
    >
      <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
        {t("emergencyClinicalData.summary.recentDocumentation")}
      </p>
      {feed.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
          {t("clinicalDocumentation.savedEntriesEmpty")}
        </p>
      ) : (
        <div
          data-testid="clinical-data-recent-feed-horizontal"
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
            flexWrap: "nowrap",
          }}
        >
          {feed.slice(0, 16).map((item) => {
            const expanded = expandedIds.has(item.id);
            const inline = formatClinicalDocumentationDetailInline(
              item.detailRows,
              expanded ? item.detailRows.length : 5
            );
            return (
              <button
                key={item.id}
                type="button"
                data-testid="clinical-data-recent-feed-row"
                style={rowCard}
                onClick={() => onSelectEntry(item.id)}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{titleFor(item)}</div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: "#334155",
                    lineHeight: 1.35,
                    whiteSpace: "normal",
                  }}
                >
                  {inline}
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>
                  {item.authorRoleTitle} {item.authorDisplayName} · {formatTime(item.documentedAt)}
                </div>
                {item.detailRows.length > 5 ? (
                  <span
                    role="presentation"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      });
                    }}
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      fontSize: 11,
                      color: "#0369a1",
                      fontWeight: 600,
                    }}
                  >
                    {t("emergencyClinicalData.detail.viewDetails")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
