"use client";

/**
 * D4A.2.7A — Inpatient Operational Dashboard.
 * Consumes Operational Governance inpatient API (Enterprise Command underneath).
 * No ED-specific logic. No documentation editing.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type { InpatientOperationalDashboardV1 } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { HospitalCareShell } from "./HospitalCareShell";
import { fetchInpatientOperationalDashboard } from "./operationalGovernanceApi";
import { isForbiddenApiError } from "./hospitalCarePlacementApi";

const POLL_MS = 20_000;

const metricBox: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 8,
  marginBottom: 14,
};

const metricCell: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "8px 10px",
  background: "#fff",
};

const sectionTitle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  margin: "12px 0 8px",
};

export function InpatientOperationalDashboardView() {
  const { t } = useI18n();
  const { ready } = useFacilityAndRoles();
  const [data, setData] = useState<InpatientOperationalDashboardV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dash = await fetchInpatientOperationalDashboard();
      setData(dash);
    } catch (err) {
      setError(
        isForbiddenApiError(err)
          ? t("hospitalCareD3ca.accessDenied")
          : t("operationalGovernanceD4a27a.inpatient.loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!ready) return;
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ready, load]);

  const k = data?.kpis;
  const p = data?.pending;
  const a = data?.alerts;

  return (
    <HospitalCareShell
      active="inpatient"
      title={t("operationalGovernanceD4a27a.inpatient.title")}
      subtitle={t("operationalGovernanceD4a27a.inpatient.subtitle")}
      actions={
        <button
          type="button"
          onClick={() => void load()}
          style={{
            fontSize: 13,
            fontWeight: 600,
            border: "1px solid #99f6e4",
            background: "#f0fdfa",
            borderRadius: 10,
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          {t("operationalGovernanceD4a27a.inpatient.refresh")}
        </button>
      }
    >
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
        {t("operationalGovernanceD4a27a.inpatient.neverDocs")} ·{" "}
        {t("operationalGovernanceD4a27a.inpatient.excludesEd")} ·{" "}
        {t("operationalGovernanceD4a27a.inpatient.placementOff")}
      </p>

      {loading && !data ? <p>{t("operationalGovernanceD4a27a.inpatient.loading")}</p> : null}
      {error ? (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}

      {k ? (
        <section style={metricBox} aria-label={t("operationalGovernanceD4a27a.inpatient.title")}>
          {(
            [
              ["census", (k.observationCount ?? 0) + (k.inpatientCount ?? 0)],
              ["observation", k.observationCount],
              ["inpatient", k.inpatientCount],
              ["admissions", k.admissionsToday],
              ["discharges", k.dischargesToday],
              ["occupancy", k.bedOccupancyPct != null ? `${k.bedOccupancyPct}%` : null],
              ["bedsAvailable", k.bedsAvailable],
              ["bedsOccupied", k.bedsOccupied],
              ["bedsCleaning", k.bedsCleaning],
              ["averageLos", k.averageLosHours],
              ["medianLos", k.medianLosHours],
              ["pendingPlacement", k.pendingPlacementVisibility],
              ["criticalAlerts", k.criticalAlerts],
            ] as const
          ).map(([key, val]) => (
            <div key={key} style={metricCell}>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {t(`operationalGovernanceD4a27a.metrics.${key}`)}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{val ?? DISPLAY_DASH}</div>
            </div>
          ))}
        </section>
      ) : null}

      {p ? (
        <>
          <h2 style={sectionTitle}>{t("operationalGovernanceD4a27a.inpatient.pendingTitle")}</h2>
          <section style={metricBox}>
            {(
              [
                ["pendingPlacement", p.placementVisibility],
                ["consult", p.consult],
                ["imaging", p.imaging],
                ["pt", p.pt],
                ["ot", p.ot],
                ["pharmacy", p.pharmacy],
                ["caseManagement", p.caseManagement],
              ] as const
            ).map(([key, val]) => (
              <div key={key} style={metricCell}>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {t(`operationalGovernanceD4a27a.metrics.${key}`)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </section>
        </>
      ) : null}

      {a ? (
        <>
          <h2 style={sectionTitle}>{t("operationalGovernanceD4a27a.inpatient.alertsTitle")}</h2>
          <section style={metricBox}>
            {(
              [
                ["criticalAlerts", a.critical],
                ["rapidResponse", a.rapidResponse],
                ["codeBlue", a.codeBlue],
                ["stroke", a.stroke],
                ["stemi", a.stemi],
                ["sepsis", a.sepsis],
                ["behavioral", a.behavioral],
                ["escalations", a.openEscalations],
              ] as const
            ).map(([key, val]) => (
              <div key={key} style={metricCell}>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {t(`operationalGovernanceD4a27a.metrics.${key}`)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </section>
        </>
      ) : null}

      {data?.medicationCompliance ? (
        <>
          <h2 style={sectionTitle}>{t("operationalGovernanceD4a27a.inpatient.medTitle")}</h2>
          <section style={metricBox}>
            {(
              [
                ["medOnTime", data.medicationCompliance.onTimePct],
                ["medLate", data.medicationCompliance.latePct],
                ["medHeld", data.medicationCompliance.heldPct],
                ["medRefused", data.medicationCompliance.refusedPct],
              ] as const
            ).map(([key, val]) => (
              <div key={key} style={metricCell}>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {t(`operationalGovernanceD4a27a.metrics.${key}`)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {val != null ? `${val}%` : DISPLAY_DASH}
                </div>
              </div>
            ))}
          </section>
        </>
      ) : null}

      {data?.documentationCompliance ? (
        <>
          <h2 style={sectionTitle}>{t("operationalGovernanceD4a27a.inpatient.docsTitle")}</h2>
          <section style={metricBox}>
            {(
              [
                ["docSigned", data.documentationCompliance.signaturesPct],
                ["docUnsigned", data.documentationCompliance.unsignedPct],
              ] as const
            ).map(([key, val]) => (
              <div key={key} style={metricCell}>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {t(`operationalGovernanceD4a27a.metrics.${key}`)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {val != null ? `${val}%` : DISPLAY_DASH}
                </div>
              </div>
            ))}
          </section>
        </>
      ) : null}

      <h2 style={sectionTitle}>{t("operationalGovernanceD4a27a.inpatient.warningsTitle")}</h2>
      {data?.warnings?.length ? (
        <ul>
          {data.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 13, color: "#64748b" }}>
          {t("operationalGovernanceD4a27a.inpatient.emptyWarnings")}
        </p>
      )}
    </HospitalCareShell>
  );
}
