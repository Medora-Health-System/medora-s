"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchDiseaseSummary, type DiseaseSummary } from "@/lib/publicHealthApi";

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
  const { facilityId, ready, canViewPublicHealth } = useFacilityAndRoles();
  const [summary, setSummary] = useState<DiseaseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportedFrom, setReportedFrom] = useState("");
  const [reportedTo, setReportedTo] = useState("");

  const load = useCallback(async () => {
    if (!facilityId || !canViewPublicHealth) return;
    setLoading(true);
    try {
      const from = reportedFrom || undefined;
      const to = reportedTo || undefined;
      const data = await fetchDiseaseSummary(facilityId, from, to);
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [facilityId, canViewPublicHealth, reportedFrom, reportedTo]);

  useEffect(() => {
    if (ready && facilityId && canViewPublicHealth) load();
  }, [ready, facilityId, canViewPublicHealth, load]);

  const defaultTo = new Date();
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setDate(defaultFrom.getDate() - 90);
  const fromPlaceholder = defaultFrom.toISOString().slice(0, 10);
  const toPlaceholder = defaultTo.toISOString().slice(0, 10);

  if (!ready) return <p>Chargement…</p>;
  if (!canViewPublicHealth) {
    return (
      <div>
        <h1>Résumé santé publique</h1>
        <p>Vous n&apos;avez pas accès.</p>
      </div>
    );
  }

  const STATUS_LABELS: Record<string, string> = { SUSPECTED: "Suspect", CONFIRMED: "Confirmé", RULED_OUT: "Écarté" };
  const byDisease = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const byCommune = new Map<string, number>();
  summary?.breakdown?.forEach((b) => {
    byDisease.set(b.diseaseName, (byDisease.get(b.diseaseName) ?? 0) + b.count);
    const statusLabel = STATUS_LABELS[b.status] ?? b.status;
    byStatus.set(statusLabel, (byStatus.get(statusLabel) ?? 0) + b.count);
    const c = b.commune ?? "—";
    byCommune.set(c, (byCommune.get(c) ?? 0) + b.count);
  });

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Résumé santé publique</h1>
      <p style={{ color: "#555", fontSize: 14, marginBottom: 20 }}>
        <Link href="/app/public-health/vaccinations">Vaccinations</Link>
        {" · "}
        <Link href="/app/public-health/disease-reports">Déclarations maladies</Link>
      </p>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Période</h3>
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
          <span>au</span>
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
          <button type="button" onClick={load} style={btnPrimary}>
            Actualiser
          </button>
        </div>
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : !summary ? (
        <p style={{ color: "#666" }}>Aucune donnée ou erreur lors du chargement.</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
            <div style={cardStyle}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Total déclarations</div>
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
              <h3 style={{ marginTop: 0 }}>Par maladie</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #ddd" }}>
                    <th style={{ padding: 8, textAlign: "left" }}>Maladie</th>
                    <th style={{ padding: 8, textAlign: "right" }}>Nombre</th>
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
              <h3 style={{ marginTop: 0 }}>Par commune</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #ddd" }}>
                    <th style={{ padding: 8, textAlign: "left" }}>Commune</th>
                    <th style={{ padding: 8, textAlign: "right" }}>Nombre</th>
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
            <h3 style={{ marginTop: 0 }}>Détail (maladie × statut × commune)</h3>
            {!summary.breakdown?.length ? (
              <p style={{ color: "#666" }}>Aucun détail sur la période.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #ddd" }}>
                      <th style={{ padding: 8, textAlign: "left" }}>Maladie</th>
                      <th style={{ padding: 8, textAlign: "left" }}>Statut</th>
                      <th style={{ padding: 8, textAlign: "left" }}>Commune</th>
                      <th style={{ padding: 8, textAlign: "right" }}>Nombre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.breakdown
                      .sort((a, b) => b.count - a.count)
                      .map((b, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: 8 }}>{b.diseaseName}</td>
                          <td style={{ padding: 8 }}>{STATUS_LABELS[b.status] ?? b.status}</td>
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
