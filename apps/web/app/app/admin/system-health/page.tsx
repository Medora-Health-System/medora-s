"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchSystemHealth,
  postSystemHealthTestAlert,
  type SystemHealthCheck,
  type SystemHealthCheckStatus,
  type SystemHealthOverallStatus,
  type SystemHealthPayload,
} from "@/lib/systemHealthApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

const CLARITY_CHECK_KEYS = new Set([
  "database",
  "node_env",
  "alerts",
  "external_billing_automation",
  "failed_exports",
  "http_5xx",
  "audit_overrides_critical",
]);

function translateIfPresent(t: (key: string) => string, key: string): string | null {
  const value = t(key);
  return value === key ? null : value;
}

function getFriendlyOverallLabel(status: SystemHealthOverallStatus): string {
  return `systemHealth.clarity.overallLabel.${status}`;
}

function getOverallClarityKey(status: SystemHealthOverallStatus): string {
  return `systemHealth.clarity.overall.${status}`;
}

function getCheckMeaningKey(checkKey: string, status: SystemHealthCheckStatus): string {
  return `systemHealth.clarity.checks.${checkKey}.${status}.meaning`;
}

function getCheckActionKey(checkKey: string, status: SystemHealthCheckStatus): string {
  return `systemHealth.clarity.checks.${checkKey}.${status}.action`;
}

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

function CheckClarityBlock(props: {
  t: (key: string) => string;
  checkKey: string;
  status: SystemHealthCheckStatus;
}) {
  const { t, checkKey, status } = props;
  const meaning = translateIfPresent(t, getCheckMeaningKey(checkKey, status));
  const action = translateIfPresent(t, getCheckActionKey(checkKey, status));
  if (!meaning && !action) return null;
  return (
    <>
      {meaning ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 13, color: "#475569", lineHeight: 1.45 }}>{meaning}</p>
      ) : null}
      {action ? (
        <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
          <strong style={{ color: "#475569" }}>{t("systemHealth.clarity.nextStepLabel")}</strong> {action}
        </p>
      ) : null}
    </>
  );
}

export default function AdminSystemHealthPage() {
  const { t, language } = useI18n();
  const { ready, facilityId, isPlatformOperator } = useFacilityAndRoles();
  const [data, setData] = useState<SystemHealthPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ messageKey: string; delivered: boolean } | null>(null);

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

  const sendTestAlert = useCallback(async () => {
    if (!facilityId) return;
    setTestBusy(true);
    setTestFeedback(null);
    try {
      const r = await postSystemHealthTestAlert(facilityId);
      setTestFeedback({ messageKey: r.messageKey, delivered: r.delivered });
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setTestFeedback(null);
      setError(normalizeUserFacingError(raw, language) || t("systemHealth.errorLoad"));
    } finally {
      setTestBusy(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (!ready || !isPlatformOperator || !facilityId) return;
    void load();
  }, [ready, isPlatformOperator, facilityId, load]);

  const m = data?.metrics;
  const hasSignals =
    m &&
    (m.recent5xxCount > 0 ||
      m.recentFailedExportsCount > 0 ||
      m.recentCriticalAlertsCount > 0 ||
      (m.recentChartExportIntegrityFailureCount ?? 0) > 0 ||
      data.status !== "healthy");
  const overallClarityLine = data ? translateIfPresent(t, getOverallClarityKey(data.status)) : null;

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
            {translateIfPresent(t, getFriendlyOverallLabel(data.status)) ?? t(`systemHealth.overall.${data.status}`)}
          </span>
        ) : null}
      </div>
      {overallClarityLine ? (
        <p
          style={{
            margin: "10px 0 0 0",
            fontSize: 14,
            color: "#64748b",
            maxWidth: 720,
            lineHeight: 1.45,
          }}
        >
          {overallClarityLine}
        </p>
      ) : null}
      <p style={{ color: "#555", maxWidth: 720, marginTop: 12 }}>{t("systemHealth.intro")}</p>
      <p style={{ fontSize: 13, color: "#64748b", maxWidth: 720, marginTop: 8 }}>{t("systemHealth.monitoringRiskNote")}</p>
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

      {data?.alertStatus ? (
        <section
          style={{
            marginTop: 16,
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "14px 16px",
            background: "#f8fafc",
          }}
        >
          <h2 style={{ fontSize: 16, margin: "0 0 10px 0" }}>{t("systemHealth.alertConfigHeading")}</h2>
          <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#64748b", maxWidth: 720, lineHeight: 1.45 }}>
            {t("systemHealth.testAlertPhiFreeIntro")}
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 12px 0",
              fontSize: 14,
              display: "grid",
              gap: 6,
            }}
          >
            <li>
              <strong>{t("systemHealth.metricAlertEnabled")}</strong>{" "}
              {data.alertStatus.enabled ? t("common.yes") : t("common.no")}
            </li>
            <li>
              <strong>{t("systemHealth.metricAlertWebhook")}</strong>{" "}
              {data.alertStatus.webhookConfigured ? t("common.yes") : t("common.no")}
            </li>
            <li>
              <strong>{t("systemHealth.alertFormatLabel")}</strong>{" "}
              {data.alertStatus.format === "slack" ? t("systemHealth.formatSlack") : t("systemHealth.formatJson")}
            </li>
            <li>
              <strong>{t("systemHealth.alertEnvironment")}</strong> {data.alertStatus.environment}
            </li>
          </ul>
          <button
            type="button"
            onClick={() => void sendTestAlert()}
            disabled={testBusy || !data.alertStatus.canSendTest}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "1px solid #1a1a1a",
              background: data.alertStatus.canSendTest ? "#1a1a1a" : "#e2e8f0",
              color: data.alertStatus.canSendTest ? "#fff" : "#94a3b8",
              fontWeight: 600,
              cursor: testBusy || !data.alertStatus.canSendTest ? "not-allowed" : "pointer",
            }}
          >
            {testBusy ? t("systemHealth.testAlertSending") : t("systemHealth.sendTestAlert")}
          </button>
          {testFeedback ? (
            <p
              style={{
                margin: "12px 0 0 0",
                fontSize: 14,
                color: testFeedback.delivered ? "#166534" : "#b45309",
              }}
              role="status"
            >
              {t(`systemHealth.testAlertMessages.${testFeedback.messageKey}`)}
            </p>
          ) : null}
        </section>
      ) : null}

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
            <li style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("systemHealth.metricJwtSecrets")}</div>
              <div style={{ fontWeight: 700 }}>{m.jwtSecretsConfigured ? t("common.yes") : t("common.no")}</div>
            </li>
            <li style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("systemHealth.metricMfaKey")}</div>
              <div style={{ fontWeight: 700 }}>{m.mfaEncryptionKeyConfigured ? t("common.yes") : t("common.no")}</div>
            </li>
            <li style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("systemHealth.metricMfaProbe")}</div>
              <div style={{ fontWeight: 700 }}>{t(`systemHealth.mfaProbe.${m.mfaEncryptionKeyProbe}`)}</div>
            </li>
            <li style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("systemHealth.metricChartSigning")}</div>
              <div style={{ fontWeight: 700 }}>{m.chartExportSigningSecretConfigured ? t("common.yes") : t("common.no")}</div>
            </li>
            <li style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("systemHealth.metricAuditMode")}</div>
              <div style={{ fontWeight: 700 }}>
                {t(`systemHealth.auditModeValue.${m.auditFailureMode === "fail_closed" ? "fail_closed" : m.auditFailureMode === "best_effort" ? "best_effort" : "unset"}`)}
              </div>
            </li>
            <li style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{t("systemHealth.metricIntegrityFailures")}</div>
              <div style={{ fontWeight: 700 }}>{m.recentChartExportIntegrityFailureCount ?? 0}</div>
            </li>
          </ul>
        </section>
      ) : null}

      {data?.backupReadiness ? (
        <section style={{ marginTop: 20, border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", background: "#f8fafc" }}>
          <h2 style={{ fontSize: 16, margin: "0 0 8px 0" }}>{t("systemHealth.backupReadinessHeading")}</h2>
          <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#64748b", maxWidth: 720, lineHeight: 1.45 }}>
            {t("systemHealth.backupReadinessIntro")}
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px 0", fontSize: 14, display: "grid", gap: 6 }}>
            <li>
              <strong>{t("systemHealth.backupReadinessStatusLabel")}</strong>{" "}
              {t(`systemHealth.backupReadinessOverall.${data.backupReadiness.status}`)}
            </li>
            <li>
              <strong>{t("systemHealth.backupReadinessAt")}</strong>{" "}
              {new Date(data.backupReadiness.generatedAt).toLocaleString(language === "en" ? "en-US" : "fr-FR", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </li>
          </ul>
          <Link href="/app/admin/backup-readiness" style={{ fontSize: 14, fontWeight: 600, color: "#1e3a8a" }}>
            {t("systemHealth.backupReadinessFullLink")}
          </Link>
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
                {(m.recentChartExportIntegrityFailureCount ?? 0) > 0 ? (
                  <li>
                    {t("systemHealth.recentLineIntegrity").replace(
                      "{{count}}",
                      String(m.recentChartExportIntegrityFailureCount ?? 0)
                    )}
                  </li>
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
              {CLARITY_CHECK_KEYS.has(c.key) ? (
                <CheckClarityBlock t={t} checkKey={c.key} status={c.status} />
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
