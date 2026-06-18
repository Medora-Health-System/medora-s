/**
 * M1.8B.7H.1 — platform MVP pass-window defaults (facility overrides deferred).
 */

export const MEDICATION_DOSE_EXPANSION_HORIZON_HOURS = 72 as const;

export const MEDICATION_DOSE_EXPANSION_HORIZON_MS =
  MEDICATION_DOSE_EXPANSION_HORIZON_HOURS * 60 * 60 * 1000;

/** Replenish when future dose coverage drops below this threshold (M1.8B.7H.1b). */
export const MEDICATION_DOSE_HORIZON_REPLENISH_THRESHOLD_HOURS = 48 as const;

export const MEDICATION_DOSE_HORIZON_REPLENISH_THRESHOLD_MS =
  MEDICATION_DOSE_HORIZON_REPLENISH_THRESHOLD_HOURS * 60 * 60 * 1000;

/** Minutes before scheduledAt when a dose becomes administrable. */
export const DEFAULT_EARLY_TOLERANCE_MINUTES = 60 as const;

/** Minutes after scheduledAt when a dose is still on-time. */
export const DEFAULT_LATE_TOLERANCE_MINUTES = 60 as const;

/** Grace after dueWindowEndAt before overdueAt; 0 = overdueAt equals dueWindowEndAt. */
export const DEFAULT_OVERDUE_GRACE_MINUTES = 0 as const;

/** Platform default wall-clock slots for FIXED_DAILY_CLOCK (facility-local). */
export const MEDICATION_DOSE_FIXED_DAILY_CLOCK_SLOTS: Readonly<
  Record<number, ReadonlyArray<{ readonly hour: number; readonly minute: number }>>
> = {
  1: [{ hour: 9, minute: 0 }],
  2: [
    { hour: 9, minute: 0 },
    { hour: 21, minute: 0 },
  ],
  3: [
    { hour: 9, minute: 0 },
    { hour: 14, minute: 0 },
    { hour: 21, minute: 0 },
  ],
  4: [
    { hour: 6, minute: 0 },
    { hour: 12, minute: 0 },
    { hour: 18, minute: 0 },
    { hour: 22, minute: 0 },
  ],
};
