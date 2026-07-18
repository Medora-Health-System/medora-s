"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  createSourceBackedWave,
  fetchSourceBackedDashboard,
  runSourceBackedInvestigate,
  runSourceBackedShadow,
  type SourceBackedDashboard,
} from "@/lib/medicationSourceBackedValidationApi";

function card(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
  };
}

export default function SourceBackedValidationPage() {
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

  const [dashboard, setDashboard] = useState<SourceBackedDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      setDashboard(await fetchSourceBackedDashboard(facilityId));
    } catch (e: unknown) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : "", language) ||
          t("medicationSourceBackedValidation.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (ready && facilityId && canAccess) void load();
  }, [ready, facilityId, canAccess, load]);

  if (!ready) {
    return (
      <p style={{ padding: 16 }}>{t("medicationSourceBackedValidation.loading")}</p>
    );
  }
  if (!canAccess) {
    return (
      <p style={{ padding: 16 }}>
        {t("medicationSourceBackedValidation.accessDenied")}
      </p>
    );
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>
          {t("medicationSourceBackedValidation.title")}
        </h1>
        <Link href="/app/admin/medication-governance" style={{ fontSize: 14 }}>
          {t("medicationSourceBackedValidation.backAdmin")}
        </Link>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {t("medicationSourceBackedValidation.refresh")}
        </button>
        {canAdmin ? (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!facilityId) return;
                void runSourceBackedInvestigate(facilityId)
                  .then(() => load())
                  .catch((e: unknown) =>
                    setError(
                      normalizeUserFacingError(
                        e instanceof Error ? e.message : "",
                        language
                      ) || t("medicationSourceBackedValidation.errorLoad")
                    )
                  );
              }}
            >
              {t("medicationSourceBackedValidation.investigateIdentity")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!facilityId) return;
                void createSourceBackedWave(facilityId)
                  .then(() => load())
                  .catch((e: unknown) =>
                    setError(
                      normalizeUserFacingError(
                        e instanceof Error ? e.message : "",
                        language
                      ) || t("medicationSourceBackedValidation.errorLoad")
                    )
                  );
              }}
            >
              {t("medicationSourceBackedValidation.createWave")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!facilityId) return;
                void runSourceBackedShadow(facilityId)
                  .then(() => load())
                  .catch((e: unknown) =>
                    setError(
                      normalizeUserFacingError(
                        e instanceof Error ? e.message : "",
                        language
                      ) || t("medicationSourceBackedValidation.errorLoad")
                    )
                  );
              }}
            >
              {t("medicationSourceBackedValidation.runShadow")}
            </button>
          </>
        ) : null}
      </div>

      <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
        {t("medicationSourceBackedValidation.intro")}
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
        <span>{t("medicationSourceBackedValidation.badgeSource")}</span>
        <span>{t("medicationSourceBackedValidation.badgeShadow")}</span>
        <span>{t("medicationSourceBackedValidation.badgeNoAlerts")}</span>
        <span>{t("medicationSourceBackedValidation.badgeNoBlocking")}</span>
        <span>{t("medicationSourceBackedValidation.badgeNoActivation")}</span>
      </div>

      {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t("medicationSourceBackedValidation.commandCenter")}
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
              {t("medicationSourceBackedValidation.metricRequested")}:{" "}
              {dashboard.RequestedFamilies}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricResolved")}:{" "}
              {dashboard.ResolvedFamilies}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricBlocked")}:{" "}
              {dashboard.IdentityBlockedFamilies}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricAcetaminophen")}:{" "}
              {dashboard.AcetaminophenResolutionStatus}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricWave1")}:{" "}
              {dashboard.Wave1SelectedFamilies}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricSourceReady")}:{" "}
              {dashboard.SourceReadyFamilies}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricApprovedShadow")}:{" "}
              {dashboard.ClinicalRecordsApprovedForShadow}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricShadowEval")}:{" "}
              {dashboard.FamiliesShadowEvaluable}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricRefCases")}:{" "}
              {dashboard.ReferenceCases}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricMatched")}:{" "}
              {dashboard.MatchedFindings}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricMissed")}:{" "}
              {dashboard.MissedFindings}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricUnexpected")}:{" "}
              {dashboard.UnexpectedFindings}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricFp")}:{" "}
              {dashboard.ConfirmedFalsePositives}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricCritical")}:{" "}
              {dashboard.CriticalMisses}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricAlerts")}:{" "}
              {dashboard.ProviderFacingAlerts}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricBlocks")}:{" "}
              {dashboard.OrderBlocks}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricActivations")}:{" "}
              {dashboard.ClinicalActivations}
            </div>
            <div>
              {t("medicationSourceBackedValidation.metricReadiness")}:{" "}
              {dashboard.ReadinessResult}
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, color: "#64748b" }}>
            {loading
              ? t("medicationSourceBackedValidation.loading")
              : t("medicationSourceBackedValidation.empty")}
          </p>
        )}
      </section>

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t("medicationSourceBackedValidation.waveFamilies")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {(dashboard?.Wave1FamilyNames ?? []).join(", ") ||
            t("medicationSourceBackedValidation.emptyWave")}
        </p>
      </section>

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t("medicationSourceBackedValidation.queues")}
        </h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569" }}>
          <li>{t("medicationSourceBackedValidation.queueIdentity")}</li>
          <li>{t("medicationSourceBackedValidation.queueSource")}</li>
          <li>{t("medicationSourceBackedValidation.queueReview")}</li>
          <li>{t("medicationSourceBackedValidation.queueShadow")}</li>
          <li>{t("medicationSourceBackedValidation.queueGaps")}</li>
        </ul>
      </section>

      <p style={{ margin: 0, fontSize: 12, color: "#9a3412", fontWeight: 600 }}>
        {t("medicationSourceBackedValidation.safetyFooter")}
      </p>
    </div>
  );
}
