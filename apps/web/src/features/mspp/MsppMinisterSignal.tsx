"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import { MedoraCardBadge } from "@/components/medora-card";
import type { MsppSummaryResponse, MsppTrendsResponse } from "@/lib/msppApi";
import { deriveNationalSurveillanceKind, type NationalSurveillanceKind } from "./msppAlertLogic";
import { interpolateNarrative } from "./msppNarrativeLogic";
import { MSPP_MINISTER_SIGNAL_CARD } from "./msppUiChrome";

function nationalBadgePreset(kind: NationalSurveillanceKind): "pathway" | "neutral" | "syncPending" {
  if (kind === "hausse") return "pathway";
  if (kind === "sous_surveillance") return "syncPending";
  return "neutral";
}

function nationalStatusLabel(t: (key: string) => string, kind: NationalSurveillanceKind): string {
  return t(`msppSurveillance.nationalStatus.${kind}`);
}

/**
 * Prominent national status strip for leadership reading (screen + print).
 * Uses the same month-over-month bucket rule as narrative and surveillance.
 */
export function MsppMinisterSignalBlock({
  loading,
  trends,
  summary,
  compact,
  className,
}: {
  loading: boolean;
  trends: MsppTrendsResponse | null;
  summary: MsppSummaryResponse | null;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useI18n();

  const cardStyle: React.CSSProperties = {
    ...MSPP_MINISTER_SIGNAL_CARD,
    padding: compact ? "16px 18px" : "22px 24px",
    marginBottom: 18,
  };

  if (loading) {
    return (
      <div style={cardStyle} className={className}>
        <p style={{ margin: 0, fontSize: compact ? 13 : 14, color: "#64748b" }}>{t("msppSignal.loading")}</p>
      </div>
    );
  }

  const kind = trends ? deriveNationalSurveillanceKind(trends.buckets) : "sous_surveillance";
  const totalLine =
    summary !== null && typeof summary.totalApproved === "number"
      ? interpolateNarrative(t("msppSignal.totalNational"), { total: summary.totalApproved })
      : t("msppSignal.totalNationalMissing");

  const kickerStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#0369a1",
    margin: "0 0 6px",
  };

  const headingStyle: React.CSSProperties = {
    margin: "0 0 8px",
    fontSize: compact ? "1.1rem" : "1.35rem",
    fontWeight: 700,
    color: "#0f172a",
    lineHeight: 1.2,
  };

  return (
    <div style={cardStyle} className={className}>
      <p style={kickerStyle}>{t("msppSignal.ministerKicker")}</p>
      <h2 style={headingStyle}>{t("msppSignal.ministerHeading")}</h2>
      <p
        style={{
          fontSize: 13,
          color: "#64748b",
          margin: "0 0 14px",
          lineHeight: 1.5,
          maxWidth: 720,
        }}
      >
        {t("msppSignal.ministerSub")}
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <MedoraCardBadge preset={nationalBadgePreset(kind)}>{nationalStatusLabel(t, kind)}</MedoraCardBadge>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#334155", fontSize: 14 }}>{totalLine}</p>
          <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.55, maxWidth: 720 }}>
            {t(`msppSignal.executiveSummary.${kind}`)}
          </p>
        </div>
      </div>
    </div>
  );
}
