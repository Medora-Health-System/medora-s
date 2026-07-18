"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  fetchShadowEvaluationDashboard,
  runShadowEvaluationPipeline,
  type ShadowEvaluationDashboard,
} from "@/lib/medicationShadowEvaluationApi";

function card(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
  };
}

export default function ShadowEvaluationPage() {
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

  const [dashboard, setDashboard] = useState<ShadowEvaluationDashboard | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      setDashboard(await fetchShadowEvaluationDashboard(facilityId));
    } catch (e: unknown) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : "", language) ||
          t("medicationShadowEvaluation.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (ready && facilityId && canAccess) void load();
  }, [ready, facilityId, canAccess, load]);

  if (!ready) {
    return <p style={{ padding: 16 }}>{t("medicationShadowEvaluation.loading")}</p>;
  }
  if (!canAccess) {
    return (
      <p style={{ padding: 16 }}>{t("medicationShadowEvaluation.accessDenied")}</p>
    );
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>
          {t("medicationShadowEvaluation.title")}
        </h1>
        <Link href="/app/admin/medication-governance" style={{ fontSize: 14 }}>
          {t("medicationShadowEvaluation.backAdmin")}
        </Link>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {t("medicationShadowEvaluation.refresh")}
        </button>
        {canAdmin ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (!facilityId) return;
              void runShadowEvaluationPipeline(facilityId)
                .then(() => load())
                .catch((e: unknown) =>
                  setError(
                    normalizeUserFacingError(
                      e instanceof Error ? e.message : "",
                      language
                    ) || t("medicationShadowEvaluation.errorLoad")
                  )
                );
            }}
          >
            {t("medicationShadowEvaluation.runPipeline")}
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
        {t("medicationShadowEvaluation.banner")}
      </p>

      <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
        {t("medicationShadowEvaluation.intro")}
      </p>

      {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}

      {!dashboard ? (
        <p style={{ margin: 0 }}>{t("medicationShadowEvaluation.empty")}</p>
      ) : (
        <>
          <section style={card()}>
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
              {t("medicationShadowEvaluation.dashboard")}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 8,
                fontSize: 13,
              }}
            >
              <div>
                {t("medicationShadowEvaluation.metricStatus")}:{" "}
                <strong>{dashboard.BatchStatus ?? "—"}</strong>
              </div>
              <div>
                {t("medicationShadowEvaluation.metricReadiness")}:{" "}
                <strong>{dashboard.Readiness ?? "—"}</strong>
              </div>
              <div>
                {t("medicationShadowEvaluation.metricApproved")}:{" "}
                <strong>{dashboard.ApprovedForShadow}</strong>
              </div>
              <div>
                {t("medicationShadowEvaluation.metricExecuted")}:{" "}
                <strong>{dashboard.FamiliesExecuted}</strong>
              </div>
              <div>
                {t("medicationShadowEvaluation.metricPassed")}:{" "}
                <strong>{dashboard.FamiliesPassed}</strong>
              </div>
              <div>
                {t("medicationShadowEvaluation.metricGapsPass")}:{" "}
                <strong>{dashboard.FamiliesPassedWithNoncriticalGaps}</strong>
              </div>
              <div>
                {t("medicationShadowEvaluation.metricRemediation")}:{" "}
                <strong>{dashboard.FamiliesRequiringRemediation}</strong>
              </div>
              <div>
                {t("medicationShadowEvaluation.metricCases")}:{" "}
                <strong>{dashboard.ReferenceCases}</strong>
              </div>
              <div>
                {t("medicationShadowEvaluation.metricMatched")}:{" "}
                <strong>{dashboard.MatchedFindings}</strong>
              </div>
              <div>
                {t("medicationShadowEvaluation.metricMissed")}:{" "}
                <strong>{dashboard.MissedFindings}</strong>
              </div>
              <div>
                {t("medicationShadowEvaluation.metricUnexpected")}:{" "}
                <strong>{dashboard.UnexpectedFindings}</strong>
              </div>
              <div>
                {t("medicationShadowEvaluation.metricCritical")}:{" "}
                <strong>{dashboard.CriticalMisses}</strong>
              </div>
              <div>
                {t("medicationShadowEvaluation.metricDeferred")}:{" "}
                <strong>{dashboard.DeferredDomainSkips}</strong>
              </div>
              <div>
                {t("medicationShadowEvaluation.metricOpenGaps")}:{" "}
                <strong>{dashboard.OpenGaps}</strong>
              </div>
              <div>
                {t("medicationShadowEvaluation.metricActivations")}:{" "}
                <strong>{dashboard.ClinicalActivation}</strong>
              </div>
            </div>
          </section>

          <section style={card()}>
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
              {t("medicationShadowEvaluation.families")}
            </h2>
            {dashboard.FamilyResults.length === 0 ? (
              <p style={{ margin: 0 }}>{t("medicationShadowEvaluation.emptyFamilies")}</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th align="left">{t("medicationShadowEvaluation.colFamily")}</th>
                    <th align="left">{t("medicationShadowEvaluation.colStatus")}</th>
                    <th align="right">{t("medicationShadowEvaluation.colCases")}</th>
                    <th align="right">{t("medicationShadowEvaluation.colMatched")}</th>
                    <th align="right">{t("medicationShadowEvaluation.colMissed")}</th>
                    <th align="right">{t("medicationShadowEvaluation.colUnexpected")}</th>
                    <th align="right">{t("medicationShadowEvaluation.colGaps")}</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.FamilyResults.map((f) => (
                    <tr key={f.familyKey}>
                      <td>{f.familyKey}</td>
                      <td>{f.status}</td>
                      <td align="right">{f.casesExecuted}</td>
                      <td align="right">{f.matchedCount}</td>
                      <td align="right">{f.missedCount}</td>
                      <td align="right">{f.unexpectedCount}</td>
                      <td align="right">{f.openGaps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section style={card()}>
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
              {t("medicationShadowEvaluation.gaps")}
            </h2>
            {dashboard.GapLinks.length === 0 ? (
              <p style={{ margin: 0 }}>{t("medicationShadowEvaluation.emptyGaps")}</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {dashboard.GapLinks.map((g, i) => (
                  <li key={`${g.gapType}-${g.familyKey}-${i}`}>
                    [{g.gapType}] {g.familyKey}: {g.description} ({g.severity})
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
        {t("medicationShadowEvaluation.safetyFooter")}
      </p>
    </div>
  );
}
