import {
  MAR_SHIFT_TIMELINE_SHIFT_LABELS,
  normalizeMarShiftTimelineTimeZone,
  resolveStandardMarShiftTimelineWindow,
  getZonedWallClockParts,
  wallClockToUtc,
  type MarShiftTimelineShiftCode,
  type MedicationAdministrationHistoryEntry,
} from "@medora/shared";

export type MarHistoricalTimelineScope = {
  selectedDateLocal: string;
  facilityTimeZone: string;
  shiftCode: MarShiftTimelineShiftCode;
  now?: Date;
};

export type MarHistoricalTimelineModel = {
  selectedDateLocal: string;
  facilityTimeZone: string;
  shiftCode: MarShiftTimelineShiftCode;
  isToday: boolean;
  isFuture: boolean;
  isHistorical: boolean;
  shiftStart: string;
  shiftEnd: string;
  shiftLabel: string;
  shiftTimeRangeLabel: string;
  dayBoundsStart: string;
  dayBoundsEnd: string;
  referenceAt: Date;
};

export type MarHistoryRailScopeMode = "selectedDay" | "all";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatLocalDate(parts: { year: number; month: number; day: number }): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function addCalendarDays(year: number, month: number, day: number, days: number) {
  const d = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function resolveFacilityLocalToday(
  facilityTimeZone: string,
  now: Date = new Date()
): string {
  const tz = normalizeMarShiftTimelineTimeZone(facilityTimeZone);
  const parts = getZonedWallClockParts(now, tz);
  return formatLocalDate(parts);
}

export function referenceAtForFacilityLocalDate(
  dateLocal: string,
  facilityTimeZone: string
): Date {
  const [year, month, day] = dateLocal.split("-").map((part) => Number(part));
  const tz = normalizeMarShiftTimelineTimeZone(facilityTimeZone);
  return wallClockToUtc(year, month, day, 12, 0, tz);
}

export function addFacilityLocalDays(
  dateLocal: string,
  deltaDays: number,
  facilityTimeZone: string
): string {
  const [year, month, day] = dateLocal.split("-").map((part) => Number(part));
  const next = addCalendarDays(year, month, day, deltaDays);
  return formatLocalDate(next);
}

export function compareFacilityLocalDates(a: string, b: string): number {
  return a.localeCompare(b);
}

export function resolveFacilityLocalDayBounds(
  dateLocal: string,
  facilityTimeZone: string
): { startIso: string; endIso: string } {
  const [year, month, day] = dateLocal.split("-").map((part) => Number(part));
  const tz = normalizeMarShiftTimelineTimeZone(facilityTimeZone);
  const startAt = wallClockToUtc(year, month, day, 0, 0, tz);
  const next = addCalendarDays(year, month, day, 1);
  const endAt = wallClockToUtc(next.year, next.month, next.day, 0, 0, tz);
  return { startIso: startAt.toISOString(), endIso: endAt.toISOString() };
}

export function formatMarHistoricalShiftTimeRange(
  startAt: Date,
  endAt: Date,
  facilityTimeZone: string,
  locale: "en" | "fr"
): string {
  const fmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    timeZone: normalizeMarShiftTimelineTimeZone(facilityTimeZone),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${fmt.format(startAt)}–${fmt.format(endAt)}`;
}

export function formatMarHistoricalDateLabel(
  dateLocal: string,
  locale: "en" | "fr",
  facilityTimeZone: string = "UTC"
): string {
  const ref = referenceAtForFacilityLocalDate(dateLocal, facilityTimeZone);
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    timeZone: normalizeMarShiftTimelineTimeZone(facilityTimeZone),
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(ref);
}

export function buildHistoricalMarTimeline(
  input: MarHistoricalTimelineScope & { locale?: "en" | "fr" }
): MarHistoricalTimelineModel {
  const facilityTimeZone = normalizeMarShiftTimelineTimeZone(input.facilityTimeZone);
  const now = input.now ?? new Date();
  const todayLocal = resolveFacilityLocalToday(facilityTimeZone, now);
  const isToday = input.selectedDateLocal === todayLocal;
  const isFuture = compareFacilityLocalDates(input.selectedDateLocal, todayLocal) > 0;
  const isHistorical = !isToday;
  const referenceAt = isToday
    ? now
    : referenceAtForFacilityLocalDate(input.selectedDateLocal, facilityTimeZone);

  const shiftCode =
    input.shiftCode === "CUSTOM" ? ("7A_7P" as const) : input.shiftCode;
  const { startAt, endAt } = resolveStandardMarShiftTimelineWindow(
    shiftCode,
    referenceAt,
    facilityTimeZone
  );
  const dayBounds = resolveFacilityLocalDayBounds(input.selectedDateLocal, facilityTimeZone);
  const locale = input.locale ?? "en";

  return {
    selectedDateLocal: input.selectedDateLocal,
    facilityTimeZone,
    shiftCode: input.shiftCode,
    isToday,
    isFuture,
    isHistorical,
    shiftStart: startAt.toISOString(),
    shiftEnd: endAt.toISOString(),
    shiftLabel: MAR_SHIFT_TIMELINE_SHIFT_LABELS[shiftCode] ?? shiftCode,
    shiftTimeRangeLabel: formatMarHistoricalShiftTimeRange(
      startAt,
      endAt,
      facilityTimeZone,
      locale
    ),
    dayBoundsStart: dayBounds.startIso,
    dayBoundsEnd: dayBounds.endIso,
    referenceAt,
  };
}

export function shouldUseExplicitMarShiftWindow(model: MarHistoricalTimelineModel): boolean {
  return model.isHistorical || model.isFuture;
}

export function filterMedicationAdministrationHistoryByInstantWindow(
  entries: MedicationAdministrationHistoryEntry[],
  window: { startIso: string; endIso: string }
): MedicationAdministrationHistoryEntry[] {
  const startMs = Date.parse(window.startIso);
  const endMs = Date.parse(window.endIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return entries;
  return entries.filter((entry) => {
    const eventMs = Date.parse(entry.eventAt);
    return Number.isFinite(eventMs) && eventMs >= startMs && eventMs < endMs;
  });
}

export function marHistoricalDateStorageKey(
  facilityId: string,
  encounterId: string,
  userId: string
): string {
  return `medora.marHistoricalDate.${facilityId}.${encounterId}.${userId}`;
}

export function readStoredMarHistoricalDateLocal(
  facilityId: string,
  encounterId: string,
  userId: string
): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(
      marHistoricalDateStorageKey(facilityId, encounterId, userId)
    );
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export function writeStoredMarHistoricalDateLocal(
  facilityId: string,
  encounterId: string,
  userId: string,
  dateLocal: string
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      marHistoricalDateStorageKey(facilityId, encounterId, userId),
      dateLocal
    );
  } catch {
    /* ignore */
  }
}
