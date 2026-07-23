"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  PROVIDER_HP_SECTION_KEYS,
  PROVIDER_PROBLEM_PLAN_STATUSES,
  PROVIDER_ROUNDING_MODE_STEPS,
  type ProviderEventAckStatus,
  type ProviderHpSectionKey,
  type ProviderRoundingModeStep,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  acknowledgeProviderWorkspaceEvent,
  fetchProviderWorkspace,
  saveProviderHpDraft,
  signProviderHp,
  upsertProviderProblemPlan,
} from "@/features/hospital-care/inpatientOperationsApi";
import { EncounterDiagnosticsPanel } from "@/components/encounters/EncounterDiagnosticsPanel";
import { EnterpriseEncounterCommandTimeline } from "@/components/encounters/EnterpriseEncounterCommandTimeline";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";

type ProviderDoc = {
  expectedVersion?: number;
  events?: Array<{
    eventId: string;
    type: string;
    severity: string;
    summary: string;
    source: string;
    occurredAt: string;
    status: string;
    acknowledgedAt?: string | null;
    actionTaken?: string | null;
  }>;
  problemPlans?: Array<{
    problemId: string;
    displayLabel: string;
    status: string;
    priority: string;
    assessment?: string | null;
    plan?: string | null;
  }>;
  tasks?: Array<{
    taskId: string;
    type: string;
    status: string;
    priority: string;
    title: string;
    linkedSection?: string | null;
    dueAt?: string | null;
  }>;
  hpDraft?: {
    status?: string;
    sections?: Record<string, { text?: string | null }>;
    signedAt?: string | null;
  } | null;
};

type ClinicalOpsLite = {
  codeStatus?: { status?: string | null } | null;
  isolationPrecautions?: unknown;
  medicationReconciliation?: unknown[];
  dischargePlanning?: {
    workflowState?: string | null;
    expectedDischargeDate?: string | null;
    destination?: string | null;
  } | null;
};

const card: CSSProperties = {
  ...MEDORA_CARD_SHELL,
  padding: "10px 12px",
  marginBottom: 10,
};

function SectionCard({
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

export function InpatientProviderWorkspacePanel({
  mode,
  encounterId,
  facilityId,
  patientId,
  canProviderWrite,
  canDocumentDiagnoses,
  isLocked,
  onNavigateSection,
}: {
  mode: "overview" | "historyPhysical" | "problemsPlan" | "timeline" | "summary" | "tasks";
  encounterId: string;
  facilityId: string;
  patientId?: string | null;
  canProviderWrite: boolean;
  canDocumentDiagnoses: boolean;
  isLocked: boolean;
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
}) {
  const { t } = useI18n();
  const [doc, setDoc] = useState<ProviderDoc | null>(null);
  const [ops, setOps] = useState<ClinicalOpsLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [rounding, setRounding] = useState(false);
  const [roundingStep, setRoundingStep] = useState(0);
  const [hpSection, setHpSection] = useState<ProviderHpSectionKey>("CHIEF_CONCERN");
  const [hpText, setHpText] = useState("");
  const [problemLabel, setProblemLabel] = useState("");
  const [problemStatus, setProblemStatus] =
    useState<(typeof PROVIDER_PROBLEM_PLAN_STATUSES)[number]>("ACTIVE");
  const [problemAssessment, setProblemAssessment] = useState("");
  const [problemPlan, setProblemPlan] = useState("");

  const expectedVersion = Number(doc?.expectedVersion ?? 0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProviderWorkspace(encounterId);
      setDoc((res.documentation ?? null) as ProviderDoc);
      setOps((res.clinicalOps ?? null) as ClinicalOpsLite);
    } catch {
      setError(t("inpatientD3e.workspace.loadError"));
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [encounterId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const text = doc?.hpDraft?.sections?.[hpSection]?.text ?? "";
    setHpText(typeof text === "string" ? text : "");
  }, [doc, hpSection]);

  const events = doc?.events ?? [];
  const tasks = (doc?.tasks ?? []).filter((x) => x.status === "OPEN" || x.status === "IN_PROGRESS");
  const problems = doc?.problemPlans ?? [];
  const hpSigned = doc?.hpDraft?.status === "SIGNED";

  const alerts = useMemo(() => {
    const list: string[] = [];
    if (!ops?.codeStatus?.status) list.push(t("inpatientProviderD4a26.alerts.codeStatusMissing"));
    if (!ops?.medicationReconciliation || (ops.medicationReconciliation as unknown[]).length === 0) {
      list.push(t("inpatientProviderD4a26.alerts.medReconIncomplete"));
    }
    if (!hpSigned) list.push(t("inpatientProviderD4a26.alerts.hpOverdue"));
    if (events.some((e) => e.severity === "CRITICAL" && e.status === "NEW")) {
      list.push(t("inpatientProviderD4a26.alerts.criticalUnacked"));
    }
    return list;
  }, [ops, hpSigned, events, t]);

  const ackEvent = async (eventId: string, status: ProviderEventAckStatus) => {
    if (!canProviderWrite) return;
    setSaveState("saving");
    try {
      const res = await acknowledgeProviderWorkspaceEvent(encounterId, {
        eventId,
        status,
        expectedVersion,
      });
      setDoc(res.documentation as ProviderDoc);
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    }
  };

  const saveHp = async () => {
    if (!canProviderWrite || hpSigned) return;
    setSaveState("saving");
    try {
      const res = await saveProviderHpDraft(encounterId, {
        sectionKey: hpSection,
        text: hpText,
        expectedVersion,
      });
      setDoc(res.documentation as ProviderDoc);
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    }
  };

  const signHp = async () => {
    if (!canProviderWrite || hpSigned) return;
    setSaveState("saving");
    try {
      const res = await signProviderHp(encounterId, { expectedVersion });
      setDoc(res.documentation as ProviderDoc);
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    }
  };

  const saveProblem = async () => {
    if (!canProviderWrite || !problemLabel.trim()) return;
    setSaveState("saving");
    try {
      const res = await upsertProviderProblemPlan(encounterId, {
        expectedVersion,
        item: {
          problemId: `prob-${Date.now()}`,
          displayLabel: problemLabel.trim(),
          status: problemStatus,
          priority: "PRIMARY",
          assessment: problemAssessment.trim() || null,
          plan: problemPlan.trim() || null,
        },
      });
      setDoc(res.documentation as ProviderDoc);
      setProblemLabel("");
      setProblemAssessment("");
      setProblemPlan("");
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    }
  };

  const stepKey = PROVIDER_ROUNDING_MODE_STEPS[
    Math.min(roundingStep, PROVIDER_ROUNDING_MODE_STEPS.length - 1)
  ] as ProviderRoundingModeStep;

  const roundingNav = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        marginBottom: 10,
      }}
      data-testid="provider-rounding-nav"
    >
      <strong style={{ fontSize: 13 }}>{t("inpatientProviderD4a26.rounding.title")}</strong>
      <span style={{ fontSize: 12, color: "#64748b" }}>
        {t("inpatientProviderD4a26.rounding.stepOf")
          .replace("{current}", String(roundingStep + 1))
          .replace("{total}", String(PROVIDER_ROUNDING_MODE_STEPS.length))}
        {" — "}
        {t(`inpatientProviderD4a26.rounding.steps.${stepKey}`)}
      </span>
      <button type="button" disabled={roundingStep <= 0} onClick={() => setRoundingStep((s) => s - 1)}>
        {t("inpatientProviderD4a26.rounding.previous")}
      </button>
      <button type="button" onClick={() => void saveHp()}>
        {t("inpatientProviderD4a26.rounding.saveDraft")}
      </button>
      <button
        type="button"
        disabled={roundingStep >= PROVIDER_ROUNDING_MODE_STEPS.length - 1}
        onClick={() => setRoundingStep((s) => s + 1)}
      >
        {t("inpatientProviderD4a26.rounding.next")}
      </button>
      <span style={{ fontSize: 12, color: "#64748b" }} aria-live="polite">
        {saveState === "saving"
          ? t("inpatientProviderD4a26.rounding.saving")
          : saveState === "saved"
            ? t("inpatientProviderD4a26.rounding.saved")
            : saveState === "failed"
              ? t("inpatientProviderD4a26.rounding.failed")
              : t("inpatientProviderD4a26.rounding.unsaved")}
      </span>
    </div>
  );

  if (loading) {
    return <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>;
  }
  if (error) {
    return (
      <p role="alert" style={{ fontSize: 13, color: "#b91c1c" }}>
        {error}
      </p>
    );
  }

  if (mode === "timeline") {
    return (
      <div data-testid="inpatient-panel-timeline-live">
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
          {t("inpatientProviderD4a26.timeline.reuse")}
        </p>
        <EnterpriseEncounterCommandTimeline
          encounterId={encounterId}
          facilityId={facilityId}
          embedded
          defaultViewMode="COMPACT"
        />
      </div>
    );
  }

  if (mode === "summary") {
    return (
      <div data-testid="inpatient-panel-summary-live">
        <SectionCard title={t("inpatientProviderD4a26.summary.title")}>
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
            {t("inpatientProviderD4a26.summary.notAiSigned")}
          </p>
          <dl style={{ margin: "10px 0 0", fontSize: 13, color: "#334155" }}>
            <dt style={{ fontWeight: 600 }}>{t("inpatientProviderD4a26.summary.activeProblems")}</dt>
            <dd style={{ margin: "0 0 8px" }}>
              {problems.length
                ? problems.map((p) => `${p.displayLabel} (${p.status})`).join("; ")
                : t("common.dash")}
            </dd>
            <dt style={{ fontWeight: 600 }}>{t("inpatientProviderD4a26.summary.pending")}</dt>
            <dd style={{ margin: "0 0 8px" }}>
              {tasks.length ? tasks.map((x) => x.title).join("; ") : t("common.dash")}
            </dd>
            <dt style={{ fontWeight: 600 }}>{t("inpatientProviderD4a26.summary.discharge")}</dt>
            <dd style={{ margin: 0 }}>
              {ops?.dischargePlanning?.expectedDischargeDate ||
                ops?.dischargePlanning?.workflowState ||
                t("common.dash")}
            </dd>
          </dl>
        </SectionCard>
      </div>
    );
  }

  if (mode === "problemsPlan") {
    return (
      <div data-testid="inpatient-panel-problems-plan">
        <SectionCard
          title={t("inpatientProviderD4a26.problems.title")}
          help={t("inpatientProviderD4a26.problems.noBlindCarry")}
        >
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
            {t("inpatientProviderD4a26.problems.ruledOutKeepsHistory")}
          </p>
          {patientId ? (
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 13 }}>
                {t("inpatientProviderD4a26.problems.enterpriseDx")}
              </h3>
              <EncounterDiagnosticsPanel
                encounterId={encounterId}
                patientId={patientId}
                facilityId={facilityId}
                canDocumentDiagnoses={canDocumentDiagnoses}
                isLocked={isLocked}
              />
            </div>
          ) : null}
          <h3 style={{ margin: "0 0 6px", fontSize: 13 }}>
            {t("inpatientProviderD4a26.problems.planOverlay")}
          </h3>
          <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 13 }}>
            {problems.map((p) => (
              <li key={p.problemId}>
                <strong>{p.displayLabel}</strong> — {p.status} / {p.priority}
                {p.assessment ? ` · ${p.assessment}` : ""}
                {p.plan ? ` · ${p.plan}` : ""}
              </li>
            ))}
          </ul>
          {canProviderWrite ? (
            <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
              <label style={{ fontSize: 12 }}>
                {t("inpatientProviderD4a26.problems.label")}
                <input
                  value={problemLabel}
                  onChange={(e) => setProblemLabel(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                />
              </label>
              <label style={{ fontSize: 12 }}>
                {t("inpatientProviderD4a26.problems.status")}
                <select
                  value={problemStatus}
                  onChange={(e) =>
                    setProblemStatus(e.target.value as (typeof PROVIDER_PROBLEM_PLAN_STATUSES)[number])
                  }
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                >
                  {PROVIDER_PROBLEM_PLAN_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 12 }}>
                {t("inpatientProviderD4a26.problems.assessment")}
                <textarea
                  value={problemAssessment}
                  onChange={(e) => setProblemAssessment(e.target.value)}
                  rows={2}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                />
              </label>
              <label style={{ fontSize: 12 }}>
                {t("inpatientProviderD4a26.problems.plan")}
                <textarea
                  value={problemPlan}
                  onChange={(e) => setProblemPlan(e.target.value)}
                  rows={2}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                />
              </label>
              <button type="button" onClick={() => void saveProblem()}>
                {t("inpatientProviderD4a26.problems.save")}
              </button>
            </div>
          ) : null}
        </SectionCard>
      </div>
    );
  }

  if (mode === "historyPhysical") {
    return (
      <div data-testid="inpatient-panel-hp-provider">
        <SectionCard
          title={t("inpatientProviderD4a26.hp.title")}
          help={t("inpatientProviderD4a26.hp.help")}
        >
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
            {t("inpatientProviderD4a26.hp.notNursing")} · {t("inpatientProviderD4a26.hp.noAutoRos")}{" "}
            · {t("inpatientProviderD4a26.hp.noAutoExam")}
          </p>
          {hpSigned ? (
            <p role="status" style={{ fontSize: 13, color: "#0f766e", fontWeight: 600 }}>
              {t("inpatientProviderD4a26.hp.signed")}
            </p>
          ) : null}
          <label style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
            {t("inpatientProviderD4a26.hp.section")}
            <select
              value={hpSection}
              onChange={(e) => setHpSection(e.target.value as ProviderHpSectionKey)}
              style={{ display: "block", width: "100%", maxWidth: 360, marginTop: 4 }}
            >
              {PROVIDER_HP_SECTION_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, display: "block" }}>
            {t("inpatientProviderD4a26.hp.draftText")}
            <textarea
              value={hpText}
              onChange={(e) => setHpText(e.target.value)}
              disabled={hpSigned || !canProviderWrite}
              rows={8}
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>
          {canProviderWrite && !hpSigned ? (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="button" onClick={() => void saveHp()}>
                {t("inpatientProviderD4a26.hp.saveSection")}
              </button>
              <button type="button" onClick={() => void signHp()}>
                {t("inpatientProviderD4a26.hp.sign")}
              </button>
              <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }} aria-live="polite">
                {saveState === "saving"
                  ? t("inpatientProviderD4a26.rounding.saving")
                  : saveState === "saved"
                    ? t("inpatientProviderD4a26.rounding.saved")
                    : saveState === "failed"
                      ? t("inpatientProviderD4a26.rounding.failed")
                      : null}
              </span>
            </div>
          ) : null}
        </SectionCard>
      </div>
    );
  }

  // overview (+ optional rounding mode)
  return (
    <div data-testid="inpatient-panel-overview-provider">
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
        {t("inpatientProviderD4a26.boundary.providerNotNursing")}{" "}
        {t("inpatientProviderD4a26.boundary.sharedEncounter")}
      </p>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
        {t("inpatientProviderD4a26.overview.reuseHint")}
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => setRounding((v) => !v)}
          data-testid="provider-rounding-toggle"
        >
          {rounding
            ? t("inpatientProviderD4a26.overview.exitRounding")
            : t("inpatientProviderD4a26.overview.enterRounding")}
        </button>
      </div>

      {rounding ? (
        <>
          {roundingNav}
          <p style={{ fontSize: 12, color: "#64748b" }}>
            {t("inpatientProviderD4a26.rounding.noAutoNote")} —{" "}
            {t(`inpatientProviderD4a26.rounding.steps.${stepKey}`)}
          </p>
          {roundingNav}
        </>
      ) : null}

      {alerts.length ? (
        <SectionCard title={t("inpatientProviderD4a26.alerts.title")} testId="provider-alerts">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#9a3412" }}>
            {alerts.map((a) => (
              <li key={a}>
                <span aria-hidden="true">⚠ </span>
                {a}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <SectionCard title={t("inpatientProviderD4a26.overview.statusSummary")}>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155" }}>
          <li>
            {t("inpatientProviderD4a26.header.codeStatus")}:{" "}
            {ops?.codeStatus?.status || t("common.dash")}
          </li>
          <li>
            {t("inpatientProviderD4a26.header.expectedDischarge")}:{" "}
            {ops?.dischargePlanning?.expectedDischargeDate || t("common.dash")}
          </li>
          <li>
            {t("inpatientProviderD4a26.header.dischargeDestination")}:{" "}
            {ops?.dischargePlanning?.destination || t("common.dash")}
          </li>
        </ul>
      </SectionCard>

      <SectionCard
        title={t("inpatientProviderD4a26.overview.newEvents")}
        help={t("inpatientProviderD4a26.help.ack")}
        testId="provider-event-inbox"
      >
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
          {t("inpatientProviderD4a26.overview.noAutoAck")}
        </p>
        {events.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientProviderD4a26.overview.emptyEvents")}</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
            {events.map((e) => (
              <li
                key={e.eventId}
                style={{
                  borderTop: "1px solid #e2e8f0",
                  padding: "8px 0",
                  fontSize: 13,
                }}
              >
                <div>
                  <strong>{e.type}</strong> · {e.severity} · {e.status}
                </div>
                <div style={{ color: "#475569" }}>{e.summary}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  {e.source} · {e.occurredAt}
                </div>
                {canProviderWrite && e.status === "NEW" ? (
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => void ackEvent(e.eventId, "REVIEWED")}>
                      {t("inpatientProviderD4a26.events.reviewed")}
                    </button>
                    <button type="button" onClick={() => void ackEvent(e.eventId, "ACKNOWLEDGED")}>
                      {t("inpatientProviderD4a26.events.acknowledge")}
                    </button>
                    <button type="button" onClick={() => void ackEvent(e.eventId, "ACTION_TAKEN")}>
                      {t("inpatientProviderD4a26.events.actionTaken")}
                    </button>
                    <button type="button" onClick={() => void ackEvent(e.eventId, "RESOLVED")}>
                      {t("inpatientProviderD4a26.events.resolved")}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={t("inpatientProviderD4a26.overview.vitals")}>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          {t("inpatientProviderD4a26.empty.vitals")}
        </p>
      </SectionCard>

      <SectionCard title={t("inpatientProviderD4a26.overview.resultsSnapshot")}>
        <p style={{ margin: 0, fontSize: 13 }}>
          <button type="button" onClick={() => onNavigateSection?.("results")}>
            {t("inpatientProviderD4a26.empty.results")}
          </button>
        </p>
      </SectionCard>

      <SectionCard title={t("inpatientProviderD4a26.overview.medsSnapshot")}>
        <p style={{ margin: 0, fontSize: 13 }}>
          <button type="button" onClick={() => onNavigateSection?.("medications")}>
            {t("inpatientProviderD4a26.empty.meds")}
          </button>
        </p>
      </SectionCard>

      <SectionCard title={t("inpatientProviderD4a26.overview.activeProblems")}>
        {problems.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13 }}>
            <button type="button" onClick={() => onNavigateSection?.("problemsPlan")}>
              {t("inpatientProviderD4a26.nav.problemsPlan")}
            </button>
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {problems.slice(0, 5).map((p) => (
              <li key={p.problemId}>
                {p.displayLabel} — {p.status}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={t("inpatientProviderD4a26.overview.tasks")} testId="provider-tasks">
        {tasks.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientProviderD4a26.overview.emptyTasks")}</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {tasks.map((task) => (
              <li key={task.taskId}>
                <button
                  type="button"
                  style={{ background: "none", border: 0, padding: 0, color: "#0f766e", cursor: "pointer" }}
                  onClick={() => {
                    const linked = task.linkedSection as InpatientWorkspaceSection | undefined;
                    if (linked) onNavigateSection?.(linked);
                  }}
                >
                  {task.title}
                </button>{" "}
                · {task.priority} · {task.status}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title={t("inpatientProviderD4a26.overview.dischargeReadiness")}
        help={t("inpatientProviderD4a26.help.dischargeReady")}
      >
        <p style={{ margin: 0, fontSize: 13 }}>
          {ops?.dischargePlanning?.workflowState || t("common.dash")}
          {" · "}
          <button type="button" onClick={() => onNavigateSection?.("dischargePlanning")}>
            {t("inpatientProviderD4a26.nav.discharge")}
          </button>
        </p>
      </SectionCard>
    </div>
  );
}
