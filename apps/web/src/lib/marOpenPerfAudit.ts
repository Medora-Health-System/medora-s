/**
 * MEDUI.INP.2E.1 — development/test-only MAR open timing.
 * No PHI. No medication/patient content. Silent in production unless explicitly enabled.
 */

const MARK_PREFIX = "medora-mar-open:";

function isMarOpenPerfAuditEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV !== "production") return true;
  try {
    return window.localStorage.getItem("MEDORA_MAR_PERF") === "1";
  } catch {
    return false;
  }
}

export function marOpenPerfMark(name: string): void {
  if (!isMarOpenPerfAuditEnabled()) return;
  const key = `${MARK_PREFIX}${name}`;
  try {
    performance.clearMarks(key);
    performance.mark(key);
  } catch {
    /* ignore */
  }
}

export function marOpenPerfMeasure(name: string, startMark: string, endMark: string): number | null {
  if (!isMarOpenPerfAuditEnabled()) return null;
  const start = `${MARK_PREFIX}${startMark}`;
  const end = `${MARK_PREFIX}${endMark}`;
  try {
    const measureName = `${MARK_PREFIX}measure:${name}`;
    performance.clearMeasures(measureName);
    performance.measure(measureName, start, end);
    const entries = performance.getEntriesByName(measureName);
    const last = entries[entries.length - 1];
    return last && Number.isFinite(last.duration) ? last.duration : null;
  } catch {
    return null;
  }
}
