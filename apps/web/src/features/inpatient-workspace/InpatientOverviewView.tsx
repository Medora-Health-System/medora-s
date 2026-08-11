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

const card: CSSProperties = {
  ...MEDORA_CARD_SHELL,
  padding: "10px 12px",
  marginBottom: 10,
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
  const p = projection;
  const dash = DISPLAY_DASH;

  return (
    <div data-testid="inpatient-overview-projected" data-role={p.role}>
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
              t("inpatientOverviewD4a34.clinicalState.legacySynthetic")
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
                  <td style={{ padding: "2px 4px", fontWeight: 600 }}>{v.label}</td>
                  <td style={{ padding: "2px 4px" }}>{v.current ?? dash}</td>
                  <td style={{ padding: "2px 4px" }}>{v.previous ?? dash}</td>
                  <td style={{ padding: "2px 4px" }}>{v.trend24h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}

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

      {(p.role === "NURSING" || p.role === "TECHNICIAN" || p.role === "CHART") &&
      p.nursing.availability !== "OMITTED_HEADER_DUPLICATE" ? (
        <Section title={t("inpatientOverviewD4a34.modules.nursing")} testId="overview-nursing">
          <p style={{ margin: "0 0 4px", fontSize: 13 }}>
            {t("inpatientOverviewD4a34.nursing.admission")}:{" "}
            <strong>
              {p.nursing.admissionAssessmentComplete
                ? t("inpatientOverviewD4a34.nursing.complete")
                : t("inpatientOverviewD4a34.nursing.incomplete")}
            </strong>
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            {t("inpatientOverviewD4a34.nursing.lastShift")}:{" "}
            {p.nursing.lastShiftAssessmentAtIso
              ? formatEncounterChromeDateTime(p.nursing.lastShiftAssessmentAtIso, language)
              : dash}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <DeepLinkButton
              label={t("inpatientOverviewD4a34.nursing.openAdmission")}
              onClick={() => onNavigateSection?.("admission")}
            />
            <DeepLinkButton
              label={t(
                p.nursing.lastShiftAssessmentAtIso
                  ? "inpatientOverviewD4a34.nursing.openAssessmentReassess"
                  : "inpatientOverviewD4a34.nursing.startAssessment"
              )}
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

      {p.devices.availability === "UNSUPPORTED" ? (
        <Section title={t("inpatientOverviewD4a34.modules.devices")} testId="overview-devices">
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("inpatientOverviewD4a34.devices.unsupported")}
          </p>
        </Section>
      ) : null}

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
  );
}
