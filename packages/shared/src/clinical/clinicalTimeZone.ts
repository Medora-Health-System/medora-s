import {
  getZonedWallClockParts,
  wallClockToUtc,
} from "../medication/medicationDoseExpansionPlanner.js";

export const CLINICAL_TIME_ZONE_FALLBACK = "UTC";

/** Single clinical timezone authority: facility → hospital → UTC (M1.8B.7K.10B.1). */
export function resolveClinicalTimeZone(input: {
  facilityTimeZone?: string | null;
  hospitalTimeZone?: string | null;
}): string {
  for (const raw of [input.facilityTimeZone, input.hospitalTimeZone]) {
    const tz = normalizeClinicalTimeZone(raw);
    if (tz !== CLINICAL_TIME_ZONE_FALLBACK || raw?.trim() === "UTC") return tz;
  }
  return CLINICAL_TIME_ZONE_FALLBACK;
}

export function normalizeClinicalTimeZone(raw: string | null | undefined): string {
  const tz = raw?.trim();
  if (!tz) return CLINICAL_TIME_ZONE_FALLBACK;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return CLINICAL_TIME_ZONE_FALLBACK;
  }
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Facility-local `datetime-local` string (YYYY-MM-DDTHH:mm) from UTC instant. */
export function clinicalDatetimeLocalFromInstant(
  instant: Date | string,
  facilityTimeZone: string
): string {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) return "";
  const tz = resolveClinicalTimeZone({ facilityTimeZone });
  const parts = getZonedWallClockParts(date, tz);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

/** Parse facility-local `datetime-local` wall clock → UTC Date. Never uses browser TZ. */
export function clinicalDatetimeLocalToUtcDate(
  localValue: string | null | undefined,
  facilityTimeZone: string
): Date | null {
  if (!localValue?.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localValue.trim());
  if (!match) return null;
  const tz = resolveClinicalTimeZone({ facilityTimeZone });
  const date = wallClockToUtc(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    tz
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function clinicalDatetimeLocalToUtcIso(
  localValue: string | null | undefined,
  facilityTimeZone: string
): string | null {
  const date = clinicalDatetimeLocalToUtcDate(localValue, facilityTimeZone);
  return date ? date.toISOString() : null;
}

/** User-facing clinical date/time in facility timezone (never browser-local). */
export function formatClinicalDateTimeInZone(
  instant: Date | string | null | undefined,
  locale: string,
  facilityTimeZone: string
): string {
  if (instant == null) return "";
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) return "";
  const tz = resolveClinicalTimeZone({ facilityTimeZone });
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export type ClinicalTimeTraceStep = {
  field: string;
  rawUtc: string;
  facilityTimeZone: string;
  wallClock: string;
  hourBucket: string;
};

/** Trace helper for audits — maps instant → facility wall + hour bucket label. */
export function traceClinicalInstantInZone(
  field: string,
  instant: Date | string,
  facilityTimeZone: string,
  hourBucketLabel: (instant: Date, tz: string) => string
): ClinicalTimeTraceStep {
  const date = instant instanceof Date ? instant : new Date(instant);
  const tz = resolveClinicalTimeZone({ facilityTimeZone });
  const parts = getZonedWallClockParts(date, tz);
  return {
    field,
    rawUtc: date.toISOString(),
    facilityTimeZone: tz,
    wallClock: `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)}`,
    hourBucket: hourBucketLabel(date, tz),
  };
}
