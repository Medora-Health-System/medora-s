"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DispositionSafetyReadinessResponse, EdClosedEncounterCertificationResult } from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { computeLos } from "@/features/emergency/erLengthOfStay";
import { buildEdClosedEncounterCertificationFromTrackboardRow } from "@/features/emergency/edClosedEncounterCertificationFromTrackboard";
import type { EdTrackboardCertificationEncounter } from "@/features/emergency/edClosedEncounterCertificationFromTrackboard";
import { emergencyActiveWorkspacePath, emergencyChartPath } from "@/features/emergency/emergencyRoutes";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";

type Props = {
  encounter: EdTrackboardCertificationEncounter;
  facilityId: string;
  facilityName: string | null;
  dispositionLabel?: string | null;
  onClose: () => void;
};

function readinessPill(ready: boolean, t: (key: string) => string) {
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
  t: (key: string) => string
) {
  if (items.length === 0) return null;
  return (
    <section style={{ marginTop: 16 }}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 700, color: "#334155" }}>{title}</h3>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((d) => (
          <li
            key={d.id}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "10px 12px",
              background: "#fff",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{d.title}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{d.description}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
              {t(`edLifecycle.certification.role.${d.responsibleRole.toLowerCase()}`)}
              {" · "}
              {d.blockingClosure
                ? t("edLifecycle.certification.blocksClosure")
                : t("edLifecycle.certification.noClosureBlock")}
              {" · "}
              {d.blockingBilling
                ? t("edLifecycle.certification.blocksBilling")
                : t("edLifecycle.certification.noBillingBlock")}
            </div>
          </li>
        ))}
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
  const [dispositionReadiness, setDispositionReadiness] =
    useState<DispositionSafetyReadinessResponse | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);

  useEffect(() => {
    if (!facilityId || encounter.status !== "OPEN") {
      setDispositionReadiness(null);
      return;
    }
    let cancelled = false;
    setLoadingReadiness(true);
    void (async () => {
      try {
        const raw = await apiFetch(`/encounters/${encounter.id}/disposition-readiness`, { facilityId });
        if (cancelled || !raw || typeof raw !== "object" || Array.isArray(raw)) {
          setDispositionReadiness(null);
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
        if (!cancelled) setDispositionReadiness(null);
      } finally {
        if (!cancelled) setLoadingReadiness(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounter.id, encounter.status, facilityId]);

  const certification = useMemo(
    () =>
      buildEdClosedEncounterCertificationFromTrackboardRow(encounter, {
        dispositionReadiness,
      }),
    [encounter, dispositionReadiness]
  );

  const patientName =
    `${(encounter.patient?.firstName ?? "").trim()} ${(encounter.patient?.lastName ?? "").trim()}`.trim() ||
    t("common.dash");
  const mrn = (encounter.patient?.mrn ?? "").trim() || t("common.dash");
  const visitDate = encounter.createdAt
    ? formatEncounterChromeDateTime(encounter.createdAt, language)
    : t("common.dash");
  const los = computeLos(encounter.createdAt)?.labelPadded ?? t("common.dash");

  const systemDeficiencies = certification.deficiencies.filter(
    (d) =>
      d.responsibleRole === "SYSTEM" ||
      d.responsibleRole === "ADMIN" ||
      d.category === "TIMESTAMPS" ||
      d.category === "DEMOGRAPHICS"
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ed-certification-panel-title"
      data-testid="ed-closed-encounter-certification-panel"
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
            <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#64748b" }}>
              {t(`edLifecycle.certification.status.${certification.status}`)}
            </p>
          </div>
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
              {t("edLifecycle.certification.closure")}
            </div>
            {readinessPill(certification.closureReady, t)}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
              {t("edLifecycle.certification.billing")}
            </div>
            {readinessPill(certification.billingReady, t)}
          </div>
          {loadingReadiness ? (
            <span style={{ fontSize: 12, color: "#64748b" }}>{t("common.loading")}</span>
          ) : null}
        </div>

        {deficiencyGroup(
          t("edLifecycle.certification.providerDeficiencies"),
          certification.providerDeficiencies,
          t
        )}
        {deficiencyGroup(
          t("edLifecycle.certification.nursingDeficiencies"),
          certification.nursingDeficiencies,
          t
        )}
        {deficiencyGroup(
          t("edLifecycle.certification.billingDeficiencies"),
          [...certification.billingDeficiencies, ...certification.codingDeficiencies],
          t
        )}
        {deficiencyGroup(t("edLifecycle.certification.systemDeficiencies"), systemDeficiencies, t)}

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
