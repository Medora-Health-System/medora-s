/**
 * MEDUI.D4C.5B.1 — authoritative Clinic FollowUp projection helpers.
 *
 * Single counting / status / period / facility-scope authority for:
 * Clinical Board KPI, Today's Visits FOLLOW_UPS_DUE, Follow-up list drill-down, AI Insights.
 *
 * Durable statuses remain FollowUpStatus: OPEN | COMPLETED | CANCELLED only.
 * No ClinicFollowUp table. No client-side KPI counters.
 */

import {
  facilityLocalDayUtcBounds,
  isClinicCareAmbulatoryEncounterType,
} from "./clinicCareTrackboardProjectionD4c2.js";
import {
  getZonedWallClockParts,
  wallClockToUtc,
} from "../medication/medicationDoseExpansionPlanner.js";
import { resolveFacilityTimezone } from "../clinical/facilityTimezoneDefaults.js";

/** Durable FollowUpStatus values (Prisma). Presentation may map OPEN → overdue/due/scheduled. */
export const CLINIC_FOLLOW_UP_DURABLE_STATUSES = ["OPEN", "COMPLETED", "CANCELLED"] as const;
export type ClinicFollowUpDurableStatus = (typeof CLINIC_FOLLOW_UP_DURABLE_STATUSES)[number];

/** Presentation-only — never persist as ClinicFollowUpStatus. */
export const CLINIC_FOLLOW_UP_PRESENTATION_STATUSES = [
  "OVERDUE",
  "DUE",
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "EXCLUDED",
] as const;
export type ClinicFollowUpPresentationStatus =
  (typeof CLINIC_FOLLOW_UP_PRESENTATION_STATUSES)[number];

export type ClinicFollowUpPeriodId = "TODAY" | "WEEK" | "MONTH";

export type ClinicFollowUpPeriodBounds = {
  /** Facility-local today 00:00 (inclusive). Forward windows start here. */
  startUtc: Date;
  /** Exclusive end: TODAY=+1d, WEEK=+7d, MONTH=+30d from today start. */
  endExclusiveUtc: Date;
  timeZone: string;
  localDateKey: string;
  dayCount: number;
  /** Local YYYY-MM-DD of first included calendar day (today). */
  dateFromKey: string;
  /** Local YYYY-MM-DD of last included calendar day (endExclusive − 1 day). */
  dateToKey: string;
};

export type ClinicFollowUpRecordInput = {
  facilityId: string | null | undefined;
  status: string | null | undefined;
  dueDate: Date | string | null | undefined;
  /** When linked, encounter must be ambulatory; null/undefined = unlinked (allowed). */
  linkedEncounterType?: string | null;
  encounterFacilityId?: string | null;
  appointmentFacilityId?: string | null;
};

export type ClinicFollowUpProjection = {
  inFacilityScope: boolean;
  durableStatus: ClinicFollowUpDurableStatus | null;
  presentationStatus: ClinicFollowUpPresentationStatus;
  dueAtMs: number | null;
  /**
   * Actionable for the selected period KPI:
   * OPEN + in scope + ambulatory-safe + valid dueDate + dueDate < periodEndExclusiveUtc.
   * Includes overdue (any past due) and due through end of forward period.
   */
  countsTowardActionablePeriodKpi: boolean;
};

function parseDueMs(dueDate: Date | string | null | undefined): number | null {
  if (dueDate == null || dueDate === "") return null;
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  return due.getTime();
}

function normalizeDurableStatus(
  status: string | null | undefined
): ClinicFollowUpDurableStatus | null {
  const s = String(status ?? "")
    .trim()
    .toUpperCase();
  if (s === "OPEN" || s === "COMPLETED" || s === "CANCELLED") return s;
  return null;
}

function addCalendarDayParts(
  year: number,
  month: number,
  day: number,
  delta: number
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day + delta, 12, 0, 0, 0));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function localDateKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Canonical facility scope: FollowUp.facilityId OR encounter.facilityId OR appointment.facilityId
 * must match the authenticated facility. No cross-facility counts.
 */
export function resolveFollowUpFacilityScope(input: {
  authenticatedFacilityId: string;
  followUpFacilityId?: string | null;
  encounterFacilityId?: string | null;
  appointmentFacilityId?: string | null;
}): boolean {
  const auth = String(input.authenticatedFacilityId ?? "").trim();
  if (!auth) return false;
  const candidates = [
    input.followUpFacilityId,
    input.encounterFacilityId,
    input.appointmentFacilityId,
  ]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  return candidates.some((id) => id === auth);
}

/**
 * Forward-looking follow-up period in facility timezone (half-open [start, end)).
 *
 * Distinct from visit analytics `facilityLocalPeriodUtcBounds` (rolling *past* days).
 * Follow-up workload looks *forward* from today so a due-later-this-week row appears in WEEK.
 *
 * - TODAY: [today 00:00, tomorrow 00:00)
 * - WEEK:  [today 00:00, today+7d 00:00)
 * - MONTH: [today 00:00, today+30d 00:00)
 *
 * Actionable KPI also includes overdue (dueDate < start) via THROUGH_PERIOD_END counting.
 */
export function resolveClinicFollowUpPeriod(
  now: Date,
  facilityTimeZone: string | null | undefined,
  period: ClinicFollowUpPeriodId
): ClinicFollowUpPeriodBounds {
  const today = facilityLocalDayUtcBounds(now, facilityTimeZone);
  const tz = today.timeZone;
  const dayCount = period === "TODAY" ? 1 : period === "WEEK" ? 7 : 30;
  const parts = getZonedWallClockParts(now, tz);
  const endParts = addCalendarDayParts(parts.year, parts.month, parts.day, dayCount);
  const endExclusiveUtc = wallClockToUtc(
    endParts.year,
    endParts.month,
    endParts.day,
    0,
    0,
    tz
  );
  const lastIncluded = addCalendarDayParts(parts.year, parts.month, parts.day, dayCount - 1);

  return {
    startUtc: today.startUtc,
    endExclusiveUtc,
    timeZone: tz,
    localDateKey: today.localDateKey,
    dayCount,
    dateFromKey: today.localDateKey,
    dateToKey: localDateKeyFromParts(lastIncluded.year, lastIncluded.month, lastIncluded.day),
  };
}

/**
 * Project one FollowUp row into durable + presentation status and KPI inclusion.
 * Closed/cancelled encounters do not drop valid follow-ups (status of encounter unused).
 */
export function projectClinicFollowUpStatus(input: {
  authenticatedFacilityId: string;
  record: ClinicFollowUpRecordInput;
  /** Exclusive end of the selected forward period (or today end for trackboard). */
  periodEndExclusiveUtc: Date;
  /** Facility-local today start — used to distinguish OVERDUE vs DUE vs SCHEDULED. */
  todayStartUtc: Date;
  todayEndExclusiveUtc: Date;
}): ClinicFollowUpProjection {
  const inFacilityScope = resolveFollowUpFacilityScope({
    authenticatedFacilityId: input.authenticatedFacilityId,
    followUpFacilityId: input.record.facilityId,
    encounterFacilityId: input.record.encounterFacilityId,
    appointmentFacilityId: input.record.appointmentFacilityId,
  });

  const durableStatus = normalizeDurableStatus(input.record.status);
  const dueAtMs = parseDueMs(input.record.dueDate);

  if (!inFacilityScope || dueAtMs == null || durableStatus == null) {
    return {
      inFacilityScope,
      durableStatus,
      presentationStatus: "EXCLUDED",
      dueAtMs,
      countsTowardActionablePeriodKpi: false,
    };
  }

  if (
    input.record.linkedEncounterType != null &&
    String(input.record.linkedEncounterType).trim() !== ""
  ) {
    if (!isClinicCareAmbulatoryEncounterType(input.record.linkedEncounterType)) {
      return {
        inFacilityScope,
        durableStatus,
        presentationStatus: "EXCLUDED",
        dueAtMs,
        countsTowardActionablePeriodKpi: false,
      };
    }
  }

  if (durableStatus === "COMPLETED") {
    return {
      inFacilityScope,
      durableStatus,
      presentationStatus: "COMPLETED",
      dueAtMs,
      countsTowardActionablePeriodKpi: false,
    };
  }
  if (durableStatus === "CANCELLED") {
    return {
      inFacilityScope,
      durableStatus,
      presentationStatus: "CANCELLED",
      dueAtMs,
      countsTowardActionablePeriodKpi: false,
    };
  }

  // OPEN
  let presentationStatus: ClinicFollowUpPresentationStatus;
  if (dueAtMs < input.todayStartUtc.getTime()) {
    presentationStatus = "OVERDUE";
  } else if (dueAtMs < input.todayEndExclusiveUtc.getTime()) {
    presentationStatus = "DUE";
  } else {
    presentationStatus = "SCHEDULED";
  }

  const countsTowardActionablePeriodKpi =
    dueAtMs < input.periodEndExclusiveUtc.getTime();

  return {
    inFacilityScope,
    durableStatus,
    presentationStatus,
    dueAtMs,
    countsTowardActionablePeriodKpi,
  };
}

export type ClinicFollowUpPeriodCounts = {
  actionable: number;
  overdue: number;
  dueToday: number;
  scheduledInPeriod: number;
  completed: number;
  cancelled: number;
  excluded: number;
};

/** Count authoritative rows for a period (server-side; UI must not re-count). */
export function countClinicFollowUpsForPeriod(input: {
  authenticatedFacilityId: string;
  records: ClinicFollowUpRecordInput[];
  periodEndExclusiveUtc: Date;
  todayStartUtc: Date;
  todayEndExclusiveUtc: Date;
}): ClinicFollowUpPeriodCounts {
  const counts: ClinicFollowUpPeriodCounts = {
    actionable: 0,
    overdue: 0,
    dueToday: 0,
    scheduledInPeriod: 0,
    completed: 0,
    cancelled: 0,
    excluded: 0,
  };

  for (const record of input.records) {
    const p = projectClinicFollowUpStatus({
      authenticatedFacilityId: input.authenticatedFacilityId,
      record,
      periodEndExclusiveUtc: input.periodEndExclusiveUtc,
      todayStartUtc: input.todayStartUtc,
      todayEndExclusiveUtc: input.todayEndExclusiveUtc,
    });
    if (p.presentationStatus === "EXCLUDED") {
      counts.excluded += 1;
      continue;
    }
    if (p.presentationStatus === "COMPLETED") {
      counts.completed += 1;
      continue;
    }
    if (p.presentationStatus === "CANCELLED") {
      counts.cancelled += 1;
      continue;
    }
    if (p.countsTowardActionablePeriodKpi) {
      counts.actionable += 1;
      if (p.presentationStatus === "OVERDUE") counts.overdue += 1;
      else if (p.presentationStatus === "DUE") counts.dueToday += 1;
      else if (p.presentationStatus === "SCHEDULED") counts.scheduledInPeriod += 1;
    }
  }

  return counts;
}

/**
 * Drill-down to enterprise Follow-up list with typed filters matching the KPI.
 * Path goes through Clinic capability tab then redirects to `/app/follow-ups`.
 */
export function clinicCareFollowUpDrillDownHref(input: {
  period: ClinicFollowUpPeriodId;
  dateFromKey: string;
  dateToKey: string;
  /** ISO exclusive end instant — required for exact KPI/list match. */
  endExclusiveIso: string;
  /** When true (default), list includes overdue before dateFrom via actionable=1. */
  actionable?: boolean;
  status?: ClinicFollowUpDurableStatus;
}): string {
  const params = new URLSearchParams();
  params.set("period", input.period);
  params.set("dateFrom", input.dateFromKey);
  params.set("dateTo", input.dateToKey);
  params.set("endExclusive", input.endExclusiveIso);
  params.set("status", input.status ?? "OPEN");
  if (input.actionable !== false) params.set("actionable", "1");
  return `/app/clinic-care/follow-up?${params.toString()}`;
}

/** Canonical `/app/follow-ups` href (after Clinic redirect). */
export function followUpsListDrillDownHref(input: {
  period?: ClinicFollowUpPeriodId;
  dateFromKey: string;
  dateToKey: string;
  endExclusiveIso: string;
  actionable?: boolean;
  status?: ClinicFollowUpDurableStatus;
}): string {
  const params = new URLSearchParams();
  if (input.period) params.set("period", input.period);
  params.set("dateFrom", input.dateFromKey);
  params.set("dateTo", input.dateToKey);
  params.set("endExclusive", input.endExclusiveIso);
  params.set("status", input.status ?? "OPEN");
  if (input.actionable !== false) params.set("actionable", "1");
  return `/app/follow-ups?${params.toString()}`;
}
