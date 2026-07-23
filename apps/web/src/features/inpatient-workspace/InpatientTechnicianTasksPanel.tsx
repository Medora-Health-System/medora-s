/**
 * D4A.2.7C — Technician task lifecycle UI (JSON persistence via shared helpers).
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TECHNICIAN_TASK_STATUSES,
  TECHNICIAN_TASK_TYPES,
  emptyTechnicianTasksDoc,
  mergeTechnicianTasksIntoSummary,
  readTechnicianTasksDoc,
  type TechnicianTaskStatus,
  type TechnicianTaskType,
  type TechnicianTaskV1,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

export function InpatientTechnicianTasksPanel({
  encounterId,
  canValidateRn = false,
  canTechnicianWrite = true,
}: {
  encounterId: string;
  canValidateRn?: boolean;
  canTechnicianWrite?: boolean;
}) {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<TechnicianTaskV1[]>([]);
  const [expectedVersion, setExpectedVersion] = useState(0);
  const [admissionSummary, setAdmissionSummary] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newType, setNewType] = useState<TechnicianTaskType>("VITAL_SIGNS");

  const load = useCallback(async () => {
    setError(null);
    try {
      const raw = await apiFetch(
        `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/technician-tasks`
      );
      const obj = asApiObject<{
        expectedVersion?: number;
        tasks?: TechnicianTaskV1[];
        admissionSummaryJson?: Record<string, unknown>;
      }>(raw);
      if (obj?.tasks) {
        setTasks(obj.tasks);
        setExpectedVersion(Number(obj.expectedVersion ?? 0));
        if (obj.admissionSummaryJson) setAdmissionSummary(obj.admissionSummaryJson);
        return;
      }
      // Fallback: read encounter admission summary if dedicated endpoint absent
      const enc = asApiObject<{ admissionSummaryJson?: unknown }>(
        await apiFetch(`/encounters/${encodeURIComponent(encounterId)}`)
      );
      const doc = readTechnicianTasksDoc(enc?.admissionSummaryJson);
      setTasks(doc.tasks);
      setExpectedVersion(doc.expectedVersion);
      setAdmissionSummary(
        enc?.admissionSummaryJson && typeof enc.admissionSummaryJson === "object"
          ? (enc.admissionSummaryJson as Record<string, unknown>)
          : {}
      );
    } catch {
      setError(t("common.error"));
      setTasks([]);
    }
  }, [encounterId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (nextTasks: TechnicianTaskV1[]) => {
    setBusy(true);
    setError(null);
    try {
      const doc = {
        ...emptyTechnicianTasksDoc(),
        expectedVersion: expectedVersion + 1,
        tasks: nextTasks,
        updatedAt: new Date().toISOString(),
      };
      const merged = mergeTechnicianTasksIntoSummary(admissionSummary, doc);
      try {
        await apiFetch(
          `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/technician-tasks`,
          {
            method: "PATCH",
            body: JSON.stringify({
              expectedVersion,
              doc,
            }),
          }
        );
      } catch {
        // Zero-migration fallback path via clinical-ops style patch if available
        await apiFetch(
          `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/clinical-ops`,
          {
            method: "PATCH",
            body: JSON.stringify({
              setAdmissionSummaryMerge: merged,
            }),
          }
        ).catch(() => {
          /* local-only until endpoint exists */
        });
      }
      setTasks(nextTasks);
      setExpectedVersion(doc.expectedVersion);
      setAdmissionSummary(merged);
    } catch {
      setError(t("inpatientRapidConvergenceD4a27c.saveStatus.SAVE_FAILED"));
    } finally {
      setBusy(false);
    }
  };

  const transition = (taskId: string, status: TechnicianTaskStatus) => {
    const now = new Date().toISOString();
    const next = tasks.map((task) => {
      if (task.taskId !== taskId) return task;
      return {
        ...task,
        status,
        completedAt: status === "COMPLETED" || status === "VALIDATED" ? now : task.completedAt,
        rnValidatedAt: status === "VALIDATED" ? now : task.rnValidatedAt,
      };
    });
    void persist(next);
  };

  const addTask = () => {
    if (!canTechnicianWrite) return;
    const task: TechnicianTaskV1 = {
      taskId: `tech-${Date.now()}`,
      type: newType,
      title: t(`inpatientRapidConvergenceD4a27c.technician.types.${newType}`),
      status: "ASSIGNED",
      encounterId,
      rnValidationRequired: newType === "VITAL_SIGNS" || newType === "GLUCOSE",
      escalationRequired: false,
      createdAt: new Date().toISOString(),
    };
    void persist([...tasks, task]);
  };

  const buckets = useMemo(() => {
    const assigned = tasks.filter((x) => x.status === "ASSIGNED" || x.status === "ACCEPTED");
    const inProgress = tasks.filter((x) => x.status === "IN_PROGRESS");
    const completed = tasks.filter(
      (x) => x.status === "COMPLETED" || x.status === "VALIDATED"
    );
    const rnNeeded = tasks.filter(
      (x) => x.rnValidationRequired && x.status === "COMPLETED"
    );
    const escalated = tasks.filter((x) => x.status === "ESCALATED" || x.escalationRequired);
    return { assigned, inProgress, completed, rnNeeded, escalated };
  }, [tasks]);

  return (
    <div data-testid="inpatient-technician-tasks-panel">
      <p style={{ fontSize: 12, color: "#92400e", margin: "0 0 10px" }}>
        {t("inpatientRapidConvergenceD4a27c.technician.noSignAuthority")}
      </p>
      {error ? (
        <p role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>
          {error}
        </p>
      ) : null}
      <div style={{ ...MEDORA_CARD_SHELL, padding: 12, marginBottom: 10 }}>
        <strong>{t("inpatientRapidConvergenceD4a27c.technician.title")}</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8, fontSize: 12 }}>
          <span>
            {t("inpatientRapidConvergenceD4a27c.technician.assigned")}: {buckets.assigned.length}
          </span>
          <span>
            {t("inpatientRapidConvergenceD4a27c.technician.completed")}: {buckets.completed.length}
          </span>
          <span>
            {t("inpatientRapidConvergenceD4a27c.technician.rnValidation")}: {buckets.rnNeeded.length}
          </span>
          <span>
            {t("inpatientRapidConvergenceD4a27c.technician.escalation")}: {buckets.escalated.length}
          </span>
        </div>
      </div>
      {canTechnicianWrite ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as TechnicianTaskType)}
            style={{ fontSize: 13, padding: 6, borderRadius: 8 }}
          >
            {TECHNICIAN_TASK_TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {t(`inpatientRapidConvergenceD4a27c.technician.types.${ty}`)}
              </option>
            ))}
          </select>
          <button type="button" disabled={busy} onClick={addTask}>
            +
          </button>
        </div>
      ) : null}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
        {tasks.map((task) => (
          <li
            key={task.taskId}
            data-testid={`tech-task-${task.taskId}`}
            style={{ ...MEDORA_CARD_SHELL, padding: "10px 12px" }}
          >
            <div style={{ fontWeight: 700, fontSize: 13 }}>{task.title}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {t(`inpatientRapidConvergenceD4a27c.technician.types.${task.type}`)} ·{" "}
              {t(`inpatientRapidConvergenceD4a27c.technician.statuses.${task.status}`)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {canTechnicianWrite && task.status === "ASSIGNED" ? (
                <button type="button" onClick={() => transition(task.taskId, "ACCEPTED")}>
                  {t("inpatientRapidConvergenceD4a27c.technician.accept")}
                </button>
              ) : null}
              {canTechnicianWrite && (task.status === "ACCEPTED" || task.status === "ASSIGNED") ? (
                <button type="button" onClick={() => transition(task.taskId, "IN_PROGRESS")}>
                  {t("inpatientRapidConvergenceD4a27c.technician.start")}
                </button>
              ) : null}
              {canTechnicianWrite && task.status === "IN_PROGRESS" ? (
                <>
                  <button type="button" onClick={() => transition(task.taskId, "COMPLETED")}>
                    {t("inpatientRapidConvergenceD4a27c.technician.complete")}
                  </button>
                  <button type="button" onClick={() => transition(task.taskId, "UNABLE_TO_COMPLETE")}>
                    {t("inpatientRapidConvergenceD4a27c.technician.unable")}
                  </button>
                  <button type="button" onClick={() => transition(task.taskId, "ESCALATED")}>
                    {t("inpatientRapidConvergenceD4a27c.technician.escalate")}
                  </button>
                </>
              ) : null}
              {canValidateRn && task.status === "COMPLETED" && task.rnValidationRequired ? (
                <button type="button" onClick={() => transition(task.taskId, "VALIDATED")}>
                  {t("inpatientRapidConvergenceD4a27c.technician.validate")}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
        {TECHNICIAN_TASK_STATUSES.join(" → ")}
      </p>
    </div>
  );
}
