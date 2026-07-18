"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  fetchSafetyEvaluationDashboard,
  fetchSafetyEvaluationRun,
  fetchSafetyEvaluationRuns,
  type SafetyEvaluationDashboard,
  type SafetyEvaluationRunRow,
} from "@/lib/medicationSafetyEvaluationApi";

function cardStyle(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#fff",
  };
}

export default function SafetyEvaluationWorkspacePage() {
  const { t, language } = useI18n();
  const { ready, facilityId, roles } = useFacilityAndRoles();

  const canAccess =
    roles.includes("ADMIN") ||
    roles.includes("MEDORA_SUPER_ADMIN") ||
    roles.includes("MEDICATION_ADMIN") ||
    roles.includes("MEDICATION_REVIEWER") ||
    roles.includes("PHARMACY");

  const [dashboard, setDashboard] = useState<SafetyEvaluationDashboard | null>(null);
  const [rows, setRows] = useState<SafetyEvaluationRunRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<(SafetyEvaluationRunRow & Record<string, unknown>) | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const [metrics, queue] = await Promise.all([
        fetchSafetyEvaluationDashboard(facilityId),
        fetchSafetyEvaluationRuns(facilityId, { limit: 100 }),
      ]);
      setDashboard(metrics);
      setRows(queue.rows);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(
        normalizeUserFacingError(raw, language) || t("medicationSafetyEvaluation.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (ready && facilityId && canAccess) void load();
  }, [ready, facilityId, canAccess, load]);

  useEffect(() => {
    if (!facilityId || !selectedId) {
      setDetail(null);
      return;
    }
    void (async () => {
      try {
        setDetail(await fetchSafetyEvaluationRun(facilityId, selectedId));
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "";
        setError(
          normalizeUserFacingError(raw, language) || t("medicationSafetyEvaluation.errorLoad")
        );
      }
    })();
  }, [facilityId, selectedId, language, t]);

  if (!ready) return <p style={{ padding: 16 }}>{t("medicationSafetyEvaluation.loading")}</p>;
  if (!canAccess) {
    return <p style={{ padding: 16 }}>{t("medicationSafetyEvaluation.accessDenied")}</p>;
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 14, maxWidth: 1100 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>{t("medicationSafetyEvaluation.title")}</h1>
        <Link href="/app/admin/medication-governance" style={{ fontSize: 14 }}>
          {t("medicationSafetyEvaluation.backAdmin")}
        </Link>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {t("medicationSafetyEvaluation.refresh")}
        </button>
      </div>
      <p style={{ margin: 0, color: "#475569", maxWidth: 860 }}>
        {t("medicationSafetyEvaluation.intro")}
      </p>
      <div
        style={{
          ...cardStyle(),
          background: "#fff7ed",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <span>{t("medicationSafetyEvaluation.shadowModeBadge")}</span>
        <span>{t("medicationSafetyEvaluation.noAlertsBadge")}</span>
        <span>{t("medicationSafetyEvaluation.noBlockingBadge")}</span>
      </div>

      {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}

      {dashboard ? (
        <section style={cardStyle()}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>
            {t("medicationSafetyEvaluation.dashboardTitle")}
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 8,
              fontSize: 13,
            }}
          >
            <div>
              {t("medicationSafetyEvaluation.metricMode")}: {dashboard.operatingMode}
            </div>
            <div>
              {t("medicationSafetyEvaluation.metricRuns")}: {dashboard.evaluationRuns}
            </div>
            <div>
              {t("medicationSafetyEvaluation.metricCompleted")}: {dashboard.completedRuns}
            </div>
            <div>
              {t("medicationSafetyEvaluation.metricFailed")}: {dashboard.failedRuns}
            </div>
            <div>
              {t("medicationSafetyEvaluation.metricFindings")}: {dashboard.findings}
            </div>
            <div>
              {t("medicationSafetyEvaluation.metricInteractions")}:{" "}
              {dashboard.interactionFindings}
            </div>
            <div>
              {t("medicationSafetyEvaluation.metricAllergy")}: {dashboard.allergyFindings}
            </div>
            <div>
              {t("medicationSafetyEvaluation.metricDup")}: {dashboard.duplicateTherapyFindings}
            </div>
            <div>
              {t("medicationSafetyEvaluation.metricUnresolved")}:{" "}
              {dashboard.unresolvedIdentities}
            </div>
            <div>
              {t("medicationSafetyEvaluation.metricAlerts")}: {dashboard.providerFacingAlerts}
            </div>
            <div>
              {t("medicationSafetyEvaluation.metricBlocks")}: {dashboard.orderBlocks}
            </div>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("medicationSafetyEvaluation.safetyBanner")}
          </p>
        </section>
      ) : null}

      <section style={cardStyle()}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>
          {t("medicationSafetyEvaluation.runsTitle")}
        </h2>
        {rows.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>{t("medicationSafetyEvaluation.empty")}</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "8px 10px",
                    background: selectedId === row.id ? "#eff6ff" : "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <strong>{row.status}</strong> · {row.operatingMode} · {row.triggerType} ·{" "}
                  {t("medicationSafetyEvaluation.findingsCreated")}: {row.findingsCreated}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {detail ? (
        <section style={cardStyle()}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>
            {t("medicationSafetyEvaluation.detailTitle")}
          </h2>
          <div style={{ fontSize: 13, display: "grid", gap: 4 }}>
            <div>
              {t("medicationSafetyEvaluation.metricMode")}: {detail.operatingMode}
            </div>
            <div>
              {t("medicationSafetyEvaluation.status")}: {detail.status}
            </div>
            <div>
              {t("medicationSafetyEvaluation.findingsCreated")}: {detail.findingsCreated}
            </div>
            <div>
              {t("medicationSafetyEvaluation.findingsSuppressed")}: {detail.findingsSuppressed}
            </div>
            <div>
              {t("medicationSafetyEvaluation.findingsDeduplicated")}:{" "}
              {detail.findingsDeduplicated}
            </div>
            <div>
              {t("medicationSafetyEvaluation.duration")}: {String(detail.durationMs ?? "—")} ms
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
