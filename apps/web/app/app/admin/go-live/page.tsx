"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  fetchGoLiveReadiness,
  type GoLiveReadinessCheck,
  type GoLiveReadinessPayload,
  type GoLiveOverallStatus,
} from "@/lib/goLiveReadinessApi";

function statusBadgeStyle(s: GoLiveOverallStatus): CSSProperties {
  if (s === "ready") return { background: "#166534", color: "#fff" };
  if (s === "attention") return { background: "#a16207", color: "#fff" };
  return { background: "#991b1b", color: "#fff" };
}

function checkCardBorder(status: GoLiveReadinessCheck["status"]): string {
  if (status === "pass") return "1px solid #bbf7d0";
  if (status === "warn") return "1px solid #fde047";
  return "1px solid #fecaca";
}

function formatMetricValue(
  v: string | number | boolean | null,
  t: (k: string) => string
): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? t("common.yes") : t("common.no");
  return String(v);
}

export default function AdminGoLivePage() {
  const { t, language } = useI18n();
  const { ready, roles, facilityId } = useFacilityAndRoles();
  const isAdmin = roles.includes("ADMIN");
  const [data, setData] = useState<GoLiveReadinessPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) {
      setError(t("goLiveReadiness.errorFacility"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await fetchGoLiveReadiness(facilityId));
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setData(null);
      setError(normalizeUserFacingError(raw, language) || t("goLiveReadiness.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (!ready || !isAdmin || !facilityId) return;
    void load();
  }, [ready, isAdmin, facilityId, load]);

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
        <p>{t("goLiveReadiness.accessDenied")}</p>
        <Link href="/app">{t("goLiveReadiness.backApp")}</Link>
      </div>
    );
  }

  const m = data?.metrics;

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
        {t("goLiveReadiness.backAdmin")}
      </Link>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 8 }}>
        <h1 style={{ margin: 0, flex: "1 1 200px" }}>{t("goLiveReadiness.title")}</h1>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? t("goLiveReadiness.refreshing") : t("goLiveReadiness.refresh")}
        </button>
      </div>
      <p style={{ color: "#555", maxWidth: 720 }}>{t("goLiveReadiness.intro")}</p>

      {error ? (
        <p style={{ color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : null}

      {data ? (
        <>
          <div style={{ marginBottom: 20 }}>
            <span
              style={{
                display: "inline-block",
                padding: "8px 14px",
                borderRadius: 9999,
                fontWeight: 700,
                fontSize: 14,
                ...statusBadgeStyle(data.status),
              }}
            >
              {t(`goLiveReadiness.overall.${data.status}`)}
            </span>
            <span style={{ marginLeft: 12, fontSize: 13, color: "#64748b" }}>
              {t("goLiveReadiness.generatedAt")}: {new Date(data.generatedAt).toLocaleString()}
            </span>
          </div>

          <h2 style={{ fontSize: 16, marginBottom: 10 }}>{t("goLiveReadiness.metricsHeading")}</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 24,
            }}
          >
            {[
              ["openEncounters", m?.openEncounters],
              ["blockedClosure", m?.blockedClosure],
              ["missingVitals", m?.missingVitals],
              ["unsignedProviderDocs", m?.unsignedProviderDocs],
              ["unresolvedOrders", m?.unresolvedOrders],
              ["doorToProviderAvgMinutes", m?.doorToProviderAvgMinutes],
              ["doorToDoorAvgMinutes", m?.doorToDoorAvgMinutes],
              ["medicationAdministrationsToday", m?.medicationAdministrationsToday],
              ["lastExternalBillingExportAt", m?.lastExternalBillingExportAt],
              ["alertWebhookConfigured", m?.alertWebhookConfigured],
            ].map(([key, val]) => (
              <div
                key={String(key)}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: "#f8fafc",
                }}
              >
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                  {t(`goLiveReadiness.metrics.${key}`)}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {key === "lastExternalBillingExportAt"
                    ? val
                      ? new Date(String(val)).toLocaleString()
                      : "—"
                    : formatMetricValue(val as string | number | boolean | null, t)}
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 16, marginBottom: 10 }}>{t("goLiveReadiness.checksHeading")}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
            {data.checks.map((c) => {
              const title = t(`goLiveReadiness.checkLabels.${c.key}`);
              const label = title.startsWith("goLiveReadiness.") ? c.label : title;
              return (
                <div
                  key={c.key}
                  style={{
                    border: checkCardBorder(c.status),
                    borderRadius: 12,
                    padding: "12px 14px",
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontWeight: 700 }}>{label}</div>
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                      {t(`goLiveReadiness.checkStatus.${c.status}`)}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 14, color: "#334155" }}>
                    {t("goLiveReadiness.valueLabel")}:{" "}
                    <code style={{ fontSize: 13 }}>{formatMetricValue(c.value, t)}</code>
                  </div>
                  {c.detail ? (
                    <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b" }}>
                      {t(`goLiveReadiness.details.${c.detail}`)}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <h2 style={{ fontSize: 16, marginBottom: 10 }}>{t("goLiveReadiness.criticalHeading")}</h2>
          {data.recentCriticalEvents.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 14 }}>{t("goLiveReadiness.criticalEmpty")}</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {data.recentCriticalEvents.map((ev) => {
                const ak = `adminAudit.actions.${ev.action}` as const;
                const ek = `adminAudit.entities.${ev.entityType}` as const;
                const actionLabel = t(ak);
                const entityLabel = t(ek);
                const actionDisp = actionLabel === ak ? ev.action : actionLabel;
                const entityDisp = entityLabel === ek ? ev.entityType : entityLabel;
                return (
                  <li
                    key={ev.id}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      padding: "10px 0",
                      fontSize: 14,
                    }}
                  >
                    <div style={{ color: "#64748b", fontSize: 12 }}>{new Date(ev.createdAt).toLocaleString()}</div>
                    <div>
                      <strong>{actionDisp}</strong>
                      {" · "}
                      <span>{entityDisp}</span>
                    </div>
                    {ev.encounterId ? (
                      <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                        {t("goLiveReadiness.encounterId")}:{" "}
                        <code style={{ fontSize: 11, wordBreak: "break-all" }}>{ev.encounterId}</code>
                      </div>
                    ) : null}
                    {ev.highlightTags.length > 0 ? (
                      <div style={{ marginTop: 4, fontSize: 12 }}>{ev.highlightTags.join(", ")}</div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : loading ? (
        <p>{t("goLiveReadiness.loading")}</p>
      ) : null}
    </div>
  );
}
