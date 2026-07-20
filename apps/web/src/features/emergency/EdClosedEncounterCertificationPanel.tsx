"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  EdChartCertificationSourceAuthority,
  type DispositionSafetyReadinessResponse,
  type EdClosedEncounterCertificationResult,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { computeLos } from "@/features/emergency/erLengthOfStay";
import { buildEdClosedEncounterCertificationFromTrackboardRow } from "@/features/emergency/edClosedEncounterCertificationFromTrackboard";
import type { EdTrackboardCertificationEncounter } from "@/features/emergency/edClosedEncounterCertificationFromTrackboard";
import { emergencyActiveWorkspacePath, emergencyChartPath } from "@/features/emergency/emergencyRoutes";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { isEnterpriseChartCertificationStageAEnabled } from "@/features/emergency/enterpriseChartCertificationStageAFlag";
import { resolveCertificationDeficiencyDisplay } from "@/features/emergency/certificationDeficiencyDisplay";
import type { SupportedLanguage } from "@/i18n/config";

type Props = {
  encounter: EdTrackboardCertificationEncounter;
  facilityId: string;
  facilityName: string | null;
  dispositionLabel?: string | null;
  onClose: () => void;
};

function advisoryPill(suggested: boolean, t: (key: string) => string) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        background: suggested ? "#fffbeb" : "#d1fae5",
        color: suggested ? "#92400e" : "#065f46",
        border: `1px solid ${suggested ? "#fde68a" : "#6ee7b7"}`,
      }}
    >
      {suggested
        ? t("edLifecycle.certification.advisory.findingsPresentShort")
        : t("edLifecycle.certification.advisory.clearShort")}
    </span>
  );
}

function authoritativePill(ready: boolean, t: (key: string) => string) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        background: ready ? "#d1fae5" : "#fef2f2",
        color: ready ? "#065f46" : "#991b1b",
        border: `1px solid ${ready ? "#6ee7b7" : "#fecaca"}`,
      }}
    >
      {ready
        ? t("edLifecycle.certification.summary.ready")
        : t("edLifecycle.certification.summary.notReady")}
    </span>
  );
}

function deficiencyGroup(
  title: string,
  items: EdClosedEncounterCertificationResult["deficiencies"],
  t: (key: string) => string,
  language: SupportedLanguage,
  advisory?: boolean
) {
  if (items.length === 0) return null;
  return (
    <section style={{ marginTop: 16 }}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 700, color: "#334155" }}>{title}</h3>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((d) => {
          const display = resolveCertificationDeficiencyDisplay(t, language, d);
          return (
          <li
            key={d.id}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "10px 12px",
              background: "#fff",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{display.title}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{display.description}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
              {t(`edLifecycle.certification.role.${d.responsibleRole.toLowerCase()}`)}
              {" · "}
              {advisory || d.sourceAuthority === EdChartCertificationSourceAuthority.STAGE_A_ADVISORY
                ? t("edLifecycle.certification.advisory.reviewSuggested")
                : d.blockingClosure
                  ? t("edLifecycle.certification.blocksClosure")
                  : t("edLifecycle.certification.noClosureBlock")}
            </div>
          </li>
          );
        })}
      </ul>
    </section>
  );
}

export function EdClosedEncounterCertificationPanel({
  encounter,
  facilityId,
  facilityName,
  dispositionLabel,
  onClose,
}: Props) {
  const { t, language } = useI18n();
  const stageAEnabled = isEnterpriseChartCertificationStageAEnabled();
  const [dispositionReadiness, setDispositionReadiness] =
    useState<DispositionSafetyReadinessResponse | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [readinessError, setReadinessError] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const loadReadiness = useCallback(async () => {
    if (!facilityId || encounter.status !== "OPEN") {
      setDispositionReadiness(null);
      setReadinessError(false);
      return;
    }
    setLoadingReadiness(true);
    setReadinessError(false);
    try {
      const raw = await apiFetch(`/encounters/${encounter.id}/disposition-readiness`, { facilityId });
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        setDispositionReadiness(null);
        setReadinessError(true);
        return;
      }
      const o = raw as Record<string, unknown>;
      setDispositionReadiness({
        canClose: o.canClose === true,
        blockers: Array.isArray(o.blockers) ? (o.blockers as DispositionSafetyReadinessResponse["blockers"]) : [],
        warnings: Array.isArray(o.warnings) ? (o.warnings as DispositionSafetyReadinessResponse["warnings"]) : [],
        lastVitalsAt: typeof o.lastVitalsAt === "string" ? o.lastVitalsAt : undefined,
        activeOrderCounts:
          o.activeOrderCounts && typeof o.activeOrderCounts === "object"
            ? (o.activeOrderCounts as DispositionSafetyReadinessResponse["activeOrderCounts"])
            : { lab: 0, imaging: 0, medication: 0, care: 0 },
      });
    } catch {
      setDispositionReadiness(null);
      setReadinessError(true);
    } finally {
      setLoadingReadiness(false);
    }
  }, [encounter.id, encounter.status, facilityId]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness, refreshNonce]);

  const certification = useMemo(
    () =>
      buildEdClosedEncounterCertificationFromTrackboardRow(encounter, {
        dispositionReadiness,
      }),
    [encounter, dispositionReadiness]
  );

  const authoritative = certification.authoritativeReadiness ?? {
    clinicalClosureReady: certification.closureReady,
    billingReady: certification.billingReady,
    dispositionReady: certification.dispositionReady ?? true,
  };

  const patientName =
    `${(encounter.patient?.firstName ?? "").trim()} ${(encounter.patient?.lastName ?? "").trim()}`.trim() ||
    t("common.dash");
  const mrn = (encounter.patient?.mrn ?? "").trim() || t("common.dash");
  const visitDate = encounter.createdAt
    ? formatEncounterChromeDateTime(encounter.createdAt, language)
    : t("common.dash");
  const los = computeLos(encounter.createdAt)?.labelPadded ?? t("common.dash");

  const establishedFindings =
    certification.establishedFindings ??
    certification.deficiencies.filter(
      (d) => d.sourceAuthority === EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW
    );
  const advisoryFindings = stageAEnabled
    ? certification.advisoryFindings ??
      certification.deficiencies.filter(
        (d) => d.sourceAuthority === EdChartCertificationSourceAuthority.STAGE_A_ADVISORY
      )
    : [];

  const unevaluated = certification.unevaluatedModules ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ed-certification-panel-title"
      data-testid="ed-closed-encounter-certification-panel"
      data-certification-authority={certification.certificationAuthority ?? "ADVISORY"}
      data-coverage-status={certification.coverageStatus ?? "PARTIAL"}
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
          width: "min(720px, 100%)",
          maxHeight: "min(90vh, 900px)",
          overflow: "auto",
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h2 id="ed-certification-panel-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              {t("edLifecycle.certification.panelTitle")}
            </h2>
            <p
              data-testid="ed-certification-advisory-banner"
              style={{ margin: "6px 0 0 0", fontSize: 13, color: "#92400e", fontWeight: 600 }}
            >
              {t("edLifecycle.certification.advisory.banner")}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              data-testid="ed-certification-refresh"
              onClick={() => setRefreshNonce((n) => n + 1)}
              disabled={loadingReadiness}
              style={{
                border: "1px solid #e2e8f0",
                background: "#fff",
                borderRadius: 10,
                padding: "6px 10px",
                cursor: loadingReadiness ? "wait" : "pointer",
                fontSize: 12,
                fontWeight: 600,
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
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>

        {readinessError ? (
          <p
            data-testid="ed-certification-readiness-error"
            style={{
              margin: "12px 0 0 0",
              fontSize: 13,
              color: "#991b1b",
              fontWeight: 600,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "8px 10px",
            }}
          >
            {t("edLifecycle.certification.advisory.readinessError")}
          </p>
        ) : null}

        <div style={{ marginTop: 16, display: "grid", gap: 8, fontSize: 13, color: "#334155" }}>
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

        <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
              {t("edLifecycle.certification.advisory.authoritativeClosure")}
            </div>
            {authoritativePill(authoritative.clinicalClosureReady, t)}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
              {t("edLifecycle.certification.advisory.authoritativeBilling")}
            </div>
            {authoritativePill(authoritative.billingReady, t)}
          </div>
          {stageAEnabled ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                {t("edLifecycle.certification.advisory.chartReview")}
              </div>
              {advisoryPill(
                certification.summary?.advisoryChartReviewLabel === "FINDINGS_PRESENT" ||
                  advisoryFindings.length > 0,
                t
              )}
            </div>
          ) : null}
          {loadingReadiness ? (
            <span style={{ fontSize: 12, color: "#64748b" }}>{t("common.loading")}</span>
          ) : null}
        </div>

        <p style={{ margin: "10px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          {t("edLifecycle.certification.advisory.coveragePartial")}
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "#94a3b8" }}>
          {t("edLifecycle.certification.evaluatedAt")}: {certification.evaluatedAt ?? certification.certificationVersion}
        </p>

        {stageAEnabled && unevaluated.length > 0 ? (
          <section style={{ marginTop: 12 }} data-testid="ed-certification-unevaluated-modules">
            <h3 style={{ margin: "0 0 6px 0", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
              {t("edLifecycle.certification.advisory.unevaluatedTitle")}
            </h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#64748b" }}>
              {(
                [
                  "orders_results_lifecycle",
                  "mar_intelligence",
                  "procedures",
                  "clinical_pathways",
                  "contextual_vitals",
                  "mutation_wide_freshness",
                ] as const
              ).map((m) => (
                <li key={m}>{t(`edLifecycle.certification.advisory.modules.${m}`)}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {deficiencyGroup(
          t("edLifecycle.certification.closeReview.closureBlockers"),
          establishedFindings.filter((d) => d.blockingClosure),
          t,
          language
        )}
        {stageAEnabled
          ? deficiencyGroup(
              t("edLifecycle.certification.advisory.findingsTitle"),
              advisoryFindings,
              t,
              language,
              true
            )
          : null}

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
          <button
            type="button"
            disabled
            title={t("edLifecycle.certification.actions.comingSoon")}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              color: "#94a3b8",
              fontSize: 12,
              fontWeight: 600,
              cursor: "not-allowed",
            }}
          >
            {t("edLifecycle.certification.actions.openMar")}
          </button>
        </div>
      </div>
    </div>
  );
}
