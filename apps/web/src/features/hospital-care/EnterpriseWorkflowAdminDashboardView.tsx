"use client";

/**
 * D4A.2.8 — Admin Enterprise Workflow Dashboard. Server-side aggregation;
 * unavailable ≠ zero.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { EnterpriseWorkflowAdminDashboardV1, MetricAvailability } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { HospitalCareShell } from "./HospitalCareShell";
import { fetchWorkflowAdminDashboard } from "./enterpriseWorkflowApi";
import { isForbiddenApiError } from "./hospitalCarePlacementApi";
import { HOSPITAL_CARE_ENTERPRISE_WORKFLOW } from "./hospitalCarePaths";

const metricBox: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 8,
  marginBottom: 14,
};

const metricCell: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "8px 10px",
  background: "#fff",
};

function metricText<T>(
  m: MetricAvailability<T>,
  unavailableLabel: string,
  format: (v: T) => string = (v) => String(v)
): string {
  if (m.availability === "UNAVAILABLE") return unavailableLabel;
  return format(m.value);
}

export function EnterpriseWorkflowAdminDashboardView() {
  const { t } = useI18n();
  const { ready } = useFacilityAndRoles();
  const [dash, setDash] = useState<EnterpriseWorkflowAdminDashboardV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDash(await fetchWorkflowAdminDashboard());
    } catch (e) {
      setDash(null);
      setError(
        isForbiddenApiError(e)
          ? t("common.unauthorizedRedirect")
          : t("enterpriseWorkflowD4a28.loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  const unavailable = t("enterpriseWorkflowD4a28.dashboard.unavailable");

  return (
    <HospitalCareShell
      active="home"
      title={t("enterpriseWorkflowD4a28.dashboard.title")}
      subtitle={t("enterpriseWorkflowD4a28.dashboard.subtitle")}
      actions={
        <Link
          href={HOSPITAL_CARE_ENTERPRISE_WORKFLOW}
          style={{ fontSize: 13, fontWeight: 600, color: "#0f766e" }}
        >
          {t("enterpriseWorkflowD4a28.openLink")}
        </Link>
      }
    >
      <p style={{ fontSize: 12, color: "#64748b", marginTop: 0 }}>
        {t("enterpriseWorkflowD4a28.definitionDriven")} ·{" "}
        {t("enterpriseWorkflowD4a28.rulesOff")} ·{" "}
        {t("enterpriseWorkflowD4a28.placementOff")}
      </p>
      <button
        type="button"
        onClick={() => void load()}
        style={{
          fontSize: 13,
          padding: "7px 12px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          background: "#fff",
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        {t("enterpriseWorkflowD4a28.refresh")}
      </button>

      {loading ? <p style={{ fontSize: 13 }}>{t("enterpriseWorkflowD4a28.loading")}</p> : null}
      {error ? (
        <p role="alert" style={{ fontSize: 13, color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}

      {dash ? (
        <>
          <div style={metricBox} data-testid="workflow-admin-metrics">
            {(
              [
                ["activeWorkflows", dash.volumeActiveWorkflows],
                ["openTasks", dash.volumeOpenTasks],
                ["completedToday", dash.completedToday],
                ["overdue", dash.overdueTasks],
                ["escalations", dash.openEscalations],
                ["avgCompletion", dash.avgCompletionMinutes],
                ["health", dash.health],
              ] as const
            ).map(([key, metric]) => (
              <div key={key} style={metricCell}>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {t(`enterpriseWorkflowD4a28.dashboard.${key}`)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                  {metricText(metric as MetricAvailability<string | number>, unavailable)}
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>
            {t("enterpriseWorkflowD4a28.dashboard.quality")}
          </h2>
          <div style={metricBox}>
            {(
              [
                ["delays", dash.quality.delayCount],
                ["escalations", dash.quality.escalationCount],
                ["failures", dash.quality.failureCount],
                ["completions", dash.quality.completionCount],
              ] as const
            ).map(([key, metric]) => (
              <div key={key} style={metricCell}>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {t(`enterpriseWorkflowD4a28.dashboard.${key}`)}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {metricText(metric, unavailable)}
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>
            {t("enterpriseWorkflowD4a28.dashboard.bottlenecks")}
          </h2>
          {dash.bottlenecks.availability === "UNAVAILABLE" ? (
            <p style={{ fontSize: 13, color: "#64748b" }}>{unavailable}</p>
          ) : dash.bottlenecks.value.length === 0 ? (
            <p style={{ fontSize: 13, color: "#64748b" }}>
              {t("enterpriseWorkflowD4a28.dashboard.noBottlenecks")}
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {dash.bottlenecks.value.map((b) => (
                <li key={b.department}>
                  {t(`enterpriseWorkflowD4a28.departments.${b.department}`)} — {b.openTasks}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </HospitalCareShell>
  );
}
