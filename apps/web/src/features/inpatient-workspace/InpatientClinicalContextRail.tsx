"use client";

/**
 * MEDUI.INP.2A — Right-side clinical context rail.
 * Projection / navigation only — never persists clinical data.
 */

import { type CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";
import type { InpatientOverviewProjection } from "./projectInpatientOverview";

const railShell: CSSProperties = {
  ...MEDORA_CARD_SHELL,
  padding: "10px 12px",
  position: "sticky",
  top: 12,
  maxHeight: "calc(100vh - 120px)",
  overflowY: "auto",
  alignSelf: "start",
};

function MiniLink({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        marginTop: 6,
        fontSize: 11,
        fontWeight: 600,
        padding: "5px 8px",
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: "#fff",
        color: "#0f766e",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export function InpatientClinicalContextRail({
  projection,
  onNavigateSection,
  variant = "desktop",
}: {
  projection: InpatientOverviewProjection;
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
  variant?: "desktop" | "drawer";
}) {
  const { t, language } = useI18n();
  const p = projection;
  const nursingSummary =
    p.nursing.assessment?.narrativeExcerpt?.trim() ||
    p.nursing.assessment?.mentalStatus ||
    null;
  const abnormals: string[] = [];
  if (p.nursing.assessment?.painScore != null && p.nursing.assessment.painScore >= 4) {
    abnormals.push(`${t("inpatientOverviewD4a34.nursing.pain")}: ${p.nursing.assessment.painScore}`);
  }
  if (p.nursing.assessment?.safetyConcern) abnormals.push(t("inpatientOverviewD4a34.nursing.safety"));
  if (p.nursing.assessment?.skinWoundConcern) abnormals.push(t("inpatientOverviewD4a34.nursing.skinWound"));
  if (p.nursing.assessment?.fallRisk) {
    abnormals.push(
      `${t("inpatientOverviewD4a34.nursing.mobilityFall")}: ${p.nursing.assessment.fallRisk}`
    );
  }
  const newOrders = p.orders.newOrUnacknowledged.slice(0, 3);
  const dueMeds = p.medications.lines.filter((m) => m.due || m.overdue || m.held).slice(0, 4);
  const criticalResults = p.results.critical.slice(0, 3);
  const goals = p.carePlan.plans.slice(0, 3);
  const barriers = p.discharge.barriers.filter((b) => !b.resolved).slice(0, 3);
  const latestEvent = p.recentEvents.items[0] ?? null;

  const body = (
    <aside
      data-testid="inpatient-clinical-context-rail"
      data-persistence="none"
      aria-label={t("inpatientOverviewInp2a.rail.title")}
      style={variant === "desktop" ? railShell : { ...railShell, position: "relative", top: 0, maxHeight: "none" }}
    >
      <h2 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
        {t("inpatientOverviewInp2a.rail.title")}
      </h2>
      <p style={{ margin: "0 0 10px", fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
        {t("inpatientOverviewInp2a.rail.projectionOnly")}
      </p>

      <div style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 11, color: "#475569" }}>
          {t("inpatientOverviewInp2a.rail.nursingSummary")}
        </strong>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#334155" }}>
          {nursingSummary || t("inpatientOverviewInp2a.rail.empty")}
        </p>
        <MiniLink
          label={t("inpatientOverviewD4a34.nursing.openNursingAssessment")}
          onClick={() => onNavigateSection?.("nursing")}
        />
      </div>

      {abnormals.length ? (
        <div style={{ marginBottom: 10 }}>
          <strong style={{ fontSize: 11, color: "#9a3412" }}>
            {t("inpatientOverviewInp2a.rail.abnormals")}
          </strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 12 }}>
            {abnormals.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 11, color: "#475569" }}>
          {t("inpatientOverviewInp2a.rail.newOrders")}
        </strong>
        {newOrders.length ? (
          <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 12 }}>
            {newOrders.map((o) => (
              <li key={o.orderItemId}>{o.label}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("inpatientOverviewInp2a.rail.empty")}
          </p>
        )}
        <MiniLink
          label={t("inpatientOverviewInp2a.orders.openOrders")}
          onClick={() => onNavigateSection?.("orders")}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 11, color: "#475569" }}>
          {t("inpatientOverviewInp2a.rail.marDue")}
        </strong>
        {dueMeds.length ? (
          <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 12 }}>
            {dueMeds.map((m, i) => (
              <li key={`${m.drug}-${i}`}>
                {m.drug}
                {m.held ? ` (${t("inpatientOverviewD4a34.meds.held")})` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("inpatientOverviewInp2a.rail.empty")}
          </p>
        )}
        <MiniLink
          label={t("inpatientOverviewD4a34.meds.openMar")}
          onClick={() => onNavigateSection?.("medications")}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 11, color: "#475569" }}>
          {t("inpatientOverviewInp2a.rail.criticalResults")}
        </strong>
        {criticalResults.length ? (
          <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 12, color: "#9a3412" }}>
            {criticalResults.map((r, i) => (
              <li key={`${r.label}-${i}`}>
                {r.label}
                {r.current ? `: ${r.current}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("inpatientOverviewInp2a.rail.empty")}
          </p>
        )}
        <MiniLink
          label={t("inpatientOverviewD4a34.labs.openResults")}
          onClick={() => onNavigateSection?.("results")}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 11, color: "#475569" }}>
          {t("inpatientOverviewInp2a.rail.carePlanGoals")}
        </strong>
        {goals.length ? (
          <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 12 }}>
            {goals.map((g) => (
              <li key={g.planId}>
                {g.title}
                {g.goalSummary ? ` — ${g.goalSummary}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("inpatientOverviewInp2a.rail.empty")}
          </p>
        )}
        <MiniLink
          label={t("inpatientOverviewInp2a.carePlan.openCarePlan")}
          onClick={() => onNavigateSection?.("carePlan")}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 11, color: "#475569" }}>
          {t("inpatientOverviewInp2a.rail.dischargeBarriers")}
        </strong>
        {barriers.length ? (
          <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 12 }}>
            {barriers.map((b) => (
              <li key={b.key}>{b.label}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("inpatientOverviewInp2a.rail.empty")}
          </p>
        )}
        <MiniLink
          label={t("inpatientOverviewD4a34.discharge.openDischarge")}
          onClick={() => onNavigateSection?.("dischargePlanning")}
        />
      </div>

      <div>
        <strong style={{ fontSize: 11, color: "#475569" }}>
          {t("inpatientOverviewInp2a.rail.latestEvent")}
        </strong>
        {latestEvent ? (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#334155" }}>
            {latestEvent.summary}
            {latestEvent.occurredAtIso
              ? ` · ${formatEncounterChromeDateTime(latestEvent.occurredAtIso, language)}`
              : ""}
          </p>
        ) : (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("inpatientOverviewD4a34.events.empty")}
          </p>
        )}
      </div>
    </aside>
  );

  if (variant === "drawer") {
    return (
      <details data-testid="inpatient-clinical-context-drawer" style={{ marginBottom: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
          {t("inpatientOverviewInp2a.rail.title")}
        </summary>
        <div style={{ marginTop: 8 }}>{body}</div>
      </details>
    );
  }

  return body;
}
