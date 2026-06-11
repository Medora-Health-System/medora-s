/** PERF.1B — bounded encounter clinical list reads (MVP clinic; full detail via GET /orders/:id). */

/** Default/max order-event rows for encounter timeline reads. */
export const ENCOUNTER_ORDER_EVENTS_LIST_DEFAULT_LIMIT = 200;
export const ENCOUNTER_ORDER_EVENTS_LIST_MAX_LIMIT = 500;

/** @deprecated Use ENCOUNTER_ORDER_EVENTS_LIST_DEFAULT_LIMIT */
export const ENCOUNTER_ORDER_EVENTS_LIST_LIMIT = ENCOUNTER_ORDER_EVENTS_LIST_DEFAULT_LIMIT;

/** Order events older than this are omitted from encounter list reads. */
export const ENCOUNTER_ORDER_EVENTS_LOOKBACK_DAYS = 90;

/** Default/max MAR rows for encounter list reads. */
export const ENCOUNTER_MAR_LIST_DEFAULT_LIMIT = 200;
export const ENCOUNTER_MAR_LIST_MAX_LIMIT = 500;

/** @deprecated Use ENCOUNTER_MAR_LIST_DEFAULT_LIMIT */
export const ENCOUNTER_MAR_LIST_LIMIT = ENCOUNTER_MAR_LIST_DEFAULT_LIMIT;

/** MAR rows older than this are omitted from encounter list reads. */
export const ENCOUNTER_MAR_LOOKBACK_DAYS = 90;

/** Max dose rows scanned for pass queue (post-filter count may be lower). */
export const MEDICATION_PASS_QUEUE_LIST_LIMIT = 500;

/** Default pass-queue horizon when no shift window is provided (facility-wide reads). */
export const MEDICATION_PASS_QUEUE_DEFAULT_LOOKBACK_HOURS = 2;

export const MEDICATION_PASS_QUEUE_DEFAULT_LOOKAHEAD_HOURS = 24;

/** Max orders returned for encounter orders list (safety cap). */
export const ENCOUNTER_ORDERS_LIST_LIMIT = 200;

/** Terminal order events considered for attribution (lookback window). */
export const ENCOUNTER_ORDER_ATTRIBUTION_LOOKBACK_DAYS = 365;

/** Hard cap on terminal order events fetched for attribution resolution. */
export const ENCOUNTER_ORDER_ATTRIBUTION_EVENTS_CAP = 500;

export function encounterClinicalLookbackStart(now: Date, days: number): Date {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days);
  return start;
}

export function passQueueDefaultShiftWindow(now: Date): { shiftStart: Date; shiftEnd: Date } {
  const shiftStart = new Date(now);
  shiftStart.setUTCHours(shiftStart.getUTCHours() - MEDICATION_PASS_QUEUE_DEFAULT_LOOKBACK_HOURS);
  const shiftEnd = new Date(now);
  shiftEnd.setUTCHours(shiftEnd.getUTCHours() + MEDICATION_PASS_QUEUE_DEFAULT_LOOKAHEAD_HOURS);
  return { shiftStart, shiftEnd };
}

/** Parse optional `?limit=` query param with default and hard max. */
export function resolveBoundedListLimit(
  requested: number | undefined,
  defaultLimit: number,
  maxLimit: number
): number {
  if (requested == null || !Number.isFinite(requested) || requested <= 0) {
    return defaultLimit;
  }
  return Math.min(Math.floor(requested), maxLimit);
}

export function parseOptionalPositiveInt(value: string | undefined): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}
