"use client";

/**
 * MEDUI.D4A.3.3A — Team Execution dashboard over enterprise assignment + workflow + orders/MAR.
 */

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { fetchInpatientClinicalOps } from "@/features/hospital-care/inpatientOperationsApi";
import { fetchHospitalAssignmentProjection } from "@/features/hospital-care/hospitalAssignmentApi";
import { fetchEncounterWorkflowDoc } from "@/features/hospital-care/enterpriseWorkflowApi";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";

type Counts = {
  ordersOutstanding: number | null;
  ordersCompleted: number | null;
  marPending: number | null;
  marCompleted: number | null;
  tasksPending: number | null;
  tasksCompleted: number | null;
};

export function InpatientNursingTeamExecutionPanel({
  encounterId,
  facilityId,
  assignedRnName,
  assignedPctName,
  attendingName,
  onNavigateSection,
}: {
  encounterId: string;
  facilityId?: string | null;
  assignedRnName?: string | null;
  assignedPctName?: string | null;
  attendingName?: string | null;
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
}) {
  const { t, language } = useI18n();
  const [nursing, setNursing] = useState<{
    admissionAssessmentComplete?: boolean;
    lastShiftAssessmentAt?: string | null;
  } | null>(null);
  const [rn, setRn] = useState(assignedRnName ?? null);
  const [pct, setPct] = useState(assignedPctName ?? null);
  const [provider, setProvider] = useState(attendingName ?? null);
  const [counts, setCounts] = useState<Counts>({
    ordersOutstanding: null,
    ordersCompleted: null,
    marPending: null,
    marCompleted: null,
    tasksPending: null,
    tasksCompleted: null,
  });

  const load = useCallback(async () => {
    try {
      const opsData = await fetchInpatientClinicalOps(encounterId);
      const ops = opsData.ops as Record<string, unknown> | null;
      const n = (ops?.nursing as Record<string, unknown> | null) ?? null;
      setNursing(
        n
          ? {
              admissionAssessmentComplete: Boolean(n.admissionAssessmentComplete),
              lastShiftAssessmentAt:
                typeof n.lastShiftAssessmentAt === "string" ? n.lastShiftAssessmentAt : null,
            }
          : null
      );
    } catch {
      setNursing(null);
    }

    if (facilityId) {
      try {
        const assign = await fetchHospitalAssignmentProjection(facilityId, encounterId);
        setRn(assign.projection?.nurseName ?? assignedRnName ?? null);
        setPct(assign.projection?.technicianName ?? assignedPctName ?? null);
        setProvider(assign.projection?.providerName ?? attendingName ?? null);
      } catch {
        setRn(assignedRnName ?? null);
        setPct(assignedPctName ?? null);
        setProvider(attendingName ?? null);
      }
    }

    let tasksPending: number | null = null;
    let tasksCompleted: number | null = null;
    try {
      const wf = await fetchEncounterWorkflowDoc(encounterId);
      const tasks = Array.isArray(wf.doc?.tasks) ? wf.doc.tasks : [];
      tasksPending = tasks.filter(
        (x: { status?: string }) => x.status && !["COMPLETED", "CANCELLED"].includes(x.status)
      ).length;
      tasksCompleted = tasks.filter((x: { status?: string }) => x.status === "COMPLETED").length;
    } catch {
      try {
        const tech = asApiObject<{ tasks?: Array<{ status?: string }> }>(
          await apiFetch(
            `/inpatient-operations/encounters/${encodeURIComponent(encounterId)}/technician-tasks`
          )
        );
        const rows = tech?.tasks ?? [];
        tasksPending = rows.filter((r) => r.status !== "COMPLETED" && r.status !== "CANCELLED").length;
        tasksCompleted = rows.filter((r) => r.status === "COMPLETED").length;
      } catch {
        /* leave null */
      }
    }

    let ordersOutstanding: number | null = null;
    let ordersCompleted: number | null = null;
    try {
      const ordersRaw = await apiFetch(`/encounters/${encodeURIComponent(encounterId)}/orders`, {
        facilityId: facilityId ?? undefined,
      });
      const list = Array.isArray(ordersRaw)
        ? ordersRaw
        : Array.isArray((ordersRaw as { orders?: unknown })?.orders)
          ? ((ordersRaw as { orders: unknown[] }).orders)
          : [];
      ordersOutstanding = list.filter((o) => {
        const s = String((o as { status?: string })?.status ?? "").toUpperCase();
        return s && !["COMPLETED", "CANCELLED", "DISCONTINUED", "DONE"].includes(s);
      }).length;
      ordersCompleted = list.filter((o) => {
        const s = String((o as { status?: string })?.status ?? "").toUpperCase();
        return s === "COMPLETED" || s === "DONE";
      }).length;
    } catch {
      /* leave null */
    }

    let marPending: number | null = null;
    let marCompleted: number | null = null;
    try {
      const marRaw = await apiFetch(
        `/encounters/${encodeURIComponent(encounterId)}/medication-administrations`,
        { facilityId: facilityId ?? undefined }
      );
      const rows = Array.isArray(marRaw)
        ? marRaw
        : Array.isArray((marRaw as { items?: unknown })?.items)
          ? ((marRaw as { items: unknown[] }).items)
          : Array.isArray((marRaw as { administrations?: unknown })?.administrations)
            ? ((marRaw as { administrations: unknown[] }).administrations)
            : [];
      marPending = rows.filter((r) => {
        const s = String((r as { status?: string })?.status ?? "").toUpperCase();
        return s && !["GIVEN", "ADMINISTERED", "COMPLETED", "CANCELLED", "HELD"].includes(s);
      }).length;
      marCompleted = rows.filter((r) => {
        const s = String((r as { status?: string })?.status ?? "").toUpperCase();
        return s === "GIVEN" || s === "ADMINISTERED" || s === "COMPLETED";
      }).length;
    } catch {
      /* leave null */
    }

    setCounts({
      ordersOutstanding,
      ordersCompleted,
      marPending,
      marCompleted,
      tasksPending,
      tasksCompleted,
    });
  }, [encounterId, facilityId, assignedRnName, assignedPctName, attendingName]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingTotal =
    (counts.ordersOutstanding ?? 0) + (counts.marPending ?? 0) + (counts.tasksPending ?? 0);
  const completedTotal =
    (counts.ordersCompleted ?? 0) + (counts.marCompleted ?? 0) + (counts.tasksCompleted ?? 0);
  const denom = pendingTotal + completedTotal;
  const shiftPct = denom > 0 ? Math.round((completedTotal / denom) * 100) : null;
  const needsAttention = pendingTotal > 0;

  const fmt = (n: number | null) => (n == null ? DISPLAY_DASH : String(n));

  return (
    <section
      data-testid="inpatient-nursing-team-execution"
      style={{ ...MEDORA_CARD_SHELL, padding: "12px 14px", marginTop: 14 }}
    >
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
        {t("inpatientHeaderNursingD4a33.teamExecution.title")}
      </h3>
      <p style={{ margin: "4px 0 10px", fontSize: 12, color: "#64748b" }}>
        {t("inpatientHeaderNursingD4a33.teamExecution.subtitle")}
      </p>
      <dl
        style={{
          margin: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: "8px 14px",
          fontSize: 12,
          color: "#334155",
        }}
      >
        <Stat label={t("inpatientHeaderNursingD4a33.teamExecution.assignedRn")} value={rn?.trim() || DISPLAY_DASH} />
        <Stat label={t("inpatientHeaderNursingD4a33.teamExecution.assignedPct")} value={pct?.trim() || DISPLAY_DASH} />
        <Stat
          label={t("inpatientHeaderNursingD4a33.teamExecution.attending")}
          value={provider?.trim() || DISPLAY_DASH}
        />
        <Stat
          label={t("inpatientHeaderNursingD4a33.teamExecution.admissionComplete")}
          value={
            nursing?.admissionAssessmentComplete
              ? t("inpatientHeaderNursingD4a33.teamExecution.complete")
              : t("inpatientHeaderNursingD4a33.teamExecution.incomplete")
          }
        />
        <Stat
          label={t("inpatientHeaderNursingD4a33.teamExecution.lastShift")}
          value={
            nursing?.lastShiftAssessmentAt
              ? formatEncounterChromeDateTime(nursing.lastShiftAssessmentAt, language)
              : DISPLAY_DASH
          }
        />
        <Stat
          label={t("inpatientHeaderNursingD4a33.teamExecution.ordersOutstanding")}
          value={fmt(counts.ordersOutstanding)}
        />
        <Stat
          label={t("inpatientHeaderNursingD4a33.teamExecution.ordersCompleted")}
          value={fmt(counts.ordersCompleted)}
        />
        <Stat label={t("inpatientHeaderNursingD4a33.teamExecution.marPending")} value={fmt(counts.marPending)} />
        <Stat
          label={t("inpatientHeaderNursingD4a33.teamExecution.marCompleted")}
          value={fmt(counts.marCompleted)}
        />
        <Stat
          label={t("inpatientHeaderNursingD4a33.teamExecution.tasksPending")}
          value={fmt(counts.tasksPending)}
        />
        <Stat
          label={t("inpatientHeaderNursingD4a33.teamExecution.tasksCompleted")}
          value={fmt(counts.tasksCompleted)}
        />
        <Stat
          label={t("inpatientHeaderNursingD4a33.teamExecution.shiftProgress")}
          value={shiftPct == null ? DISPLAY_DASH : `${shiftPct}%`}
        />
        <Stat
          label={t("inpatientHeaderNursingD4a33.teamExecution.executionStatus")}
          value={
            needsAttention
              ? t("inpatientHeaderNursingD4a33.teamExecution.statusAttention")
              : t("inpatientHeaderNursingD4a33.teamExecution.statusOnTrack")
          }
        />
      </dl>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {onNavigateSection ? (
          <>
            <button type="button" style={linkBtn} onClick={() => onNavigateSection("medications")}>
              {t("inpatientHeaderNursingD4a33.teamExecution.openMar")}
            </button>
            <button type="button" style={linkBtn} onClick={() => onNavigateSection("orders")}>
              {t("inpatientHeaderNursingD4a33.teamExecution.openOrders")}
            </button>
            <button type="button" style={linkBtn} onClick={() => onNavigateSection("tasks")}>
              {t("inpatientHeaderNursingD4a33.teamExecution.openTasks")}
            </button>
          </>
        ) : null}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 11, color: "#94a3b8" }}>
        {t("inpatientHeaderNursingD4a33.teamExecution.emptyHint")}
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ fontWeight: 600, color: "#64748b" }}>{label}</dt>
      <dd style={{ margin: "2px 0 0" }}>{value}</dd>
    </div>
  );
}

const linkBtn = {
  padding: "6px 10px",
  borderRadius: 9999,
  border: "1px solid #99f6e4",
  background: "#f0fdfa",
  color: "#0f766e",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
} as const;
