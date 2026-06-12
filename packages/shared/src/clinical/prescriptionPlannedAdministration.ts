import { clinicalDatetimeLocalFromInstant } from "./clinicalTimeZone.js";

/** Browser-local datetime-local (YYYY-MM-DDTHH:mm) — must never be clinical authority. */
export function browserLocalDatetimeLocalValue(now = new Date()): string {
  const x = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return x.toISOString().slice(0, 16);
}

/** True when a planned-admin value matches browser-local wall clock (K.10B.5). */
export function isBrowserLocalPlannedAdminArtifact(
  localValue: string | null | undefined,
  now = new Date()
): boolean {
  const raw = localValue?.trim();
  if (!raw) return false;
  return raw === browserLocalDatetimeLocalValue(now);
}

/** True when facility-local planned admin matches facility wall clock for `now`. */
export function isFacilityLocalPlannedAdminNow(
  localValue: string | null | undefined,
  facilityTimeZone: string,
  now = new Date()
): boolean {
  const raw = localValue?.trim();
  if (!raw) return false;
  return raw === clinicalDatetimeLocalFromInstant(now, facilityTimeZone);
}

/**
 * Whether an untouched planned-admin field should be replaced with facility-local now.
 * Replaces empty values, browser artifacts, and stale UTC-skewed auto defaults.
 */
export function shouldReplaceUntouchedPlannedAdminLocal(input: {
  localValue?: string | null;
  plannedAdminAtTouched?: boolean;
  facilityTimeZone: string;
  now?: Date;
}): boolean {
  if (input.plannedAdminAtTouched) return false;
  const raw = input.localValue?.trim();
  if (!raw) return true;
  const now = input.now ?? new Date();
  if (isBrowserLocalPlannedAdminArtifact(raw, now)) return true;
  const facilityNow = clinicalDatetimeLocalFromInstant(now, input.facilityTimeZone);
  if (raw !== facilityNow) {
    const browserNow = browserLocalDatetimeLocalValue(now);
    if (raw === browserNow) return true;
  }
  return false;
}
