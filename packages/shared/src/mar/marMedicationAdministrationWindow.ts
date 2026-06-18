/** MEDUI.ED.MAR.HOTFIX.TIME.1 — universal ±60 minute on-time administration window (advisory only). */

export const MAR_STANDARD_ADMINISTRATION_WINDOW_MINUTES = 60 as const;

export type MarAdministrationWindowStatus = "ON_TIME" | "EARLY" | "LATE";

function parseInstant(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Classifies administration time vs scheduled time using a symmetric ±60 minute window.
 * Non-blocking — callers may show advisory UI only.
 */
export function resolveMarAdministrationWindowStatus(input: {
  scheduledAt: Date | string;
  administeredAt: Date | string;
  windowMinutes?: number;
  isPrn?: boolean;
}): {
  status: MarAdministrationWindowStatus;
  minutesDelta: number;
  windowMinutes: number;
} {
  const scheduled = parseInstant(input.scheduledAt);
  const administered = parseInstant(input.administeredAt);
  const windowMinutes = input.windowMinutes ?? MAR_STANDARD_ADMINISTRATION_WINDOW_MINUTES;

  if (!scheduled || !administered) {
    return { status: "ON_TIME", minutesDelta: 0, windowMinutes };
  }

  if (input.isPrn) {
    return {
      status: "ON_TIME",
      minutesDelta: Math.round((administered.getTime() - scheduled.getTime()) / 60_000),
      windowMinutes,
    };
  }

  const windowMs = windowMinutes * 60_000;
  const earliest = scheduled.getTime() - windowMs;
  const latest = scheduled.getTime() + windowMs;
  const adminMs = administered.getTime();
  const minutesDelta = Math.round((adminMs - scheduled.getTime()) / 60_000);

  if (adminMs < earliest) {
    return { status: "EARLY", minutesDelta, windowMinutes };
  }
  if (adminMs > latest) {
    return { status: "LATE", minutesDelta, windowMinutes };
  }
  return { status: "ON_TIME", minutesDelta, windowMinutes };
}

export function marAdministrationOutsideStandardWindow(
  input: Parameters<typeof resolveMarAdministrationWindowStatus>[0]
): boolean {
  return resolveMarAdministrationWindowStatus(input).status !== "ON_TIME";
}
