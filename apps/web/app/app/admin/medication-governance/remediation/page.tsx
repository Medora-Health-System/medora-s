"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  deferPhase15WorkItem,
  fetchPhase15Dashboard,
  previewPhase15Transition,
  refreshPhase15Remediations,
  type Phase15Dashboard,
} from "@/lib/medicationPhase15RemediationApi";

function card(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
  };
}

export default function Phase15RemediationPage() {
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

  const [dashboard, setDashboard] = useState<Phase15Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterFamily, setFilterFamily] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [previewJson, setPreviewJson] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      setDashboard(await fetchPhase15Dashboard(facilityId));
    } catch (e: unknown) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : "", language) ||
          t("medicationPhase15Remediation.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (ready && facilityId && canAccess) void load();
  }, [ready, facilityId, canAccess, load]);

  const remediations = useMemo(() => {
    const rows = dashboard?.Remediations ?? [];
    return rows.filter((r) => {
      if (filterFamily && r.familyKey !== filterFamily) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      return true;
    });
  }, [dashboard, filterFamily, filterStatus]);

  if (!ready) {
    return <p style={{ padding: 16 }}>{t("medicationPhase15Remediation.loading")}</p>;
  }
  if (!canAccess) {
    return (
      <p style={{ padding: 16 }}>{t("medicationPhase15Remediation.accessDenied")}</p>
    );
  }

  const b = dashboard?.liveBaseline;

  return (
    <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>
          {t("medicationPhase15Remediation.title")}
        </h1>
        <Link href="/app/admin/medication-governance" style={{ fontSize: 14 }}>
          {t("medicationPhase15Remediation.backAdmin")}
        </Link>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {t("medicationPhase15Remediation.refresh")}
        </button>
        {canAdmin ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (!facilityId) return;
              void refreshPhase15Remediations(facilityId)
                .then(() => load())
                .catch((e: unknown) =>
                  setError(
                    normalizeUserFacingError(
                      e instanceof Error ? e.message : "",
                      language
                    ) || t("medicationPhase15Remediation.errorLoad")
                  )
                );
            }}
          >
            {t("medicationPhase15Remediation.refreshQueue")}
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
        {t("medicationPhase15Remediation.banner")}
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
        {t("medicationPhase15Remediation.certBanner")}
      </p>
      <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
        {t("medicationPhase15Remediation.intro")}
      </p>

      {error ? (
        <p style={{ color: "#b91c1c", margin: 0 }} role="alert">
          {error}
        </p>
      ) : null}

      {b ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 8,
          }}
        >
          {(
            [
              ["metricWave1", b.Wave1Families],
              ["metricApproved", b.ApprovedForShadow],
              ["metricOpenGaps", b.OpenTier1KnowledgeGaps],
              ["metricOpenWork", b.OpenWorkItems],
              ["metricDeferred", b.DeferredWorkItems ?? 0],
              ["metricBlocked", b.BlockedWorkItems],
              ["metricResolved", b.ResolvedWorkItems],
              ["metricReadiness", b.FinalReadiness ?? b.OperationalReadiness],
              ["metricCert", b.CertificationDecision ?? "—"],
              ["metricActivations", b.ClinicalActivations],
              ["metricAlerts", b.ProviderAlerts],
              ["metricBlocks", b.OrderBlocks],
            ] as const
          ).map(([key, val]) => (
            <div key={key} style={card()}>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {t(`medicationPhase15Remediation.${key}`)}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{String(val)}</div>
            </div>
          ))}
        </div>
      ) : loading ? (
        <p>{t("medicationPhase15Remediation.loading")}</p>
      ) : (
        <p>{t("medicationPhase15Remediation.empty")}</p>
      )}

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>
          {t("medicationPhase15Remediation.familiesTitle")}
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
              <th style={{ padding: 6 }}>{t("medicationPhase15Remediation.colFamily")}</th>
              <th style={{ padding: 6 }}>{t("medicationPhase15Remediation.colIdentity")}</th>
              <th style={{ padding: 6 }}>{t("medicationPhase15Remediation.colOpenGaps")}</th>
              <th style={{ padding: 6 }}>{t("medicationPhase15Remediation.colOpenWork")}</th>
              <th style={{ padding: 6 }}>{t("medicationPhase15Remediation.colBlocked")}</th>
            </tr>
          </thead>
          <tbody>
            {(dashboard?.Families ?? []).map((f) => (
              <tr key={f.familyKey} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: 6 }}>{f.familyName}</td>
                <td style={{ padding: 6 }}>{f.identityStatus}</td>
                <td style={{ padding: 6 }}>{f.openGaps}</td>
                <td style={{ padding: 6 }}>{f.workItemsOpen}</td>
                <td style={{ padding: 6 }}>{f.workItemsBlocked}</td>
              </tr>
            ))}
            {dashboard?.Acetaminophen ? (
              <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                <td style={{ padding: 6 }}>acetaminophen</td>
                <td style={{ padding: 6 }} colSpan={4}>
                  {t("medicationPhase15Remediation.acetaminophenBlocked")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section style={card()}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>
          {t("medicationPhase15Remediation.queueTitle")}
        </h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <label style={{ fontSize: 13 }}>
            {t("medicationPhase15Remediation.filterFamily")}{" "}
            <select
              value={filterFamily}
              onChange={(e) => setFilterFamily(e.target.value)}
            >
              <option value="">{t("medicationPhase15Remediation.filterAll")}</option>
              {(dashboard?.Families ?? []).map((f) => (
                <option key={f.familyKey} value={f.familyKey}>
                  {f.familyName}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 13 }}>
            {t("medicationPhase15Remediation.filterStatus")}{" "}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">{t("medicationPhase15Remediation.filterAll")}</option>
              {Object.keys(b?.WorkItemsByStatus ?? {}).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        {remediations.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>
            {t("medicationPhase15Remediation.emptyQueue")}
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: 6 }}>{t("medicationPhase15Remediation.colFamily")}</th>
                <th style={{ padding: 6 }}>{t("medicationPhase15Remediation.colCategory")}</th>
                <th style={{ padding: 6 }}>{t("medicationPhase15Remediation.colStatus")}</th>
                <th style={{ padding: 6 }}>{t("medicationPhase15Remediation.colBlocker")}</th>
                <th style={{ padding: 6 }}>{t("medicationPhase15Remediation.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {remediations.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 6 }}>{r.familyKey}</td>
                  <td style={{ padding: 6 }}>{r.gapCategoryDisplay}</td>
                  <td style={{ padding: 6 }}>{r.status}</td>
                  <td style={{ padding: 6 }}>{r.blockingReason ?? "—"}</td>
                  <td style={{ padding: 6 }}>
                    <button
                      type="button"
                      style={{ marginRight: 6 }}
                      onClick={() => {
                        if (!facilityId) return;
                        void previewPhase15Transition(
                          facilityId,
                          r.id,
                          "ROUTED"
                        )
                          .then((p) => setPreviewJson(JSON.stringify(p, null, 2)))
                          .catch((e: unknown) =>
                            setError(
                              normalizeUserFacingError(
                                e instanceof Error ? e.message : "",
                                language
                              ) || t("medicationPhase15Remediation.errorLoad")
                            )
                          );
                      }}
                    >
                      {t("medicationPhase15Remediation.preview")}
                    </button>
                    {canAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!facilityId) return;
                          const reason = window.prompt(
                            t("medicationPhase15Remediation.deferReasonPrompt")
                          );
                          if (!reason) return;
                          void deferPhase15WorkItem(facilityId, r.id, reason)
                            .then(() => load())
                            .catch((e: unknown) =>
                              setError(
                                normalizeUserFacingError(
                                  e instanceof Error ? e.message : "",
                                  language
                                ) || t("medicationPhase15Remediation.errorLoad")
                              )
                            );
                        }}
                      >
                        {t("medicationPhase15Remediation.defer")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {previewJson ? (
        <section style={card()} aria-label={t("medicationPhase15Remediation.previewTitle")}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>
            {t("medicationPhase15Remediation.previewTitle")}
          </h2>
          <p style={{ fontSize: 13, color: "#92400e" }}>
            {t("medicationPhase15Remediation.previewNoMutation")}
          </p>
          <pre
            style={{
              margin: 0,
              fontSize: 12,
              overflow: "auto",
              maxHeight: 280,
              background: "#f8fafc",
              padding: 8,
              borderRadius: 8,
            }}
          >
            {previewJson}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
