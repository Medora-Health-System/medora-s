"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { PROVIDER_PRINT_PACKAGE_KINDS, type ProviderPrintPackageKind } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  fetchProviderClinicalSynthesis,
  fetchProviderPrintPackage,
} from "@/features/hospital-care/inpatientOperationsApi";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";

type Synthesis = {
  overview?: {
    hospitalDay?: number | null;
    currentStatus?: string | null;
    codeStatus?: string | null;
    isolation?: string | null;
    attending?: string | null;
    consultServices?: string[];
    primaryDiagnosis?: string | null;
    secondaryProblems?: string[];
    currentBed?: string | null;
    currentUnit?: string | null;
    admissionDate?: string | null;
    lengthOfStayHours?: number | null;
    estimatedDischarge?: string | null;
    provider?: string | null;
    resident?: string | null;
    app?: string | null;
  };
  vitals?: Array<{
    key: string;
    label: string;
    current: string | null;
    previous: string | null;
    trend24h: string;
    abnormal: boolean;
  }>;
  intakeOutput?: {
    intake24hMl?: number | null;
    output24hMl?: number | null;
    balance24hMl?: number | null;
    hospitalBalanceMl?: number | null;
    urineOutputMl?: number | null;
    drainOutputMl?: number | null;
    chestTubeMl?: number | null;
    ngOutputMl?: number | null;
    dialysisMl?: number | null;
    warnings?: string[];
  };
  laboratories?: {
    pending?: Array<{ label: string; current: string | null; critical: boolean; acknowledgedByProvider: boolean }>;
    critical?: Array<{ label: string; current: string | null; acknowledgedByProvider: boolean; timestamp: string | null }>;
    abnormal?: Array<{ label: string; current: string | null; direction: string }>;
    trending?: Array<{ label: string; current: string | null; previous: string | null; direction: string }>;
  };
  radiology?: {
    pending?: Array<{ label: string; status: string }>;
    inProgress?: Array<{ label: string; status: string }>;
    preliminary?: Array<{ label: string; impression: string | null }>;
    final?: Array<{ label: string; impression: string | null; radiologist: string | null }>;
    critical?: Array<{ label: string; acknowledgedByProvider: boolean }>;
  };
  medications?: {
    groups?: Record<string, Array<{ drug: string; dose: string | null; route: string | null; frequency: string | null; held: boolean }>>;
    changes?: Array<{ drug: string }>;
    held?: Array<{ drug: string }>;
  };
  tasks?: {
    critical?: Array<{ taskId: string; title: string; priority: string; linkedSection?: string | null }>;
    today?: Array<{ taskId: string; title: string; priority: string; linkedSection?: string | null }>;
    upcoming?: Array<{ taskId: string; title: string; priority: string; linkedSection?: string | null }>;
    completed?: Array<{ taskId: string; title: string }>;
  };
  dischargeReadiness?: {
    medicalReady?: boolean;
    workflowState?: string | null;
    estimatedDischargeDate?: string | null;
    destination?: string | null;
    barriers?: Array<{ key: string; label: string; resolved: boolean }>;
  };
  currentVsAdmission?: {
    admissionPain?: string | null;
    currentPain?: string | null;
    providerAssessment?: string | null;
  };
  events?: Array<{
    eventId: string;
    type: string;
    severity: string;
    summary: string;
    status: string;
    source: string;
    occurredAt: string;
  }>;
  problems?: Array<{ problemId: string; displayLabel: string; status: string; assessment?: string | null; plan?: string | null }>;
};

const card: CSSProperties = {
  ...MEDORA_CARD_SHELL,
  padding: "10px 12px",
  marginBottom: 10,
};

function Section({
  title,
  children,
  testId,
  help,
}: {
  title: string;
  children: ReactNode;
  testId?: string;
  help?: string;
}) {
  return (
    <section style={card} data-testid={testId}>
      <h2 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
        {title}
        {help ? (
          <span
            title={help}
            aria-label={help}
            style={{
              marginLeft: 8,
              display: "inline-flex",
              width: 18,
              height: 18,
              borderRadius: 9999,
              border: "1px solid #94a3b8",
              fontSize: 11,
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
              cursor: "help",
              verticalAlign: "middle",
            }}
          >
            ?
          </span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

function dash(v: unknown, fallback: string) {
  if (v == null || v === "") return fallback;
  return String(v);
}

export function ProviderClinicalSynthesisOverview({
  encounterId,
  onNavigateSection,
  onAckEvent,
  canProviderWrite,
}: {
  encounterId: string;
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
  onAckEvent?: (eventId: string, status: string) => void;
  canProviderWrite: boolean;
}) {
  const { t } = useI18n();
  const [syn, setSyn] = useState<Synthesis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printMsg, setPrintMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProviderClinicalSynthesis(encounterId);
      setSyn((res.synthesis ?? null) as Synthesis);
    } catch {
      setError(t("inpatientD3e.workspace.loadError"));
      setSyn(null);
    } finally {
      setLoading(false);
    }
  }, [encounterId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const printPackage = async (kind: ProviderPrintPackageKind) => {
    setPrintMsg(null);
    try {
      const res = await fetchProviderPrintPackage(encounterId, kind);
      const pkg = res.package as { title?: string; revision?: number };
      const printClass = String((res as { printClass?: string }).printClass ?? "");
      const label =
        printClass === "CLINICAL_SYNTHESIS"
          ? t("providerLegalRecordD4a26b.unsignedSynthesisReport")
          : t("providerLegalRecordD4a26b.legalRecordPrint");
      setPrintMsg(`${label}: ${pkg.title ?? kind} · rev ${pkg.revision ?? "—"}`);
    } catch {
      setPrintMsg(t("inpatientProviderD4a26.rounding.failed"));
    }
  };

  if (loading) {
    return <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>;
  }
  if (error || !syn) {
    return (
      <p role="alert" style={{ fontSize: 13, color: "#b91c1c" }}>
        {error ?? t("common.dash")}
      </p>
    );
  }

  const o = syn.overview ?? {};
  const io = syn.intakeOutput ?? {};
  const labs = syn.laboratories ?? {};
  const rad = syn.radiology ?? {};
  const meds = syn.medications ?? {};
  const tasks = syn.tasks ?? {};
  const dc = syn.dischargeReadiness ?? {};
  const cva = syn.currentVsAdmission ?? {};

  return (
    <div data-testid="provider-clinical-synthesis-overview">
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
        {t("providerClinicalSynthesisD4a26a.safety.noAuto")}{" "}
        {t("providerLegalRecordD4a26b.neverAutoAck")}
      </p>

      <Section title={t("providerClinicalSynthesisD4a26a.overview.title")} testId="provider-overview-live">
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
          {(
            [
              ["hospitalDay", o.hospitalDay],
              ["status", o.currentStatus],
              ["codeStatus", o.codeStatus],
              ["isolation", o.isolation],
              ["attending", o.attending],
              ["primaryDx", o.primaryDiagnosis],
              ["bed", o.currentBed],
              ["unit", o.currentUnit],
              ["admissionDate", o.admissionDate],
              ["los", o.lengthOfStayHours],
              ["edd", o.estimatedDischarge],
              ["provider", o.provider],
              ["resident", o.resident],
              ["app", o.app],
            ] as const
          ).map(([key, val]) => (
            <div key={key}>
              <dt style={{ fontWeight: 600 }}>{t(`providerClinicalSynthesisD4a26a.overview.${key}`)}</dt>
              <dd style={{ margin: 0 }}>{dash(val, t("common.dash"))}</dd>
            </div>
          ))}
        </dl>
        <p style={{ margin: "8px 0 0", fontSize: 12 }}>
          <strong>{t("providerClinicalSynthesisD4a26a.overview.consults")}:</strong>{" "}
          {(o.consultServices ?? []).join(", ") || t("common.dash")}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 12 }}>
          <strong>{t("providerClinicalSynthesisD4a26a.overview.secondary")}:</strong>{" "}
          {(o.secondaryProblems ?? []).join("; ") || t("common.dash")}
        </p>
      </Section>

      <Section
        title={t("providerClinicalSynthesisD4a26a.currentVsAdmission.title")}
        testId="provider-current-vs-admission"
        help={t("providerClinicalSynthesisD4a26a.currentVsAdmission.separated")}
      >
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          <li>
            {t("providerClinicalSynthesisD4a26a.currentVsAdmission.admissionPain")}:{" "}
            {dash(cva.admissionPain, t("common.dash"))}
          </li>
          <li>
            {t("providerClinicalSynthesisD4a26a.currentVsAdmission.currentPain")}:{" "}
            {dash(cva.currentPain, t("common.dash"))}
          </li>
          <li>
            {t("providerClinicalSynthesisD4a26a.currentVsAdmission.providerAssessment")}:{" "}
            {dash(cva.providerAssessment, t("common.dash"))}
          </li>
        </ul>
      </Section>

      <Section title={t("providerClinicalSynthesisD4a26a.vitals.title")} testId="provider-vitals-live">
        {(syn.vitals ?? []).length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("providerClinicalSynthesisD4a26a.vitals.missing")}
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#64748b" }}>
                <th style={{ padding: "2px 4px" }} />
                <th style={{ padding: "2px 4px" }}>{t("providerClinicalSynthesisD4a26a.vitals.current")}</th>
                <th style={{ padding: "2px 4px" }}>{t("providerClinicalSynthesisD4a26a.vitals.previous")}</th>
                <th style={{ padding: "2px 4px" }}>{t("providerClinicalSynthesisD4a26a.vitals.trend")}</th>
              </tr>
            </thead>
            <tbody>
              {(syn.vitals ?? []).map((v) => (
                <tr key={v.key} style={{ color: v.abnormal ? "#9a3412" : "#334155" }}>
                  <td style={{ padding: "2px 4px", fontWeight: 600 }}>
                    {v.label}
                    {v.abnormal ? (
                      <span aria-label={t("providerClinicalSynthesisD4a26a.vitals.abnormal")}> ⚠</span>
                    ) : null}
                  </td>
                  <td style={{ padding: "2px 4px" }}>{dash(v.current, t("common.dash"))}</td>
                  <td style={{ padding: "2px 4px" }}>{dash(v.previous, t("common.dash"))}</td>
                  <td style={{ padding: "2px 4px" }}>{v.trend24h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={t("providerClinicalSynthesisD4a26a.io.title")} testId="provider-io-live">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          <li>
            {t("providerClinicalSynthesisD4a26a.io.intake24")}: {dash(io.intake24hMl, t("common.dash"))}
            {io.intake24hMl != null ? " mL" : ""}
          </li>
          <li>
            {t("providerClinicalSynthesisD4a26a.io.output24")}: {dash(io.output24hMl, t("common.dash"))}
            {io.output24hMl != null ? " mL" : ""}
          </li>
          <li>
            {t("providerClinicalSynthesisD4a26a.io.balance")}: {dash(io.balance24hMl, t("common.dash"))}
            {io.balance24hMl != null ? " mL" : ""}
          </li>
          <li>
            {t("providerClinicalSynthesisD4a26a.io.hospitalBalance")}:{" "}
            {dash(io.hospitalBalanceMl, t("common.dash"))}
            {io.hospitalBalanceMl != null ? " mL" : ""}
          </li>
          <li>
            {t("providerClinicalSynthesisD4a26a.io.urine")}: {dash(io.urineOutputMl, t("common.dash"))}
          </li>
          <li>
            {t("providerClinicalSynthesisD4a26a.io.drain")}: {dash(io.drainOutputMl, t("common.dash"))}
          </li>
          <li>
            {t("providerClinicalSynthesisD4a26a.io.chest")}: {dash(io.chestTubeMl, t("common.dash"))}
          </li>
          <li>
            {t("providerClinicalSynthesisD4a26a.io.ng")}: {dash(io.ngOutputMl, t("common.dash"))}
          </li>
          <li>
            {t("providerClinicalSynthesisD4a26a.io.dialysis")}: {dash(io.dialysisMl, t("common.dash"))}
          </li>
        </ul>
        {(io.warnings ?? []).length ? (
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "#9a3412" }}>
            {(io.warnings ?? []).map((w) => (
              <li key={w}>
                <span aria-hidden="true">⚠ </span>
                {t(`providerClinicalSynthesisD4a26a.io.warnings.${w}` as "providerClinicalSynthesisD4a26a.io.warnings.MISSING_DOCUMENTATION")}
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section
        title={t("providerClinicalSynthesisD4a26a.labs.title")}
        help={t("providerClinicalSynthesisD4a26a.labs.neverAutoAck")}
        testId="provider-labs-live"
      >
        <p style={{ margin: "0 0 6px", fontSize: 12 }}>
          <strong>{t("providerClinicalSynthesisD4a26a.labs.critical")}:</strong>{" "}
          {(labs.critical ?? [])
            .map(
              (l) =>
                `${l.label} ${l.current ?? ""} (${l.acknowledgedByProvider ? t("providerClinicalSynthesisD4a26a.labs.ack") : t("providerClinicalSynthesisD4a26a.labs.unacked")})`
            )
            .join("; ") || t("common.dash")}
        </p>
        <p style={{ margin: "0 0 6px", fontSize: 12 }}>
          <strong>{t("providerClinicalSynthesisD4a26a.labs.pending")}:</strong>{" "}
          {(labs.pending ?? []).map((l) => l.label).join("; ") || t("common.dash")}
        </p>
        <p style={{ margin: "0 0 6px", fontSize: 12 }}>
          <strong>{t("providerClinicalSynthesisD4a26a.labs.abnormal")}:</strong>{" "}
          {(labs.abnormal ?? []).map((l) => `${l.label} ${l.current ?? ""}`).join("; ") || t("common.dash")}
        </p>
        <p style={{ margin: 0, fontSize: 12 }}>
          <strong>{t("providerClinicalSynthesisD4a26a.labs.trending")}:</strong>{" "}
          {(labs.trending ?? [])
            .map((l) => `${l.label}: ${l.previous ?? "—"} → ${l.current ?? "—"} (${l.direction})`)
            .join("; ") || t("common.dash")}
        </p>
        <button type="button" style={{ marginTop: 8 }} onClick={() => onNavigateSection?.("results")}>
          {t("inpatientProviderD4a26.empty.results")}
        </button>
      </Section>

      <Section
        title={t("providerClinicalSynthesisD4a26a.radiology.title")}
        help={t("providerClinicalSynthesisD4a26a.radiology.neverAutoAck")}
        testId="provider-radiology-live"
      >
        {(
          [
            ["pending", rad.pending],
            ["inProgress", rad.inProgress],
            ["preliminary", rad.preliminary],
            ["final", rad.final],
            ["critical", rad.critical],
          ] as const
        ).map(([key, list]) => (
          <p key={key} style={{ margin: "0 0 4px", fontSize: 12 }}>
            <strong>{t(`providerClinicalSynthesisD4a26a.radiology.${key}`)}:</strong>{" "}
            {(list ?? [])
              .map((x) => {
                const impression = "impression" in x ? x.impression : null;
                return impression ? `${x.label} — ${impression}` : x.label;
              })
              .join("; ") || t("common.dash")}
          </p>
        ))}
      </Section>

      <Section title={t("providerClinicalSynthesisD4a26a.meds.title")} testId="provider-meds-live">
        {Object.entries(meds.groups ?? {}).map(([group, lines]) => (
          <div key={group} style={{ marginBottom: 6 }}>
            <strong style={{ fontSize: 12 }}>
              {t(`providerClinicalSynthesisD4a26a.meds.groups.${group}` as "providerClinicalSynthesisD4a26a.meds.groups.OTHER")}
            </strong>
            <ul style={{ margin: "2px 0 0", paddingLeft: 18, fontSize: 12 }}>
              {(lines ?? []).slice(0, 8).map((m) => (
                <li key={`${group}-${m.drug}`}>
                  {m.drug}
                  {m.dose ? ` ${m.dose}` : ""}
                  {m.route ? ` ${m.route}` : ""}
                  {m.frequency ? ` ${m.frequency}` : ""}
                  {m.held ? ` (${t("providerClinicalSynthesisD4a26a.meds.held")})` : ""}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p style={{ margin: "6px 0 0", fontSize: 12 }}>
          <strong>{t("providerClinicalSynthesisD4a26a.meds.changes")}:</strong>{" "}
          {(meds.changes ?? []).map((m) => m.drug).join("; ") || t("common.dash")}
        </p>
        <button type="button" style={{ marginTop: 8 }} onClick={() => onNavigateSection?.("medications")}>
          {t("providerClinicalSynthesisD4a26a.meds.deepLink")}
        </button>
      </Section>

      <Section
        title={t("providerClinicalSynthesisD4a26a.inbox.title")}
        help={t("providerClinicalSynthesisD4a26a.inbox.neverAutoAck")}
        testId="provider-inbox-live"
      >
        {(syn.events ?? []).length === 0 ? (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientProviderD4a26.overview.emptyEvents")}</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
            {(syn.events ?? []).map((e) => (
              <li
                key={e.eventId}
                style={{ borderTop: "1px solid #e2e8f0", padding: "8px 0", fontSize: 13 }}
              >
                <div>
                  <strong>{e.type}</strong> · {e.severity} · {e.status}
                </div>
                <div style={{ color: "#475569" }}>{e.summary}</div>
                {canProviderWrite && e.status === "NEW" && onAckEvent ? (
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
        )}
      </Section>

      <Section title={t("providerClinicalSynthesisD4a26a.tasks.title")} testId="provider-tasks-live">
        {(
          [
            ["critical", tasks.critical],
            ["today", tasks.today],
            ["upcoming", tasks.upcoming],
            ["completed", tasks.completed],
          ] as const
        ).map(([key, list]) => (
          <div key={key} style={{ marginBottom: 6 }}>
            <strong style={{ fontSize: 12 }}>{t(`providerClinicalSynthesisD4a26a.tasks.${key}`)}</strong>
            <ul style={{ margin: "2px 0 0", paddingLeft: 18, fontSize: 12 }}>
              {(list ?? []).length === 0 ? (
                <li>{t("common.dash")}</li>
              ) : (
                (list ?? []).map((task) => (
                  <li key={task.taskId}>
                    {"linkedSection" in task && task.linkedSection ? (
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: 0,
                          padding: 0,
                          color: "#0f766e",
                          cursor: "pointer",
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
                ))
              )}
            </ul>
          </div>
        ))}
      </Section>

      <Section
        title={t("providerClinicalSynthesisD4a26a.discharge.title")}
        help={t("providerClinicalSynthesisD4a26a.discharge.neverAuto")}
        testId="provider-discharge-live"
      >
        <p style={{ margin: "0 0 6px", fontSize: 13 }}>
          {t("providerClinicalSynthesisD4a26a.discharge.medicalReady")}:{" "}
          {dc.medicalReady ? "✓" : "—"} · {dash(dc.workflowState, t("common.dash"))} ·{" "}
          {dash(dc.estimatedDischargeDate, t("common.dash"))} · {dash(dc.destination, t("common.dash"))}
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
          {(dc.barriers ?? []).map((b) => (
            <li key={b.key} style={{ color: b.resolved ? "#0f766e" : "#9a3412" }}>
              {b.resolved ? t("providerClinicalSynthesisD4a26a.discharge.resolved") : t("providerClinicalSynthesisD4a26a.discharge.barriers")}
              : {b.label}
            </li>
          ))}
        </ul>
        <button type="button" style={{ marginTop: 8 }} onClick={() => onNavigateSection?.("dischargePlanning")}>
          {t("inpatientProviderD4a26.nav.discharge")}
        </button>
      </Section>

      <Section title={t("providerClinicalSynthesisD4a26a.print.title")} testId="provider-print-packages">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PROVIDER_PRINT_PACKAGE_KINDS.map((kind) => (
            <button key={kind} type="button" onClick={() => void printPackage(kind)}>
              {t(`providerClinicalSynthesisD4a26a.print.kinds.${kind}`)}
            </button>
          ))}
        </div>
        {printMsg ? (
          <p role="status" style={{ margin: "8px 0 0", fontSize: 12, color: "#0f766e" }}>
            {printMsg}
          </p>
        ) : null}
      </Section>

      <Section title={t("inpatientProviderD4a26.overview.activeProblems")}>
        {(syn.problems ?? []).length === 0 ? (
          <button type="button" onClick={() => onNavigateSection?.("problemsPlan")}>
            {t("inpatientProviderD4a26.nav.problemsPlan")}
          </button>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {(syn.problems ?? []).slice(0, 8).map((p) => (
              <li key={p.problemId}>
                {p.displayLabel} — {p.status}
                {p.assessment ? ` · ${p.assessment}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
