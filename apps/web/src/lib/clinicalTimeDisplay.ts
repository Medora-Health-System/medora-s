import {
  clinicalDatetimeLocalFromInstant,
  clinicalDatetimeLocalToUtcDate,
  clinicalDatetimeLocalToUtcIso,
  formatClinicalDateTimeInZone,
  resolveClinicalTimeZone,
} from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";

export {
  clinicalDatetimeLocalFromInstant,
  clinicalDatetimeLocalToUtcDate,
  clinicalDatetimeLocalToUtcIso,
  formatClinicalDateTimeInZone,
  resolveClinicalTimeZone,
};

/** Format ISO instant in facility timezone (never browser-local). */
export function formatClinicalInstantForFacility(
  instant: string | Date | null | undefined,
  facilityTimeZone: string | null | undefined,
  language: SupportedLanguage
): string {
  if (instant == null) return "";
  return formatClinicalDateTimeInZone(
    instant,
    encounterBcp47(language),
    resolveClinicalTimeZone({ facilityTimeZone })
  );
}
