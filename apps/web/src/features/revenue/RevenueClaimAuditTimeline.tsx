"use client";

import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import type { RevenueClaimAuditTimelineEntry } from "@medora/shared";

type RevenueClaimAuditTimelineProps = {
  entries: readonly RevenueClaimAuditTimelineEntry[];
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(140px, 180px) minmax(120px, 160px) 1fr",
  gap: 12,
  padding: "10px 12px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 13,
};

function phaseLabel(t: (k: string) => string, phase: string): string {
  const key = `revenueClaimAudit.timeline.phases.${phase}`;
  const translated = t(key);
  return translated === key ? phase.replaceAll("_", " ") : translated;
}

export function RevenueClaimAuditTimeline({ entries }: RevenueClaimAuditTimelineProps) {
  const { t, language } = useI18n();

  return (
    <div
      data-testid="revenue-claim-audit-timeline"
      style={{
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          ...rowStyle,
          fontSize: 11,
          fontWeight: 600,
          color: "#64748b",
          background: "#f8fafc",
        }}
      >
        <div>{t("revenueClaimAudit.timeline.when")}</div>
        <div>{t("revenueClaimAudit.timeline.phaseColumn")}</div>
        <div>{t("revenueClaimAudit.timeline.detail")}</div>
      </div>
      {entries.length === 0 ? (
        <p style={{ margin: 0, padding: 14, color: "#64748b", fontSize: 13 }}>
          {t("revenueClaimAudit.timeline.empty")}
        </p>
      ) : (
        entries.map((entry, index) => (
          <div
            key={`${entry.at}-${entry.phase}-${index}`}
            data-testid={`revenue-claim-audit-timeline-row-${entry.phase.toLowerCase()}`}
            style={rowStyle}
          >
            <div style={{ color: "#0f172a" }}>
              {formatEncounterChromeDateTime(entry.at, language)}
            </div>
            <div style={{ color: "#475569", fontWeight: 600 }}>
              {phaseLabel(t, entry.phase)}
            </div>
            <div style={{ color: "#334155" }}>
              <div>{entry.label}</div>
              {entry.detail ? (
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{entry.detail}</div>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function sortTimelineEntriesNewestFirst(
  entries: readonly RevenueClaimAuditTimelineEntry[]
): RevenueClaimAuditTimelineEntry[] {
  return [...entries].sort((a, b) => b.at.localeCompare(a.at));
}
