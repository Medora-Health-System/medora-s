"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchSystemHealth,
  type SystemHealthCheck,
  type SystemHealthOverallStatus,
  type SystemHealthPayload,
} from "@/lib/systemHealthApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

function overallBadgeStyle(s: SystemHealthOverallStatus): CSSProperties {
  if (s === "healthy") return { background: "#166534", color: "#fff" };
  if (s === "degraded") return { background: "#a16207", color: "#fff" };
  return { background: "#991b1b", color: "#fff" };
}

function checkBorder(status: SystemHealthCheck["status"]): string {
  if (status === "pass") return "1px solid #bbf7d0";
  if (status === "warn") return "1px solid #fde047";
  return "1px solid #fecaca";
}

export default function AdminSystemHealthPage() {
  const { t, language } = useI18n();
  const { ready, facilityId, roles } = useFacilityAndRoles();
  const isAdmin = roles.includes("ADMIN");
  const [data, setData] = useState<SystemHealthPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) {
      setError(t("systemHealth.errorFacility"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await fetchSystemHealth(facilityId));
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setData(null);
      setError(normalizeUserFacingError(raw, language) || t("systemHealth.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (!ready || !isAdmin || !facilityId) return;
    void load();
  }, [ready, isAdmin, facilityId, load]);

  const m = data?.metrics;
  const hasSignals =
    m &&
    (m.recent5xxCount > 0 ||
      m.recentFailedExportsCount > 0 ||
      m.recentCriticalAlertsCount > 0 ||
      data.status !== "healthy");

  if (!ready) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("systemHealth.accessDenied")}</p>
        <Link href="/app">{t("systemHealth.backApp")}</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
        {t("systemHealth.backAdmin")}
      </Link>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 8 }}>
        <h1 style={{ margin: 0, flex: "1 1 200px" }}>{t("systemHealth.title")}</h1>
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
          {loading ? t("common.loading") : t("systemHealth.refresh")}
        </button>
        {data ? (
          <span
            style={{
              padding: "8px 14px",
              borderRadius: 9999,
              fontWeight: 700,
              fontSize: 13,
              ...overallBadgeStyle(data.status),
            }}
          >
            {t(`systemHealth.overall.${data.status}`)}
          </span>
        ) : null}
      </div>
      <p style={{ color: "#555", maxWidth: 720, marginTop: 12 }}>{t("systemHealth.intro")}</p>
      <p style={{ fontSize: 13, color: "#64748b" }}>
        {t("systemHealth.generatedAt")}:{" "}
        {data?.generatedAt
          ? new Date(data.generatedAt).toLocaleString(language === "en" ? "en-US" : "fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "—"}
      </p>

      {error ? <p style={{ color: "#b71c1c" }}>{error}</p> : null}

      {m ? (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 10px 0" }}>{t("systemHealth.metricsHeading")}</h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              fontSize: 14,
            }}
          >
            <li style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("systemHealth.metricUptime")}</div>
              <div style={{ fontWeight: 700 }}>{m.apiUptimeSeconds}</div>
            </li>
            <li style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("systemHealth.metricDb")}</div>
              <div style={{ fontWeight: 700 }}>{m.databaseReachable ? t("common.yes") : t("common.no")}</div>
            </li>
            <li style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("systemHealth.metricAlertWebhook")}</div>
              <div style={{ fontWeight: 700 }}>{m.alertWebhookConfigured ? t("common.yes") : t("common.no")}</div>
            </li>
            <li style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("systemHealth.metricAlertEnabled")}</div>
              <div style={{ fontWeight: 700 }}>{m.alertEnabled ? t("common.yes") : t("common.no")}</div>
            </li>
            <li style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("systemHealth.metricExtAuto")}</div>
              <div style={{ fontWeight: 700 }}>{m.externalBillingAutomationEnabled ? t("common.yes") : t("common.no")}</div>
            </li>
            <li style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("systemHealth.metric5xx")}</div>
              <div style={{ fontWeight: 700 }}>{m.recent5xxCount}</div>
            </li>
            <li style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("systemHealth.metricCriticalAudit")}</div>
              <div style={{ fontWeight: 700 }}>{m.recentCriticalAlertsCount}</div>
            </li>
            <li style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("systemHealth.metricFailedExports")}</div>
              <div style={{ fontWeight: 700 }}>{m.recentFailedExportsCount}</div>
            </li>
          </ul>
        </section>
      ) : null}

      {m ? (
        <section style={{ marginTop: 22, border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", background: "#f8fafc" }}>
          <h2 style={{ fontSize: 16, margin: "0 0 8px 0" }}>{t("systemHealth.recentHeading")}</h2>
          {!hasSignals ? (
            <p style={{ margin: 0, fontSize: 14, color: "#334155" }}>{t("systemHealth.recentNone")}</p>
          ) : (
            <div style={{ fontSize: 14, color: "#334155" }}>
              <p style={{ margin: "0 0 8px 0" }}>{t("systemHealth.recentMixed")}</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {m.recent5xxCount > 0 ? (
                  <li>{t("systemHealth.recentLine5xx").replace("{{count}}", String(m.recent5xxCount))}</li>
                ) : null}
                {m.recentFailedExportsCount > 0 ? (
                  <li>{t("systemHealth.recentLineExports").replace("{{count}}", String(m.recentFailedExportsCount))}</li>
                ) : null}
                {m.recentCriticalAlertsCount > 0 ? (
                  <li>{t("systemHealth.recentLineCritical").replace("{{count}}", String(m.recentCriticalAlertsCount))}</li>
                ) : null}
              </ul>
            </div>
          )}
        </section>
      ) : null}

      {data?.checks?.length ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {data.checks.map((c) => (
            <li
              key={c.key}
              style={{
                border: checkBorder(c.status),
                borderRadius: 10,
                padding: "14px 16px",
                background: "#fafafa",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t(`systemHealth.checks.${c.key}`)}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {t("systemHealth.statusLabel")}: <strong>{t(`systemHealth.checkStatus.${c.status}`)}</strong>
              </div>
              {c.detail ? (
                <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#334155" }}>
                  {t(`systemHealth.details.${c.detail}`)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !loading && data && !data.checks.length ? (
        <p>{t("systemHealth.empty")}</p>
      ) : null}
    </div>
  );
}
