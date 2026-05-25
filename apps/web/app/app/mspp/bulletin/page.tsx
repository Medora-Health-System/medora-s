"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import "@/features/mspp/msppRapportPrint.css";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { interpolateNarrative } from "@/features/mspp/msppNarrativeLogic";
import {
  fetchMsppSummary,
  fetchMsppTrends,
  fetchMsppDiseases,
  fetchMsppGeography,
  fetchMsppSanitarySignals,
  fetchMsppCommuneSanitarySignals,
  fetchMsppAlertEscalations,
  fetchMsppValidationAnalytics,
  type MsppSummaryResponse,
  type MsppTrendsResponse,
  type MsppDiseasesResponse,
  type MsppGeographyResponse,
  type MsppSanitarySignalsResponse,
  type MsppCommuneSanitarySignalsResponse,
  type MsppAlertEscalationsResponse,
  type MsppValidationAnalyticsResponse,
} from "@/lib/msppApi";
import {
  MsppTrendLineChart,
  MsppTrendLineChartPrint,
  buildTrendChartData,
  MsppDiseaseBarChart,
  MsppDiseaseBarChartPrint,
  buildDiseaseBarData,
  MsppDepartmentBarChart,
  MsppDepartmentBarChartPrint,
  buildDepartmentBarDataFromGeo,
} from "@/features/mspp/MsppReportingCharts";
import { MsppHaitiHeatmap } from "@/features/mspp/MsppHaitiHeatmap";
import { MsppMinisterSignalBlock } from "@/features/mspp/MsppMinisterSignal";
import { MsppSanitarySignalsBlock } from "@/features/mspp/MsppSanitarySignalsBlock";
import { MsppEscalationsBlock } from "@/features/mspp/MsppEscalationsBlock";
import { MsppCommuneSurveillanceBlock } from "@/features/mspp/MsppCommuneSurveillanceBlock";
import {
  MSPP_ERROR_CALLOUT,
  MSPP_KPI_GRID,
  MSPP_KPI_LABEL,
  MSPP_KPI_TILE,
  MSPP_KPI_VALUE,
  MSPP_NAV_LINK,
  MSPP_NAV_ROW,
  MSPP_PAGE_SHELL,
  MSPP_PAGE_SUBTITLE,
  MSPP_PAGE_TITLE,
  MSPP_PRINT_BUTTON,
  MSPP_SECTION_CARD,
  MSPP_SECTION_SUBTITLE,
  MSPP_SECTION_TITLE,
} from "@/features/mspp/msppUiChrome";

const CHART_MAX = 14;

export default function MsppBulletinHebdomadairePage() {
  const { t, language } = useI18n();
  const { ready, msppRoles } = useFacilityAndRoles();
  const canMspp = msppRoles.length > 0;

  const [summary, setSummary] = useState<MsppSummaryResponse | null>(null);
  const [trends, setTrends] = useState<MsppTrendsResponse | null>(null);
  const [diseases, setDiseases] = useState<MsppDiseasesResponse | null>(null);
  const [geo, setGeo] = useState<MsppGeographyResponse | null>(null);
  const [sanitarySignals, setSanitarySignals] = useState<MsppSanitarySignalsResponse | null>(null);
  const [communeSignals, setCommuneSignals] = useState<MsppCommuneSanitarySignalsResponse | null>(null);
  const [escalations, setEscalations] = useState<MsppAlertEscalationsResponse | null>(null);
  const [validationAnalytics, setValidationAnalytics] = useState<MsppValidationAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printPreparing, setPrintPreparing] = useState(false);

  const load = useCallback(async () => {
    if (!canMspp) return;
    setLoading(true);
    setError(null);
    try {
      const [s, tr, d, g, sig, comm, esc, val] = await Promise.all([
        fetchMsppSummary(),
        fetchMsppTrends(),
        fetchMsppDiseases(),
        fetchMsppGeography(),
        fetchMsppSanitarySignals(),
        fetchMsppCommuneSanitarySignals(),
        fetchMsppAlertEscalations(),
        fetchMsppValidationAnalytics(),
      ]);
      setSummary(s);
      setTrends(tr);
      setDiseases(d);
      setGeo(g);
      setSanitarySignals(sig);
      setCommuneSignals(comm);
      setEscalations(esc);
      setValidationAnalytics(val);
    } catch {
      setError(t("msppBulletinPage.errorLoad"));
      setSummary(null);
      setTrends(null);
      setDiseases(null);
      setGeo(null);
      setSanitarySignals(null);
      setCommuneSignals(null);
      setEscalations(null);
      setValidationAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [canMspp, t]);

  useEffect(() => {
    if (ready && canMspp) void load();
    else if (ready && !canMspp) setLoading(false);
  }, [ready, canMspp, load]);

  useEffect(() => {
    const onAfterPrint = () => setPrintPreparing(false);
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  const requestPrint = useCallback(() => {
    if (loading || printPreparing) return;
    setPrintPreparing(true);
    requestAnimationFrame(() => {
      window.print();
    });
  }, [loading, printPreparing]);

  const diseaseRows = diseases?.diseases ?? [];
  const geoRows = geo?.regions ?? [];
  const trendData = buildTrendChartData(trends?.buckets ?? [], language);
  const diseaseChartData = buildDiseaseBarData(diseaseRows, { maxRows: CHART_MAX });
  const diseaseChartTruncated = diseaseRows.length > CHART_MAX;
  const deptChartData = buildDepartmentBarDataFromGeo(geoRows, { maxRows: CHART_MAX });
  const deptChartTruncated = geoRows.length > CHART_MAX;

  const printGeneratedLine = interpolateNarrative(t("msppBulletinPage.printHeaderGenerated"), {
    date: new Date().toLocaleString("fr-FR"),
  });

  const windowRef = escalations?.window ?? sanitarySignals?.window;

  if (!ready) {
    return (
      <div style={MSPP_PAGE_SHELL}>
        <p style={{ color: "#64748b", marginTop: 0 }}>{t("msppBulletinPage.loading")}</p>
      </div>
    );
  }
  if (!canMspp) {
    return (
      <div style={MSPP_PAGE_SHELL}>
        <h1 style={MSPP_PAGE_TITLE}>{t("msppBulletinPage.pageTitle")}</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>{t("msppBulletinPage.accessDenied")}</p>
      </div>
    );
  }

  return (
    <div style={MSPP_PAGE_SHELL}>
      <div
        className="mspp-no-print"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <button
          type="button"
          style={{
            ...MSPP_PRINT_BUTTON,
            opacity: loading || printPreparing ? 0.5 : 1,
            cursor: loading || printPreparing ? "not-allowed" : "pointer",
          }}
          disabled={loading || printPreparing}
          onClick={requestPrint}
        >
          {t("msppBulletinPage.printButton")}
        </button>
        <span style={{ fontSize: 13, color: "#64748b", maxWidth: 420, lineHeight: 1.45 }}>
          {loading
            ? t("msppBulletinPage.printButtonDisabledHint")
            : printPreparing
              ? t("msppBulletinPage.printPreparingHint")
              : t("msppBulletinPage.printHelper")}
        </span>
      </div>

      <div style={MSPP_NAV_ROW} className="mspp-no-print">
        <Link href="/app/mspp/dashboard" style={MSPP_NAV_LINK}>
          {t("msppBulletinPage.navDashboard")}
        </Link>
        <Link href="/app/mspp/rapport" style={MSPP_NAV_LINK}>
          {t("msppBulletinPage.navRapport")}
        </Link>
      </div>

      <div id="mspp-bulletin-print-root">
        <div className="mspp-rapport-print-only">
          <div className="mspp-rapport-print-brand" aria-hidden>
            <img src="/branding/mspp-logo.png" alt="" className="mspp-rapport-print-logo" width={200} height={56} />
          </div>
          <p className="mspp-rapport-print-header-title">{t("msppBulletinPage.printHeaderTitle")}</p>
          <p className="mspp-rapport-print-header-meta">{printGeneratedLine}</p>
          <p className="mspp-rapport-print-header-meta">{t("msppBulletinPage.printHeaderScope")}</p>
        </div>

        <h1 style={MSPP_PAGE_TITLE}>{t("msppBulletinPage.pageTitle")}</h1>
        <p style={MSPP_PAGE_SUBTITLE}>{t("msppBulletinPage.subtitle")}</p>
        {windowRef ? (
          <p style={{ ...MSPP_PAGE_SUBTITLE, fontSize: 13, color: "#475569", marginTop: -6 }}>
            {t("msppBulletinPage.signalWindowHint")}
          </p>
        ) : null}

        {error ? (
          <div style={MSPP_ERROR_CALLOUT} className="mspp-no-print" role="alert">
            <p style={{ color: "#991b1b", margin: 0, fontWeight: 600 }}>{error}</p>
          </div>
        ) : null}

        <MsppMinisterSignalBlock
          loading={loading}
          trends={trends}
          summary={summary}
          className="mspp-print-section mspp-minister-signal"
        />

        <div style={MSPP_SECTION_CARD} className="mspp-print-section">
          <h2 style={MSPP_SECTION_TITLE}>{t("msppBulletinPage.sectionKpiTitle")}</h2>
          <p style={MSPP_SECTION_SUBTITLE}>{t("msppBulletinPage.sectionKpiIntro")}</p>
          {loading ? (
            <p style={{ color: "#64748b", margin: 0 }}>{t("msppBulletinPage.loading")}</p>
          ) : (
            <div style={MSPP_KPI_GRID}>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppBulletinPage.kpiTotalApproved")}</div>
                <div style={MSPP_KPI_VALUE}>{summary?.totalApproved ?? "—"}</div>
              </div>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppBulletinPage.kpiEscalationsListed")}</div>
                <div style={MSPP_KPI_VALUE}>{escalations?.escalations.length ?? "—"}</div>
              </div>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppBulletinPage.kpiCommuneSignalsListed")}</div>
                <div style={MSPP_KPI_VALUE}>{communeSignals?.signals.length ?? "—"}</div>
              </div>
            </div>
          )}
        </div>

        <MsppSanitarySignalsBlock loading={loading} data={sanitarySignals} />

        <div className="mspp-print-section">
          <MsppEscalationsBlock loading={loading} data={escalations} />
        </div>

        <div style={MSPP_SECTION_CARD} className="mspp-print-section">
          <h2 style={MSPP_SECTION_TITLE}>{t("msppBulletinPage.sectionTrendsTitle")}</h2>
          <p style={MSPP_SECTION_SUBTITLE}>{t("msppBulletinPage.sectionTrendsIntro")}</p>
          {loading ? (
            <p style={{ color: "#64748b", margin: 0 }}>{t("msppBulletinPage.loading")}</p>
          ) : (
            <>
              <div className="mspp-rapport-screen-charts">
                <div className="mspp-print-chart-anchor mspp-print-chart-trend">
                  <MsppTrendLineChart data={trendData} />
                </div>
              </div>
              <div className="mspp-rapport-print-charts-only mspp-print-chart-anchor mspp-print-chart-trend">
                <MsppTrendLineChartPrint data={trendData} />
              </div>
            </>
          )}
        </div>

        <div style={MSPP_SECTION_CARD} className="mspp-print-section">
          <h2 style={MSPP_SECTION_TITLE}>{t("msppBulletinPage.sectionGeoMapTitle")}</h2>
          <p style={MSPP_SECTION_SUBTITLE}>{t("msppBulletinPage.sectionGeoMapIntro")}</p>
          <MsppHaitiHeatmap loading={loading} signals={sanitarySignals?.signals ?? []} />
        </div>

        <div style={MSPP_SECTION_CARD} className="mspp-print-section">
          <h2 style={MSPP_SECTION_TITLE}>{t("msppBulletinPage.sectionDiseaseBarsTitle")}</h2>
          {diseaseChartTruncated ? (
            <p style={MSPP_SECTION_SUBTITLE}>
              {t("msppBulletinPage.chartTruncatedNote").replace("{n}", String(CHART_MAX))}
            </p>
          ) : null}
          {loading ? (
            <p style={{ color: "#64748b", margin: 0 }}>{t("msppBulletinPage.loading")}</p>
          ) : (
            <>
              <div className="mspp-rapport-screen-charts">
                <div className="mspp-print-chart-anchor mspp-print-chart-bars">
                  <MsppDiseaseBarChart data={diseaseChartData} />
                </div>
              </div>
              <div className="mspp-rapport-print-charts-only mspp-print-chart-anchor mspp-print-chart-bars">
                <MsppDiseaseBarChartPrint data={diseaseChartData} />
              </div>
            </>
          )}
        </div>

        <div style={MSPP_SECTION_CARD} className="mspp-print-section">
          <h2 style={MSPP_SECTION_TITLE}>{t("msppBulletinPage.sectionDeptBarsTitle")}</h2>
          {deptChartTruncated ? (
            <p style={MSPP_SECTION_SUBTITLE}>
              {t("msppBulletinPage.chartTruncatedDeptNote").replace("{n}", String(CHART_MAX))}
            </p>
          ) : null}
          {loading ? (
            <p style={{ color: "#64748b", margin: 0 }}>{t("msppBulletinPage.loading")}</p>
          ) : (
            <>
              <div className="mspp-rapport-screen-charts">
                <div className="mspp-print-chart-anchor mspp-print-chart-bars">
                  <MsppDepartmentBarChart data={deptChartData} />
                </div>
              </div>
              <div className="mspp-rapport-print-charts-only mspp-print-chart-anchor mspp-print-chart-bars">
                <MsppDepartmentBarChartPrint data={deptChartData} />
              </div>
            </>
          )}
        </div>

        <div className="mspp-print-section">
          <MsppCommuneSurveillanceBlock loading={loading} data={communeSignals} />
        </div>

        <div style={MSPP_SECTION_CARD} className="mspp-print-section">
          <h2 style={MSPP_SECTION_TITLE}>{t("msppBulletinPage.sectionValidationTitle")}</h2>
          <p style={MSPP_SECTION_SUBTITLE}>{t("msppBulletinPage.sectionValidationIntro")}</p>
          {validationAnalytics ? (
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>{validationAnalytics.scopeNote}</p>
          ) : null}
          {loading ? (
            <p style={{ color: "#64748b", margin: 0 }}>{t("msppBulletinPage.loading")}</p>
          ) : validationAnalytics ? (
            <div style={MSPP_KPI_GRID}>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppBulletinPage.validationPendingDept")}</div>
                <div style={MSPP_KPI_VALUE}>{validationAnalytics.summary.pendingDepartment}</div>
              </div>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppBulletinPage.validationPendingCentral")}</div>
                <div style={MSPP_KPI_VALUE}>{validationAnalytics.summary.pendingCentral}</div>
              </div>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppBulletinPage.validationApproved")}</div>
                <div style={MSPP_KPI_VALUE}>{validationAnalytics.summary.approvedCentral}</div>
              </div>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppBulletinPage.validationRejected")}</div>
                <div style={MSPP_KPI_VALUE}>{validationAnalytics.summary.rejectedTotal}</div>
              </div>
              <div style={MSPP_KPI_TILE}>
                <div style={MSPP_KPI_LABEL}>{t("msppBulletinPage.validationRequeue")}</div>
                <div style={MSPP_KPI_VALUE}>{validationAnalytics.summary.requeueEventsTotal}</div>
              </div>
            </div>
          ) : (
            <p style={{ color: "#64748b", margin: 0 }}>—</p>
          )}
        </div>

        <div style={{ ...MSPP_SECTION_CARD, marginBottom: 0 }} className="mspp-print-section">
          <h2 style={MSPP_SECTION_TITLE}>{t("msppBulletinPage.sectionMethodologyTitle")}</h2>
          <p style={{ ...MSPP_SECTION_SUBTITLE, marginBottom: 8 }}>{t("msppBulletinPage.sectionMethodologyP1")}</p>
          <p style={{ ...MSPP_SECTION_SUBTITLE, marginBottom: 8 }}>{t("msppBulletinPage.sectionMethodologyP2")}</p>
          <p style={{ ...MSPP_SECTION_SUBTITLE, marginBottom: 0 }}>{t("msppBulletinPage.sectionMethodologyP3")}</p>
        </div>
      </div>
    </div>
  );
}
