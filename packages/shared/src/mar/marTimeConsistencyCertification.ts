/** MEDUI.ED.MAR.TIME.CERTIFICATION.1 — certify medication display time consistency. */

import {
  resolveMedicationClinicalDisplayTime,
  formatClinicalInstantInFacilityTimeZone,
} from "../clinical/clinicalTimeZone.js";

export type MarTimeConsistencySnapshot = {
  storedUtcIso: string;
  facilityTimezone: string;
  orderDisplayTime: string;
  prescriptionDisplayTime: string;
  doseScheduledDisplayTime: string;
  marTimelineDisplayTime: string;
  administrationModalDisplayTime: string;
  postHocAdjustTimeDisplayTime: string;
  historyRailDisplayTime: string;
};

export type MarTimeConsistencyField =
  | "orderDisplayTime"
  | "prescriptionDisplayTime"
  | "doseScheduledDisplayTime"
  | "marTimelineDisplayTime"
  | "administrationModalDisplayTime"
  | "postHocAdjustTimeDisplayTime"
  | "historyRailDisplayTime";

const DISPLAY_FIELDS: MarTimeConsistencyField[] = [
  "orderDisplayTime",
  "prescriptionDisplayTime",
  "doseScheduledDisplayTime",
  "marTimelineDisplayTime",
  "administrationModalDisplayTime",
  "postHocAdjustTimeDisplayTime",
  "historyRailDisplayTime",
];

export type MarTimeConsistencyCertificationResult = {
  ok: boolean;
  mismatches: Array<{ field: MarTimeConsistencyField; expected: string; actual: string }>;
  canonicalDisplayTime: string;
};

/** Build a certified snapshot where every display field uses the shared facility-TZ helper. */
export function buildMarTimeConsistencySnapshot(input: {
  storedUtcIso: string;
  facilityTimezone: string;
  locale?: string;
}): MarTimeConsistencySnapshot {
  const display = resolveMedicationClinicalDisplayTime({
    iso: input.storedUtcIso,
    facilityTimezone: input.facilityTimezone,
    locale: input.locale,
  });
  return {
    storedUtcIso: input.storedUtcIso,
    facilityTimezone: input.facilityTimezone,
    orderDisplayTime: display,
    prescriptionDisplayTime: display,
    doseScheduledDisplayTime: display,
    marTimelineDisplayTime: display,
    administrationModalDisplayTime: display,
    postHocAdjustTimeDisplayTime: display,
    historyRailDisplayTime: display,
  };
}

/**
 * Certifies that all display fields representing the same clinical instant match.
 * Mismatch if any field differs from the canonical facility-TZ display string.
 */
export function certifyMarTimeConsistency(
  snapshot: MarTimeConsistencySnapshot,
  options?: { locale?: string }
): MarTimeConsistencyCertificationResult {
  const locale = options?.locale ?? "en-US";
  const canonicalDisplayTime = resolveMedicationClinicalDisplayTime({
    iso: snapshot.storedUtcIso,
    facilityTimezone: snapshot.facilityTimezone,
    locale,
  });

  const mismatches: MarTimeConsistencyCertificationResult["mismatches"] = [];

  for (const field of DISPLAY_FIELDS) {
    const actual = snapshot[field].trim();
    if (actual !== canonicalDisplayTime.trim()) {
      mismatches.push({ field, expected: canonicalDisplayTime, actual: snapshot[field] });
    }
  }

  return {
    ok: mismatches.length === 0,
    mismatches,
    canonicalDisplayTime,
  };
}

/** Regression guard: facility display must differ from a browser-offset display by ~1 hour. */
export function detectMarTimeConsistencyOneHourOffsetRegression(input: {
  storedUtcIso: string;
  facilityTimezone: string;
  browserOffsetDisplayTime: string;
  locale?: string;
}): boolean {
  const facilityDisplay = resolveMedicationClinicalDisplayTime({
    iso: input.storedUtcIso,
    facilityTimezone: input.facilityTimezone,
    locale: input.locale,
  });
  if (facilityDisplay.trim() === input.browserOffsetDisplayTime.trim()) {
    return false;
  }
  const facilityMatch = /(\d{1,2}):(\d{2})/.exec(facilityDisplay);
  const browserMatch = /(\d{1,2}):(\d{2})/.exec(input.browserOffsetDisplayTime);
  if (!facilityMatch || !browserMatch) return false;
  const facilityMinutes = Number(facilityMatch[1]) * 60 + Number(facilityMatch[2]);
  const browserMinutes = Number(browserMatch[1]) * 60 + Number(browserMatch[2]);
  const delta = Math.abs(facilityMinutes - browserMinutes);
  return delta >= 59 && delta <= 61;
}

/** Detects production bug: timeline 02:00 AM vs modal 03:00 AM for same UTC instant. */
export function detectMarOneHourModalTimelineMismatch(input: {
  storedUtcIso: string;
  facilityTimezone: string;
  timelineDisplayTime: string;
  modalDisplayTime: string;
  locale?: string;
}): boolean {
  void input.storedUtcIso;
  void input.facilityTimezone;
  void input.locale;

  const extractMinutes = (display: string): number | null => {
    const match = /(\d{1,2}):(\d{2})/.exec(display);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };

  const timelineMinutes = extractMinutes(input.timelineDisplayTime);
  const modalMinutes = extractMinutes(input.modalDisplayTime);
  if (timelineMinutes == null || modalMinutes == null) return false;

  const crossDelta = Math.abs(timelineMinutes - modalMinutes);
  return crossDelta >= 59 && crossDelta <= 61;
}
