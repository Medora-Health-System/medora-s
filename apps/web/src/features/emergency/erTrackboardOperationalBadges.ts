/**
 * Phase 10B — pure operational badge helpers for the ER trackboard (reminders only).
 */

export type TrackboardOpsPayload = {
  resultsPendingCount: number;
  criticalResultUnacknowledged: boolean;
  lastNursingReassessmentAt: string | null;
  firstDispositionDocAt: string | null;
};

/** Format duration as 01h12 (zero-padded hours; minutes two digits). */
export function formatDurationMsAsHhMm(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "00h00";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}h${minutes.toString().padStart(2, "0")}`;
}

export function parseIsoMs(iso: string | null | undefined): number | null {
  if (iso == null || typeof iso !== "string" || !iso.trim()) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

export function reassessmentDue(args: {
  nowMs: number;
  encounterCreatedMs: number;
  triageCompleteMs: number | null;
  lastReassessmentMs: number | null;
  esi: number | null | undefined;
}): boolean {
  const { nowMs, encounterCreatedMs, triageCompleteMs, lastReassessmentMs, esi } = args;
  if (!Number.isFinite(nowMs) || !Number.isFinite(encounterCreatedMs)) return false;
  const thresholdMs = esi != null && esi <= 2 ? 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
  const baseline = triageCompleteMs ?? encounterCreatedMs;
  const ref = lastReassessmentMs ?? baseline;
  return nowMs - ref >= thresholdMs;
}

export function dispositionDecisionMsFromEncounterFields(args: {
  admittedAtMs: number | null;
  firstDispositionDocMs: number | null;
}): number | null {
  const { admittedAtMs, firstDispositionDocMs } = args;
  if (admittedAtMs != null && firstDispositionDocMs != null) {
    return Math.min(admittedAtMs, firstDispositionDocMs);
  }
  return admittedAtMs ?? firstDispositionDocMs ?? null;
}
