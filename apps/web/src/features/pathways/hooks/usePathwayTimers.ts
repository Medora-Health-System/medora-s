// src/features/pathways/hooks/usePathwayTimers.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatDuration,
  isOverdue,
  metOnTime,
  secondsRemaining,
  MilestoneStatus,
} from "../utils/timer";

// Match your API DTO shape (adjust names if needed)
export type PathwayMilestoneDTO = {
  id: string;
  name: string;
  description?: string | null;
  targetMinutes: number; // API returns minutes, we convert to seconds
  status: PathwayMilestoneStatus;
  metAt?: string | Date | null;
};

export type PathwayMilestoneStatus = "PENDING" | "MET" | "OVERDUE" | "SKIPPED";

// Map API status to UI status
function mapToUIStatus(apiStatus: PathwayMilestoneStatus): MilestoneStatus {
  if (apiStatus === "OVERDUE") return "MISSED";
  if (apiStatus === "SKIPPED") return "WAIVED";
  return apiStatus as MilestoneStatus;
}

export type PathwaySessionDTO = {
  id: string;
  type: "STROKE" | "SEPSIS" | "STEMI" | "TRAUMA";
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  activatedAt: string; // ISO
  completedAt?: string | null;
  milestones: PathwayMilestoneDTO[];
};

export type MilestoneTimerView = {
  id: string;
  name: string;
  description?: string | null;
  targetSeconds: number;
  // Raw server status
  serverStatus: PathwayMilestoneStatus;
  // Derived UI status (optional auto-miss for UI only)
  uiStatus: MilestoneStatus;
  // Timing
  remainingSeconds: number;
  remainingLabel: string;
  overdue: boolean;
  // Styling tokens
  rowClass: string;
  badgeClass: string;
  // Helpful flags
  metOnTime: boolean | null;
};

type Options = {
  tickMs?: number; // default 1000
  autoMarkMissedInUI?: boolean; // default false
};

export function usePathwayTimers(session: PathwaySessionDTO | null, options?: Options) {
  const tickMs = options?.tickMs ?? 1000;
  const autoMarkMissedInUI = options?.autoMarkMissedInUI ?? false;
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const intervalRef = useRef<number | null>(null);

  // Start ticking only when session is ACTIVE; freeze when completed/cancelled.
  const shouldTick = !!session && session.status === "ACTIVE";

  useEffect(() => {
    if (!shouldTick) return;

    intervalRef.current = window.setInterval(() => {
      setNowMs(Date.now());
    }, tickMs);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [shouldTick, tickMs]);

  const milestoneViews: MilestoneTimerView[] = useMemo(() => {
    if (!session) return [];

    const startedAt = session.activatedAt;

    // If pathway is completed/cancelled, freeze timers at completion time (or now as fallback)
    const effectiveNowMs =
      session.status === "ACTIVE"
        ? nowMs
        : session.completedAt
          ? new Date(session.completedAt).getTime()
          : nowMs;

    return session.milestones.map((m) => {
      // Convert targetMinutes to targetSeconds
      const targetSeconds = m.targetMinutes * 60;

      const remainingSeconds = secondsRemaining({
        startedAt,
        targetSeconds,
        nowMs: effectiveNowMs,
      });

      const overdue = isOverdue({ status: m.status as MilestoneStatus, secondsRemaining: remainingSeconds });

      // Map API status to UI status
      const mappedStatus = mapToUIStatus(m.status);
      
      // Optional client-side "auto MISS" for UI only
      const uiStatus: MilestoneStatus =
        autoMarkMissedInUI && mappedStatus === "PENDING" && remainingSeconds < 0
          ? "MISSED"
          : mappedStatus;

      const onTime = metOnTime({
        startedAt,
        targetSeconds,
        occurredAt: m.metAt ?? null,
      });

      // Color logic:
      // GREEN  -> MET on time
      // YELLOW -> PENDING with time remaining
      // RED    -> Overdue PENDING (or uiStatus MISSED if you auto-mark)
      // GRAY   -> WAIVED/CANCELLED or pathway completed
      const color =
        session.status === "COMPLETED" || session.status === "CANCELLED"
          ? "gray"
          : uiStatus === "WAIVED" || uiStatus === "CANCELLED"
            ? "gray"
            : uiStatus === "MET"
              ? onTime === false
                ? "red" // met but late -> treat as red (optional)
                : "green"
              : uiStatus === "MISSED"
                ? "red"
                : overdue
                  ? "red"
                  : "yellow";

      const rowClass =
        color === "green"
          ? "bg-emerald-50"
          : color === "yellow"
            ? "bg-amber-50"
            : color === "red"
              ? "bg-rose-50"
              : "bg-gray-50";

      const badgeClass =
        color === "green"
          ? "bg-emerald-100 text-emerald-900"
          : color === "yellow"
            ? "bg-amber-100 text-amber-900"
            : color === "red"
              ? "bg-rose-100 text-rose-900"
              : "bg-gray-200 text-gray-800";

      return {
        id: m.id,
        name: m.name,
        description: m.description,
        targetSeconds,
        serverStatus: m.status,
        uiStatus,
        remainingSeconds,
        remainingLabel: formatDuration(remainingSeconds),
        overdue,
        rowClass,
        badgeClass,
        metOnTime: onTime,
      };
    });
  }, [session, nowMs, autoMarkMissedInUI]);

  return {
    nowMs,
    shouldTick,
    milestoneViews,
  };
}

