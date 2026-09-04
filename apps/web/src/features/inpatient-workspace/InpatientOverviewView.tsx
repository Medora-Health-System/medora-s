"use client";

/**
 * MEDUI.D4A.3.4 — Shared inpatient Overview presentation (role-aware).
 * Consumes projectInpatientOverview(); deep-links only; no architecture prose.
 */

import { type CSSProperties, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";
import type { InpatientOverviewProjection } from "./projectInpatientOverview";
import {
  formatInpatientClinicalStateLabel,
  formatInpatientConsultSpecialtyDisplay,
} from "./inpatientClinicalDisplayLabels";

import { InpatientClinicalContextRail } from "./InpatientClinicalContextRail";

const card: CSSProperties = {
  ...MEDORA_CARD_SHELL,
  padding: "10px 12px",
  marginBottom: 10,
};

const overviewLayout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 300px)",
  gap: 14,
  alignItems: "start",
};

function Section({
  title,
  children,
  testId,
}: {
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section style={card} data-testid={testId}>
      <h2 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
      {children}
    </section>
  );
}

function DeepLinkButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      style={{
        marginTop: 8,
        fontSize: 12,
        fontWeight: 600,
        padding: "6px 10px",
        borderRadius: 10,
        border: "1px solid #99f6e4",
        background: "#f0fdfa",
        color: "#0f766e",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function eventTypeLabel(type: string, t: (k: string) => string): string {
  const key = `inpatientOverviewD4a34.eventType.${type}`;
  const labeled = t(key);
  return labeled !== key ? labeled : type.replace(/_/g, " ");
}

function eventSeverityLabel(sev: string, t: (k: string) => string): string {
  const key = `inpatientOverviewD4a34.eventSeverity.${sev}`;
  const labeled = t(key);
  return labeled !== key ? labeled : sev.replace(/_/g, " ");
}

function eventStatusLabel(status: string, t: (k: string) => string): string {
  const key = `inpatientOverviewD4a34.eventStatus.${status}`;
  const labeled = t(key);
  return labeled !== key ? labeled : status.replace(/_/g, " ");
}

function vitalMetricLabel(key: string, fallback: string, t: (k: string) => string): string {
  const i18nKey = `inpatientMedicalRecordSummaryInp2f.vitals.${key}`;
  const labeled = t(i18nKey);
  return labeled !== i18nKey ? labeled : fallback;
}

function medGroupLabel(group: string, t: (k: string) => string): string {
  const key = `inpatientOverviewD4a34.meds.groups.${group}`;
  const labeled = t(key);
  return labeled !== key ? labeled : group.replace(/_/g, " ");
}

export function InpatientOverviewView({
  projection,
  onNavigateSection,
  onAckEvent,
}: {
  projection: InpatientOverviewProjection;
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
  onAckEvent?: (eventId: string, status: string) => void;
}) {
  const { t, language } = useI18n();
  const nursingCodeLabel = (code: string | null | undefined) => {
    if (!code) return null;
    const key = `inpatientNursingAssessmentInp1b.codes.${code}`;
    const labeled = t(key);
    return labeled !== key ? labeled : code.replaceAll("_", " ");
  };
  const p = projection;
  const dash = DISPLAY_DASH;

  return (
    <div data-testid="inpatient-overview-projected" data-role={p.role} data-readonly="true">
      <div data-testid="inpatient-overview-drawer-host" className="inpatient-overview-drawer">
        <InpatientClinicalContextRail
          projection={p}
          onNavigateSection={onNavigateSection}
          variant="drawer"
        />
      </div>
      <div style={overviewLayout} className="inpatient-overview-grid">
        <div data-testid="inpatient-overview-main">
      {p.alerts.availability === "READY" ? (
        <Section title={t("inpatientOverviewD4a34.modules.alerts")} testId="overview-alerts">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#9a3412" }}>
            {p.alerts.items.map((a) => (
              <li key={a.id}>
                <span aria-hidden="true">⚠ </span>
                {a.text}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title={t("inpatientOverviewD4a34.modules.careTeam")} testId="overview-care-team">
        <dl
          style={{
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "6px 12px",
            fontSize: 12,
            color: "#334155",
          }}
        >
          <div>
            <dt style={{ fontWeight: 600 }}>{t("inpatientOverviewD4a34.careTeam.attending")}</dt>
            <dd style={{ margin: 0 }}>{p.careTeam.attending || t("inpatientOverviewD4a34.notAssigned")}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>{t("inpatientOverviewD4a34.careTeam.provider")}</dt>
            <dd style={{ margin: 0 }}>{p.careTeam.provider || t("inpatientOverviewD4a34.notAssigned")}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>{t("inpatientOverviewD4a34.careTeam.resident")}</dt>
            <dd style={{ margin: 0 }}>{p.careTeam.resident || t("inpatientOverviewD4a34.notAssigned")}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>{t("inpatientOverviewD4a34.careTeam.app")}</dt>
            <dd style={{ margin: 0 }}>{p.careTeam.app || t("inpatientOverviewD4a34.notAssigned")}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>{t("inpatientOverviewD4a34.careTeam.hospitalDay")}</dt>
            <dd style={{ margin: 0 }}>
              {p.careTeam.hospitalDay != null ? String(p.careTeam.hospitalDay) : dash}
            </dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>{t("inpatientOverviewD4a34.careTeam.los")}</dt>
            <dd style={{ margin: 0 }}>
              {p.careTeam.lengthOfStayHours != null
                ? `${p.careTeam.lengthOfStayHours}${t("inpatientOverviewD4a34.careTeam.hoursSuffix")}`
                : dash}
            </dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>{t("inpatientOverviewD4a34.careTeam.primaryDx")}</dt>
            <dd style={{ margin: 0 }}>{p.careTeam.primaryDiagnosis || dash}</dd>
          </div>
        </dl>
        {p.careTeam.secondaryProblems.length ? (
          <p style={{ margin: "8px 0 0", fontSize: 12 }}>
            <strong>{t("inpatientOverviewD4a34.careTeam.secondary")}:</strong>{" "}
            {p.careTeam.secondaryProblems.join("; ")}
          </p>
        ) : null}
      </Section>

      <Section title={t("inpatientOverviewD4a34.modules.clinicalState")} testId="overview-clinical-state">
        {p.clinicalState.items.map((item) => (
          <p key={item.key} style={{ margin: "0 0 6px", fontSize: 13 }}>
            <strong>{formatInpatientClinicalStateLabel(item.key, t)}</strong>
            {": "}
            {item.state === "RESOLVED" ? (
              <>
                {item.summary?.trim() || dash}
                {item.clinicalTimestampIso
                  ? ` · ${formatEncounterChromeDateTime(item.clinicalTimestampIso, language)}`
                  : ""}
              </>
            ) : item.state === "UNRESOLVED_SYNTHETIC" ? (
              t("inpatientOverviewD4a34.clinicalState.verifyInNursing")
            ) : (
              t("inpatientOverviewD4a34.clinicalState.notDocumented")
            )}
          </p>
        ))}
        <DeepLinkButton
          label={t("inpatientOverviewD4a34.clinicalState.openNursing")}
          onClick={() => onNavigateSection?.("nursing")}
        />
      </Section>

      <Section title={t("inpatientOverviewD4a34.modules.problems")} testId="overview-problems">
        {p.problems.availability === "READY" ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {p.problems.items.slice(0, 8).map((pr) => (
              <li key={pr.problemId}>
                {pr.displayLabel}
                {pr.status ? ` — ${pr.status.replace(/_/g, " ")}` : ""}
                {pr.assessment ? ` · ${pr.assessment}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("inpatientOverviewD4a34.problems.empty")}
          </p>
        )}
        <DeepLinkButton
          label={t("inpatientOverviewD4a34.problems.openProblems")}
          onClick={() => onNavigateSection?.("problemsPlan")}
        />
      </Section>

      {p.vitals.availability === "READY" ? (
        <Section title={t("inpatientOverviewD4a34.modules.vitalsTrends")} testId="overview-vitals-trends">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#64748b" }}>
                <th style={{ padding: "2px 4px" }} />
                <th style={{ padding: "2px 4px" }}>
                  {t("providerClinicalSynthesisD4a26a.vitals.current")}
                </th>
                <th style={{ padding: "2px 4px" }}>
                  {t("providerClinicalSynthesisD4a26a.vitals.previous")}
                </th>
                <th style={{ padding: "2px 4px" }}>
                  {t("providerClinicalSynthesisD4a26a.vitals.trend")}
                </th>
              </tr>
            </thead>
            <tbody>
              {p.vitals.rows.map((v) => (
                <tr key={v.key} style={{ color: v.abnormal ? "#9a3412" : "#334155" }}>
                  <td style={{ padding: "2px 4px", fontWeight: 600 }}>
                    {vitalMetricLabel(v.key, v.label, t)}
                  </td>
                  <td style={{ padding: "2px 4px" }}>{v.current ?? dash}</td>
                  <td style={{ padding: "2px 4px" }}>{v.previous ?? dash}</td>
                  <td style={{ padding: "2px 4px" }}>{v.trend24h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}

      <Section title={t("inpatientOverviewInp2a.modules.provider")} testId="overview-provider-docs">
        {p.providerDocs.availability === "READY" ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {p.providerDocs.hpStatus ? (
              <li>
                {t("inpatientOverviewInp2a.provider.hpStatus")}: {p.providerDocs.hpStatus}
              </li>
            ) : null}
            {p.providerDocs.latestProgressExcerpt ? (
              <li>
                {t("inpatientOverviewInp2a.provider.progress")}: {p.providerDocs.latestProgressExcerpt}
              </li>
            ) : null}
            {p.providerDocs.assessmentPlanExcerpt ? (
              <li>
                {t("inpatientOverviewInp2a.provider.assessmentPlan")}:{" "}
                {p.providerDocs.assessmentPlanExcerpt}
              </li>
            ) : null}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("inpatientOverviewInp2a.provider.empty")}
          </p>
        )}
        <DeepLinkButton
          label={t("inpatientOverviewD4a34.problems.openProblems")}
          onClick={() => onNavigateSection?.("problemsPlan")}
        />
      </Section>

      <Section title={t("inpatientOverviewInp2a.modules.orders")} testId="overview-orders">
        {p.orders.availability === "READY" ? (
          <>
            {p.orders.newOrUnacknowledged.length ? (
              <div style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 12 }}>
                  {t("inpatientOverviewInp2a.orders.new")}
                </strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12 }}>
                  {p.orders.newOrUnacknowledged.slice(0, 8).map((o) => (
                    <li key={`new-${o.orderItemId}`}>
                      {o.label}
                      {o.status ? ` — ${o.status.replace(/_/g, " ")}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {p.orders.active.length ? (
              <div style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 12 }}>
                  {t("inpatientOverviewInp2a.orders.active")}
                </strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12 }}>
                  {p.orders.active.slice(0, 10).map((o) => (
                    <li key={`act-${o.orderItemId}`}>
                      {o.label}
                      {o.orderType ? ` · ${o.orderType.replace(/_/g, " ")}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {p.orders.pendingActions.length ? (
              <div style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 12 }}>
                  {t("inpatientOverviewInp2a.orders.pending")}
                </strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12 }}>
                  {p.orders.pendingActions.slice(0, 8).map((o) => (
                    <li key={`pend-${o.orderItemId}`}>{o.label}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {p.orders.reviewOrders ? (
              <div
                style={{ marginBottom: 8, fontSize: 12, color: "#334155" }}
                data-testid="overview-review-orders-counts"
              >
                <p style={{ margin: "0 0 2px" }}>
                  {t("inpatientOverviewInp2a.rail.reviewOrdersNew")}: {p.orders.reviewOrders.newUnreviewed}
                </p>
                <p style={{ margin: "0 0 2px" }}>
                  {t("inpatientOverviewInp2a.rail.reviewOrdersStat")}: {p.orders.reviewOrders.statUrgent}
                </p>
                <p style={{ margin: "0 0 2px" }}>
                  {t("inpatientOverviewInp2a.rail.reviewOrdersDue")}:{" "}
                  {p.orders.reviewOrders.dueNursingActionable}
                </p>
                <p style={{ margin: "0 0 2px" }}>
                  {t("inpatientOverviewInp2a.rail.reviewOrdersOverdue")}:{" "}
                  {p.orders.reviewOrders.overdueNursingActionable}
                </p>
                <p style={{ margin: 0 }}>
                  {t("inpatientOverviewInp2a.rail.reviewOrdersHeld")}: {p.orders.reviewOrders.held}
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("inpatientOverviewInp2a.orders.empty")}
          </p>
        )}
        <DeepLinkButton
          label={t("inpatientOverviewInp2a.orders.openOrders")}
          onClick={() => onNavigateSection?.("orders")}
        />
      </Section>

      <Section title={t("inpatientOverviewD4a34.modules.results")} testId="overview-results">
        {p.results.availability === "READY" ? (
          <>
            {p.results.critical.length ? (
              <div style={{ marginBottom: 10 }} data-testid="overview-labs-critical">
                <strong style={{ fontSize: 12, color: "#9a3412" }}>
                  {t("inpatientOverviewD4a34.labs.critical")}
                </strong>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 4 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#64748b" }}>
                      <th style={{ padding: "2px 4px" }}>{t("inpatientOverviewD4a34.labs.value")}</th>
                      <th style={{ padding: "2px 4px" }}>{t("inpatientOverviewD4a34.labs.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.results.critical.map((l, i) => (
                      <tr key={`crit-${l.label}-${i}`}>
                        <td style={{ padding: "2px 4px", fontWeight: 600 }}>
                          {l.label}
                          {l.current ? `: ${l.current}` : ""}
                          {l.critical ? (
                            <span style={{ color: "#b91c1c", marginLeft: 4 }} aria-label="critical">
                              ●
                            </span>
                          ) : null}
                        </td>
                        <td style={{ padding: "2px 4px" }}>
                          {l.acknowledgedByProvider
                            ? t("inpatientOverviewD4a34.labs.acked")
                            : t("inpatientOverviewD4a34.labs.unacked")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {p.results.pending.length ? (
              <div style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 12 }}>{t("inpatientOverviewD4a34.labs.pending")}</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12 }}>
                  {p.results.pending.map((l, i) => (
                    <li key={`pend-${l.label}-${i}`}>{l.label}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {p.results.abnormal.length ? (
              <div style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 12 }}>{t("inpatientOverviewD4a34.labs.abnormal")}</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12 }}>
                  {p.results.abnormal.map((l, i) => (
                    <li key={`abn-${l.label}-${i}`}>
                      {l.label}
                      {l.current ? `: ${l.current}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {p.results.trending.length ? (
              <div style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 12 }}>{t("inpatientOverviewD4a34.labs.trending")}</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12 }}>
                  {p.results.trending.map((l, i) => (
                    <li key={`tr-${l.label}-${i}`}>
                      {l.label}: {l.previous ?? dash} → {l.current ?? dash}
                      {l.direction ? ` (${l.direction})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("inpatientOverviewD4a34.labs.empty")}
          </p>
        )}
        <DeepLinkButton
          label={t("inpatientOverviewD4a34.labs.openResults")}
          onClick={() => onNavigateSection?.("results")}
        />
      </Section>

      <Section title={t("inpatientOverviewD4a34.modules.medications")} testId="overview-mar">
        {p.medications.availability === "READY" ? (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#64748b" }}>
                  <th style={{ padding: "2px 4px" }}>{t("inpatientOverviewD4a34.meds.drug")}</th>
                  <th style={{ padding: "2px 4px" }}>{t("inpatientOverviewD4a34.meds.dose")}</th>
                  <th style={{ padding: "2px 4px" }}>{t("inpatientOverviewD4a34.meds.route")}</th>
                  <th style={{ padding: "2px 4px" }}>{t("inpatientOverviewD4a34.meds.frequency")}</th>
                </tr>
              </thead>
              <tbody>
                {p.medications.lines.slice(0, 12).map((m, i) => (
                  <tr key={`${m.group}-${m.drug}-${i}`}>
                    <td style={{ padding: "2px 4px" }}>
                      <span style={{ color: "#64748b", fontSize: 11 }}>
                        {medGroupLabel(m.group, t)}
                      </span>
                      <br />
                      {m.drug}
                      {m.held ? ` (${t("inpatientOverviewD4a34.meds.held")})` : ""}
                    </td>
                    <td style={{ padding: "2px 4px" }}>{m.dose ?? dash}</td>
                    <td style={{ padding: "2px 4px" }}>{m.route ?? dash}</td>
                    <td style={{ padding: "2px 4px" }}>{m.frequency ?? dash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {p.medications.changes.length ? (
              <p style={{ margin: "8px 0 0", fontSize: 12 }}>
                <strong>{t("inpatientOverviewD4a34.meds.changes")}:</strong>{" "}
                {p.medications.changes.join("; ")}
              </p>
            ) : null}
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("inpatientOverviewD4a34.meds.empty")}
          </p>
        )}
        <DeepLinkButton
          label={t("inpatientOverviewD4a34.meds.openMar")}
          onClick={() => onNavigateSection?.("medications")}
        />
      </Section>

      <Section title={t("inpatientOverviewD4a34.modules.tasks")} testId="overview-work-attention">
        {p.tasks.availability === "READY" ? (
          (["critical", "today", "upcoming"] as const).map((bucket) => {
            const items = p.tasks.items.filter((x) => x.bucket === bucket);
            if (!items.length) return null;
            return (
              <div key={bucket} style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 12 }}>
                  {t(`inpatientOverviewD4a34.tasks.${bucket}`)}
                </strong>
                <ul style={{ margin: "2px 0 0", paddingLeft: 18, fontSize: 12 }}>
                  {items.map((task) => (
                    <li key={task.taskId}>
                      {task.linkedSection ? (
                        <button
                          type="button"
                          style={{
                            background: "none",
                            border: 0,
                            padding: 0,
                            color: "#0f766e",
                            cursor: "pointer",
                            font: "inherit",
                          }}
                          onClick={() =>
                            onNavigateSection?.(task.linkedSection as InpatientWorkspaceSection)
                          }
                        >
                          {task.title}
                        </button>
                      ) : (
                        task.title
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("inpatientOverviewD4a34.tasks.empty")}
          </p>
        )}
      </Section>

      {p.nursing.availability !== "OMITTED_HEADER_DUPLICATE" ? (
        <Section title={t("inpatientOverviewD4a34.modules.nursing")} testId="overview-nursing">
          <p style={{ margin: "0 0 4px", fontSize: 13 }}>
            {t("inpatientOverviewD4a34.nursing.admission")}:{" "}
            <strong>
              {p.nursing.admissionAssessmentComplete === true
                ? t("inpatientOverviewD4a34.nursing.complete")
                : p.nursing.admissionAssessmentComplete === false
                  ? t("inpatientOverviewD4a34.nursing.inProgress")
                  : t("inpatientOverviewD4a34.nursing.notStarted")}
            </strong>
          </p>
          {p.nursing.admissionOverview?.availability === "READY" ? (
            <ul
              data-testid="overview-nursing-admission-projection"
              style={{ margin: "0 0 8px", paddingLeft: 18, fontSize: 12 }}
            >
              <li>
                {t("inpatientAdmissionInp2b.overview.completion")}:{" "}
                {t("inpatientAdmissionInp2b.completion.sections")
                  .replace("{complete}", String(p.nursing.admissionOverview.completeCount))
                  .replace("{total}", String(p.nursing.admissionOverview.totalSections))}
                {" · "}
                {p.nursing.admissionOverview.signed
                  ? t("inpatientAdmissionInp2b.overview.signed")
                  : t("inpatientAdmissionInp2b.overview.unsigned")}
              </li>
              {p.nursing.admissionOverview.admissionSource ? (
                <li>
                  {t("inpatientAdmissionInp2b.overview.admissionSource")}:{" "}
                  {t(`hospitalAdmissionD4a25.options.${p.nursing.admissionOverview.admissionSource}`)}
                </li>
              ) : null}
              {p.nursing.admissionOverview.clinicalDocumentedAt ? (
                <li data-testid="overview-nursing-admission-clinical-time">
                  {t("inpatientAdmissionInp2b1.clinicalTime")}:{" "}
                  {formatEncounterChromeDateTime(
                    p.nursing.admissionOverview.clinicalDocumentedAt,
                    language
                  )}
                </li>
              ) : null}
              {p.nursing.admissionOverview.modeOfArrival ? (
                <li>
                  {t("inpatientAdmissionInp2b.overview.modeOfArrival")}:{" "}
                  {t(`hospitalAdmissionD4a25.options.${p.nursing.admissionOverview.modeOfArrival}`)}
                </li>
              ) : null}
              {p.nursing.admissionOverview.interpreterNeeded ? (
                <li>
                  {t("inpatientAdmissionInp2b.overview.interpreter")}:{" "}
                  {t(`hospitalAdmissionD4a25.options.${p.nursing.admissionOverview.interpreterNeeded}`)}
                </li>
              ) : null}
              {p.nursing.admissionOverview.historyReviewed ? (
                <li>
                  {t("inpatientAdmissionInp2b.overview.historyReviewed")}:{" "}
                  {t(`hospitalAdmissionD4a25.options.${p.nursing.admissionOverview.historyReviewed}`)}
                </li>
              ) : null}
              {p.nursing.admissionOverview.allergyReviewed ? (
                <li>
                  {t("inpatientAdmissionInp2b.overview.allergyReviewed")}:{" "}
                  {t(`hospitalAdmissionD4a25.options.${p.nursing.admissionOverview.allergyReviewed}`)}
                </li>
              ) : null}
              {p.nursing.admissionOverview.homeMedReviewed ? (
                <li>
                  {t("inpatientAdmissionInp2b.overview.homeMedReviewed")}:{" "}
                  {t(`hospitalAdmissionD4a25.options.${p.nursing.admissionOverview.homeMedReviewed}`)}
                </li>
              ) : null}
              {p.nursing.admissionOverview.mobilityBaseline || p.nursing.assessment?.mobility ? (
                <li data-testid="overview-mobility-baseline-vs-current">
                  {t("inpatientNursingAssessmentInp2c.overview.mobilityPair")}:{" "}
                  {p.nursing.admissionOverview.mobilityBaseline ? (
                    <>
                      {t("inpatientNursingAssessmentInp2c.overview.assessmentBaseline")}{" "}
                      {t(`hospitalAdmissionD4a25.options.${p.nursing.admissionOverview.mobilityBaseline}`)}
                    </>
                  ) : null}
                  {p.nursing.admissionOverview.mobilityBaseline && p.nursing.assessment?.mobility ? " · " : null}
                  {p.nursing.assessment?.mobility ? (
                    <>
                      {t("inpatientNursingAssessmentInp2c.overview.assessmentCurrent")}{" "}
                      {nursingCodeLabel(p.nursing.assessment.mobility)}
                    </>
                  ) : null}
                </li>
              ) : p.nursing.admissionOverview.mobilityBaseline ? (
                <li>
                  {t("inpatientAdmissionInp2b.overview.mobility")}:{" "}
                  {t(`hospitalAdmissionD4a25.options.${p.nursing.admissionOverview.mobilityBaseline}`)}
                </li>
              ) : null}
              {p.nursing.admissionOverview.skinBaseline ? (
                <li>
                  {t("inpatientAdmissionInp2b.overview.skin")}:{" "}
                  {t(`hospitalAdmissionD4a25.options.${p.nursing.admissionOverview.skinBaseline}`)}
                </li>
              ) : null}
              {p.nursing.admissionOverview.preAdmissionResidence ? (
                <li>
                  {t("inpatientAdmissionInp2b.overview.residence")}:{" "}
                  {t(
                    `hospitalAdmissionD4a25.options.${p.nursing.admissionOverview.preAdmissionResidence}`,
                  )}
                </li>
              ) : null}
            </ul>
          ) : null}
          <p style={{ margin: 0, fontSize: 13 }}>
            {t("inpatientOverviewD4a34.nursing.lastShift")}:{" "}
            {p.nursing.lastShiftAssessmentAtIso
              ? formatEncounterChromeDateTime(p.nursing.lastShiftAssessmentAtIso, language)
              : dash}
          </p>
          {p.nursing.assessment ? (
            <div data-testid="overview-nursing-assessment-projection" style={{ marginTop: 8, fontSize: 13 }}>
              {p.nursing.assessment.authorDisplayName ? (
                <p style={{ margin: "0 0 4px" }}>
                  {t("inpatientOverviewD4a34.nursing.documentedBy")}:{" "}
                  <strong>{p.nursing.assessment.authorDisplayName}</strong>
                  {p.nursing.assessment.assessmentType
                    ? ` · ${nursingCodeLabel(p.nursing.assessment.assessmentType)}`
                    : null}
                </p>
              ) : null}
              {p.nursing.assessment.mentalStatus ? (
                <p style={{ margin: "0 0 2px" }}>
                  {t("inpatientOverviewD4a34.nursing.mentalStatus")}:{" "}
                  {nursingCodeLabel(p.nursing.assessment.mentalStatus)}
                </p>
              ) : null}
              {p.nursing.assessment.painScore != null ? (
                <p style={{ margin: "0 0 2px" }}>
                  {t("inpatientOverviewD4a34.nursing.pain")}: {p.nursing.assessment.painScore}/10
                </p>
              ) : null}
              {p.nursing.assessment.respiratoryStatus ? (
                <p style={{ margin: "0 0 2px" }}>
                  {t("inpatientOverviewD4a34.nursing.respiratory")}:{" "}
                  {nursingCodeLabel(p.nursing.assessment.respiratoryStatus)}
                </p>
              ) : null}
              {p.nursing.assessment.mobility || p.nursing.assessment.fallRisk ? (
                <p style={{ margin: "0 0 2px" }}>
                  {t("inpatientOverviewD4a34.nursing.mobilityFall")}:{" "}
                  {[
                    nursingCodeLabel(p.nursing.assessment.mobility),
                    nursingCodeLabel(p.nursing.assessment.fallRisk),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              {p.nursing.assessment.skinWoundConcern ||
              p.nursing.assessment.deviceLineConcern ||
              p.nursing.assessment.safetyConcern ? (
                <p style={{ margin: "0 0 2px" }}>
                  {t("inpatientOverviewD4a34.nursing.concerns")}:{" "}
                  {[
                    p.nursing.assessment.skinWoundConcern
                      ? t("inpatientOverviewD4a34.nursing.skinWound")
                      : null,
                    p.nursing.assessment.deviceLineConcern
                      ? t("inpatientOverviewD4a34.nursing.devices")
                      : null,
                    p.nursing.assessment.safetyConcern
                      ? t("inpatientOverviewD4a34.nursing.safety")
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
              {p.nursing.assessment.narrativeExcerpt ? (
                <p style={{ margin: "4px 0 0", color: "#334155" }}>{p.nursing.assessment.narrativeExcerpt}</p>
              ) : null}
            </div>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <DeepLinkButton
              label={t(
                p.nursing.admissionAssessmentComplete === true
                  ? "inpatientOverviewD4a34.nursing.reviewAdmission"
                  : p.nursing.admissionAssessmentComplete === false
                    ? "inpatientOverviewD4a34.nursing.continueAdmission"
                    : "inpatientOverviewD4a34.nursing.startAdmission"
              )}
              onClick={() => onNavigateSection?.("admission")}
            />
            <DeepLinkButton
              label={t("inpatientOverviewD4a34.nursing.openNursingAssessment")}
              onClick={() => onNavigateSection?.("nursing")}
            />
          </div>
        </Section>
      ) : null}

      <Section title={t("inpatientOverviewD4a34.modules.intakeOutput")} testId="overview-io">
        {p.intakeOutput.availability === "READY" ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {p.intakeOutput.intake24hMl != null ? (
              <li>
                {t("inpatientOverviewD4a34.io.intake")}: {p.intakeOutput.intake24hMl}{" "}
                {t("inpatientOverviewD4a34.io.ml")}
              </li>
            ) : null}
            {p.intakeOutput.output24hMl != null ? (
              <li>
                {t("inpatientOverviewD4a34.io.output")}: {p.intakeOutput.output24hMl}{" "}
                {t("inpatientOverviewD4a34.io.ml")}
              </li>
            ) : null}
            {p.intakeOutput.balance24hMl != null ? (
              <li>
                {t("inpatientOverviewD4a34.io.balance")}: {p.intakeOutput.balance24hMl}{" "}
                {t("inpatientOverviewD4a34.io.ml")}
              </li>
            ) : null}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("inpatientOverviewD4a34.io.empty")}
          </p>
        )}
      </Section>

      {p.devices.availability === "READY" && (p.devices.lines?.length ?? 0) > 0 ? (
        <Section title={t("inpatientOverviewD4a34.modules.devices")} testId="overview-devices">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {(p.devices.lines ?? []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Section>
      ) : (
        <Section title={t("inpatientOverviewD4a34.modules.devices")} testId="overview-devices">
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("inpatientOverviewD4a34.devices.empty")}
          </p>
        </Section>
      )}

      <Section title={t("inpatientOverviewD4a34.modules.consults")} testId="overview-consults">
        {p.consults.availability === "READY" ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {p.consults.specialties.map((s) => (
              <li key={s}>{formatInpatientConsultSpecialtyDisplay(s, t)}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("inpatientOverviewD4a34.consults.empty")}
          </p>
        )}
      </Section>

      <Section title={t("inpatientOverviewD4a34.modules.discharge")} testId="overview-discharge">
        {p.discharge.availability === "READY" ? (
          <>
            <p style={{ margin: "0 0 6px", fontSize: 13 }}>
              {t("inpatientOverviewD4a34.discharge.medicalReady")}:{" "}
              {p.discharge.medicalReady ? "✓" : dash}
              {" · "}
              {t("inpatientOverviewD4a34.discharge.workflow")}:{" "}
              {p.discharge.workflowState
                ? p.discharge.workflowState.replace(/_/g, " ")
                : dash}
              {" · "}
              {t("inpatientOverviewD4a34.discharge.edd")}:{" "}
              {p.discharge.estimatedDischargeDate
                ? formatEncounterChromeDateTime(p.discharge.estimatedDischargeDate, language)
                : dash}
            </p>
            {(p.discharge.barriers ?? []).length ? (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                {p.discharge.barriers.map((b) => (
                  <li key={b.key} style={{ color: b.resolved ? "#0f766e" : "#9a3412" }}>
                    {b.resolved
                      ? t("inpatientOverviewD4a34.discharge.resolved")
                      : t("inpatientOverviewD4a34.discharge.barriers")}
                    : {b.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("inpatientOverviewD4a34.discharge.empty")}
          </p>
        )}
        <DeepLinkButton
          label={t("inpatientOverviewD4a34.discharge.openDischarge")}
          onClick={() => onNavigateSection?.("dischargePlanning")}
        />
      </Section>

      <Section title={t("inpatientOverviewInp2a.modules.carePlan")} testId="overview-care-plan">
        {p.carePlan.availability === "READY" ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {p.carePlan.plans.slice(0, 8).map((plan) => (
              <li key={plan.planId}>
                <strong>{plan.title}</strong>
                {plan.status ? ` — ${plan.status.replace(/_/g, " ")}` : ""}
                {plan.goalSummary ? (
                  <div style={{ color: "#475569", fontSize: 12 }}>{plan.goalSummary}</div>
                ) : null}
                {plan.concern ? (
                  <div style={{ color: "#9a3412", fontSize: 12 }}>{plan.concern}</div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("inpatientOverviewInp2a.carePlan.empty")}
          </p>
        )}
        <DeepLinkButton
          label={t("inpatientOverviewInp2a.carePlan.openCarePlan")}
          onClick={() => onNavigateSection?.("carePlan")}
        />
      </Section>

      {p.painCompare.availability === "READY" ? (
        <Section title={t("inpatientOverviewD4a34.modules.painCompare")} testId="overview-pain">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>
              {t("inpatientOverviewD4a34.pain.admission")}: {p.painCompare.admissionPain ?? dash}
            </li>
            <li>
              {t("inpatientOverviewD4a34.pain.current")}: {p.painCompare.currentPain ?? dash}
            </li>
            {p.role === "PROVIDER" || p.role === "CHART" ? (
              <li>
                {t("inpatientOverviewD4a34.pain.provider")}:{" "}
                {p.painCompare.providerAssessment ?? dash}
              </li>
            ) : null}
          </ul>
        </Section>
      ) : null}

      <Section title={t("inpatientOverviewD4a34.modules.recentEvents")} testId="overview-events">
        {p.recentEvents.availability === "READY" ? (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
            {p.recentEvents.items.map((e) => (
              <li
                key={e.eventId}
                style={{ borderTop: "1px solid #e2e8f0", padding: "8px 0", fontSize: 13 }}
              >
                <div>
                  <strong>{eventTypeLabel(e.type, t)}</strong>
                  {" · "}
                  {eventSeverityLabel(e.severity, t)}
                  {" · "}
                  {eventStatusLabel(e.status, t)}
                </div>
                <div style={{ color: "#475569" }}>{e.summary}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  {formatEncounterChromeDateTime(e.occurredAtIso, language)}
                </div>
                {e.canAck && onAckEvent ? (
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => onAckEvent(e.eventId, "REVIEWED")}>
                      {t("inpatientProviderD4a26.events.reviewed")}
                    </button>
                    <button type="button" onClick={() => onAckEvent(e.eventId, "ACKNOWLEDGED")}>
                      {t("inpatientProviderD4a26.events.acknowledge")}
                    </button>
                    <button type="button" onClick={() => onAckEvent(e.eventId, "ACTION_TAKEN")}>
                      {t("inpatientProviderD4a26.events.actionTaken")}
                    </button>
                    <button type="button" onClick={() => onAckEvent(e.eventId, "RESOLVED")}>
                      {t("inpatientProviderD4a26.events.resolved")}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("inpatientOverviewD4a34.events.empty")}
          </p>
        )}
      </Section>
        </div>
        <div data-testid="inpatient-overview-rail-host" className="inpatient-overview-rail-desktop">
          <InpatientClinicalContextRail
            projection={p}
            onNavigateSection={onNavigateSection}
            variant="desktop"
          />
        </div>
      </div>
      <style>{`
        @media (max-width: 960px) {
          .inpatient-overview-grid { grid-template-columns: 1fr !important; }
          .inpatient-overview-rail-desktop { display: none; }
          .inpatient-overview-drawer { display: block; margin-bottom: 10px; }
        }
        @media (min-width: 961px) {
          .inpatient-overview-drawer { display: none; }
        }
      `}</style>
    </div>
  );
}
