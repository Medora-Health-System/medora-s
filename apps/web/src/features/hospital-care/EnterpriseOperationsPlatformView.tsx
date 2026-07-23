"use client";

/**
 * D4A.2.7A — Enterprise Operations Platform landing.
 * ED and Inpatient are separate cards — never combined.
 */

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  GOVERNANCE_DASHBOARD_KINDS,
  type GovernanceDashboardKind,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { HospitalCareShell } from "./HospitalCareShell";
import {
  EMERGENCY_DEPARTMENT_OPERATIONAL_DASHBOARD,
  HOSPITAL_CARE_ENTERPRISE_COMMAND,
  HOSPITAL_CARE_INPATIENT_OPERATIONS,
} from "./hospitalCarePaths";
import {
  fetchAuditCenter,
  fetchGovernanceDashboard,
  fetchPlacementReadiness,
} from "./operationalGovernanceApi";
import { isForbiddenApiError } from "./hospitalCarePlacementApi";

const cardStyle: CSSProperties = {
  ...MEDORA_CARD_SHELL,
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: 12,
  marginBottom: 16,
};

const metricBox: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 8,
};

const metricCell: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "8px 10px",
  background: "#fff",
};

type ViewId =
  | GovernanceDashboardKind
  | "AUDIT_CENTER"
  | "PLACEMENT_READINESS"
  | null;

export function EnterpriseOperationsPlatformView() {
  const { t } = useI18n();
  const { ready } = useFacilityAndRoles();
  const searchParams = useSearchParams();
  const viewParam = (searchParams?.get("view") ?? "").trim().toUpperCase();
  const [view, setView] = useState<ViewId>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [auditEvents, setAuditEvents] = useState<
    Array<{ id: string; at: string; action: string; entityType: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!viewParam) {
      setView(null);
      return;
    }
    if (
      (GOVERNANCE_DASHBOARD_KINDS as readonly string[]).includes(viewParam) ||
      viewParam === "AUDIT_CENTER" ||
      viewParam === "PLACEMENT_READINESS"
    ) {
      setView(viewParam as ViewId);
    }
  }, [viewParam]);

  useEffect(() => {
    if (!ready || !view) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        if (view === "AUDIT_CENTER") {
          const data = await fetchAuditCenter({ facet: "CHART_ACCESS" });
          if (!cancelled) {
            setAuditEvents(data.events);
            setPayload(null);
          }
        } else if (view === "PLACEMENT_READINESS") {
          const data = await fetchPlacementReadiness();
          if (!cancelled) {
            setPayload(data as unknown as Record<string, unknown>);
            setAuditEvents([]);
          }
        } else {
          const data = await fetchGovernanceDashboard(view);
          if (!cancelled) {
            setPayload(data);
            setAuditEvents([]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            isForbiddenApiError(err)
              ? t("hospitalCareD3ca.accessDenied")
              : t("operationalGovernanceD4a27a.governance.loadError")
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, view, t]);

  return (
    <HospitalCareShell
      active="home"
      title={t("operationalGovernanceD4a27a.platform.title")}
      subtitle={t("operationalGovernanceD4a27a.platform.subtitle")}
    >
      <p
        role="status"
        style={{
          fontSize: 12,
          color: "#0f766e",
          background: "#f0fdfa",
          border: "1px solid #99f6e4",
          borderRadius: 10,
          padding: "8px 10px",
          marginBottom: 12,
        }}
      >
        {t("operationalGovernanceD4a27a.platform.separationBanner")}
      </p>

      <section style={grid} aria-label={t("operationalGovernanceD4a27a.platform.title")}>
        <article style={cardStyle} data-testid="ops-ed-card">
          <strong>{t("operationalGovernanceD4a27a.platform.edCard")}</strong>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {t("operationalGovernanceD4a27a.platform.edHint")}
          </span>
          <Link href={EMERGENCY_DEPARTMENT_OPERATIONAL_DASHBOARD} style={{ fontWeight: 600, color: "#0f766e" }}>
            {t("operationalGovernanceD4a27a.platform.edOpen")}
          </Link>
        </article>

        <article style={cardStyle} data-testid="ops-inpatient-card">
          <strong>{t("operationalGovernanceD4a27a.platform.inpatientCard")}</strong>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {t("operationalGovernanceD4a27a.platform.inpatientHint")}
          </span>
          <Link href={HOSPITAL_CARE_INPATIENT_OPERATIONS} style={{ fontWeight: 600, color: "#0f766e" }}>
            {t("operationalGovernanceD4a27a.platform.inpatientOpen")}
          </Link>
        </article>

        <article style={cardStyle} data-testid="ops-command-card">
          <strong>{t("operationalGovernanceD4a27a.platform.commandCard")}</strong>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {t("operationalGovernanceD4a27a.platform.commandHint")}
          </span>
          <Link href={HOSPITAL_CARE_ENTERPRISE_COMMAND} style={{ fontWeight: 600, color: "#0f766e" }}>
            {t("operationalGovernanceD4a27a.platform.commandOpen")}
          </Link>
        </article>
      </section>

      <h2 style={{ fontSize: 15, margin: "8px 0 10px" }}>
        {t("operationalGovernanceD4a27a.platform.governanceTitle")}
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {[...GOVERNANCE_DASHBOARD_KINDS, "AUDIT_CENTER", "PLACEMENT_READINESS"].map((id) => (
          <Link
            key={id}
            href={`/app/hospitalisation/enterprise-operations?view=${id}`}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 9999,
              border: `1px solid ${view === id ? "#0f766e" : "#cbd5e1"}`,
              background: view === id ? "#ccfbf1" : "#fff",
              color: "#115e59",
              textDecoration: "none",
            }}
          >
            {t(`operationalGovernanceD4a27a.views.${id}`)}
          </Link>
        ))}
      </div>

      {loading ? <p>{t("operationalGovernanceD4a27a.governance.loading")}</p> : null}
      {error ? (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}

      {view === "AUDIT_CENTER" ? (
        <section>
          <p style={{ fontSize: 12, color: "#64748b" }}>
            {t("operationalGovernanceD4a27a.governance.auditImmutable")}
          </p>
          {auditEvents.length === 0 ? (
            <p>{t("operationalGovernanceD4a27a.governance.auditEmpty")}</p>
          ) : (
            <ul>
              {auditEvents.map((e) => (
                <li key={e.id}>
                  {e.at} — {e.action} / {e.entityType}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {view === "PLACEMENT_READINESS" && payload ? (
        <section>
          <p style={{ fontSize: 12, color: "#64748b" }}>
            {t("operationalGovernanceD4a27a.governance.placementReadinessNote")}
          </p>
          <pre
            style={{
              fontSize: 12,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 12,
              overflow: "auto",
            }}
          >
            {JSON.stringify(payload, null, 2)}
          </pre>
        </section>
      ) : null}

      {view &&
      view !== "AUDIT_CENTER" &&
      view !== "PLACEMENT_READINESS" &&
      payload ? (
        <section style={metricBox} aria-label={t(`operationalGovernanceD4a27a.views.${view}`)}>
          <p style={{ gridColumn: "1 / -1", fontSize: 12, color: "#64748b" }}>
            {t("operationalGovernanceD4a27a.governance.neverInfer")} ·{" "}
            {t("operationalGovernanceD4a27a.governance.neverModifyMar")}
          </p>
          {Object.entries(payload)
            .filter(([, v]) => typeof v === "number" || typeof v === "string" || v === null)
            .slice(0, 24)
            .map(([key, val]) => (
              <div key={key} style={metricCell}>
                <div style={{ fontSize: 11, color: "#64748b" }}>{key}</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {val == null || val === "" ? DISPLAY_DASH : String(val)}
                </div>
              </div>
            ))}
        </section>
      ) : null}
    </HospitalCareShell>
  );
}
