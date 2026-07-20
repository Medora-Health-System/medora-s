"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ChartCertificationB1Result } from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { emergencyActiveWorkspacePath, emergencyChartPath } from "@/features/emergency/emergencyRoutes";
import type { EdTrackboardCertificationEncounter } from "@/features/emergency/edClosedEncounterCertificationFromTrackboard";
import {
  CHART_CERTIFICATION_REFRESH_EVENT,
  loadWithSingleRetry,
} from "@/features/emergency/chartCertificationProductionUi";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { computeLos } from "@/features/emergency/erLengthOfStay";

type Props = {
  encounter: EdTrackboardCertificationEncounter;
  facilityId: string;
  facilityName: string | null;
  dispositionLabel?: string | null;
  onClose: () => void;
};

function pill(ready: boolean | null, t: (key: string) => string) {
  if (ready == null) {
    return (
      <span style={pillStyle("#f1f5f9", "#64748b", "#e2e8f0")}>
        {t("edLifecycle.certification.b1.summary.unknown")}
      </span>
    );
  }
  return ready ? (
    <span style={pillStyle("#d1fae5", "#065f46", "#6ee7b7")}>
      {t("edLifecycle.certification.summary.ready")}
    </span>
  ) : (
    <span style={pillStyle("#fef2f2", "#991b1b", "#fecaca")}>
      {t("edLifecycle.certification.summary.notReady")}
    </span>
  );
}

function pillStyle(bg: string, color: string, border: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 600,
    background: bg,
    color,
    border: `1px solid ${border}`,
  };
}

function remediationHref(
  encounterId: string,
  remediation?: { route?: string; tab?: string; section?: string }
): string {
  const route = remediation?.route ?? "chart";
  const tab = remediation?.tab;
  if (route === "triage") return `${emergencyActiveWorkspacePath(encounterId)}?tab=triage`;
  if (route === "nursing") return `${emergencyActiveWorkspacePath(encounterId)}?tab=nursing`;
  if (route === "provider") {
    const q = tab === "ecg" ? "provider&section=ecg" : "provider";
    return `${emergencyActiveWorkspacePath(encounterId)}?tab=${q}`;
  }
  if (route === "disposition") return `${emergencyActiveWorkspacePath(encounterId)}?tab=disposition`;
  if (route === "orders") {
    const orderTab = tab === "imaging" ? "imaging" : tab === "care" ? "care" : "orders";
    return `${emergencyActiveWorkspacePath(encounterId)}?tab=${orderTab}`;
  }
  if (route === "mar") {
    return `${emergencyActiveWorkspacePath(encounterId)}?tab=mar`;
  }
  if (route === "results") {
    return `${emergencyActiveWorkspacePath(encounterId)}?tab=results`;
  }
  if (route === "registration") return `/app/patients`;
  return emergencyChartPath(encounterId);
}

export function EdChartCertificationB1Panel({
  encounter,
  facilityId,
  facilityName,
  dispositionLabel,
  onClose,
}: Props) {
  const { t, language } = useI18n();
  const [result, setResult] = useState<ChartCertificationB1Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadOnce = useCallback(async (): Promise<boolean> => {
    if (!facilityId) return false;
    try {
      const raw = await apiFetch(`/encounters/${encounter.id}/chart-certification`, { facilityId });
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        setResult(null);
        return false;
      }
      setResult(raw as ChartCertificationB1Result);
      return true;
    } catch {
      setResult(null);
      return false;
    }
  }, [encounter.id, facilityId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const ok = await loadWithSingleRetry(loadOnce);
    setError(!ok);
    setLoading(false);
  }, [loadOnce]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => {
      void load();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener(CHART_CERTIFICATION_REFRESH_EVENT, onRefresh);
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener(CHART_CERTIFICATION_REFRESH_EVENT, onRefresh);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patientName =
    `${(encounter.patient?.firstName ?? "").trim()} ${(encounter.patient?.lastName ?? "").trim()}`.trim() ||
    t("common.dash");
  const mrn = (encounter.patient?.mrn ?? "").trim() || t("common.dash");
  const visitDate = encounter.createdAt
    ? formatEncounterChromeDateTime(encounter.createdAt, language)
    : t("common.dash");
  const los = computeLos(encounter.createdAt)?.labelPadded ?? t("common.dash");

  const stage =
    result?.certificationStage === "B3"
      ? "B3"
      : result?.certificationStage === "B2"
        ? "B2"
        : "B1";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ed-chart-certification-b1-title"
      data-testid="ed-chart-certification-b1-panel"
      data-certification-stage={stage}
      data-certification-authority={result?.certificationAuthority ?? "ADVISORY"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...MEDORA_CARD_SHELL,
          width: "min(760px, 100%)",
          maxHeight: "min(90vh, 900px)",
          overflow: "auto",
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <h2
            id="ed-chart-certification-b1-title"
            style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}
          >
            {t("edLifecycle.certification.panelTitle")}
          </h2>
          <button
            type="button"
            aria-label={t("edLifecycle.certification.closeDialog")}
            data-testid="ed-certification-close"
            onClick={onClose}
            style={{
              border: "1px solid #e2e8f0",
              background: "#fff",
              borderRadius: 10,
              width: 36,
              height: 36,
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              color: "#475569",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 6, fontSize: 13, color: "#334155" }}>
          <div>
            <strong>{t("edLifecycle.certification.patient")}:</strong> {patientName}
          </div>
          <div>
            <strong>{t("edLifecycle.certification.mrn")}:</strong> {mrn}
          </div>
          <div>
            <strong>{t("edLifecycle.certification.visitDate")}:</strong> {visitDate}
          </div>
          <div>
            <strong>{t("edLifecycle.certification.los")}:</strong> {los}
          </div>
          <div>
            <strong>{t("edLifecycle.certification.facility")}:</strong> {facilityName || t("common.dash")}
          </div>
          {dispositionLabel ? (
            <div>
              <strong>{t("edLifecycle.certification.disposition")}:</strong> {dispositionLabel}
            </div>
          ) : null}
        </div>

        {loading ? <p style={{ marginTop: 12, fontSize: 13 }}>{t("common.loading")}</p> : null}
        {error ? (
          <p
            data-testid="ed-certification-b1-error"
            style={{
              marginTop: 12,
              fontSize: 13,
              color: "#991b1b",
              fontWeight: 600,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "8px 10px",
            }}
          >
            {t("edLifecycle.certification.refreshError")}
          </p>
        ) : null}

        {result ? (
          <>
            {(result.evaluationErrors?.length ?? 0) > 0 ? (
              <p
                data-testid="ed-certification-b1-eval-errors"
                style={{ marginTop: 10, fontSize: 13, color: "#991b1b", fontWeight: 600 }}
              >
                {t("edLifecycle.certification.b1.evaluationErrorsPresent")}
              </p>
            ) : null}

            <section style={{ marginTop: 16 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
                {t("edLifecycle.certification.b1.authoritativeReadiness")}
              </h3>
              <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {t("edLifecycle.certification.closure")}
                  </div>
                  {pill(result.authoritativeReadiness.clinicalClosureReady, t)}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {t("edLifecycle.certification.dispositionReady")}
                  </div>
                  {pill(result.authoritativeReadiness.dispositionReady, t)}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {t("edLifecycle.certification.billing")}
                  </div>
                  {pill(result.authoritativeReadiness.billingReady, t)}
                </div>
              </div>
            </section>

            <section style={{ marginTop: 16 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
                {t("edLifecycle.certification.modulesTitle")}
              </h3>
              <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                {(
                  [
                    ["registrationReady", "REGISTRATION"],
                    ["triageReady", "TRIAGE"],
                    ["nursingReady", "NURSING"],
                    ["providerReady", "PROVIDER"],
                    ["dispositionDocumentationReady", "DISPOSITION_DOCUMENTATION"],
                    ...(stage === "B2" || stage === "B3"
                      ? ([
                          ["ordersReady", "ORDERS"],
                          ["laboratoryReady", "LAB_RESULTS"],
                          ["imagingReady", "IMAGING"],
                          ["ecgReady", "ECG"],
                          ["resultReviewReady", "RESULT_ACKNOWLEDGMENT"],
                        ] as const)
                      : []),
                    ...(stage === "B3"
                      ? ([
                          ["medicationOrdersReady", "MEDICATION_ORDERS"],
                          ["marReady", "MAR"],
                          ["infusionsReady", "INFUSIONS"],
                          ["medicationReconciliationReady", "MEDICATION_RECONCILIATION"],
                          ["proceduresReady", "PROCEDURES"],
                          ["reassessmentReady", "FULL_REASSESSMENT"],
                        ] as const)
                      : []),
                  ] as const
                ).map(([key, mod]) => (
                  <div key={mod}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {t(`edLifecycle.certification.b1.modules.${mod}`)}
                    </div>
                    {pill(
                      (result.evaluatedReadiness as Record<string, boolean | null | undefined>)[key] ??
                        null,
                      t
                    )}
                  </div>
                ))}
              </div>
            </section>

            {result.deficiencies.length > 0 ? (
              <section style={{ marginTop: 16 }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
                  {t("edLifecycle.certification.findingsTitle")}
                </h3>
                <ul style={{ listStyle: "none", margin: "8px 0 0 0", padding: 0, display: "grid", gap: 8 }}>
                  {result.deficiencies.map((d) => (
                    <li
                      key={d.deduplicationKey}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: "10px 12px",
                        background: "#fff",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t(d.titleKey)}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        {t(d.descriptionKey)}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                        {d.sourceAuthority === "ESTABLISHED_WORKFLOW"
                          ? t("edLifecycle.certification.requiresAttention")
                          : t("edLifecycle.certification.forReview")}
                      </div>
                      <Link
                        href={remediationHref(encounter.id, d.remediation)}
                        style={{
                          display: "inline-block",
                          marginTop: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#1d4ed8",
                        }}
                      >
                        {t("edLifecycle.certification.b1.openRemediation")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Link
                href={emergencyChartPath(encounter.id)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #93c5fd",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {t("edLifecycle.certification.actions.openChart")}
              </Link>
              <Link
                href={emergencyActiveWorkspacePath(encounter.id)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#0f172a",
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {t("edLifecycle.certification.actions.openDocumentation")}
              </Link>
              <Link
                href={`/app/billing/encounters/${encounter.id}`}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#0f172a",
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {t("edLifecycle.certification.actions.openBilling")}
              </Link>
              <Link
                href={`${emergencyActiveWorkspacePath(encounter.id)}?tab=mar`}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#0f172a",
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {t("edLifecycle.certification.actions.openMar")}
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
