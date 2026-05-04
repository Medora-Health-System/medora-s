"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { fetchCatalogAuditDashboard, type AdminCatalogAuditPayload } from "@/lib/catalogAuditApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

const CONFLICT_FLAG_PREFIX = new Set([
  "ROUTE_PUSH_BUT_INFUSION",
  "INFUSION_BUT_NOT_IV_ROUTE",
  "HYDRATION_MISMATCH",
  "THERAPEUTIC_MISMATCH",
  "UNKNOWN_HIGH_USAGE",
]);

function flagBadgeStyle(flag: string): CSSProperties {
  if (CONFLICT_FLAG_PREFIX.has(flag)) {
    return { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" };
  }
  return { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" };
}

function cardShell(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#fafafa",
    fontSize: 14,
  };
}

export default function AdminCatalogAuditPage() {
  const { t, language } = useI18n();
  const { ready, facilityId, isPlatformOperator } = useFacilityAndRoles();
  const [data, setData] = useState<AdminCatalogAuditPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) {
      setError(t("catalogAudit.errorFacility"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await fetchCatalogAuditDashboard(facilityId));
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setData(null);
      setError(normalizeUserFacingError(raw, language) || t("catalogAudit.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (!ready || !isPlatformOperator || !facilityId) return;
    void load();
  }, [ready, isPlatformOperator, facilityId, load]);

  const percents = useMemo(() => {
    if (!data?.summary.totalMedications) {
      return { classified: 0, unknown: 0 };
    }
    const total = data.summary.totalMedications;
    const classified = Math.round(((total - data.summary.unknownBillingClass) / total) * 1000) / 10;
    const unknown = Math.round((data.summary.unknownBillingClass / total) * 1000) / 10;
    return { classified, unknown };
  }, [data]);

  if (!ready) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (!isPlatformOperator) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("platformOps.restrictedBody")}</p>
        <Link href="/app">{t("catalogAudit.backApp")}</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
        {t("catalogAudit.backAdmin")}
      </Link>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 8 }}>
        <h1 style={{ margin: 0, flex: "1 1 200px" }}>{t("catalogAudit.title")}</h1>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid #1a1a1a",
            background: "#fff",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? t("common.loading") : t("catalogAudit.refresh")}
        </button>
      </div>

      <p style={{ color: "#555", maxWidth: 720, marginTop: 12 }}>{t("catalogAudit.intro")}</p>
      <p style={{ fontSize: 13, color: "#64748b", maxWidth: 720, marginTop: 8 }}>{t("catalogAudit.noPhiNote")}</p>

      {error ? <p style={{ color: "#b71c1c" }}>{error}</p> : null}

      {data ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
            marginTop: 16,
          }}
        >
          <div style={cardShell()}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t("catalogAudit.summary.classifiedPercent")}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{percents.classified}%</div>
          </div>
          <div style={cardShell()}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t("catalogAudit.summary.unknownPercent")}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{percents.unknown}%</div>
          </div>
          <div style={cardShell()}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t("catalogAudit.summary.conflicts")}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{data.summary.highRiskConflicts}</div>
          </div>
          <div style={cardShell()}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t("catalogAudit.summary.infusionCandidates")}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{data.summary.infusionCandidates}</div>
          </div>
          <div style={cardShell()}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t("catalogAudit.summary.totalMedications")}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{data.summary.totalMedications}</div>
          </div>
        </div>
      ) : null}

      {loading && !data ? (
        <p style={{ marginTop: 16, color: "#64748b" }}>{t("common.loading")}</p>
      ) : null}

      {data ? (
        <div style={{ marginTop: 20, overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={{ padding: "8px 10px" }}>{t("catalogAudit.colMedication")}</th>
                <th style={{ padding: "8px 10px" }}>{t("catalogAudit.colRoute")}</th>
                <th style={{ padding: "8px 10px" }}>{t("catalogAudit.colAdminType")}</th>
                <th style={{ padding: "8px 10px" }}>{t("catalogAudit.colBillingClass")}</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>{t("catalogAudit.colUsage")}</th>
                <th style={{ padding: "8px 10px" }}>{t("catalogAudit.colFlags")}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.catalogMedicationId} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 600 }}>{row.label}</td>
                  <td style={{ padding: "8px 10px", color: "#334155" }}>{row.route ?? "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#334155" }}>{row.administrationType ?? "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#334155" }}>{row.billingClass ?? "—"}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {row.usageCount ?? 0}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                      {row.flags.length ? (
                        row.flags.map((f) => (
                          <span
                            key={f}
                            title={f}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 9999,
                              whiteSpace: "nowrap",
                              ...flagBadgeStyle(f),
                            }}
                          >
                            {t(`catalogAudit.flags.${f}` as const)}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
