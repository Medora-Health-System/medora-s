"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  createKnowledgePopulationBatch,
  executeKnowledgePopulationDrafts,
  fetchKnowledgePopulationBatch,
  fetchKnowledgePopulationBatches,
  fetchKnowledgePopulationDashboard,
  previewKnowledgePopulationBatch,
  resolveKnowledgePopulationBatch,
  type KnowledgePopulationDashboard,
} from "@/lib/medicationKnowledgePopulationApi";

function card(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
  };
}

export default function KnowledgePopulationPage() {
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

  const [dashboard, setDashboard] = useState<KnowledgePopulationDashboard | null>(
    null
  );
  const [batches, setBatches] = useState<Array<Record<string, unknown>>>([]);
  const [batchDetail, setBatchDetail] = useState<Record<string, unknown> | null>(
    null
  );
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const [dash, list] = await Promise.all([
        fetchKnowledgePopulationDashboard(facilityId),
        fetchKnowledgePopulationBatches(facilityId),
      ]);
      setDashboard(dash);
      setBatches(list);
      const first = list[0];
      if (first?.id) {
        setBatchDetail(
          await fetchKnowledgePopulationBatch(facilityId, String(first.id))
        );
      }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(
        normalizeUserFacingError(raw, language) ||
          t("medicationKnowledgePopulation.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (ready && facilityId && canAccess) void load();
  }, [ready, facilityId, canAccess, load]);

  if (!ready) {
    return <p style={{ padding: 16 }}>{t("medicationKnowledgePopulation.loading")}</p>;
  }
  if (!canAccess) {
    return (
      <p style={{ padding: 16 }}>{t("medicationKnowledgePopulation.accessDenied")}</p>
    );
  }

  const batchId = batches[0]?.id ? String(batches[0].id) : null;
  const items = (batchDetail?.items as Array<Record<string, unknown>>) ?? [];

  return (
    <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>
          {t("medicationKnowledgePopulation.title")}
        </h1>
        <Link href="/app/admin/medication-governance" style={{ fontSize: 14 }}>
          {t("medicationKnowledgePopulation.backAdmin")}
        </Link>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {t("medicationKnowledgePopulation.refresh")}
        </button>
        {canAdmin ? (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!facilityId) return;
                void createKnowledgePopulationBatch(facilityId)
                  .then(() => load())
                  .catch((e: unknown) =>
                    setError(
                      normalizeUserFacingError(
                        e instanceof Error ? e.message : "",
                        language
                      ) || t("medicationKnowledgePopulation.errorLoad")
                    )
                  );
              }}
            >
              {t("medicationKnowledgePopulation.createBatch")}
            </button>
            <button
              type="button"
              disabled={loading || !batchId}
              onClick={() => {
                if (!facilityId || !batchId) return;
                void resolveKnowledgePopulationBatch(facilityId, batchId)
                  .then(() => load())
                  .catch((e: unknown) =>
                    setError(
                      normalizeUserFacingError(
                        e instanceof Error ? e.message : "",
                        language
                      ) || t("medicationKnowledgePopulation.errorLoad")
                    )
                  );
              }}
            >
              {t("medicationKnowledgePopulation.resolve")}
            </button>
            <button
              type="button"
              disabled={loading || !batchId}
              onClick={() => {
                if (!facilityId || !batchId) return;
                void previewKnowledgePopulationBatch(facilityId, batchId)
                  .then((p) => setPreview(p))
                  .catch((e: unknown) =>
                    setError(
                      normalizeUserFacingError(
                        e instanceof Error ? e.message : "",
                        language
                      ) || t("medicationKnowledgePopulation.errorLoad")
                    )
                  );
              }}
            >
              {t("medicationKnowledgePopulation.preview")}
            </button>
            <button
              type="button"
              disabled={loading || !batchId}
              onClick={() => {
                if (!facilityId || !batchId) return;
                void executeKnowledgePopulationDrafts(facilityId, batchId)
                  .then(() => load())
                  .catch((e: unknown) =>
                    setError(
                      normalizeUserFacingError(
                        e instanceof Error ? e.message : "",
                        language
                      ) || t("medicationKnowledgePopulation.errorLoad")
                    )
                  );
              }}
            >
              {t("medicationKnowledgePopulation.executeDrafts")}
            </button>
          </>
        ) : null}
      </div>

      <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
        {t("medicationKnowledgePopulation.intro")}
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
        <span>{t("medicationKnowledgePopulation.badgeControlled")}</span>
        <span>{t("medicationKnowledgePopulation.badgeShadow")}</span>
        <span>{t("medicationKnowledgePopulation.badgeNoAlerts")}</span>
        <span>{t("medicationKnowledgePopulation.badgeNoBlocking")}</span>
        <span>{t("medicationKnowledgePopulation.badgeNoActivation")}</span>
      </div>

      {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t("medicationKnowledgePopulation.dashboard")}
        </h2>
        {dashboard ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 8,
              fontSize: 13,
            }}
          >
            <div>
              {t("medicationKnowledgePopulation.metricFamilies")}:{" "}
              {dashboard.BatchFamilies}
            </div>
            <div>
              {t("medicationKnowledgePopulation.metricResolved")}:{" "}
              {dashboard.IdentityResolvedFamilies}
            </div>
            <div>
              {t("medicationKnowledgePopulation.metricBlocked")}:{" "}
              {dashboard.IdentityBlockedFamilies}
            </div>
            <div>
              {t("medicationKnowledgePopulation.metricClinicalDraft")}:{" "}
              {dashboard.ClinicalDraftRecords}
            </div>
            <div>
              {t("medicationKnowledgePopulation.metricClinicalApproved")}:{" "}
              {dashboard.ClinicalApprovedRecords}
            </div>
            <div>
              {t("medicationKnowledgePopulation.metricSafetyDraft")}:{" "}
              {dashboard.SafetyDraftRecords}
            </div>
            <div>
              {t("medicationKnowledgePopulation.metricSafetyApproved")}:{" "}
              {dashboard.SafetyApprovedRecords}
            </div>
            <div>
              {t("medicationKnowledgePopulation.metricNoSource")}:{" "}
              {dashboard.RecordsWithoutSources}
            </div>
            <div>
              {t("medicationKnowledgePopulation.metricShadow")}:{" "}
              {dashboard.ShadowEvaluableFamilies}
            </div>
            <div>
              {t("medicationKnowledgePopulation.metricValidated")}:{" "}
              {dashboard.ValidatedFamilies}
            </div>
            <div>
              {t("medicationKnowledgePopulation.metricActivations")}:{" "}
              {dashboard.ClinicalActivations}
            </div>
            <div>
              {t("medicationKnowledgePopulation.metricAlerts")}:{" "}
              {dashboard.ProviderFacingAlerts}
            </div>
            <div>
              {t("medicationKnowledgePopulation.metricBlocks")}:{" "}
              {dashboard.OrderBlocks}
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, color: "#64748b" }}>
            {loading
              ? t("medicationKnowledgePopulation.loading")
              : t("medicationKnowledgePopulation.empty")}
          </p>
        )}
      </section>

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t("medicationKnowledgePopulation.batchInventory")}
        </h2>
        <p style={{ margin: "0 0 8px", fontSize: 13 }}>
          {t("medicationKnowledgePopulation.batchStatus")}:{" "}
          {String(batchDetail?.status ?? dashboard?.batchStatus ?? "—")}
        </p>
        <div style={{ maxHeight: 280, overflow: "auto", display: "grid", gap: 4 }}>
          {items.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b" }}>
              {t("medicationKnowledgePopulation.emptyBatch")}
            </p>
          ) : (
            items.map((item) => (
              <div
                key={String(item.id)}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "6px 8px",
                  fontSize: 13,
                }}
              >
                {String(item.requestedFamilyName)} — {String(item.resolutionStatus)} —{" "}
                {String(item.populationWave ?? "")} — clinical{" "}
                {String(item.clinicalKnowledgeStatus)}
              </div>
            ))
          )}
        </div>
      </section>

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t("medicationKnowledgePopulation.previewResults")}
        </h2>
        <pre style={{ margin: 0, fontSize: 11, overflow: "auto", maxHeight: 220 }}>
          {JSON.stringify(preview, null, 2)}
        </pre>
      </section>

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t("medicationKnowledgePopulation.queues")}
        </h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569" }}>
          <li>{t("medicationKnowledgePopulation.queueClinical")}</li>
          <li>{t("medicationKnowledgePopulation.queuePharmacy")}</li>
          <li>{t("medicationKnowledgePopulation.queueMedical")}</li>
          <li>{t("medicationKnowledgePopulation.queueConflicts")}</li>
          <li>{t("medicationKnowledgePopulation.queueEligibility")}</li>
        </ul>
      </section>

      <p style={{ margin: 0, fontSize: 12, color: "#9a3412", fontWeight: 600 }}>
        {t("medicationKnowledgePopulation.safetyFooter")}
      </p>
    </div>
  );
}
