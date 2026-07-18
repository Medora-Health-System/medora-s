"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  approveClinicalKnowledgeProfile,
  fetchClinicalKnowledgeDashboard,
  fetchClinicalKnowledgeProfile,
  fetchClinicalKnowledgeProfiles,
  transitionClinicalKnowledgeProfile,
  type ClinicalKnowledgeDashboard,
  type ClinicalKnowledgeProfileRow,
} from "@/lib/medicationClinicalKnowledgeApi";

function cardStyle(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#fff",
  };
}

const STATUS_OPTIONS = ["", "DRAFT", "UNDER_REVIEW", "APPROVED", "SUPERSEDED", "RETIRED"] as const;

export default function ClinicalKnowledgeWorkspacePage() {
  const { t, language } = useI18n();
  const { ready, facilityId, roles } = useFacilityAndRoles();

  const canAccess =
    roles.includes("ADMIN") ||
    roles.includes("MEDORA_SUPER_ADMIN") ||
    roles.includes("MEDICATION_ADMIN") ||
    roles.includes("MEDICATION_REVIEWER") ||
    roles.includes("PHARMACY");

  const canApprove =
    roles.includes("MEDICATION_ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  const [dashboard, setDashboard] = useState<ClinicalKnowledgeDashboard | null>(null);
  const [rows, setRows] = useState<ClinicalKnowledgeProfileRow[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<(ClinicalKnowledgeProfileRow & Record<string, unknown>) | null>(
    null
  );
  const [rationale, setRationale] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const [metrics, queue] = await Promise.all([
        fetchClinicalKnowledgeDashboard(facilityId),
        fetchClinicalKnowledgeProfiles(facilityId, {
          lifecycleStatus: status || undefined,
          limit: 100,
        }),
      ]);
      setDashboard(metrics);
      setRows(queue.rows);
      setTotal(queue.total);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("medicationClinicalKnowledge.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, status, language, t]);

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
        setDetail(await fetchClinicalKnowledgeProfile(facilityId, selectedId));
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "";
        setError(normalizeUserFacingError(raw, language) || t("medicationClinicalKnowledge.errorLoad"));
      }
    })();
  }, [facilityId, selectedId, language, t]);

  async function runTransition(toStatus: string) {
    if (!facilityId || !selectedId) return;
    if (!rationale.trim()) {
      setError(t("medicationClinicalKnowledge.errorRationale"));
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      if (toStatus === "APPROVED") {
        await approveClinicalKnowledgeProfile(facilityId, selectedId, {
          rationale: rationale.trim(),
        });
      } else {
        await transitionClinicalKnowledgeProfile(facilityId, selectedId, {
          toStatus,
          rationale: rationale.trim(),
        });
      }
      setSuccess(t("medicationClinicalKnowledge.successTransition"));
      setRationale("");
      await load();
      setDetail(await fetchClinicalKnowledgeProfile(facilityId, selectedId));
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("medicationClinicalKnowledge.errorAction"));
    }
  }

  if (!ready) return <p style={{ padding: 16 }}>{t("medicationClinicalKnowledge.loading")}</p>;
  if (!canAccess) {
    return <p style={{ padding: 16 }}>{t("medicationClinicalKnowledge.accessDenied")}</p>;
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 1200 }}>
      <div>
        <Link href="/app/admin/medication-governance" style={{ fontSize: 14 }}>
          {t("medicationClinicalKnowledge.backAdmin")}
        </Link>
        <h1 style={{ margin: "8px 0 4px", fontSize: 22 }}>
          {t("medicationClinicalKnowledge.title")}
        </h1>
        <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
          {t("medicationClinicalKnowledge.intro")}
        </p>
        <div
          style={{
            marginTop: 10,
            padding: "8px 10px",
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: 10,
            fontSize: 13,
            color: "#92400e",
          }}
        >
          {t("medicationClinicalKnowledge.safetyBanner")}
          <div style={{ marginTop: 4 }}>
            {t("medicationClinicalKnowledge.clinicalActivationOff")} ·{" "}
            {t("medicationClinicalKnowledge.cdsOff")}
          </div>
        </div>
      </div>

      {dashboard && (
        <section style={cardStyle()}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>
            {t("medicationClinicalKnowledge.dashboardTitle")}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13 }}>
            <span>
              {t("medicationClinicalKnowledge.metricTotal")}: {dashboard.profilesTotal}
            </span>
            <span>
              {t("medicationClinicalKnowledge.metricDraft")}: {dashboard.draftCount}
            </span>
            <span>
              {t("medicationClinicalKnowledge.metricReview")}: {dashboard.underReviewCount}
            </span>
            <span>
              {t("medicationClinicalKnowledge.metricApproved")}: {dashboard.approvedCount}
            </span>
            <span>
              {t("medicationClinicalKnowledge.metricSources")}: {dashboard.sourcesCount}
            </span>
            <span>
              {t("medicationClinicalKnowledge.metricMissingEm")}:{" "}
              {dashboard.conceptsMissingEmergencyProfileEstimate}
            </span>
          </div>
        </section>
      )}

      <section style={{ ...cardStyle(), display: "grid", gap: 10 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 13 }}>
            {t("medicationClinicalKnowledge.filterStatus")}{" "}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s || "all"} value={s}>
                  {s || t("medicationClinicalKnowledge.filterAll")}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => void load()} disabled={loading}>
            {t("medicationClinicalKnowledge.refresh")}
          </button>
          <span style={{ fontSize: 13, color: "#64748b" }}>{total}</span>
        </div>
        {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}
        {success ? <p style={{ color: "#166534", margin: 0 }}>{success}</p> : null}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <section style={cardStyle()}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>
            {t("medicationClinicalKnowledge.queueTitle")}
          </h2>
          {loading ? <p>{t("medicationClinicalKnowledge.loading")}</p> : null}
          {!loading && rows.length === 0 ? (
            <p style={{ color: "#64748b" }}>{t("medicationClinicalKnowledge.empty")}</p>
          ) : null}
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border:
                      selectedId === row.id ? "1px solid #2563eb" : "1px solid #e2e8f0",
                    background: selectedId === row.id ? "#eff6ff" : "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <div>
                    <strong>{row.lifecycleStatus}</strong> ·{" "}
                    {row.source?.sourceCode ?? row.knowledgeSourceLabel ?? "—"}
                  </div>
                  <div style={{ color: "#64748b" }}>
                    {row.conceptId ?? "—"} / {row.productId ?? "—"}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section style={cardStyle()}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>
            {t("medicationClinicalKnowledge.detailTitle")}
          </h2>
          {!detail ? (
            <p style={{ color: "#64748b" }}>{t("medicationClinicalKnowledge.empty")}</p>
          ) : (
            <div style={{ fontSize: 13, display: "grid", gap: 6 }}>
              <div>
                {t("medicationClinicalKnowledge.lifecycle")}:{" "}
                <strong>{detail.lifecycleStatus}</strong>
              </div>
              <div>
                {t("medicationClinicalKnowledge.source")}:{" "}
                {detail.source?.sourceName ?? detail.knowledgeSourceLabel ?? "—"}
              </div>
              <div>
                {t("medicationClinicalKnowledge.version")}:{" "}
                {detail.knowledgeVersion?.versionLabel ??
                  detail.knowledgeVersionLabel ??
                  "—"}
              </div>
              <div>
                {t("medicationClinicalKnowledge.conceptId")}: {detail.conceptId ?? "—"}
              </div>
              <div>
                {t("medicationClinicalKnowledge.productId")}: {detail.productId ?? "—"}
              </div>
              <div>
                {t("medicationClinicalKnowledge.evidence")}: {detail.evidenceLevel ?? "—"}
              </div>
              <label style={{ display: "grid", gap: 4, marginTop: 8 }}>
                {t("medicationClinicalKnowledge.rationaleLabel")}
                <textarea
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  rows={3}
                  style={{ width: "100%" }}
                />
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {detail.lifecycleStatus === "DRAFT" ? (
                  <button type="button" onClick={() => void runTransition("UNDER_REVIEW")}>
                    {t("medicationClinicalKnowledge.submitReview")}
                  </button>
                ) : null}
                {canApprove && detail.lifecycleStatus === "UNDER_REVIEW" ? (
                  <button type="button" onClick={() => void runTransition("APPROVED")}>
                    {t("medicationClinicalKnowledge.approve")}
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
