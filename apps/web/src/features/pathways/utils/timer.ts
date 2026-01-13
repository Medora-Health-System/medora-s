// src/features/pathways/utils/timer.ts

export type MilestoneStatus = "PENDING" | "MET" | "MISSED" | "WAIVED" | "CANCELLED";

export function toMs(input: string | Date): number {
  return input instanceof Date ? input.getTime() : new Date(input).getTime();
}

/**
 * remainingSeconds = (startedAt + targetSeconds) - now
 * Can be negative if overdue.
 */
export function secondsRemaining(params: {
  startedAt: string | Date;
  targetSeconds: number;
  nowMs: number;
}): number {
  const startMs = toMs(params.startedAt);
  const dueMs = startMs + params.targetSeconds * 1000;
  return Math.floor((dueMs - params.nowMs) / 1000);
}

export function isOverdue(params: {
  status: MilestoneStatus;
  secondsRemaining: number;
}): boolean {
  // Only pending milestones can be overdue
  if (params.status !== "PENDING") return false;
  return params.secondsRemaining < 0;
}

export function formatDuration(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
  const mm = Math.floor(abs / 60);
  const ss = abs % 60;
  const sign = totalSeconds < 0 ? "-" : "";
  return `${sign}${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/**
 * If milestone is MET and has occurredAt, check if it was on time
 * occurredAt <= startedAt + targetSeconds
 */
export function metOnTime(params: {
  startedAt: string | Date;
  targetSeconds: number;
  occurredAt?: string | Date | null;
}): boolean | null {
  if (!params.occurredAt) return null;
  const startMs = toMs(params.startedAt);
  const occMs = toMs(params.occurredAt);
  const dueMs = startMs + params.targetSeconds * 1000;
  return occMs <= dueMs;
}

