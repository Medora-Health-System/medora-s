"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchExportMonitoring,
  postExportMonitoringRetry,
  type ExportMonitoringFilter,
  type ExportMonitoringPayload,
  type ExportMonitoringRecentRow,
} from "@/lib/exportMonitoringApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

function labelOrRaw(t: (k: string) => string, prefix: string, raw: string): string {
  const k = `${prefix}.${raw}`;
  const out = t(k);
  return out === k ? raw : out;
}

function fmtTs(iso: string | null, locale: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(locale === "en" ? "en-US" : "fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminExportMonitoringPage() {
  const { t, language } = useI18n();
  const { ready, facilityId, roles } = useFacilityAndRoles();
  const isAdmin = roles.includes("ADMIN");
  const [filter, setFilter] = useState<ExportMonitoringFilter>("all");
  const [data, setData] = useState<ExportMonitoringPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryingKey, setRetryingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await fetchExportMonitoring(facilityId, filter);
      setData(d);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setData(null);
      setError(normalizeUserFacingError(raw, language) || t("exportMonitoring.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, filter, language, t]);

  useEffect(() => {
    if (!ready || !isAdmin || !facilityId) return;
    void load();
  }, [ready, isAdmin, facilityId, load]);

  const onRetry = async (row: ExportMonitoringRecentRow) => {
    if (!facilityId || !row.retryable || !row.from || (row.format !== "json" && row.format !== "csv")) return;
    const key = row.id;
    setRetryingKey(key);
    setError(null);
    try {
      await postExportMonitoringRetry(facilityId, {
        exportType: "external_billing_daily",
        date: row.from,
        format: row.format,
      });
      await load();
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("exportMonitoring.errorRetry"));
    } finally {
      setRetryingKey(null);
    }
  };

  if (!ready) {
    return <div style={{ padding: 24 }}>{t("common.loading")}</div>;
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 24, maxWidth: 640 }}>
        <p>{t("exportMonitoring.accessDenied")}</p>
        <Link href="/app">{t("common.back")}</Link>
      </div>
    );
  }

  const s = data?.summary;
  const locale = language === "en" ? "en-US" : "fr-FR";

  return (
    <div style={{ padding: 24, maxWidth: 1280 }}>
      <p style={{ marginTop: 0 }}>
        <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
          {t("exportMonitoring.backAdmin")}
        </Link>
      </p>
      <h1 style={{ marginTop: 8 }}>{t("exportMonitoring.title")}</h1>
      <p style={{ color: "#555", maxWidth: 720 }}>{t("exportMonitoring.intro")}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {(["all", "billing", "ed_reports", "failures"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: filter === f ? "2px solid #1a1a1a" : "1px solid #cbd5e1",
              background: filter === f ? "#f1f5f9" : "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {t(`exportMonitoring.filter.${f}`)}
          </button>
        ))}
      </div>

      {s ? (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#fafafa" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t("exportMonitoring.cardLastBilling")}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>{fmtTs(s.lastExternalBillingExportAt, locale)}</div>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#fafafa" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t("exportMonitoring.cardLastEd")}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>{fmtTs(s.lastEdReportExportAt, locale)}</div>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#fafafa" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t("exportMonitoring.cardFailures48h")}</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>{s.failedExportsLast48h}</div>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#fafafa" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t("exportMonitoring.cardAutomation")}</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>
              {s.autoExportEnabled ? t("exportMonitoring.autoOn") : t("exportMonitoring.autoOff")}
              {" · "}
              {s.vendorWebhookConfigured ? t("exportMonitoring.vendorOk") : t("exportMonitoring.vendorMissing")}
            </div>
          </div>
        </section>
      ) : null}

      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          disabled={loading || !facilityId}
          onClick={() => void load()}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #1a1a1a",
            background: "#fff",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? t("common.loading") : t("exportMonitoring.refresh")}
        </button>
      </div>

      {error ? <p style={{ color: "#b71c1c" }}>{error}</p> : null}

      {data?.recentExports?.length ? (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: 8 }}>{t("exportMonitoring.colWhen")}</th>
                <th style={{ padding: 8 }}>{t("exportMonitoring.colType")}</th>
                <th style={{ padding: 8 }}>{t("exportMonitoring.colStatus")}</th>
                <th style={{ padding: 8 }}>{t("exportMonitoring.colSource")}</th>
                <th style={{ padding: 8 }}>{t("exportMonitoring.colRange")}</th>
                <th style={{ padding: 8 }}>{t("exportMonitoring.colFormat")}</th>
                <th style={{ padding: 8 }}>{t("exportMonitoring.colRows")}</th>
                <th style={{ padding: 8 }}>{t("exportMonitoring.colActor")}</th>
                <th style={{ padding: 8 }}>{t("exportMonitoring.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentExports.map((row) => {
                const range =
                  row.from && row.to
                    ? row.from === row.to
                      ? row.from
                      : `${row.from} → ${row.to}`
                    : "—";
                return (
                  <tr key={row.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 8, whiteSpace: "nowrap" }}>{fmtTs(row.createdAt, locale)}</td>
                    <td style={{ padding: 8, fontSize: 13 }}>{labelOrRaw(t, "exportMonitoring.kind", row.exportType)}</td>
                    <td style={{ padding: 8 }}>{labelOrRaw(t, "exportMonitoring.status", row.status)}</td>
                    <td style={{ padding: 8 }}>{labelOrRaw(t, "exportMonitoring.source", row.source)}</td>
                    <td style={{ padding: 8 }}>{range}</td>
                    <td style={{ padding: 8 }}>{row.format ?? "—"}</td>
                    <td style={{ padding: 8 }}>{row.rowCount ?? "—"}</td>
                    <td style={{ padding: 8 }}>{row.actorName}</td>
                    <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                      {row.downloadUrl ? (
                        <a href={row.downloadUrl} style={{ color: "#1565c0", marginRight: 10 }}>
                          {t("exportMonitoring.download")}
                        </a>
                      ) : null}
                      {row.retryable ? (
                        <button
                          type="button"
                          disabled={retryingKey === row.id}
                          onClick={() => void onRetry(row)}
                          style={{
                            padding: "4px 10px",
                            fontSize: 12,
                            borderRadius: 6,
                            border: "1px solid #b45309",
                            background: "#fffbeb",
                            color: "#92400e",
                            fontWeight: 600,
                            cursor: retryingKey === row.id ? "wait" : "pointer",
                          }}
                        >
                          {t("exportMonitoring.retry")}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : !loading && data ? (
        <p style={{ color: "#64748b" }}>{t("exportMonitoring.empty")}</p>
      ) : null}
    </div>
  );
}
