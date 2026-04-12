"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchDiseaseSummary,
  fetchDiseaseSummaryNational,
  type DiseaseSummary,
} from "@/lib/publicHealthApi";
import { PublicHealthFacilityRequiredBlock } from "@/features/public-health/PublicHealthFacilityRequiredBlock";

const btnPrimary: React.CSSProperties = {
  padding: "8px 16px",
  backgroundColor: "#1a1a1a",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 14,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  padding: 24,
  borderRadius: 4,
  marginBottom: 20,
  border: "1px solid #eee",
};

export default function PublicHealthSummaryPage() {
  const { t } = useI18n();
  const { facilityId, ready, canViewPublicHealthSummary, isMsppOnlyUser } = useFacilityAndRoles();
  const nationalRead = Boolean(isMsppOnlyUser && canViewPublicHealthSummary);

  const [summary, setSummary] = useState<DiseaseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportedFrom, setReportedFrom] = useState("");
  const [reportedTo, setReportedTo] = useState("");

  const load = useCallback(async () => {
    if (!canViewPublicHealthSummary) return;
    if (!nationalRead && !facilityId) return;
    setLoading(true);
    try {
      const from = reportedFrom || undefined;
      const to = reportedTo || undefined;
      const data = nationalRead
        ? await fetchDiseaseSummaryNational(from, to)
        : await fetchDiseaseSummary(facilityId!, from, to);
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [facilityId, canViewPublicHealthSummary, nationalRead, reportedFrom, reportedTo]);

  useEffect(() => {
    if (!ready || !canViewPublicHealthSummary) return;
    if (nationalRead || facilityId) void load();
  }, [ready, facilityId, canViewPublicHealthSummary, nationalRead, load]);

  const defaultTo = new Date();
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setDate(defaultFrom.getDate() - 90);
  const fromPlaceholder = defaultFrom.toISOString().slice(0, 10);
  const toPlaceholder = defaultTo.toISOString().slice(0, 10);

  if (!ready) return <p>{t("common.loading")}</p>;
  if (!canViewPublicHealthSummary) {
    return (
      <div>
        <h1>{t("nav.publicHealth")}</h1>
        <p>{t("diseaseReports.accessDenied")}</p>
      </div>
    );
  }
  if (!nationalRead && !facilityId) {
    return <PublicHealthFacilityRequiredBlock />;
  }

  const statusLabel = (code: string) => {
    const key = `diseaseReports.statuses.${code}`;
    const out = t(key);
    return out === key ? code : out;
  };

  const byDisease = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const byCommune = new Map<string, number>();
  summary?.breakdown?.forEach((b) => {
    byDisease.set(b.diseaseName, (byDisease.get(b.diseaseName) ?? 0) + b.count);
    const statusL = statusLabel(b.status);
    byStatus.set(statusL, (byStatus.get(statusL) ?? 0) + b.count);
    const c = b.commune ?? "—";
    byCommune.set(c, (byCommune.get(c) ?? 0) + b.count);
  });

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t("publicHealthSummary.pageTitle")}</h1>
      {nationalRead ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: 8,
            fontSize: 14,
            color: "#14532d",
          }}
        >
          <strong>{t("publicHealthNational.readOnlyBanner")}</strong>
          {" — "}
          {t("publicHealthNational.actionsNeedFacility")}
        </div>
      ) : null}
      <p style={{ color: "#555", fontSize: 14, marginBottom: 20 }}>
        <Link href="/app/public-health/vaccinations">{t("nav.vaccinations")}</Link>
        {" · "}
        <Link href="/app/public-health/disease-reports">{t("nav.diseaseReports")}</Link>
      </p>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>{t("publicHealthSummary.periodTitle")}</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <input
            type="date"
            style={{
              padding: "8px 10px",
              borderRadius: 4,
              border: "1px solid #ccc",
              fontSize: 14,
            }}
            placeholder={fromPlaceholder}
            value={reportedFrom}
            onChange={(e) => setReportedFrom(e.target.value)}
          />
          <span>{t("publicHealthSummary.periodTo")}</span>
          <input
            type="date"
            style={{
              padding: "8px 10px",
              borderRadius: 4,
              border: "1px solid #ccc",
              fontSize: 14,
            }}
            placeholder={toPlaceholder}
            value={reportedTo}
            onChange={(e) => setReportedTo(e.target.value)}
          />
          <button type="button" onClick={() => void load()} style={btnPrimary}>
            {t("publicHealthSummary.refresh")}
          </button>
        </div>
      </div>

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : !summary ? (
        <p style={{ color: "#666" }}>{t("publicHealthSummary.loadError")}</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div style={cardStyle}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                {t("publicHealthSummary.totalReports")}
              </div>
              <div style={{ fontSize: 28, fontWeight: 600 }}>{summary.totalReports}</div>
            </div>
            {Array.from(byStatus.entries()).map(([s, count]) => (
              <div key={s} style={cardStyle}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{s}</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{count}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>{t("publicHealthSummary.byDisease")}</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #ddd" }}>
                    <th style={{ padding: 8, textAlign: "left" }}>{t("publicHealthSummary.disease")}</th>
                    <th style={{ padding: 8, textAlign: "right" }}>{t("publicHealthSummary.count")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(byDisease.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, count]) => (
                      <tr key={name} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: 8 }}>{name}</td>
                        <td style={{ padding: 8, textAlign: "right" }}>{count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>{t("publicHealthSummary.byCommune")}</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #ddd" }}>
                    <th style={{ padding: 8, textAlign: "left" }}>{t("publicHealthSummary.commune")}</th>
                    <th style={{ padding: 8, textAlign: "right" }}>{t("publicHealthSummary.count")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(byCommune.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([commune, count]) => (
                      <tr key={commune} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: 8 }}>{commune}</td>
                        <td style={{ padding: 8, textAlign: "right" }}>{count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>{t("publicHealthSummary.detailTitle")}</h3>
            {!summary.breakdown?.length ? (
              <p style={{ color: "#666" }}>{t("publicHealthSummary.detailEmpty")}</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #ddd" }}>
                      <th style={{ padding: 8, textAlign: "left" }}>{t("publicHealthSummary.tableDisease")}</th>
                      <th style={{ padding: 8, textAlign: "left" }}>{t("publicHealthSummary.tableStatus")}</th>
                      <th style={{ padding: 8, textAlign: "left" }}>{t("publicHealthSummary.tableCommuneCol")}</th>
                      <th style={{ padding: 8, textAlign: "right" }}>{t("publicHealthSummary.tableCount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.breakdown
                      .sort((a, b) => b.count - a.count)
                      .map((b, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: 8 }}>{b.diseaseName}</td>
                          <td style={{ padding: 8 }}>{statusLabel(b.status)}</td>
                          <td style={{ padding: 8 }}>{b.commune ?? "—"}</td>
                          <td style={{ padding: 8, textAlign: "right" }}>{b.count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
