"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  fetchMsppSummary,
  fetchMsppTrends,
  fetchMsppDiseases,
  fetchMsppGeography,
  fetchMsppSanitarySignals,
  type MsppSummaryResponse,
  type MsppTrendsResponse,
  type MsppDiseasesResponse,
  type MsppGeographyResponse,
  type MsppSanitarySignalsResponse,
} from "@/lib/msppApi";
import {
  MsppTrendLineChart,
  buildTrendChartData,
  MsppDiseaseBarChart,
  buildDiseaseBarData,
} from "@/features/mspp/MsppReportingCharts";
import { MsppSurveillancePanel } from "@/features/mspp/MsppAlertBadges";
import { MsppMinisterSignalBlock } from "@/features/mspp/MsppMinisterSignal";
import { MsppDashboardNarrative } from "@/features/mspp/MsppNarrativeInsights";
import { MsppSanitarySignalsBlock } from "@/features/mspp/MsppSanitarySignalsBlock";
import {
  MSPP_EMPTY_STATE,
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
  MSPP_SECTION_CARD,
  MSPP_SECTION_SUBTITLE,
  MSPP_SECTION_TITLE,
  MSPP_TABLE,
  MSPP_TABLE_CELL,
  MSPP_TABLE_HEAD_CELL,
} from "@/features/mspp/msppUiChrome";

const DISEASE_CHART_MAX = 18;

export default function MsppDashboardPage() {
  const { ready, msppRoles } = useFacilityAndRoles();
  const [summary, setSummary] = useState<MsppSummaryResponse | null>(null);
  const [trends, setTrends] = useState<MsppTrendsResponse | null>(null);
  const [diseases, setDiseases] = useState<MsppDiseasesResponse | null>(null);
  const [geo, setGeo] = useState<MsppGeographyResponse | null>(null);
  const [sanitarySignals, setSanitarySignals] = useState<MsppSanitarySignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canMspp = msppRoles.length > 0;

  const load = useCallback(async () => {
    if (!canMspp) return;
    setLoading(true);
    setError(null);
    try {
      const [s, t, d, g, sig] = await Promise.all([
        fetchMsppSummary(),
        fetchMsppTrends(),
        fetchMsppDiseases(),
        fetchMsppGeography(),
        fetchMsppSanitarySignals(),
      ]);
      setSummary(s);
      setTrends(t);
      setDiseases(d);
      setGeo(g);
      setSanitarySignals(sig);
    } catch {
      setError("Impossible de charger les indicateurs.");
      setSummary(null);
      setTrends(null);
      setDiseases(null);
      setGeo(null);
      setSanitarySignals(null);
    } finally {
      setLoading(false);
    }
  }, [canMspp]);

  useEffect(() => {
    if (ready && canMspp) void load();
    else if (ready && !canMspp) setLoading(false);
  }, [ready, canMspp, load]);

  const trendData = buildTrendChartData(trends?.buckets ?? []);
  const diseaseBarData = buildDiseaseBarData(diseases?.diseases ?? [], { maxRows: DISEASE_CHART_MAX });
  const diseaseTruncated = (diseases?.diseases.length ?? 0) > DISEASE_CHART_MAX;

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
        <h1 style={MSPP_PAGE_TITLE}>MSPP — Tableau de bord</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>Vous n&apos;avez pas accès au portail MSPP.</p>
      </div>
    );
  }

  return (
    <div style={MSPP_PAGE_SHELL}>
      <h1 style={MSPP_PAGE_TITLE}>MSPP — Tableau de bord</h1>
      <p style={MSPP_PAGE_SUBTITLE}>
        Vue nationale (agrégats approuvés au niveau central). Les liens ci-dessous mènent au rapport détaillé et à la file
        de validation.
      </p>

      <div style={MSPP_NAV_ROW}>
        <Link href="/app/mspp/rapport" style={MSPP_NAV_LINK}>
          Rapport et agrégats
        </Link>
        <Link href="/app/mspp/validation" style={MSPP_NAV_LINK}>
          File de validation
        </Link>
      </div>

      <MsppMinisterSignalBlock compact loading={loading} trends={trends} summary={summary} />

      <MsppSanitarySignalsBlock loading={loading} data={sanitarySignals} />

      <MsppSurveillancePanel
        compact
        loading={loading}
        trends={trends}
        regions={geo?.regions ?? []}
        diseases={diseases?.diseases ?? []}
        omitNational
        watchlistColumns
        mapCrossRef="dashboard"
      />

      <MsppDashboardNarrative loading={loading} summary={summary} trends={trends} diseases={diseases} />

      {error && (
        <div style={MSPP_ERROR_CALLOUT} role="alert">
          <p style={{ color: "#991b1b", margin: 0, fontWeight: 600 }}>{error}</p>
        </div>
      )}

      <div style={MSPP_SECTION_CARD}>
        <h2 style={MSPP_SECTION_TITLE}>Indicateurs (cas approuvés centralement)</h2>
        {loading ? (
          <p style={{ color: "#64748b", margin: 0 }}>Chargement…</p>
        ) : (
          <div style={MSPP_KPI_GRID}>
            <div style={MSPP_KPI_TILE}>
              <div style={MSPP_KPI_LABEL}>Total approuvé</div>
              <div style={MSPP_KPI_VALUE}>{summary?.totalApproved ?? "—"}</div>
            </div>
          </div>
        )}
      </div>

      <div style={MSPP_SECTION_CARD}>
        <h2 style={MSPP_SECTION_TITLE}>Cas approuvés dans le temps</h2>
        <p style={MSPP_SECTION_SUBTITLE}>Agrégation mensuelle selon la date de revue centrale (UTC).</p>
        {loading ? (
          <p style={{ color: "#64748b", margin: 0 }}>Chargement…</p>
        ) : (
          <MsppTrendLineChart data={trendData} />
        )}
      </div>

      <div style={MSPP_SECTION_CARD}>
        <h2 style={MSPP_SECTION_TITLE}>Cas approuvés par maladie</h2>
        {diseaseTruncated && (
          <p style={MSPP_SECTION_SUBTITLE}>
            Affichage des {DISEASE_CHART_MAX} maladies les plus représentées (tri par nombre décroissant).
          </p>
        )}
        {loading ? (
          <p style={{ color: "#64748b", margin: 0 }}>Chargement…</p>
        ) : (
          <MsppDiseaseBarChart data={diseaseBarData} />
        )}
      </div>

      <div style={{ ...MSPP_SECTION_CARD, marginBottom: 0 }}>
        <h2 style={MSPP_SECTION_TITLE}>Répartition par département géographique</h2>
        {loading ? (
          <p style={{ color: "#64748b", margin: 0 }}>Chargement…</p>
        ) : summary && summary.byDepartment.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={MSPP_TABLE}>
              <thead>
                <tr>
                  <th style={MSPP_TABLE_HEAD_CELL}>Département</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>Code</th>
                  <th style={{ ...MSPP_TABLE_HEAD_CELL, textAlign: "right" }}>Nombre</th>
                </tr>
              </thead>
              <tbody>
                {summary.byDepartment.map((row) => (
                  <tr key={row.departmentId}>
                    <td style={MSPP_TABLE_CELL}>{row.departmentName ?? "—"}</td>
                    <td style={MSPP_TABLE_CELL}>{row.departmentCode ?? "—"}</td>
                    <td style={{ ...MSPP_TABLE_CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={MSPP_EMPTY_STATE}>Aucune donnée agrégée.</p>
        )}
      </div>
    </div>
  );
}
