"use client";

import React, { useCallback, useEffect, useState } from "react";
import "@/features/mspp/msppRapportPrint.css";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { interpolateNarrative } from "@/features/mspp/msppNarrativeLogic";
import {
  fetchMsppDiseases,
  fetchMsppGeography,
  fetchMsppSummary,
  fetchMsppTrends,
  type MsppDiseasesResponse,
  type MsppGeographyResponse,
  type MsppSummaryResponse,
  type MsppTrendsResponse,
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
import { MsppHaitiDepartmentMap } from "@/features/mspp/MsppHaitiDepartmentMap";
import { MsppSurveillancePanel } from "@/features/mspp/MsppAlertBadges";
import { MsppMinisterSignalBlock } from "@/features/mspp/MsppMinisterSignal";
import { MsppRapportNarrative } from "@/features/mspp/MsppNarrativeInsights";
import {
  MSPP_EMPTY_STATE,
  MSPP_ERROR_CALLOUT,
  MSPP_FILTER_LABEL,
  MSPP_INPUT,
  MSPP_KPI_GRID,
  MSPP_KPI_LABEL,
  MSPP_KPI_TILE,
  MSPP_KPI_VALUE,
  MSPP_PAGE_SHELL,
  MSPP_PAGE_SUBTITLE,
  MSPP_PAGE_TITLE,
  MSPP_PRINT_BUTTON,
  MSPP_SECTION_CARD,
  MSPP_SECTION_SUBTITLE,
  MSPP_SECTION_TITLE,
  MSPP_TABLE,
  MSPP_TABLE_CELL,
  MSPP_TABLE_HEAD_CELL,
} from "@/features/mspp/msppUiChrome";

const CHART_MAX = 18;

export default function MsppRapportPage() {
  const { t } = useI18n();
  const { ready, msppRoles } = useFacilityAndRoles();
  const canMspp = msppRoles.length > 0;

  const [summary, setSummary] = useState<MsppSummaryResponse | null>(null);
  const [diseases, setDiseases] = useState<MsppDiseasesResponse | null>(null);
  const [geo, setGeo] = useState<MsppGeographyResponse | null>(null);
  const [trends, setTrends] = useState<MsppTrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printPreparing, setPrintPreparing] = useState(false);

  const [filterDisease, setFilterDisease] = useState("");
  const [filterDept, setFilterDept] = useState("");

  const load = useCallback(async () => {
    if (!canMspp) return;
    setLoading(true);
    setError(null);
    try {
      const [s, d, g, t] = await Promise.all([
        fetchMsppSummary(),
        fetchMsppDiseases(),
        fetchMsppGeography(),
        fetchMsppTrends(),
      ]);
      setSummary(s);
      setDiseases(d);
      setGeo(g);
      setTrends(t);
    } catch {
      setError("Impossible de charger les rapports.");
      setSummary(null);
      setDiseases(null);
      setGeo(null);
      setTrends(null);
    } finally {
      setLoading(false);
    }
  }, [canMspp]);

  useEffect(() => {
    if (ready && canMspp) void load();
    else if (ready && !canMspp) setLoading(false);
  }, [ready, canMspp, load]);

  useEffect(() => {
    const onAfterPrint = () => {
      setPrintPreparing(false);
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  const requestMsppRapportPrint = useCallback(() => {
    if (loading || printPreparing) return;
    setPrintPreparing(true);
    requestAnimationFrame(() => {
      window.print();
    });
  }, [loading, printPreparing]);

  const diseaseRows =
    diseases?.diseases.filter((x) => {
      if (filterDisease.trim()) {
        const q = filterDisease.toLowerCase();
        return x.diseaseCode.toLowerCase().includes(q) || x.diseaseName.toLowerCase().includes(q);
      }
      return true;
    }) ?? [];

  const geoRows =
    geo?.regions.filter((r) => {
      if (!filterDept.trim()) return true;
      const q = filterDept.toLowerCase();
      return (
        (r.departmentName ?? "").toLowerCase().includes(q) || (r.departmentCode ?? "").toLowerCase().includes(q)
      );
    }) ?? [];

  const trendData = buildTrendChartData(trends?.buckets ?? []);
  const diseaseChartData = buildDiseaseBarData(diseaseRows, { maxRows: CHART_MAX });
  const diseaseChartTruncated = diseaseRows.length > CHART_MAX;
  const deptChartData = buildDepartmentBarDataFromGeo(geoRows, { maxRows: CHART_MAX });
  const deptChartTruncated = geoRows.length > CHART_MAX;

  if (!ready) {
    return (
      <div style={MSPP_PAGE_SHELL}>
        <p style={{ color: "#64748b", marginTop: 0 }}>Chargement…</p>
      </div>
    );
  }
  if (!canMspp) {
    return (
      <div style={MSPP_PAGE_SHELL}>
        <h1 style={MSPP_PAGE_TITLE}>MSPP — Rapport</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>Vous n&apos;avez pas accès au portail MSPP.</p>
      </div>
    );
  }

  /** Impression MSPP : date toujours formatée en français (expérience exclusivement FR). */
  const printGeneratedLine = interpolateNarrative(t("msppRapportPrint.printHeaderGenerated"), {
    date: new Date().toLocaleString("fr-FR"),
  });

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
          onClick={requestMsppRapportPrint}
        >
          {t("msppRapportPrint.printButton")}
        </button>
        <span style={{ fontSize: 13, color: "#64748b", maxWidth: 420, lineHeight: 1.45 }}>
          {loading
            ? t("msppRapportPrint.printButtonDisabledHint")
            : printPreparing
              ? t("msppRapportPrint.printPreparingHint")
              : t("msppRapportPrint.printHelper")}
        </span>
      </div>

      <div id="mspp-rapport-print-root">
        <div className="mspp-rapport-print-only">
          <div className="mspp-rapport-print-brand" aria-hidden>
            <img src="/branding/mspp-logo.png" alt="" className="mspp-rapport-print-logo" width={200} height={56} />
          </div>
          <p className="mspp-rapport-print-header-title">{t("msppRapportPrint.printHeaderTitle")}</p>
          <p className="mspp-rapport-print-header-meta">{printGeneratedLine}</p>
          <p className="mspp-rapport-print-header-meta">{t("msppRapportPrint.printHeaderScope")}</p>
        </div>

        <h1 style={MSPP_PAGE_TITLE}>MSPP — Rapport</h1>
        <p style={MSPP_PAGE_SUBTITLE}>
          Agrégats nationaux basés uniquement sur les dossiers <strong>approuvés au niveau central</strong> (pas de données
          par établissement dans cette vue).
        </p>

        <MsppMinisterSignalBlock
          loading={loading}
          trends={trends}
          summary={summary}
          className="mspp-print-section mspp-minister-signal"
        />

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 18,
            alignItems: "flex-start",
            marginBottom: 18,
          }}
        >
          <div style={{ flex: "1 1 300px", maxWidth: "100%", minWidth: 0 }}>
            <MsppSurveillancePanel
              className="mspp-print-section"
              loading={loading}
              trends={trends}
              regions={geoRows}
              diseases={diseaseRows}
              departmentRankingFiltered={filterDept.trim() !== ""}
              omitNational
              watchlistColumns
              mapCrossRef="rapport"
            />
          </div>
          <div style={{ flex: "2 1 360px", minWidth: 0 }}>
            <MsppRapportNarrative
              className="mspp-print-section"
              loading={loading}
              summary={summary}
              trends={trends}
              diseasesForRanking={diseaseRows}
              regionsForRanking={geoRows}
              filtersActive={filterDisease.trim() !== "" || filterDept.trim() !== ""}
            />
          </div>
        </div>

        <div className="mspp-no-print" style={MSPP_SECTION_CARD}>
          <h2 style={MSPP_SECTION_TITLE}>Filtres (côté interface)</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", marginTop: 4 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <span style={MSPP_FILTER_LABEL}>Maladie (code ou libellé)</span>
            <input
              value={filterDisease}
              onChange={(e) => setFilterDisease(e.target.value)}
              style={MSPP_INPUT}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <span style={MSPP_FILTER_LABEL}>Département</span>
            <input value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={MSPP_INPUT} />
          </label>
        </div>
          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 0, marginTop: 14 }}>
            Filtre par période : non disponible pour l’instant (API nationale sans paramètres de dates).
          </p>
        </div>

        {error && (
          <div style={MSPP_ERROR_CALLOUT} className="mspp-print-section" role="alert">
            <p style={{ color: "#991b1b", margin: 0, fontWeight: 600 }}>{error}</p>
          </div>
        )}

        <div style={MSPP_SECTION_CARD} className="mspp-print-section">
          <h2 style={MSPP_SECTION_TITLE}>Synthèse</h2>
        {loading ? (
          <p style={{ color: "#64748b", margin: 0 }}>Chargement…</p>
        ) : (
          <div style={MSPP_KPI_GRID}>
            <div style={MSPP_KPI_TILE}>
              <div style={MSPP_KPI_LABEL}>Total approuvé (national)</div>
              <div style={MSPP_KPI_VALUE}>{summary?.totalApproved ?? "—"}</div>
            </div>
          </div>
        )}
        </div>

        <div style={MSPP_SECTION_CARD} className="mspp-print-section">
          <h2 style={MSPP_SECTION_TITLE}>Tendance mensuelle (cas approuvés)</h2>
        <p style={MSPP_SECTION_SUBTITLE}>
          Basé sur la date de revue centrale. Les filtres ci-dessus ne s’appliquent pas à cette série (agrégat national
          intégral).
        </p>
        {loading ? (
          <p style={{ color: "#64748b", margin: 0 }}>Chargement…</p>
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
          <h2 style={MSPP_SECTION_TITLE}>Graphique — répartition par maladie</h2>
        {diseaseChartTruncated && (
          <p style={MSPP_SECTION_SUBTITLE}>
            Affichage des {CHART_MAX} entrées les plus représentées parmi les lignes filtrées.
          </p>
        )}
        {loading ? (
          <p style={{ color: "#64748b", margin: 0 }}>Chargement…</p>
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
          <h2 style={MSPP_SECTION_TITLE}>Graphique — répartition par département géographique</h2>
        {deptChartTruncated && (
          <p style={MSPP_SECTION_SUBTITLE}>
            Affichage des {CHART_MAX} départements les plus représentés parmi les lignes filtrées.
          </p>
        )}
        {loading ? (
          <p style={{ color: "#64748b", margin: 0 }}>Chargement…</p>
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

        <div style={MSPP_SECTION_CARD} className="mspp-print-section">
          <h2 style={MSPP_SECTION_TITLE}>Carte — départements (Haïti)</h2>
        <p style={MSPP_SECTION_SUBTITLE}>
          Intensité du remplissage selon les cas approuvés (même filtre « Département » que le tableau et le graphique
          ci-dessus). Passez le curseur sur un département pour voir le détail.
        </p>
          <MsppHaitiDepartmentMap regions={geoRows} loading={loading} />
        </div>

        <div style={MSPP_SECTION_CARD} className="mspp-print-section">
          <h2 style={MSPP_SECTION_TITLE}>Par maladie (agrégat approuvé)</h2>
        {loading ? (
          <p style={{ color: "#64748b", margin: 0 }}>Chargement…</p>
        ) : diseaseRows.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={MSPP_TABLE}>
              <thead>
                <tr>
                  <th style={MSPP_TABLE_HEAD_CELL}>Code</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>Maladie</th>
                  <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>Nombre</th>
                </tr>
              </thead>
              <tbody>
                {diseaseRows.map((row) => (
                  <tr key={row.diseaseCode}>
                    <td style={MSPP_TABLE_CELL}>{row.diseaseCode}</td>
                    <td style={MSPP_TABLE_CELL}>{row.diseaseName}</td>
                    <td style={{ ...MSPP_TABLE_CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={MSPP_EMPTY_STATE}>Aucune ligne.</p>
        )}
        </div>

        <div style={{ ...MSPP_SECTION_CARD, marginBottom: 0 }} className="mspp-print-section">
          <h2 style={MSPP_SECTION_TITLE}>Par département géographique</h2>
        {loading ? (
          <p style={{ color: "#64748b", margin: 0 }}>Chargement…</p>
        ) : geoRows.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={MSPP_TABLE}>
              <thead>
                <tr>
                  <th style={MSPP_TABLE_HEAD_CELL}>Département</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>Code</th>
                  <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>Cas approuvés</th>
                </tr>
              </thead>
              <tbody>
                {geoRows.map((row) => (
                  <tr key={row.departmentId}>
                    <td style={MSPP_TABLE_CELL}>{row.departmentName ?? "—"}</td>
                    <td style={MSPP_TABLE_CELL}>{row.departmentCode ?? "—"}</td>
                    <td style={{ ...MSPP_TABLE_CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {row.approvedCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={MSPP_EMPTY_STATE}>Aucune ligne.</p>
        )}
        </div>
      </div>
    </div>
  );
}
