"use client";

import React, { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import type {
  MsppDiseasesResponse,
  MsppGeographyResponse,
  MsppSummaryResponse,
  MsppTrendsResponse,
} from "@/lib/msppApi";
import {
  classifyMonthOverMonthTrend,
  formatMonthOverMonthSentence,
  interpolateNarrative,
  topDepartmentLabelsFromGeo,
  topDepartmentLabelsFromSummary,
  topDiseaseLabels,
  type MonthOverMonthTemplates,
} from "./msppNarrativeLogic";
import {
  MSPP_NARRATIVE_CARD,
  MSPP_NARRATIVE_LIST,
  MSPP_NARRATIVE_MUTED,
  MSPP_SECTION_TITLE,
} from "./msppUiChrome";

const TOP_N = 3;

function useTrendTemplates(t: (key: string) => string): MonthOverMonthTemplates {
  return useMemo(
    () => ({
      insufficientNoBuckets: t("msppNarrative.trendInsufficientNoBuckets"),
      insufficientSingleBucket: t("msppNarrative.trendInsufficientSingleBucket"),
      hausse: t("msppNarrative.trendHausse"),
      baisse: t("msppNarrative.trendBaisse"),
      stable: t("msppNarrative.trendStable"),
    }),
    [t]
  );
}

export function MsppDashboardNarrative({
  loading,
  summary,
  trends,
  diseases,
}: {
  loading: boolean;
  summary: MsppSummaryResponse | null;
  trends: MsppTrendsResponse | null;
  diseases: MsppDiseasesResponse | null;
}) {
  const { t } = useI18n();
  const trendTemplates = useTrendTemplates(t);

  if (loading) {
    return (
      <div style={MSPP_NARRATIVE_CARD}>
        <h2 style={MSPP_SECTION_TITLE}>{t("msppNarrative.dashboardTitle")}</h2>
        <p style={{ color: "#64748b", margin: "8px 0 0" }}>{t("msppNarrative.loading")}</p>
      </div>
    );
  }

  const trendSentence = trends
    ? formatMonthOverMonthSentence(classifyMonthOverMonthTrend(trends.buckets), trendTemplates)
    : t("msppNarrative.trendUnavailable");
  const diseaseLines = diseases?.diseases?.length ? topDiseaseLabels(diseases.diseases, TOP_N) : [];
  const deptLines = summary?.byDepartment?.length ? topDepartmentLabelsFromSummary(summary.byDepartment, TOP_N) : [];

  return (
    <div style={MSPP_NARRATIVE_CARD}>
      <h2 style={MSPP_SECTION_TITLE}>{t("msppNarrative.dashboardTitle")}</h2>
      <p style={MSPP_NARRATIVE_MUTED}>
        {t("msppNarrative.dashboardDisclaimerBefore")}
        <strong>{t("msppNarrative.dashboardDisclaimerEm")}</strong>
        {t("msppNarrative.dashboardDisclaimerAfter")}
      </p>
      <p style={{ marginBottom: 10, color: "#334155", fontSize: 14, lineHeight: 1.5 }}>
        <strong>{t("msppNarrative.volumeNationalLabel")}</strong>{" "}
        {summary !== null
          ? interpolateNarrative(t("msppNarrative.totalApprovedCases"), { count: summary.totalApproved })
          : "—"}
      </p>
      <p style={{ marginBottom: 10, color: "#334155", fontSize: 14, lineHeight: 1.5 }}>
        <strong>{t("msppNarrative.trendCompareLabel")}</strong> {trendSentence}
      </p>
      {diseaseLines.length > 0 ? (
        <div style={{ marginBottom: 10 }}>
          <strong style={{ color: "#0f172a", fontSize: 14 }}>{interpolateNarrative(t("msppNarrative.diseasesTopLabel"), { n: TOP_N })}</strong>
          <ul style={MSPP_NARRATIVE_LIST}>
            {diseaseLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p style={{ marginBottom: 10, color: "#334155", fontSize: 14 }}>
          <strong>{t("msppNarrative.diseasesNone")}</strong> {t("msppNarrative.diseasesNoneDetail")}
        </p>
      )}
      {deptLines.length > 0 ? (
        <div>
          <strong style={{ color: "#0f172a", fontSize: 14 }}>
            {interpolateNarrative(t("msppNarrative.departmentsTopSummaryLabel"), { n: TOP_N })}
          </strong>
          <ul style={MSPP_NARRATIVE_LIST}>
            {deptLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p style={{ marginBottom: 0, color: "#334155", fontSize: 14 }}>
          <strong>{t("msppNarrative.departmentsNone")}</strong> {t("msppNarrative.departmentsNoneDetail")}
        </p>
      )}
    </div>
  );
}

export function MsppRapportNarrative({
  loading,
  summary,
  trends,
  diseasesForRanking,
  regionsForRanking,
  filtersActive,
  className,
}: {
  loading: boolean;
  summary: MsppSummaryResponse | null;
  trends: MsppTrendsResponse | null;
  diseasesForRanking: MsppDiseasesResponse["diseases"];
  regionsForRanking: MsppGeographyResponse["regions"];
  filtersActive: boolean;
  /** Optional class for print layout (e.g. page-break hints). */
  className?: string;
}) {
  const { t } = useI18n();
  const trendTemplates = useTrendTemplates(t);

  if (loading) {
    return (
      <div style={MSPP_NARRATIVE_CARD} className={className}>
        <h2 style={MSPP_SECTION_TITLE}>{t("msppNarrative.rapportTitle")}</h2>
        <p style={{ color: "#64748b", margin: "8px 0 0" }}>{t("msppNarrative.loading")}</p>
      </div>
    );
  }

  const trendSentence = trends
    ? formatMonthOverMonthSentence(classifyMonthOverMonthTrend(trends.buckets), trendTemplates)
    : t("msppNarrative.trendUnavailable");
  const diseaseLines = diseasesForRanking.length ? topDiseaseLabels(diseasesForRanking, TOP_N) : [];
  const deptLines = regionsForRanking.length ? topDepartmentLabelsFromGeo(regionsForRanking, TOP_N) : [];

  const diseasesHeading = filtersActive
    ? interpolateNarrative(t("msppNarrative.diseasesPrincipalTopFiltered"), { n: TOP_N })
    : interpolateNarrative(t("msppNarrative.diseasesPrincipalTop"), { n: TOP_N });
  const departmentsHeading = filtersActive
    ? interpolateNarrative(t("msppNarrative.departmentsPrincipalTopFiltered"), { n: TOP_N })
    : interpolateNarrative(t("msppNarrative.departmentsPrincipalTop"), { n: TOP_N });

  return (
    <div style={MSPP_NARRATIVE_CARD} className={className}>
      <h2 style={MSPP_SECTION_TITLE}>{t("msppNarrative.rapportTitle")}</h2>
      <p style={MSPP_NARRATIVE_MUTED}>
        {t("msppNarrative.rapportScopeBefore")}
        <strong>{t("msppNarrative.rapportScopeEm1")}</strong>
        {t("msppNarrative.rapportScopeMid")}
        <strong>{t("msppNarrative.rapportScopeEm2")}</strong>
        {t("msppNarrative.rapportScopeAfter")}
      </p>
      {filtersActive && (
        <p style={{ ...MSPP_NARRATIVE_MUTED, fontWeight: 600, color: "#334155" }}>{t("msppNarrative.rapportFiltersNote")}</p>
      )}
      <p style={{ marginBottom: 10, color: "#334155", fontSize: 14, lineHeight: 1.5 }}>
        <strong>{t("msppNarrative.volumeNationalRapportLabel")}</strong>{" "}
        {summary !== null
          ? interpolateNarrative(t("msppNarrative.totalApprovedCasesShort"), { count: summary.totalApproved })
          : "—"}
      </p>
      <p style={{ marginBottom: 10, color: "#334155", fontSize: 14, lineHeight: 1.5 }}>
        <strong>{t("msppNarrative.trendRecentLabel")}</strong> {trendSentence}
      </p>
      {diseaseLines.length > 0 ? (
        <div style={{ marginBottom: 10 }}>
          <strong style={{ color: "#0f172a", fontSize: 14 }}>{diseasesHeading}</strong>
          <ul style={MSPP_NARRATIVE_LIST}>
            {diseaseLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p style={{ marginBottom: 10, color: "#334155", fontSize: 14 }}>
          <strong>{t("msppNarrative.diseasesNoneFiltered")}</strong>{" "}
          {t("msppNarrative.diseasesNoneFilteredDetail")}
        </p>
      )}
      {deptLines.length > 0 ? (
        <div style={{ marginBottom: 0 }}>
          <strong style={{ color: "#0f172a", fontSize: 14 }}>{departmentsHeading}</strong>
          <ul style={MSPP_NARRATIVE_LIST}>
            {deptLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p style={{ marginBottom: 0, color: "#334155", fontSize: 14 }}>
          <strong>{t("msppNarrative.departmentsNoneFiltered")}</strong>{" "}
          {t("msppNarrative.departmentsNoneFilteredDetail")}
        </p>
      )}
    </div>
  );
}
