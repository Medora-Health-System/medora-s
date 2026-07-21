/**
 * D3D — Observation reassessment engine (intervals + reminder roles).
 * Complements existing observationReassessmentV1 clinical event payload.
 */

export const OBSERVATION_REASSESSMENT_INTERVAL_MINUTES = [15, 30, 60, 120, 240, 480] as const;

export type ObservationReassessmentIntervalMinutes =
  (typeof OBSERVATION_REASSESSMENT_INTERVAL_MINUTES)[number];

export type ObservationReassessmentReminderRole = "PROVIDER" | "NURSING";

export function isObservationReassessmentInterval(
  value: unknown
): value is ObservationReassessmentIntervalMinutes {
  return (
    typeof value === "number" &&
    (OBSERVATION_REASSESSMENT_INTERVAL_MINUTES as readonly number[]).includes(value)
  );
}

export function nextObservationReassessmentDueAt(input: {
  lastReassessmentAt: string | Date;
  intervalMinutes: ObservationReassessmentIntervalMinutes;
}): Date {
  const base =
    input.lastReassessmentAt instanceof Date
      ? input.lastReassessmentAt.getTime()
      : Date.parse(String(input.lastReassessmentAt));
  const safeBase = Number.isFinite(base) ? base : Date.now();
  return new Date(safeBase + input.intervalMinutes * 60_000);
}

export function observationReassessmentIsOverdue(input: {
  dueAt: string | Date;
  now?: Date;
}): boolean {
  const due =
    input.dueAt instanceof Date ? input.dueAt.getTime() : Date.parse(String(input.dueAt));
  if (!Number.isFinite(due)) return false;
  const now = (input.now ?? new Date()).getTime();
  return now > due;
}

export function observationReassessmentEscalationLevel(input: {
  overdueMinutes: number;
}): "NONE" | "REMINDER" | "ESCALATION" {
  if (input.overdueMinutes <= 0) return "NONE";
  if (input.overdueMinutes < 60) return "REMINDER";
  return "ESCALATION";
}
