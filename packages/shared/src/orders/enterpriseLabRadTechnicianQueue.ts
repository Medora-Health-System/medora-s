/**
 * MEDUI.RES.2 — Technician worklist queue projection + sorting.
 *
 * Projects existing OrderItem / Order lifecycle into technician tabs:
 * NEW | IN_PROGRESS | COMPLETED | CANCELLED
 *
 * Does not invent a parallel persistence status column.
 * Sorting is explicit — never silent DB row order.
 */

export const TECHNICIAN_WORK_STATUSES = [
  "NEW",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type TechnicianWorkStatus = (typeof TECHNICIAN_WORK_STATUSES)[number];

export const TECHNICIAN_WORKLIST_SORT_MODES = [
  "PRIORITY_NEWEST",
  "NEWEST_FIRST",
  "OLDEST_FIRST",
  "PRIORITY",
] as const;

export type TechnicianWorklistSortMode = (typeof TECHNICIAN_WORKLIST_SORT_MODES)[number];

const NEW_STATUSES = new Set([
  "PLACED",
  "PENDING",
  "SIGNED",
  "ACKNOWLEDGED",
  "DRAFT",
]);

const IN_PROGRESS_STATUSES = new Set(["IN_PROGRESS"]);

const COMPLETED_STATUSES = new Set(["COMPLETED", "RESULTED", "VERIFIED"]);

const CANCELLED_STATUSES = new Set(["CANCELLED"]);

function normStatus(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase();
}

/**
 * Project existing lifecycle status into technician tab buckets.
 * Prefer item status; fall back to order status for cancelled/terminal.
 */
export function projectTechnicianWorkStatus(input: {
  itemStatus?: string | null;
  orderStatus?: string | null;
}): TechnicianWorkStatus {
  const item = normStatus(input.itemStatus);
  const order = normStatus(input.orderStatus);

  if (CANCELLED_STATUSES.has(item) || CANCELLED_STATUSES.has(order)) {
    return "CANCELLED";
  }
  if (COMPLETED_STATUSES.has(item) || COMPLETED_STATUSES.has(order)) {
    return "COMPLETED";
  }
  if (IN_PROGRESS_STATUSES.has(item)) {
    return "IN_PROGRESS";
  }
  if (NEW_STATUSES.has(item) || !item) {
    return "NEW";
  }
  // Unknown non-terminal item statuses still land in New (active work).
  if (!COMPLETED_STATUSES.has(item) && !CANCELLED_STATUSES.has(item)) {
    return item === "IN_PROGRESS" ? "IN_PROGRESS" : "NEW";
  }
  return "NEW";
}

/** STAT → URGENT → ROUTINE (lower = higher priority). */
export function technicianPriorityRank(priority: string | null | undefined): number {
  const p = String(priority ?? "ROUTINE")
    .trim()
    .toUpperCase();
  if (p === "STAT") return 0;
  if (p === "URGENT") return 1;
  return 2;
}

function toMs(raw: string | Date | null | undefined): number | null {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw.getTime();
  if (typeof raw === "string" && raw.trim()) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  return null;
}

export type TechnicianWorklistSortInput = {
  workStatus: TechnicianWorkStatus;
  priority?: string | null;
  /** Order placed / created time. */
  orderedAt?: string | Date | null;
  /** Result verified / completed time when available. */
  completedAt?: string | Date | null;
  /** Cancel / last update time for cancelled rows. */
  cancelledAt?: string | Date | null;
  itemId?: string | null;
};

/**
 * Relevant timestamp for the active queue tab:
 * - COMPLETED → completedAt (fallback orderedAt)
 * - CANCELLED → cancelledAt (fallback orderedAt)
 * - active → orderedAt
 */
export function technicianRelevantTimestampMs(
  row: TechnicianWorklistSortInput
): number {
  if (row.workStatus === "COMPLETED") {
    return toMs(row.completedAt) ?? toMs(row.orderedAt) ?? 0;
  }
  if (row.workStatus === "CANCELLED") {
    return toMs(row.cancelledAt) ?? toMs(row.orderedAt) ?? 0;
  }
  return toMs(row.orderedAt) ?? 0;
}

/**
 * Default: PRIORITY_NEWEST (STAT/Urgent/Routine, then newest relevant timestamp).
 * Completed / Cancelled tabs: most recently completed / cancelled first when using
 * PRIORITY_NEWEST or NEWEST_FIRST (timestamp descending).
 */
export function compareTechnicianWorklistRows(
  a: TechnicianWorklistSortInput,
  b: TechnicianWorklistSortInput,
  mode: TechnicianWorklistSortMode = "PRIORITY_NEWEST"
): number {
  const aMs = technicianRelevantTimestampMs(a);
  const bMs = technicianRelevantTimestampMs(b);

  if (mode === "PRIORITY" || mode === "PRIORITY_NEWEST") {
    const pr = technicianPriorityRank(a.priority) - technicianPriorityRank(b.priority);
    if (pr !== 0) return pr;
    if (mode === "PRIORITY") {
      // Priority only: newest as stable secondary within same priority.
      if (aMs !== bMs) return bMs - aMs;
    } else if (aMs !== bMs) {
      return bMs - aMs;
    }
  } else if (mode === "NEWEST_FIRST") {
    if (aMs !== bMs) return bMs - aMs;
  } else {
    // OLDEST_FIRST
    if (aMs !== bMs) return aMs - bMs;
  }

  return String(a.itemId ?? "").localeCompare(String(b.itemId ?? ""));
}

export function sortTechnicianWorklistRows<T extends TechnicianWorklistSortInput>(
  rows: T[],
  mode: TechnicianWorklistSortMode = "PRIORITY_NEWEST"
): T[] {
  return [...rows].sort((a, b) => compareTechnicianWorklistRows(a, b, mode));
}

/** Start of local calendar day for "completed today" KPI projections. */
export function startOfLocalDayMs(now: Date = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export type LabTechnicianKpiSnapshot = {
  newOrders: number;
  inProgress: number;
  completedToday: number;
  criticalResults: number;
  pendingAcknowledgement: number;
};

export type RadiologyTechnicianKpiSnapshot = {
  newOrders: number;
  inProgress: number;
  preliminaryReports: number;
  completedToday: number;
  overdue: number;
};

export type TechnicianKpiRowInput = {
  workStatus: TechnicianWorkStatus;
  completedAt?: string | Date | null;
  criticalValue?: boolean | null;
  awaitingCriticalAck?: boolean;
  /** Radiology: performed but not yet finalized/verified. */
  awaitingFinalization?: boolean;
  overdue?: boolean;
};

export function projectLabTechnicianKpis(
  rows: TechnicianKpiRowInput[],
  now: Date = new Date()
): LabTechnicianKpiSnapshot {
  const dayStart = startOfLocalDayMs(now);
  let newOrders = 0;
  let inProgress = 0;
  let completedToday = 0;
  let criticalResults = 0;
  let pendingAcknowledgement = 0;

  for (const row of rows) {
    if (row.workStatus === "NEW") newOrders += 1;
    if (row.workStatus === "IN_PROGRESS") inProgress += 1;
    if (row.workStatus === "COMPLETED") {
      const ms = toMs(row.completedAt);
      if (ms != null && ms >= dayStart) completedToday += 1;
    }
    if (row.criticalValue) criticalResults += 1;
    if (row.awaitingCriticalAck) pendingAcknowledgement += 1;
  }

  return {
    newOrders,
    inProgress,
    completedToday,
    criticalResults,
    pendingAcknowledgement,
  };
}

export function projectRadiologyTechnicianKpis(
  rows: TechnicianKpiRowInput[],
  now: Date = new Date()
): RadiologyTechnicianKpiSnapshot {
  const dayStart = startOfLocalDayMs(now);
  let newOrders = 0;
  let inProgress = 0;
  let preliminaryReports = 0;
  let completedToday = 0;
  let overdue = 0;

  for (const row of rows) {
    if (row.workStatus === "NEW") newOrders += 1;
    if (row.workStatus === "IN_PROGRESS") {
      inProgress += 1;
      if (row.awaitingFinalization) preliminaryReports += 1;
    }
    if (row.workStatus === "COMPLETED") {
      const ms = toMs(row.completedAt);
      if (ms != null && ms >= dayStart) completedToday += 1;
    }
    if (row.overdue) overdue += 1;
  }

  return {
    newOrders,
    inProgress,
    preliminaryReports,
    completedToday,
    overdue,
  };
}
