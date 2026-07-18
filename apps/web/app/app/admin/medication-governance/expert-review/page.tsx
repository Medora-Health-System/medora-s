"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  fetchExpertReviewDashboard,
  runExpertReviewPipeline,
  type ExpertReviewDashboard,
} from "@/lib/medicationExpertReviewApi";

function card(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
  };
}

export default function ExpertReviewPage() {
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

  const [dashboard, setDashboard] = useState<ExpertReviewDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      setDashboard(await fetchExpertReviewDashboard(facilityId));
    } catch (e: unknown) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : "", language) ||
          t("medicationExpertReview.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (ready && facilityId && canAccess) void load();
  }, [ready, facilityId, canAccess, load]);

  if (!ready) {
    return <p style={{ padding: 16 }}>{t("medicationExpertReview.loading")}</p>;
  }
  if (!canAccess) {
    return (
      <p style={{ padding: 16 }}>{t("medicationExpertReview.accessDenied")}</p>
    );
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>
          {t("medicationExpertReview.title")}
        </h1>
        <Link href="/app/admin/medication-governance" style={{ fontSize: 14 }}>
          {t("medicationExpertReview.backAdmin")}
        </Link>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {t("medicationExpertReview.refresh")}
        </button>
        {canAdmin ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (!facilityId) return;
              void runExpertReviewPipeline(facilityId)
                .then(() => load())
                .catch((e: unknown) =>
                  setError(
                    normalizeUserFacingError(
                      e instanceof Error ? e.message : "",
                      language
                    ) || t("medicationExpertReview.errorLoad")
                  )
                );
            }}
          >
            {t("medicationExpertReview.runPipeline")}
          </button>
        ) : null}
      </div>

      <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
        {t("medicationExpertReview.intro")}
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
        <span style={card()}>{t("medicationExpertReview.badgeReview")}</span>
        <span style={card()}>{t("medicationExpertReview.badgeAdvisory")}</span>
        <span style={card()}>{t("medicationExpertReview.badgeNoAlerts")}</span>
        <span style={card()}>{t("medicationExpertReview.badgeNoActivation")}</span>
        <span style={card()}>{t("medicationExpertReview.badgeShadowNotProd")}</span>
      </div>

      {error ? (
        <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>
      ) : null}

      {!dashboard ? (
        <p style={{ margin: 0 }}>{t("medicationExpertReview.empty")}</p>
      ) : (
        <>
          <section style={card()}>
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
              {t("medicationExpertReview.dashboard")}
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
                {t("medicationExpertReview.metricStatus")}:{" "}
                <strong>{dashboard.BatchStatus ?? "—"}</strong>
              </div>
              <div>
                {t("medicationExpertReview.metricReviewed")}:{" "}
                <strong>{dashboard.Wave1FamiliesReviewed}</strong>
              </div>
              <div>
                {t("medicationExpertReview.metricApprovedShadow")}:{" "}
                <strong>{dashboard.Wave1FamiliesApprovedForShadow}</strong>
              </div>
              <div>
                {t("medicationExpertReview.metricDeferred")}:{" "}
                <strong>{dashboard.Wave1FamiliesDeferred}</strong>
              </div>
              <div>
                {t("medicationExpertReview.metricClinicalDomains")}:{" "}
                <strong>{dashboard.ClinicalDomainsReviewed}</strong>
              </div>
              <div>
                {t("medicationExpertReview.metricSafetyDomains")}:{" "}
                <strong>{dashboard.SafetyDomainsReviewed}</strong>
              </div>
              <div>
                {t("medicationExpertReview.metricQuality")}:{" "}
                <strong>{dashboard.QualityScoresCalculated}</strong>
              </div>
              <div>
                {t("medicationExpertReview.metricSnapshots")}:{" "}
                <strong>{dashboard.ShadowSnapshotsCreated}</strong>
              </div>
              <div>
                {t("medicationExpertReview.metricConflicts")}:{" "}
                <strong>{dashboard.ReviewConflictsOpen}</strong>
              </div>
              <div>
                {t("medicationExpertReview.metricAudit")}:{" "}
                <strong>{dashboard.AuditEntriesCreated}</strong>
              </div>
              <div>
                {t("medicationExpertReview.metricActivations")}:{" "}
                <strong>{dashboard.ClinicalActivation}</strong>
              </div>
              <div>
                {t("medicationExpertReview.metricAlerts")}:{" "}
                <strong>{dashboard.ProviderFacingAlerts}</strong>
              </div>
            </div>
          </section>

          <section style={card()}>
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
              {t("medicationExpertReview.waveFamilies")}
            </h2>
            {dashboard.Wave1Families.length === 0 ? (
              <p style={{ margin: 0 }}>{t("medicationExpertReview.emptyWave")}</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {dashboard.Wave1Families.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
          </section>

          <section style={card()}>
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
              {t("medicationExpertReview.scores")}
            </h2>
            {dashboard.FamilyScores.length === 0 ? (
              <p style={{ margin: 0 }}>{t("medicationExpertReview.emptyScores")}</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th align="left">{t("medicationExpertReview.colFamily")}</th>
                    <th align="right">{t("medicationExpertReview.colOverall")}</th>
                    <th align="right">{t("medicationExpertReview.colClinical")}</th>
                    <th align="right">{t("medicationExpertReview.colSafety")}</th>
                    <th align="right">{t("medicationExpertReview.colEvidence")}</th>
                    <th align="right">{t("medicationExpertReview.colConsistency")}</th>
                    <th align="right">{t("medicationExpertReview.colReview")}</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.FamilyScores.map((s) => (
                    <tr key={s.familyKey}>
                      <td>{s.familyKey}</td>
                      <td align="right">{s.overallScore}</td>
                      <td align="right">{s.clinicalScore}</td>
                      <td align="right">{s.safetyScore}</td>
                      <td align="right">{s.evidenceScore}</td>
                      <td align="right">{s.consistencyScore}</td>
                      <td align="right">{s.reviewScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section style={card()}>
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
              {t("medicationExpertReview.qualifications")}
            </h2>
            {dashboard.Qualifications.length === 0 ? (
              <p style={{ margin: 0 }}>{t("medicationExpertReview.emptyQual")}</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {dashboard.Qualifications.map((q) => (
                  <li key={q.familyKey}>
                    {q.familyKey}: {q.status}
                    {q.shadowVersion ? ` (${q.shadowVersion})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
        {t("medicationExpertReview.safetyFooter")}
      </p>
    </div>
  );
}
