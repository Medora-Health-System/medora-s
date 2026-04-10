"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import { MedoraCardBadge } from "@/components/medora-card";
import type { MsppDiseasesResponse, MsppGeographyResponse, MsppTrendsResponse } from "@/lib/msppApi";
import {
  DEFAULT_WATCHLIST_TOP_N,
  deriveNationalSurveillanceKind,
  topDiseaseWatchlist,
  topGeographyHotspots,
  type NationalSurveillanceKind,
} from "./msppAlertLogic";
import {
  MSPP_SECTION_SUBTITLE,
  MSPP_SECTION_TITLE,
  MSPP_SURVEILLANCE_CARD,
  MSPP_WATCHLIST_TILE,
} from "./msppUiChrome";

function nationalBadgePreset(kind: NationalSurveillanceKind): "pathway" | "neutral" | "syncPending" {
  if (kind === "hausse") return "pathway";
  if (kind === "sous_surveillance") return "syncPending";
  return "neutral";
}

function nationalStatusLabel(t: (key: string) => string, kind: NationalSurveillanceKind): string {
  return t(`msppSurveillance.nationalStatus.${kind}`);
}

type MapCrossRef = "none" | "dashboard" | "rapport";

type MsppSurveillancePanelProps = {
  loading: boolean;
  trends: MsppTrendsResponse | null;
  regions: MsppGeographyResponse["regions"];
  diseases: MsppDiseasesResponse["diseases"];
  /** Tighter layout for dashboard strip. */
  compact?: boolean;
  className?: string;
  /** When true (Rapport only), department ranking follows active UI filters. */
  departmentRankingFiltered?: boolean;
  /** Hide national trend block (e.g. when {@link MsppMinisterSignalBlock} is shown above). */
  omitNational?: boolean;
  /** Side-by-side department / disease watchlists. */
  watchlistColumns?: boolean;
  /** Depth of ranking lists (default {@link DEFAULT_WATCHLIST_TOP_N}). */
  topN?: number;
  /** Caption under department watchlist — ties to map on Rapport. */
  mapCrossRef?: MapCrossRef;
};

function RankRow({ rank, children }: { rank: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "8px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: 13,
          color: "#1d4ed8",
          fontVariantNumeric: "tabular-nums",
          minWidth: 22,
        }}
      >
        {rank}.
      </span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: "#334155", lineHeight: 1.45 }}>{children}</div>
    </div>
  );
}

export function MsppSurveillancePanel({
  loading,
  trends,
  regions,
  diseases,
  compact,
  className,
  departmentRankingFiltered,
  omitNational = false,
  watchlistColumns = false,
  topN = DEFAULT_WATCHLIST_TOP_N,
  mapCrossRef = "none",
}: MsppSurveillancePanelProps) {
  const { t } = useI18n();

  const pad = compact ? "16px 18px" : MSPP_SURVEILLANCE_CARD.padding;
  const cardStyle: React.CSSProperties = {
    ...MSPP_SURVEILLANCE_CARD,
    padding: pad,
    marginBottom: compact ? 14 : MSPP_SURVEILLANCE_CARD.marginBottom,
  };

  const panelTitle = omitNational ? t("msppSurveillance.watchlistsPanelTitle") : t("msppSurveillance.panelTitle");
  const panelDisclaimer = omitNational ? t("msppSurveillance.watchlistsDisclaimer") : t("msppSurveillance.panelDisclaimer");

  const deptCaption =
    mapCrossRef === "rapport"
      ? t("msppSurveillance.watchlistDeptCaptionRapport")
      : mapCrossRef === "dashboard"
        ? t("msppSurveillance.watchlistDeptCaptionDashboard")
        : null;

  if (loading) {
    return (
      <div style={cardStyle} className={className}>
        <h2 style={{ ...MSPP_SECTION_TITLE, fontSize: compact ? "1rem" : MSPP_SECTION_TITLE.fontSize }}>{panelTitle}</h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>{t("msppSurveillance.loading")}</p>
      </div>
    );
  }

  const nationalKind = trends ? deriveNationalSurveillanceKind(trends.buckets) : "sous_surveillance";
  const deptHot = topGeographyHotspots(regions, topN);
  const diseaseWatch = topDiseaseWatchlist(diseases, topN);

  const titleStyle: React.CSSProperties = {
    ...MSPP_SECTION_TITLE,
    fontSize: compact ? "1rem" : MSPP_SECTION_TITLE.fontSize,
  };

  const rowGap = compact ? 10 : 14;
  const sectionLabel: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 6,
    marginTop: 0,
  };

  const deptTitle = t("msppSurveillance.watchlistDeptTitle");
  const diseaseTitle = t("msppSurveillance.watchlistDiseaseTitle");

  const departmentBlock = (
    <div>
      <p style={sectionLabel}>{deptTitle}</p>
      {deptCaption && (
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px", lineHeight: 1.45 }}>{deptCaption}</p>
      )}
      {departmentRankingFiltered && (
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 8px", lineHeight: 1.45 }}>
          {t("msppSurveillance.departmentsFilteredNote")}
        </p>
      )}
      {deptHot.length > 0 ? (
        <div>
          {deptHot.map((r, i) => (
            <RankRow key={r.departmentId} rank={i + 1}>
              <>
                <strong>{r.departmentName ?? r.departmentCode ?? "—"}</strong>
                {r.departmentCode && r.departmentName ? ` (${r.departmentCode})` : ""}
                <span style={{ color: "#64748b" }}>
                  {" "}
                  — {r.approvedCount} {t("msppSurveillance.countApproved")}
                </span>
              </>
            </RankRow>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{t("msppSurveillance.departmentsEmpty")}</p>
      )}
    </div>
  );

  const diseaseBlock = (
    <div>
      <p style={sectionLabel}>{diseaseTitle}</p>
      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px", lineHeight: 1.45 }}>
        {t("msppSurveillance.watchlistDiseaseCaption")}
      </p>
      {diseaseWatch.length > 0 ? (
        <div>
          {diseaseWatch.map((d, i) => (
            <RankRow key={d.diseaseCode} rank={i + 1}>
              <>
                <strong>{d.diseaseName.trim() || d.diseaseCode}</strong> ({d.diseaseCode}) — {d.count}
              </>
            </RankRow>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{t("msppSurveillance.diseasesEmpty")}</p>
      )}
    </div>
  );

  return (
    <div style={cardStyle} className={className}>
      <h2 style={titleStyle}>{panelTitle}</h2>
      <p style={{ ...MSPP_SECTION_SUBTITLE, marginBottom: compact ? 10 : 14 }}>{panelDisclaimer}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: rowGap }}>
        {!omitNational && (
          <div>
            <p style={sectionLabel}>{t("msppSurveillance.nationalBlockTitle")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <MedoraCardBadge preset={nationalBadgePreset(nationalKind)}>
                {nationalStatusLabel(t, nationalKind)}
              </MedoraCardBadge>
              <span style={{ fontSize: 13, color: "#64748b", lineHeight: 1.45, maxWidth: compact ? 360 : 520 }}>
                {t("msppSurveillance.nationalMethodHint")}
              </span>
            </div>
          </div>
        )}

        {watchlistColumns ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              alignItems: "stretch",
            }}
          >
            <div style={MSPP_WATCHLIST_TILE}>{departmentBlock}</div>
            <div style={MSPP_WATCHLIST_TILE}>{diseaseBlock}</div>
          </div>
        ) : (
          <>
            {departmentBlock}
            <div style={{ marginBottom: 0 }}>{diseaseBlock}</div>
          </>
        )}
      </div>
    </div>
  );
}
