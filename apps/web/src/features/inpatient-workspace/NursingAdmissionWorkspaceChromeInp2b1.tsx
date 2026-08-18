"use client";

/**
 * MEDUI.INP.2B.1 — Presentation chrome for Nursing Admission.
 * Does not own persistence. Stage/section ids remain NURSING_ADMISSION_STAGES.
 */

import { type CSSProperties, type ReactNode } from "react";
import {
  NURSING_ADMISSION_STAGES,
  type AdmissionSectionCompletionState,
  type InpatientAdmissionClinicalSection,
  type NursingAdmissionOverviewProjectionV1,
  type NursingAdmissionRailSummaryV1,
  type NursingAdmissionStageId,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { ClinicalSaveStatus } from "./rapid-documentation/ClinicalRapidControls";
import { AdditionalClinicalDocumentationLauncher } from "./rapid-documentation/AdditionalClinicalDocumentationLauncher";
import {
  formatInpatientCodeStatusDisplay,
  formatInpatientIsolationDisplay,
} from "./inpatientClinicalDisplayLabels";

const TEAL = "#0f766e";
const TEAL_SOFT = "#ccfbf1";

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function stageCompletion(
  sectionKeys: readonly string[],
  sectionState: (id: string) => AdmissionSectionCompletionState
): "COMPLETE" | "IN_PROGRESS" | "NOT_STARTED" | "UNABLE_TO_COMPLETE" {
  const states = sectionKeys.map((id) => sectionState(id));
  if (states.every((s) => s === "NOT_STARTED")) return "NOT_STARTED";
  if (states.every((s) => s === "COMPLETE" || s === "NOT_APPLICABLE" || s === "UNABLE_TO_COMPLETE")) {
    return "COMPLETE";
  }
  if (states.some((s) => s === "UNABLE_TO_COMPLETE") && !states.some((s) => s === "IN_PROGRESS" || s === "NOT_STARTED")) {
    return "UNABLE_TO_COMPLETE";
  }
  return "IN_PROGRESS";
}

function stageResolvedCount(
  sectionKeys: readonly string[],
  sectionState: (id: string) => AdmissionSectionCompletionState
): number {
  return sectionKeys.filter((id) => {
    const st = sectionState(id);
    return st === "COMPLETE" || st === "NOT_APPLICABLE" || st === "UNABLE_TO_COMPLETE";
  }).length;
}

export function NursingAdmissionStageTracker({
  stageId,
  sectionState,
  lastSavedAt,
  saveCode,
  language,
  onStage,
}: {
  stageId: NursingAdmissionStageId;
  sectionState: (id: string) => AdmissionSectionCompletionState;
  lastSavedAt: string | null;
  saveCode: string;
  language: string;
  onStage: (id: NursingAdmissionStageId) => void;
}) {
  const { t } = useI18n();
  return (
    <header
      data-testid="nursing-admission-workspace-header"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
        {t("inpatientAdmissionInp2b1.title")}
      </h2>
      <nav
        aria-label={t("inpatientAdmissionInp2b1.title")}
        data-testid="nursing-admission-stage-rail"
        style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1, justifyContent: "center" }}
      >
        {NURSING_ADMISSION_STAGES.map((s, idx) => {
          const active = s.id === stageId;
          const st = stageCompletion(s.sectionKeys, sectionState);
          const resolved = stageResolvedCount(s.sectionKeys, sectionState);
          return (
            <button
              key={s.id}
              type="button"
              data-testid={`admission-stage-${s.id}`}
              aria-current={active ? "step" : undefined}
              onClick={() => onStage(s.id)}
              style={{
                minHeight: 36,
                padding: "6px 10px",
                borderRadius: 9999,
                border: `1px solid ${active ? TEAL : st === "COMPLETE" ? "#86efac" : "#e2e8f0"}`,
                background: active ? TEAL_SOFT : st === "COMPLETE" ? "#f0fdf4" : "#fff",
                color: active ? "#115e59" : "#334155",
                fontWeight: active ? 700 : 500,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {idx + 1} {t(`inpatientAdmissionInp2b1.tracker.${s.id}`)}{" "}
              {resolved}/{s.sectionKeys.length}
              {st === "COMPLETE" ? " ✓" : ""}
            </button>
          );
        })}
      </nav>
      <div style={{ fontSize: 12, color: "#64748b" }} data-testid="nursing-admission-header-save">
        <ClinicalSaveStatus code={saveCode} savedAt={lastSavedAt} language={language} />
      </div>
    </header>
  );
}

export function NursingAdmissionLeftNavigator({
  stageId,
  active,
  stageIndex,
  complete,
  total,
  sectionState,
  onSection,
}: {
  stageId: NursingAdmissionStageId;
  active: InpatientAdmissionClinicalSection;
  stageIndex: number;
  complete: number;
  total: number;
  sectionState: (id: string) => AdmissionSectionCompletionState;
  onSection: (id: InpatientAdmissionClinicalSection) => void;
}) {
  const { t } = useI18n();
  const stage = NURSING_ADMISSION_STAGES.find((s) => s.id === stageId);
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0;
  return (
    <nav
      data-testid="inpatient-admission-checklist"
      aria-label={t("inpatientAdmissionInp2b1.steps")}
      style={{
        ...MEDORA_CARD_SHELL,
        padding: 10,
        position: "sticky",
        top: 8,
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
      }}
    >
      <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.4 }}>
        {t("inpatientAdmissionInp2b1.steps")}
      </p>
      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>
        {t(`inpatientRapidConvergenceD4a27c.stages.${stageId}`)}
      </p>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }} data-testid="nursing-admission-stages-hint">
        {t("inpatientAdmissionInp2b1.stageOf").replace("{current}", String(stageIndex + 1))}
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {(stage?.sectionKeys ?? []).map((section, idx) => {
          const id = section as InpatientAdmissionClinicalSection;
          const isActive = active === id;
          const st = sectionState(id);
          return (
            <li key={id} style={{ marginBottom: 6 }}>
              <button
                type="button"
                onClick={() => onSection(id)}
                data-testid={`admission-section-${id}`}
                aria-current={isActive ? "page" : undefined}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  textAlign: "left",
                  minHeight: 48,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: `1px solid ${isActive ? TEAL : "#e2e8f0"}`,
                  background: isActive ? TEAL_SOFT : "#fff",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 600 }}>
                  {st === "COMPLETE" || st === "NOT_APPLICABLE" || st === "UNABLE_TO_COMPLETE" ? "✓ " : st === "IN_PROGRESS" ? "• " : ""}
                  {idx + 1}. {t(`hospitalAdmissionD4a0.clinical.sections.${id}`)}
                </span>
                <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
                  {t(`inpatientAdmissionInp2b1.status.${st}`)} ›
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div style={{ marginTop: 10 }}>
        <AdditionalClinicalDocumentationLauncher
          role="NURSING"
          encounterType="INPATIENT"
          compact
          launchLabel={t("inpatientAdmissionInp2b1.clinicalDocumentation")}
        />
      </div>
      <p
        style={{ margin: "12px 0 6px", fontSize: 12, color: "#475569" }}
        data-testid="nursing-admission-progress-label"
      >
        {t("inpatientAdmissionInp2b1.overallProgress")
          .replace("{complete}", String(complete))
          .replace("{total}", String(total))}
      </p>
      <div
        role="progressbar"
        aria-valuenow={complete}
        aria-valuemin={0}
        aria-valuemax={total}
        data-testid="nursing-admission-progress-bar"
        style={{ height: 8, borderRadius: 9999, background: "#e2e8f0", overflow: "hidden" }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: TEAL }} />
      </div>
    </nav>
  );
}

export function NursingAdmissionSaveRail({
  codeStatus,
  isolation,
  allergiesSummary,
  projection,
  railSummary,
  activeSection,
  clinicalDocumentedAt,
  onClinicalTimeChange,
  saveCode,
  lastSavedAt,
  language,
  writeBlocked,
  busy,
  isFirst,
  isLast,
  onPrevious,
  onSaveDraft,
  onSaveContinue,
  onNext,
}: {
  codeStatus?: { value: string | null; documented: boolean } | null;
  isolation?: { value: string | null; documented: boolean } | null;
  allergiesSummary?: string | null;
  projection?: NursingAdmissionOverviewProjectionV1 | null;
  railSummary?: NursingAdmissionRailSummaryV1 | null;
  activeSection?: InpatientAdmissionClinicalSection;
  clinicalDocumentedAt: string | null;
  onClinicalTimeChange: (iso: string | null) => void;
  saveCode: string;
  lastSavedAt: string | null;
  language: string;
  writeBlocked: boolean;
  busy: boolean;
  isFirst: boolean;
  isLast: boolean;
  onPrevious: () => void;
  onSaveDraft: () => void;
  onSaveContinue: () => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const empty = t("inpatientAdmissionInp2b.rail.notDocumented");
  const codeLabel = codeStatus?.documented
    ? formatInpatientCodeStatusDisplay(codeStatus.value, t, empty)
    : empty;
  const isolationLabel = isolation?.documented
    ? formatInpatientIsolationDisplay(isolation.value, t, empty)
    : empty;
  const card: CSSProperties = { ...MEDORA_CARD_SHELL, padding: "10px 12px", marginBottom: 10 };
  const clinicalTimeLabel = clinicalDocumentedAt
    ? new Date(clinicalDocumentedAt).toLocaleString(language?.startsWith("fr") ? "fr-FR" : "en-US")
    : empty;
  return (
    <aside
      data-testid="nursing-admission-context-rail"
      data-persistence="none"
      aria-label={t("inpatientAdmissionInp2b.rail.title")}
      className="nursing-admission-right-rail-2b1"
      style={{
        position: "sticky",
        top: 8,
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
      }}
    >
      <div style={card}>
        <h2 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>
          {t("inpatientAdmissionInp2b.rail.title")}
        </h2>
        <p style={{ margin: "0 0 10px", fontSize: 11, color: "#64748b" }}>
          {t("inpatientAdmissionInp2b.rail.projectionOnly")}
        </p>
        <RailRow label={t("inpatientAdmissionInp2b.rail.codeStatus")} value={codeLabel} />
        <p style={{ margin: "0 0 8px", fontSize: 11, color: "#64748b" }}>
          {t("inpatientAdmissionInp2b.domain.openCodeStatus")}
        </p>
        <RailRow label={t("inpatientAdmissionInp2b.rail.isolation")} value={isolationLabel} />
        <p style={{ margin: "0 0 8px", fontSize: 11, color: "#64748b" }}>
          {t("inpatientAdmissionInp2b.domain.openIsolation")}
        </p>
        <RailRow
          label={t("inpatientAdmissionInp2b.rail.allergies")}
          value={allergiesSummary?.trim() || empty}
        />
      </div>

      {projection?.availability === "READY" || railSummary ? (
        <div style={card} data-testid="nursing-admission-rail-summary">
          <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>
            {t("inpatientAdmissionInp2b1.summaryTitle")}
          </h3>
          <p style={{ margin: "0 0 6px", fontSize: 12 }}>
            {t("inpatientAdmissionInp2b1.completeCount")
              .replace("{complete}", String(railSummary?.completeCount ?? projection?.completeCount ?? 0))
              .replace("{total}", String(railSummary?.totalSections ?? projection?.totalSections ?? 20))}
          </p>
          {railSummary?.currentStageId ? (
            <RailRow
              label={t("inpatientAdmissionInp2b2.rail.currentStage")}
              value={t(`inpatientAdmissionInp2b1.tracker.${railSummary.currentStageId}`)}
            />
          ) : null}
          {activeSection ? (
            <RailRow
              label={t("inpatientAdmissionInp2b2.rail.currentSection")}
              value={t(`hospitalAdmissionD4a0.clinical.sections.${activeSection}`)}
            />
          ) : null}
          {(railSummary?.unresolvedSectionCount ?? 0) > 0 ? (
            <RailRow
              label={t("inpatientAdmissionInp2b2.rail.unresolved")}
              value={String(railSummary!.unresolvedSectionCount)}
            />
          ) : null}
          <RailRow
            label={t("inpatientAdmissionInp2b2.rail.assessmentStatus")}
            value={
              railSummary?.admissionAssessmentComplete
                ? t("inpatientAdmissionInp2b1.status.COMPLETE")
                : t("inpatientAdmissionInp2b1.status.IN_PROGRESS")
            }
          />
          <RailRow label={t("inpatientAdmissionInp2b1.clinicalTime")} value={clinicalTimeLabel} />
          <RailRow
            label={t("inpatientAdmissionInp2b2.rail.signed")}
            value={
              railSummary?.signed ? t("inpatientAdmissionInp2b2.rail.signed") : t("inpatientAdmissionInp2b2.rail.unsigned")
            }
          />
        </div>
      ) : null}

      <div style={card} data-testid="nursing-admission-save-rail">
        <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>
          {t("inpatientAdmissionInp2b1.savePanel")}
        </h3>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
          {t("inpatientAdmissionInp2b1.clinicalTime")}
          <input
            type="datetime-local"
            data-testid="nursing-admission-clinical-documented-at"
            disabled={writeBlocked}
            value={isoToDatetimeLocal(clinicalDocumentedAt)}
            onChange={(e) => onClinicalTimeChange(datetimeLocalToIso(e.target.value))}
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
            }}
          />
        </label>
        <div
          style={{
            marginBottom: 10,
            padding: 8,
            borderRadius: 10,
            background: saveCode === "NOT_SAVED" ? "#fff7ed" : "#ecfdf5",
            fontSize: 12,
          }}
        >
          <ClinicalSaveStatus code={saveCode} savedAt={lastSavedAt} language={language} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button type="button" style={btn} onClick={onPrevious} disabled={busy || isFirst}>
            {t("inpatientAdmissionInp2b1.previous")}
          </button>
          <button
            type="button"
            style={btn}
            disabled={busy || writeBlocked}
            onClick={onSaveDraft}
            data-testid="admission-save"
          >
            {t("inpatientAdmissionInp2b1.saveDraft")}
          </button>
          <button
            type="button"
            style={{
              ...btn,
              gridColumn: "1 / -1",
              background: TEAL,
              color: "#fff",
              borderColor: TEAL,
              fontWeight: 700,
            }}
            disabled={busy || writeBlocked}
            onClick={onSaveContinue}
            data-testid="admission-save-continue"
          >
            {t("inpatientAdmissionInp2b1.saveAndContinue")}
          </button>
          <button type="button" style={{ ...btn, gridColumn: "1 / -1" }} onClick={onNext} disabled={busy || isLast}>
            {t("inpatientAdmissionInp2b1.next")}
          </button>
        </div>
      </div>
    </aside>
  );
}

function RailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 6, fontSize: 12 }}>
      <strong>{label}</strong>
      <div>{value}</div>
    </div>
  );
}

const btn: CSSProperties = {
  minHeight: 40,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};

export function NursingAdmissionWorkspaceStyles() {
  return (
    <style>{`
      .nursing-admission-workspace-2b1 {
        display: grid;
        grid-template-columns: minmax(240px, 280px) minmax(0, 1fr) minmax(320px, 380px);
        gap: 16px;
        align-items: start;
        max-width: 1440px;
        margin: 0 auto;
        padding: 0 4px;
      }
      @media (max-width: 1100px) {
        .nursing-admission-workspace-2b1 {
          grid-template-columns: minmax(0, 1fr);
          max-width: none;
        }
        .nursing-admission-right-rail-2b1 {
          position: static !important;
          max-height: none !important;
        }
      }
    `}</style>
  );
}

export function NursingAdmissionEncounterActionsSlot({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <details data-testid="nursing-admission-encounter-actions" style={{ marginBottom: 10 }}>
      <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
        {t("inpatientAdmissionInp2b1.encounterActions")}
      </summary>
      <div style={{ marginTop: 8 }}>{children}</div>
    </details>
  );
}
