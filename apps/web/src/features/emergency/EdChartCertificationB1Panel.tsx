"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ChartCertificationB1Result } from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { emergencyActiveWorkspacePath, emergencyChartPath } from "@/features/emergency/emergencyRoutes";
import type { EdTrackboardCertificationEncounter } from "@/features/emergency/edClosedEncounterCertificationFromTrackboard";

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
  const { t } = useI18n();
  const [result, setResult] = useState<ChartCertificationB1Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(false);
    try {
      const raw = await apiFetch(`/encounters/${encounter.id}/chart-certification`, { facilityId });
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        setResult(null);
        setError(true);
        return;
      }
      setResult(raw as ChartCertificationB1Result);
    } catch {
      setResult(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [encounter.id, facilityId]);

  useEffect(() => {
    void load();
  }, [load, refreshNonce]);

  const patientName =
    `${(encounter.patient?.firstName ?? "").trim()} ${(encounter.patient?.lastName ?? "").trim()}`.trim() ||
    t("common.dash");
  const stage = result?.certificationStage === "B2" ? "B2" : "B1";
  const i18nPrefix =
    stage === "B2" ? "edLifecycle.certification.b2" : "edLifecycle.certification.b1";

  return (
    <div
      role="dialog"
      aria-modal="true"
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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              {t(`${i18nPrefix}.panelTitle`)}
            </h2>
            <p
              data-testid="ed-certification-b1-banner"
              style={{ margin: "6px 0 0 0", fontSize: 13, color: "#92400e", fontWeight: 600 }}
            >
              {t(`${i18nPrefix}.banner`)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              data-testid="ed-certification-b1-refresh"
              disabled={loading}
              onClick={() => setRefreshNonce((n) => n + 1)}
              style={{
                border: "1px solid #e2e8f0",
                background: "#fff",
                borderRadius: 10,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {t("edLifecycle.certification.advisory.refresh")}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid #e2e8f0",
                background: "#fff",
                borderRadius: 10,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 13, color: "#334155" }}>
          <div>
            <strong>{t("edLifecycle.certification.patient")}:</strong> {patientName}
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
            {t("edLifecycle.certification.b1.loadError")}
          </p>
        ) : null}

        {result ? (
          <>
            <p style={{ margin: "12px 0 0 0", fontSize: 12, color: "#64748b" }}>
              {t(`${i18nPrefix}.coveragePartial`)}
              {" · "}
              {t("edLifecycle.certification.evaluatedAt")}: {result.evaluatedAt}
              {" · v"}
              {result.encounterVersion}
              {result.diagnosticRevision ? ` · diag ${result.diagnosticRevision}` : null}
            </p>

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
                {t(`${i18nPrefix}.evaluatedModules`)}
              </h3>
              <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                {(
                  [
                    ["registrationReady", "REGISTRATION"],
                    ["triageReady", "TRIAGE"],
                    ["nursingReady", "NURSING"],
                    ["providerReady", "PROVIDER"],
                    ["dispositionDocumentationReady", "DISPOSITION_DOCUMENTATION"],
                    ...(stage === "B2"
                      ? ([
                          ["ordersReady", "ORDERS"],
                          ["laboratoryReady", "LAB_RESULTS"],
                          ["imagingReady", "IMAGING"],
                          ["ecgReady", "ECG"],
                          ["resultReviewReady", "RESULT_ACKNOWLEDGMENT"],
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

            <section style={{ marginTop: 16 }} data-testid="ed-certification-b1-unevaluated">
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
                {t(`${i18nPrefix}.unevaluatedTitle`)}
              </h3>
              <ul style={{ margin: "8px 0 0 0", paddingLeft: 18, fontSize: 12, color: "#64748b" }}>
                {result.unevaluatedModules.slice(0, 11).map((m) => (
                  <li key={m}>{t(`edLifecycle.certification.b1.modules.${m}`)}</li>
                ))}
              </ul>
            </section>

            {result.deficiencies.length > 0 ? (
              <section style={{ marginTop: 16 }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
                  {t("edLifecycle.certification.b1.findingsTitle")}
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
                          ? t("edLifecycle.certification.b1.establishedFinding")
                          : t("edLifecycle.certification.b1.advisoryFinding")}
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
          </>
        ) : null}
      </div>
    </div>
  );
}
