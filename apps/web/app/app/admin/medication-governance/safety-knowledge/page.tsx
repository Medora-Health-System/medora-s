"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  approveSafetyInteraction,
  fetchSafetyInteraction,
  fetchSafetyInteractions,
  fetchSafetyKnowledgeDashboard,
  transitionSafetyInteraction,
  type SafetyInteractionRow,
  type SafetyKnowledgeDashboard,
} from "@/lib/medicationSafetyKnowledgeApi";

function cardStyle(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#fff",
  };
}

const STATUS_OPTIONS = [
  "",
  "DRAFT",
  "UNDER_REVIEW",
  "APPROVED",
  "SUPERSEDED",
  "RETIRED",
  "REJECTED",
] as const;

export default function SafetyKnowledgeWorkspacePage() {
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

  const [dashboard, setDashboard] = useState<SafetyKnowledgeDashboard | null>(null);
  const [rows, setRows] = useState<SafetyInteractionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<(SafetyInteractionRow & Record<string, unknown>) | null>(
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
        fetchSafetyKnowledgeDashboard(facilityId),
        fetchSafetyInteractions(facilityId, {
          status: status || undefined,
          limit: 100,
        }),
      ]);
      setDashboard(metrics);
      setRows(queue.rows);
      setTotal(queue.total);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("medicationSafetyKnowledge.errorLoad"));
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
        setDetail(await fetchSafetyInteraction(facilityId, selectedId));
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "";
        setError(normalizeUserFacingError(raw, language) || t("medicationSafetyKnowledge.errorLoad"));
      }
    })();
  }, [facilityId, selectedId, language, t]);

  async function runTransition(toStatus: string) {
    if (!facilityId || !selectedId) return;
    if (!rationale.trim()) {
      setError(t("medicationSafetyKnowledge.errorRationale"));
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      if (toStatus === "APPROVED") {
        await approveSafetyInteraction(facilityId, selectedId, {
          rationale: rationale.trim(),
        });
      } else {
        await transitionSafetyInteraction(facilityId, selectedId, {
          toStatus,
          rationale: rationale.trim(),
        });
      }
      setSuccess(t("medicationSafetyKnowledge.successTransition"));
      setRationale("");
      await load();
      setDetail(await fetchSafetyInteraction(facilityId, selectedId));
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("medicationSafetyKnowledge.errorAction"));
    }
  }

  if (!ready) return <p style={{ padding: 16 }}>{t("medicationSafetyKnowledge.loading")}</p>;
  if (!canAccess) {
    return <p style={{ padding: 16 }}>{t("medicationSafetyKnowledge.accessDenied")}</p>;
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 14, maxWidth: 1100 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>{t("medicationSafetyKnowledge.title")}</h1>
        <Link href="/app/admin/medication-governance" style={{ fontSize: 14 }}>
          {t("medicationSafetyKnowledge.backAdmin")}
        </Link>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {t("medicationSafetyKnowledge.refresh")}
        </button>
      </div>
      <p style={{ margin: 0, color: "#475569", maxWidth: 820 }}>
        {t("medicationSafetyKnowledge.intro")}
      </p>
      <div
        style={{
          ...cardStyle(),
          background: "#f8fafc",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          fontSize: 13,
        }}
      >
        <span>{t("medicationSafetyKnowledge.clinicalActivationOff")}</span>
        <span>{t("medicationSafetyKnowledge.alertsOff")}</span>
        <span>{t("medicationSafetyKnowledge.futureCdsBadge")}</span>
      </div>

      {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}
      {success ? <p style={{ color: "#15803d", margin: 0 }}>{success}</p> : null}

      {dashboard ? (
        <section style={cardStyle()}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>
            {t("medicationSafetyKnowledge.dashboardTitle")}
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 8,
              fontSize: 13,
            }}
          >
            <div>
              {t("medicationSafetyKnowledge.metricInteractions")}: {dashboard.interactionsTotal}
            </div>
            <div>
              {t("medicationSafetyKnowledge.metricDraft")}: {dashboard.interactionsDraft}
            </div>
            <div>
              {t("medicationSafetyKnowledge.metricApproved")}: {dashboard.interactionsApproved}
            </div>
            <div>
              {t("medicationSafetyKnowledge.metricAllergen")}: {dashboard.allergenMappings}
            </div>
            <div>
              {t("medicationSafetyKnowledge.metricCross")}: {dashboard.crossReactivityRules}
            </div>
            <div>
              {t("medicationSafetyKnowledge.metricDupGroups")}: {dashboard.duplicateTherapyGroups}
            </div>
            <div>
              {t("medicationSafetyKnowledge.metricActivated")}:{" "}
              {dashboard.clinicallyActivatedRecords}
            </div>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("medicationSafetyKnowledge.safetyBanner")}
          </p>
        </section>
      ) : null}

      <section style={cardStyle()}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>{t("medicationSafetyKnowledge.queueTitle")}</h2>
          <label style={{ fontSize: 13 }}>
            {t("medicationSafetyKnowledge.filterStatus")}{" "}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s || "all"} value={s}>
                  {s || t("medicationSafetyKnowledge.filterAll")}
                </option>
              ))}
            </select>
          </label>
          <span style={{ fontSize: 12, color: "#64748b" }}>{total}</span>
        </div>
        {rows.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>{t("medicationSafetyKnowledge.empty")}</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "8px 10px",
                    background: selectedId === row.id ? "#eff6ff" : "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <strong>{row.status}</strong> · {row.severity} · {row.interactionType}
                  {row.directional ? " · DIR" : " · SYM"} ·{" "}
                  {row.clinicalActivationAllowed
                    ? t("medicationSafetyKnowledge.activationOn")
                    : t("medicationSafetyKnowledge.clinicalActivationOff")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {detail ? (
        <section style={cardStyle()}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>
            {t("medicationSafetyKnowledge.detailTitle")}
          </h2>
          <div style={{ fontSize: 13, display: "grid", gap: 4 }}>
            <div>
              {t("medicationSafetyKnowledge.lifecycle")}: {detail.status}
            </div>
            <div>
              {t("medicationSafetyKnowledge.severity")}: {detail.severity}
            </div>
            <div>
              {t("medicationSafetyKnowledge.pairKey")}: {detail.normalizedPairKey}
            </div>
            <div>
              {t("medicationSafetyKnowledge.evidence")}: {String(detail.evidenceLevel ?? "—")}
            </div>
            <div>
              {detail.futureAlertEligible
                ? t("medicationSafetyKnowledge.futureCdsBadge")
                : t("medicationSafetyKnowledge.futureCdsOff")}
            </div>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13 }}>
              {t("medicationSafetyKnowledge.rationaleLabel")}
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={2}
                style={{ width: "100%", marginTop: 4 }}
              />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => void runTransition("UNDER_REVIEW")}>
                {t("medicationSafetyKnowledge.submitReview")}
              </button>
              {canApprove ? (
                <button type="button" onClick={() => void runTransition("APPROVED")}>
                  {t("medicationSafetyKnowledge.approve")}
                </button>
              ) : null}
              <button type="button" onClick={() => void runTransition("RETIRED")}>
                {t("medicationSafetyKnowledge.retire")}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
