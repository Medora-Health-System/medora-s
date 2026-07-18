"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  detectPhase18Drift,
  fetchPhase18OpsDashboard,
  generatePhase18Regulatory,
  sealPhase18Immutable,
  type Phase18OpsDashboard,
} from "@/lib/medicationPhase18OpsApi";

function card(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
  };
}

export default function Phase18OperationsCenterPage() {
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

  const [dashboard, setDashboard] = useState<Phase18OpsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      setDashboard(await fetchPhase18OpsDashboard(facilityId));
    } catch (e: unknown) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : "", language) ||
          t("medicationPhase18Ops.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (ready && facilityId && canAccess) void load();
  }, [ready, facilityId, canAccess, load]);

  if (!ready) {
    return <p style={{ padding: 16 }}>{t("medicationPhase18Ops.loading")}</p>;
  }
  if (!canAccess) {
    return <p style={{ padding: 16 }}>{t("medicationPhase18Ops.accessDenied")}</p>;
  }

  const q = dashboard?.quality;
  const s = dashboard?.safety;
  const a = dashboard?.activation;

  return (
    <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>
          {t("medicationPhase18Ops.adminTitle")}
        </h1>
        <Link href="/app/admin/medication-governance" style={{ fontSize: 14 }}>
          {t("medicationPhase18Ops.backAdmin")}
        </Link>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {t("medicationPhase18Ops.refresh")}
        </button>
        {canAdmin ? (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!facilityId) return;
                void sealPhase18Immutable(facilityId)
                  .then(() => load())
                  .catch((e: unknown) =>
                    setError(
                      normalizeUserFacingError(
                        e instanceof Error ? e.message : "",
                        language
                      ) || t("medicationPhase18Ops.errorLoad")
                    )
                  );
              }}
            >
              {t("medicationPhase18Ops.sealVersions")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!facilityId) return;
                void detectPhase18Drift(facilityId)
                  .then(() => load())
                  .catch((e: unknown) =>
                    setError(
                      normalizeUserFacingError(
                        e instanceof Error ? e.message : "",
                        language
                      ) || t("medicationPhase18Ops.errorLoad")
                    )
                  );
              }}
            >
              {t("medicationPhase18Ops.detectDrift")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!facilityId) return;
                void generatePhase18Regulatory(facilityId)
                  .then(() => load())
                  .catch((e: unknown) =>
                    setError(
                      normalizeUserFacingError(
                        e instanceof Error ? e.message : "",
                        language
                      ) || t("medicationPhase18Ops.errorLoad")
                    )
                  );
              }}
            >
              {t("medicationPhase18Ops.generateRegulatory")}
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
        {t("medicationPhase18Ops.banner")}
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
        {t("medicationPhase18Ops.locksBanner")}
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
            ["metricHealth", dashboard?.overallHealth ?? "—"],
            ["metricQuality", q?.qualityScore ?? 0],
            ["metricCoverage", q?.coverageScore ?? 0],
            ["metricExplain", q?.explainabilityScore ?? 0],
            ["metricReplay", q?.reproducibilityScore ?? 0],
            ["metricSealed", dashboard?.sealedVersions ?? 0],
            ["metricDrift", s?.openDriftAlerts ?? 0],
            ["metricReplayFail", s?.replayFailures ?? 0],
            ["metricRollbacks", s?.rollbackFrequency ?? 0],
            ["metricOrderMut", s?.orderMutations ?? 0],
            ["metricEnterprise", s?.enterpriseActivations ?? 0],
            ["metricCds", a?.productionCdsEnabled ? "ON" : "OFF"],
            ["metricRegulatory", dashboard?.regulatoryArtifactCount ?? 0],
            ["metricPilots", dashboard?.activePilots ?? 0],
          ] as const
        ).map(([key, value]) => (
          <div key={key} style={card()}>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              {t(`medicationPhase18Ops.${key}`)}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700 }}>
              {String(value)}
            </p>
          </div>
        ))}
      </div>

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t("medicationPhase18Ops.sectionsTitle")}
        </h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155" }}>
          <li>{t("medicationPhase18Ops.sectionHealth")}</li>
          <li>{t("medicationPhase18Ops.sectionCoverage")}</li>
          <li>{t("medicationPhase18Ops.sectionFreshness")}</li>
          <li>{t("medicationPhase18Ops.sectionEvidence")}</li>
          <li>{t("medicationPhase18Ops.sectionReview")}</li>
          <li>{t("medicationPhase18Ops.sectionQuality")}</li>
          <li>{t("medicationPhase18Ops.sectionPerformance")}</li>
          <li>{t("medicationPhase18Ops.sectionReplay")}</li>
          <li>{t("medicationPhase18Ops.sectionVersions")}</li>
          <li>{t("medicationPhase18Ops.sectionPilot")}</li>
          <li>{t("medicationPhase18Ops.sectionGovernance")}</li>
          <li>{t("medicationPhase18Ops.sectionSafety")}</li>
          <li>{t("medicationPhase18Ops.sectionDrift")}</li>
          <li>{t("medicationPhase18Ops.sectionRollback")}</li>
          <li>{t("medicationPhase18Ops.sectionCertification")}</li>
        </ul>
      </section>
    </div>
  );
}
