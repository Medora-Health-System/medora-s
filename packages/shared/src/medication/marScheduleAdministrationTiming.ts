import { evaluateMarScheduleTimingGovernance } from "../mar/marAdministrationSafetyGovernance.js";

export type MarScheduleAdministrationTimingKind = "on_time" | "early" | "late";

export type MarScheduleAdministrationTimingResult = {
  kind: MarScheduleAdministrationTimingKind;
  /** Facility-local display of scheduled anchor time. */
  scheduledTimeDisplay: string;
  /** Facility-local display of actual administration time (K.10B.9). */
  actualTimeDisplay?: string;
  /** Minutes early or late when off-window (K.10B.9). */
  minutesDelta?: number;
  requiresReason: boolean;
};

/**
 * Uses administered/effective time vs scheduledAt and due window bounds.
 */
export function evaluateMarScheduleAdministrationTiming(input: {
  administeredAt: Date | string;
  scheduledAt: Date | string;
  dueWindowStartAt?: Date | string | null;
  dueWindowEndAt?: Date | string | null;
  facilityTimeZone: string;
  locale?: string;
}): MarScheduleAdministrationTimingResult {
  const governed = evaluateMarScheduleTimingGovernance(input);
  return {
    kind: governed.kind,
    scheduledTimeDisplay: governed.scheduledTimeDisplay,
    actualTimeDisplay: governed.actualTimeDisplay,
    minutesDelta: governed.minutesDelta,
    requiresReason: governed.requiresReason,
  };
}
