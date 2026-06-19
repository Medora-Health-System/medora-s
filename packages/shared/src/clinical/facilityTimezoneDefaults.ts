/** MEDUI.ENTERPRISE.TIMEZONE.1 — enterprise facility timezone defaults (never Haiti in production paths). */

export const MEDORA_DEFAULT_FACILITY_TIMEZONE = "America/Chicago" as const;

/** @deprecated Use MEDORA_DEFAULT_FACILITY_TIMEZONE — UTC is not a clinical display fallback. */
export const CLINICAL_TIME_ZONE_LEGACY_UTC_FALLBACK = "UTC";

export function isValidIanaTimezone(value: string | null | undefined): boolean {
  const tz = value?.trim();
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves facility timezone from Facility.timezone (or equivalent).
 * Invalid / missing values fall back to America/Chicago — never browser local, never Haiti.
 */
export function resolveFacilityTimezone(value?: string | null): string {
  const trimmed = value?.trim();
  if (trimmed && isValidIanaTimezone(trimmed)) return trimmed;
  return MEDORA_DEFAULT_FACILITY_TIMEZONE;
}
