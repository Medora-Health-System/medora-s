import {
  getZonedWallClockParts,
  wallClockToUtc,
} from "../medication/medicationDoseExpansionPlanner.js";
import {
  MEDORA_DEFAULT_FACILITY_TIMEZONE,
  resolveFacilityTimezone,
} from "./facilityTimezoneDefaults.js";

/** @deprecated Use MEDORA_DEFAULT_FACILITY_TIMEZONE for clinical paths. */
export const CLINICAL_TIME_ZONE_FALLBACK = MEDORA_DEFAULT_FACILITY_TIMEZONE;

/** Single clinical timezone authority: facility → hospital → enterprise default (MEDUI.ENTERPRISE.TIMEZONE.1). */
export function resolveClinicalTimeZone(input: {
  facilityTimeZone?: string | null;
  hospitalTimeZone?: string | null;
}): string {
  for (const raw of [input.facilityTimeZone, input.hospitalTimeZone]) {
    if (raw?.trim()) {
      return resolveFacilityTimezone(raw);
    }
  }
  return MEDORA_DEFAULT_FACILITY_TIMEZONE;
}

export function normalizeClinicalTimeZone(raw: string | null | undefined): string {
  return resolveFacilityTimezone(raw);
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
  const tz = resolveFacilityTimezone(facilityTimeZone);
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
  const tz = resolveFacilityTimezone(facilityTimeZone);
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

/** Format ISO instant in facility timezone for medication order/MAR display. */
export function resolveMedicationClinicalDisplayTime(input: {
  iso: string | Date | null | undefined;
  facilityTimezone: string | null | undefined;
  locale?: string;
}): string {
  if (input.iso == null) return "";
  return formatMedicationTimeInFacilityZone({
    iso: input.iso,
    facilityTimezone: input.facilityTimezone,
    locale: input.locale,
  });
}

/** Alias for medication-facing display — facility TZ is the single source of truth. */
export function formatMedicationTimeInFacilityZone(input: {
  iso: string | Date | null | undefined;
  facilityTimezone: string | null | undefined;
  locale?: string;
}): string {
  if (input.iso == null) return "";
  return formatClinicalDateTimeInZone(
    input.iso,
    input.locale ?? "en-US",
    resolveClinicalTimeZone({ facilityTimeZone: input.facilityTimezone })
  );
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
  const tz = resolveFacilityTimezone(facilityTimeZone);
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

/** Canonical display helper — UTC instant formatted in resolved facility timezone. */
export function formatClinicalInstantInFacilityTimeZone(input: {
  iso: string | Date | null | undefined;
  facilityTimezone: string | null | undefined;
  locale?: string;
}): string {
  if (input.iso == null) return "";
  return formatClinicalDateTimeInZone(
    input.iso,
    input.locale ?? "en-US",
    resolveFacilityTimezone(input.facilityTimezone)
  );
}

/** Parse facility-local datetime-local → UTC ISO. Never uses browser timezone. */
export function datetimeLocalToUtcIsoInFacilityTimeZone(input: {
  localValue: string | null | undefined;
  facilityTimezone: string | null | undefined;
}): string | null {
  return clinicalDatetimeLocalToUtcIso(
    input.localValue,
    resolveFacilityTimezone(input.facilityTimezone)
  );
}

/** UTC instant → facility-local datetime-local string (YYYY-MM-DDTHH:mm). */
export function utcIsoToDatetimeLocalValueInFacilityTimeZone(input: {
  iso: string | Date | null | undefined;
  facilityTimezone: string | null | undefined;
}): string {
  if (input.iso == null) return "";
  return clinicalDatetimeLocalFromInstant(
    input.iso,
    resolveFacilityTimezone(input.facilityTimezone)
  );
}

export type ClinicalTimeTraceStep = {
  field: string;
  rawUtc: string;
  facilityTimeZone: string;
  wallClock: string;
  hourBucket: string;
};

/**
 * Browser-local `datetime-local` (YYYY-MM-DDTHH:mm) from an ISO instant.
 * Uses native Date local components (DST-safe for the runtime timezone).
 * Prefer facility-TZ helpers when facilityTimeZone is known.
 */
export function instantToLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Browser-local `datetime-local` wall clock → ISO UTC instant.
 * Constructed via Date(y, m, d, h, min) so DST rules of the runtime apply.
 */
export function localDateTimeInputToIso(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const d = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
    0
  );
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Trace helper for audits — maps instant → facility wall + hour bucket label. */
export function traceClinicalInstantInZone(
  field: string,
  instant: Date | string,
  facilityTimeZone: string,
  hourBucketLabel: (instant: Date, tz: string) => string
): ClinicalTimeTraceStep {
  const date = instant instanceof Date ? instant : new Date(instant);
  const tz = resolveFacilityTimezone(facilityTimeZone);
  const parts = getZonedWallClockParts(date, tz);
  return {
    field,
    rawUtc: date.toISOString(),
    facilityTimeZone: tz,
    wallClock: `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)}`,
    hourBucket: hourBucketLabel(date, tz),
  };
}
