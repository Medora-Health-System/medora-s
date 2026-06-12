import type { MedicationFrequencyExpansionStrategy } from "./medicationFrequencyCatalog.js";
import type { MedicationFrequencySnapshotJson } from "./medicationOrderScheduleSnapshot.js";
import {
  DEFAULT_EARLY_TOLERANCE_MINUTES,
  DEFAULT_LATE_TOLERANCE_MINUTES,
  DEFAULT_OVERDUE_GRACE_MINUTES,
  MEDICATION_DOSE_EXPANSION_HORIZON_MS,
  MEDICATION_DOSE_FIXED_DAILY_CLOCK_SLOTS,
} from "./medicationDosePassWindowDefaults.js";

export type PlannedMedicationDoseSlot = {
  doseSequenceNumber: number;
  scheduledAt: Date;
  dueWindowStartAt: Date;
  dueWindowEndAt: Date;
  overdueAt: Date;
};

export type MedicationDoseExpansionPlannerInput = {
  /** Schedule anchor — typically schedule.createdAt. */
  anchorAt: Date;
  /** Rolling horizon end — typically anchorAt + 72h unless capped. */
  horizonEndAt?: Date;
  frequencySnapshotJson: MedicationFrequencySnapshotJson;
  facilityTimeZone: string;
  /** Existing max sequence (0 when none). Used for idempotent extension only. */
  existingMaxSequenceNumber?: number;
};

export type MedicationDoseExpansionPlannerResult =
  | { ok: true; slots: PlannedMedicationDoseSlot[] }
  | { ok: false; reason: "UNSUPPORTED_EXPANSION_STRATEGY" | "INVALID_FREQUENCY_SNAPSHOT" };

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

/** Facility-local wall-clock parts for a UTC instant (shared MAR / dose scheduling). */
export function getZonedWallClockParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const hour = get("hour");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: hour === 24 ? 0 : hour,
    minute: get("minute"),
  };
}

/** Maps a facility-local wall clock to the corresponding UTC instant. */
export function wallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  if (timeZone === "UTC") {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  }

  let utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  for (let i = 0; i < 4; i++) {
    const parts = getZonedWallClockParts(new Date(utcGuess), timeZone);
    const diffMinutes =
      (day - parts.day) * 24 * 60 + (hour - parts.hour) * 60 + (minute - parts.minute);
    if (diffMinutes === 0) break;
    utcGuess += diffMinutes * 60 * 1000;
  }
  return new Date(utcGuess);
}

function addCalendarDays(year: number, month: number, day: number, days: number) {
  const d = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function computeDueWindows(
  scheduledAt: Date,
  expansionStrategy: MedicationFrequencyExpansionStrategy,
  intervalMinutes: number | null
): Pick<PlannedMedicationDoseSlot, "dueWindowStartAt" | "dueWindowEndAt" | "overdueAt"> {
  let earlyMinutes: number = DEFAULT_EARLY_TOLERANCE_MINUTES;
  let lateMinutes: number = DEFAULT_LATE_TOLERANCE_MINUTES;

  if (expansionStrategy === "INTERVAL_FROM_ANCHOR" && intervalMinutes != null && intervalMinutes > 0) {
    earlyMinutes = Math.min(DEFAULT_EARLY_TOLERANCE_MINUTES, intervalMinutes / 4);
    lateMinutes = Math.min(DEFAULT_LATE_TOLERANCE_MINUTES, intervalMinutes / 2);
  }

  const dueWindowStartAt = new Date(scheduledAt.getTime() - earlyMinutes * 60 * 1000);
  const dueWindowEndAt = new Date(scheduledAt.getTime() + lateMinutes * 60 * 1000);
  const overdueAt = new Date(
    dueWindowEndAt.getTime() + DEFAULT_OVERDUE_GRACE_MINUTES * 60 * 1000
  );

  return { dueWindowStartAt, dueWindowEndAt, overdueAt };
}

function planFixedDailyClockSlots(input: MedicationDoseExpansionPlannerInput): Date[] {
  const { anchorAt, horizonEndAt, frequencySnapshotJson, facilityTimeZone } = input;
  const horizonEnd = horizonEndAt ?? new Date(anchorAt.getTime() + MEDICATION_DOSE_EXPANSION_HORIZON_MS);
  const dosesPerDay = frequencySnapshotJson.dosesPerDay;
  if (dosesPerDay == null || dosesPerDay <= 0) return [];

  const clockSlots = MEDICATION_DOSE_FIXED_DAILY_CLOCK_SLOTS[dosesPerDay];
  if (!clockSlots) return [];

  const anchorParts = getZonedWallClockParts(anchorAt, facilityTimeZone);
  const scheduledTimes: Date[] = [];

  for (let dayOffset = 0; dayOffset <= 4; dayOffset++) {
    const day = addCalendarDays(anchorParts.year, anchorParts.month, anchorParts.day, dayOffset);
    for (const slot of clockSlots) {
      const scheduledAt = wallClockToUtc(
        day.year,
        day.month,
        day.day,
        slot.hour,
        slot.minute,
        facilityTimeZone
      );
      if (scheduledAt.getTime() >= anchorAt.getTime() && scheduledAt.getTime() <= horizonEnd.getTime()) {
        scheduledTimes.push(scheduledAt);
      }
    }
    const nextDayStart = wallClockToUtc(day.year, day.month, day.day + 1, 0, 0, facilityTimeZone);
    if (nextDayStart.getTime() > horizonEnd.getTime()) break;
  }

  return scheduledTimes.sort((a, b) => a.getTime() - b.getTime());
}

function planIntervalFromAnchorSlots(input: MedicationDoseExpansionPlannerInput): Date[] {
  const { anchorAt, horizonEndAt, frequencySnapshotJson } = input;
  const intervalMinutes = frequencySnapshotJson.intervalMinutes;
  if (intervalMinutes == null || intervalMinutes <= 0) return [];

  const horizonEnd = horizonEndAt ?? new Date(anchorAt.getTime() + MEDICATION_DOSE_EXPANSION_HORIZON_MS);
  const intervalMs = intervalMinutes * 60 * 1000;
  const scheduledTimes: Date[] = [];

  for (let t = anchorAt.getTime(); t <= horizonEnd.getTime(); t += intervalMs) {
    scheduledTimes.push(new Date(t));
  }

  return scheduledTimes;
}

function assignSequenceNumbersWithStrategy(
  scheduledTimes: Date[],
  expansionStrategy: MedicationFrequencyExpansionStrategy,
  intervalMinutes: number | null,
  existingMaxSequenceNumber = 0
): PlannedMedicationDoseSlot[] {
  return scheduledTimes.map((scheduledAt, index) => ({
    doseSequenceNumber: existingMaxSequenceNumber + index + 1,
    scheduledAt,
    ...computeDueWindows(scheduledAt, expansionStrategy, intervalMinutes),
  }));
}

/**
 * Pure rolling-horizon dose slot planner (M1.8B.7H.1).
 * Uses frozen frequencySnapshotJson — never live catalog.
 */
export function planMedicationDoseExpansionSlots(
  input: MedicationDoseExpansionPlannerInput
): MedicationDoseExpansionPlannerResult {
  const strategy = input.frequencySnapshotJson.expansionStrategy as MedicationFrequencyExpansionStrategy;
  const intervalMinutes = input.frequencySnapshotJson.intervalMinutes;

  let scheduledTimes: Date[];
  switch (strategy) {
    case "FIXED_DAILY_CLOCK":
      scheduledTimes = planFixedDailyClockSlots(input);
      break;
    case "INTERVAL_FROM_ANCHOR":
      scheduledTimes = planIntervalFromAnchorSlots(input);
      break;
    default:
      return { ok: false, reason: "UNSUPPORTED_EXPANSION_STRATEGY" };
  }

  if (scheduledTimes.length === 0) {
    return { ok: false, reason: "INVALID_FREQUENCY_SNAPSHOT" };
  }

  const slots = assignSequenceNumbersWithStrategy(
    scheduledTimes,
    strategy,
    intervalMinutes,
    input.existingMaxSequenceNumber ?? 0
  );

  return { ok: true, slots };
}

/** Returns slots that are not yet materialized (by sequence number). */
export function filterUnmaterializedMedicationDoseSlots(
  plannedSlots: PlannedMedicationDoseSlot[],
  existingSequenceNumbers: ReadonlySet<number>
): PlannedMedicationDoseSlot[] {
  return plannedSlots.filter((slot) => !existingSequenceNumbers.has(slot.doseSequenceNumber));
}
