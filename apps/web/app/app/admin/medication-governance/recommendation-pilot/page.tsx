"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  evaluatePhase17Qualifications,
  fetchPhase17PilotDashboard,
  fetchPhase17Readiness,
  suspendPhase17Program,
  type Phase17PilotDashboard,
  type Phase17Readiness,
} from "@/lib/medicationPhase17PilotApi";

function card(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
  };
}

export default function Phase17RecommendationPilotAdminPage() {
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

  const [dashboard, setDashboard] = useState<Phase17PilotDashboard | null>(null);
  const [readiness, setReadiness] = useState<Phase17Readiness | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const [dash, readyState] = await Promise.all([
        fetchPhase17PilotDashboard(facilityId),
        fetchPhase17Readiness(facilityId),
      ]);
      setDashboard(dash);
      setReadiness(readyState);
    } catch (e: unknown) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : "", language) ||
          t("medicationPhase17Pilot.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (ready && facilityId && canAccess) void load();
  }, [ready, facilityId, canAccess, load]);

  if (!ready) {
    return <p style={{ padding: 16 }}>{t("medicationPhase17Pilot.loading")}</p>;
  }
  if (!canAccess) {
    return <p style={{ padding: 16 }}>{t("medicationPhase17Pilot.accessDenied")}</p>;
  }

  const m = dashboard?.metrics;
  const a = dashboard?.activation;

  return (
    <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>
          {t("medicationPhase17Pilot.adminTitle")}
        </h1>
        <Link href="/app/admin/medication-governance" style={{ fontSize: 14 }}>
          {t("medicationPhase17Pilot.backAdmin")}
        </Link>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {t("medicationPhase17Pilot.refresh")}
        </button>
        {canAdmin ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (!facilityId) return;
              void evaluatePhase17Qualifications(facilityId)
                .then(() => load())
                .catch((e: unknown) =>
                  setError(
                    normalizeUserFacingError(
                      e instanceof Error ? e.message : "",
                      language
                    ) || t("medicationPhase17Pilot.errorLoad")
                  )
                );
            }}
          >
            {t("medicationPhase17Pilot.evaluateQualifications")}
          </button>
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
        {t("medicationPhase17Pilot.banner")}
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
        {t("medicationPhase17Pilot.locksBanner")}
      </p>

      {error ? (
        <p style={{ color: "#b91c1c", margin: 0 }} role="alert">
          {error}
        </p>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 8,
        }}
      >
        {(
          [
            ["metricReadiness", readiness?.readiness ?? "—"],
            ["metricEligible", m?.eligibleDefinitionQualifications ?? 0],
            ["metricActivePilots", m?.activePilotCount ?? 0],
            ["metricExposures", m?.exposureCount ?? 0],
            ["metricSafety", m?.safetyEventCount ?? 0],
            ["metricOrderMut", dashboard?.orderMutations ?? 0],
            ["metricMarMut", dashboard?.marMutations ?? 0],
            ["metricChartMut", dashboard?.chartMutations ?? 0],
            ["metricEnterprise", dashboard?.enterpriseActivations ?? 0],
            ["metricCds", a?.productionCdsEnabled ? "ON" : "OFF"],
          ] as const
        ).map(([key, value]) => (
          <div key={key} style={card()}>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              {t(`medicationPhase17Pilot.${key}`)}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700 }}>
              {String(value)}
            </p>
          </div>
        ))}
      </div>

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t("medicationPhase17Pilot.qualificationQueue")}
        </h2>
        {(dashboard?.qualifications ?? []).length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>
            {t("medicationPhase17Pilot.emptyQualifications")}
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: 6 }}>{t("medicationPhase17Pilot.colDefinition")}</th>
                <th style={{ padding: 6 }}>{t("medicationPhase17Pilot.colDecision")}</th>
                <th style={{ padding: 6 }}>{t("medicationPhase17Pilot.colConfidence")}</th>
                <th style={{ padding: 6 }}>{t("medicationPhase17Pilot.colShadowEvals")}</th>
                <th style={{ padding: 6 }}>{t("medicationPhase17Pilot.colMutations")}</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard?.qualifications ?? []).map((q) => (
                <tr key={q.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 6, fontFamily: "monospace", fontSize: 11 }}>
                    {q.recommendationDefinitionId.slice(0, 8)}…
                  </td>
                  <td style={{ padding: 6 }}>{q.qualificationDecision}</td>
                  <td style={{ padding: 6 }}>{q.confidenceScore}</td>
                  <td style={{ padding: 6 }}>{q.shadowEvaluationCount}</td>
                  <td style={{ padding: 6 }}>
                    {q.orderMutationCount}/{q.marMutationCount}/{q.chartMutationCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t("medicationPhase17Pilot.programsTitle")}
        </h2>
        {(dashboard?.programs ?? []).length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>
            {t("medicationPhase17Pilot.emptyPrograms")}
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
            {(dashboard?.programs ?? []).map((p) => (
              <li key={p.id}>
                <strong>{p.title}</strong> — {p.status} — {p.programKey}
                {canAdmin && (p.status === "ACTIVE" || p.status === "SCHEDULED") ? (
                  <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      placeholder={t("medicationPhase17Pilot.suspendReasonPlaceholder")}
                      style={{ minWidth: 220, padding: "4px 8px" }}
                    />
                    <button
                      type="button"
                      disabled={loading || !suspendReason.trim()}
                      onClick={() => {
                        if (!facilityId) return;
                        void suspendPhase17Program(facilityId, p.id, suspendReason)
                          .then(() => {
                            setSuspendReason("");
                            return load();
                          })
                          .catch((e: unknown) =>
                            setError(
                              normalizeUserFacingError(
                                e instanceof Error ? e.message : "",
                                language
                              ) || t("medicationPhase17Pilot.errorLoad")
                            )
                          );
                      }}
                    >
                      {t("medicationPhase17Pilot.suspend")}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t("medicationPhase17Pilot.sectionsTitle")}
        </h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155" }}>
          <li>{t("medicationPhase17Pilot.sectionReadiness")}</li>
          <li>{t("medicationPhase17Pilot.sectionQualification")}</li>
          <li>{t("medicationPhase17Pilot.sectionFacility")}</li>
          <li>{t("medicationPhase17Pilot.sectionProviders")}</li>
          <li>{t("medicationPhase17Pilot.sectionMonitoring")}</li>
          <li>{t("medicationPhase17Pilot.sectionSafety")}</li>
          <li>{t("medicationPhase17Pilot.sectionSuspension")}</li>
          <li>{t("medicationPhase17Pilot.sectionAudit")}</li>
        </ul>
      </section>
    </div>
  );
}
