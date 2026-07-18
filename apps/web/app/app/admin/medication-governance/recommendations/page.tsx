"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  fetchPhase16RecommendationDashboard,
  promotePhase16ToShadow,
  seedPhase16Recommendations,
  shadowEvaluatePhase16,
  type Phase16Dashboard,
} from "@/lib/medicationPhase16RecommendationApi";

function card(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
  };
}

export default function Phase16RecommendationsAdminPage() {
  const { t, language } = useI18n();
  const { ready, facilityId, roles } = useFacilityAndRoles();
  const canAccess =
    roles.includes("ADMIN") ||
    roles.includes("MEDORA_SUPER_ADMIN") ||
    roles.includes("MEDICATION_ADMIN") ||
    roles.includes("MEDICATION_REVIEWER") ||
    roles.includes("PHARMACY");
  const canAdmin =
    roles.includes("MEDICATION_ADMIN") ||
    roles.includes("MEDORA_SUPER_ADMIN") ||
    roles.includes("ADMIN");

  const [dashboard, setDashboard] = useState<Phase16Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      setDashboard(await fetchPhase16RecommendationDashboard(facilityId));
    } catch (e: unknown) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : "", language) ||
          t("medicationPhase16Recommendations.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (ready && facilityId && canAccess) void load();
  }, [ready, facilityId, canAccess, load]);

  if (!ready) {
    return <p style={{ padding: 16 }}>{t("medicationPhase16Recommendations.loading")}</p>;
  }
  if (!canAccess) {
    return (
      <p style={{ padding: 16 }}>{t("medicationPhase16Recommendations.accessDenied")}</p>
    );
  }

  const a = dashboard?.activation;
  const analytics = dashboard?.analytics as
    | {
        shadowEvaluationCount?: number;
        acknowledgedCount?: number;
        rejectedCount?: number;
        overrideCount?: number;
        coveragePercent?: number;
      }
    | undefined;

  return (
    <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>
          {t("medicationPhase16Recommendations.adminTitle")}
        </h1>
        <Link href="/app/admin/medication-governance" style={{ fontSize: 14 }}>
          {t("medicationPhase16Recommendations.backAdmin")}
        </Link>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {t("medicationPhase16Recommendations.refresh")}
        </button>
        {canAdmin ? (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!facilityId) return;
                void seedPhase16Recommendations(facilityId)
                  .then(() => load())
                  .catch((e: unknown) =>
                    setError(
                      normalizeUserFacingError(
                        e instanceof Error ? e.message : "",
                        language
                      ) || t("medicationPhase16Recommendations.errorLoad")
                    )
                  );
              }}
            >
              {t("medicationPhase16Recommendations.seed")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!facilityId) return;
                void promotePhase16ToShadow(facilityId)
                  .then(() => load())
                  .catch((e: unknown) =>
                    setError(
                      normalizeUserFacingError(
                        e instanceof Error ? e.message : "",
                        language
                      ) || t("medicationPhase16Recommendations.errorLoad")
                    )
                  );
              }}
            >
              {t("medicationPhase16Recommendations.promoteShadow")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!facilityId) return;
                void shadowEvaluatePhase16(facilityId)
                  .then(() => load())
                  .catch((e: unknown) =>
                    setError(
                      normalizeUserFacingError(
                        e instanceof Error ? e.message : "",
                        language
                      ) || t("medicationPhase16Recommendations.errorLoad")
                    )
                  );
              }}
            >
              {t("medicationPhase16Recommendations.runShadowEval")}
            </button>
          </>
        ) : null}
      </div>

      <p
        style={{
          margin: 0,
          padding: "8px 12px",
          background: "#fef3c7",
          border: "1px solid #f59e0b",
          borderRadius: 8,
          fontSize: 13,
        }}
      >
        {t("medicationPhase16Recommendations.banner")}
      </p>
      <p
        style={{
          margin: 0,
          padding: "8px 12px",
          background: "#eff6ff",
          border: "1px solid #93c5fd",
          borderRadius: 8,
          fontSize: 13,
        }}
      >
        {t("medicationPhase16Recommendations.activationBlockedBanner")}
      </p>

      {error ? (
        <p style={{ color: "#b91c1c", margin: 0 }} role="alert">
          {error}
        </p>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 8,
        }}
      >
        {(
          [
            ["metricShadow", dashboard?.byLifecycleStatus?.SHADOW_RECOMMENDATION ?? 0],
            ["metricDraft", dashboard?.byLifecycleStatus?.DRAFT ?? 0],
            ["metricCoverage", analytics?.coveragePercent ?? 0],
            ["metricEvals", analytics?.shadowEvaluationCount ?? 0],
            ["metricAck", analytics?.acknowledgedCount ?? 0],
            ["metricRejected", analytics?.rejectedCount ?? 0],
            ["metricOverrides", analytics?.overrideCount ?? 0],
            ["metricCeiling", a?.ceiling ?? "SHADOW_RECOMMENDATION"],
            ["metricActivations", dashboard?.clinicalActivations ?? 0],
            ["metricCds", dashboard?.productionCds ?? "OFF"],
          ] as const
        ).map(([key, val]) => (
          <div key={key} style={card()}>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              {t(`medicationPhase16Recommendations.${key}`)}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{String(val)}</div>
          </div>
        ))}
      </div>

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>
          {t("medicationPhase16Recommendations.queueTitle")}
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
              <th style={{ padding: 6 }}>{t("medicationPhase16Recommendations.colFamily")}</th>
              <th style={{ padding: 6 }}>{t("medicationPhase16Recommendations.colKind")}</th>
              <th style={{ padding: 6 }}>{t("medicationPhase16Recommendations.colStatus")}</th>
              <th style={{ padding: 6 }}>{t("medicationPhase16Recommendations.colConfidence")}</th>
              <th style={{ padding: 6 }}>{t("medicationPhase16Recommendations.colEvidence")}</th>
            </tr>
          </thead>
          <tbody>
            {(dashboard?.queue ?? []).map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: 6 }}>{r.familyKey}</td>
                <td style={{ padding: 6 }}>{r.recommendationKind}</td>
                <td style={{ padding: 6 }}>{r.lifecycleStatus}</td>
                <td style={{ padding: 6 }}>{r.confidenceScore}</td>
                <td style={{ padding: 6 }}>{r.evidenceLinkCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>
          {t("medicationPhase16Recommendations.auditTitle")}
        </h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          {(dashboard?.recentAudits ?? []).slice(0, 12).map((ev) => (
            <li key={ev.id}>
              {ev.action} — {ev.entityType} —{" "}
              {new Date(ev.performedAt).toLocaleString()}
              {ev.reason ? ` — ${ev.reason}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
