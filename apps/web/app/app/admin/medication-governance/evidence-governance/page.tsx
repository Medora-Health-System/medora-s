"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  fetchEvidenceGovernanceDashboard,
  runEvidenceGovernancePipeline,
  type EvidenceGovernanceDashboard,
} from "@/lib/medicationEvidenceGovernanceApi";

function card(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
  };
}

export default function EvidenceGovernancePage() {
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

  const [dashboard, setDashboard] = useState<EvidenceGovernanceDashboard | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      setDashboard(await fetchEvidenceGovernanceDashboard(facilityId));
    } catch (e: unknown) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : "", language) ||
          t("medicationEvidenceGovernance.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (ready && facilityId && canAccess) void load();
  }, [ready, facilityId, canAccess, load]);

  if (!ready) {
    return <p style={{ padding: 16 }}>{t("medicationEvidenceGovernance.loading")}</p>;
  }
  if (!canAccess) {
    return (
      <p style={{ padding: 16 }}>{t("medicationEvidenceGovernance.accessDenied")}</p>
    );
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>
          {t("medicationEvidenceGovernance.title")}
        </h1>
        <Link href="/app/admin/medication-governance" style={{ fontSize: 14 }}>
          {t("medicationEvidenceGovernance.backAdmin")}
        </Link>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {t("medicationEvidenceGovernance.refresh")}
        </button>
        {canAdmin ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (!facilityId) return;
              void runEvidenceGovernancePipeline(facilityId)
                .then(() => load())
                .catch((e: unknown) =>
                  setError(
                    normalizeUserFacingError(
                      e instanceof Error ? e.message : "",
                      language
                    ) || t("medicationEvidenceGovernance.errorLoad")
                  )
                );
            }}
          >
            {t("medicationEvidenceGovernance.runPipeline")}
          </button>
        ) : null}
      </div>

      <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
        {t("medicationEvidenceGovernance.intro")}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          fontSize: 12,
          fontWeight: 700,
          color: "#9a3412",
        }}
      >
        <span>{t("medicationEvidenceGovernance.badgeEvidence")}</span>
        <span>{t("medicationEvidenceGovernance.badgeAdvisory")}</span>
        <span>{t("medicationEvidenceGovernance.badgeNoAlerts")}</span>
        <span>{t("medicationEvidenceGovernance.badgeNoBlocking")}</span>
        <span>{t("medicationEvidenceGovernance.badgeNoActivation")}</span>
      </div>

      {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t("medicationEvidenceGovernance.dashboard")}
        </h2>
        {dashboard ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 8,
              fontSize: 13,
            }}
          >
            <div>
              {t("medicationEvidenceGovernance.metricStatus")}:{" "}
              {dashboard.BatchStatus ?? "—"}
            </div>
            <div>
              {t("medicationEvidenceGovernance.metricFamilies")}:{" "}
              {dashboard.TargetFamilyCount}
            </div>
            <div>
              {t("medicationEvidenceGovernance.metricProvenance")}:{" "}
              {dashboard.FamiliesWithProvenance}
            </div>
            <div>
              {t("medicationEvidenceGovernance.metricLinks")}:{" "}
              {dashboard.EvidenceLinksCreated}
            </div>
            <div>
              {t("medicationEvidenceGovernance.metricPlaceholders")}:{" "}
              {dashboard.PlaceholdersRetired}
            </div>
            <div>
              {t("medicationEvidenceGovernance.metricSources")}:{" "}
              {dashboard.SourceRegistrations}
            </div>
            <div>
              {t("medicationEvidenceGovernance.metricOverall")}:{" "}
              {dashboard.AverageOverallCompleteness}
            </div>
            <div>
              {t("medicationEvidenceGovernance.metricProvScore")}:{" "}
              {dashboard.AverageProvenanceScore}
            </div>
            <div>
              {t("medicationEvidenceGovernance.metricNoProv")}:{" "}
              {dashboard.KnowledgeWithoutProvenance}
            </div>
            <div>
              {t("medicationEvidenceGovernance.metricApprovedShadow")}:{" "}
              {dashboard.ClinicalApprovedForShadow}
            </div>
            <div>
              {t("medicationEvidenceGovernance.metricAlerts")}:{" "}
              {dashboard.ProviderFacingAlerts}
            </div>
            <div>
              {t("medicationEvidenceGovernance.metricBlocks")}:{" "}
              {dashboard.OrderBlocks}
            </div>
            <div>
              {t("medicationEvidenceGovernance.metricActivations")}:{" "}
              {dashboard.ClinicalActivations}
            </div>
            <div>
              {t("medicationEvidenceGovernance.metricOrdering")}:{" "}
              {dashboard.OrderingChanged}
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, color: "#64748b" }}>
            {loading
              ? t("medicationEvidenceGovernance.loading")
              : t("medicationEvidenceGovernance.empty")}
          </p>
        )}
      </section>

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t("medicationEvidenceGovernance.waveFamilies")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {(dashboard?.Wave1Families ?? []).join(", ") ||
            t("medicationEvidenceGovernance.emptyWave")}
        </p>
      </section>

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t("medicationEvidenceGovernance.scores")}
        </h2>
        <div style={{ display: "grid", gap: 4, fontSize: 13 }}>
          {(dashboard?.FamilyScores ?? []).length === 0 ? (
            <p style={{ margin: 0, color: "#64748b" }}>
              {t("medicationEvidenceGovernance.emptyScores")}
            </p>
          ) : (
            (dashboard?.FamilyScores ?? []).map((s) => (
              <div key={s.familyKey}>
                {s.familyKey}: overall {s.overallScore} · provenance{" "}
                {s.provenanceScore} · links {s.evidenceLinkCount}
              </div>
            ))
          )}
        </div>
      </section>

      <p style={{ margin: 0, fontSize: 12, color: "#9a3412", fontWeight: 600 }}>
        {t("medicationEvidenceGovernance.safetyFooter")}
      </p>
    </div>
  );
}
