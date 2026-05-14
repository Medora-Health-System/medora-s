/**
 * Phase 13B / 13C — Observation / short-stay operational snapshot and stay summaries (computed only).
 * No persistence, no billing codes, no disposition string changes.
 * Safe for INPATIENT (observation board) rows; returns null for other types where noted.
 */

export const OBSERVATION_REASSESSMENT_DUE_MS = 2 * 60 * 60 * 1000;
export const OBSERVATION_REASSESSMENT_OVERDUE_MS = 4 * 60 * 60 * 1000;
export const OBSERVATION_VITALS_STALE_MS = 4 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ObservationTrackboardOpsInput = {
  resultsPendingCount: number;
  criticalResultUnacknowledged: boolean;
  lastNursingReassessmentAt: string | null;
  firstDispositionDocAt: string | null;
  lastTriageVitalsRecordedAt?: string | null;
};

export type ObservationOperationalFlags = {
  /** Early observation workflow (arrived / triage corridor). */
  boardingOperational: boolean;
  reassessmentDue: boolean;
  reassessmentOverdue: boolean;
  readyForDischarge: boolean;
  /** Workflow in disposition phase (transfer / discharge work-up). */
  dispositionPhase: boolean;
  assignPhysicianGap: boolean;
  assignRnGap: boolean;
  resultsPending: boolean;
  criticalLabsUnacked: boolean;
};

export type ObservationOperationalSnapshot = {
  anchorKind: "admittedAt" | "createdAt";
  anchorIso: string;
  losMs: number;
  losLabel: string;
  losLabelCompact: string;
  /** True when UTC calendar date differs between anchor and now (conservative; not facility TZ). */
  overnightUtcSpan: boolean;
  /** True when elapsed observation time ≥ 24h. */
  extendedStay24h: boolean;
  flags: ObservationOperationalFlags;
  vitalsAgeMs: number | null;
  vitalsStale: boolean;
  providerSignedAgeMs: number | null;
};

function parseIsoMs(v: unknown): number | null {
  if (v == null) return null;
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof v === "string" || typeof v === "number") {
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

function utcYmd(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatLosLabel(hours: number, minutes: number): { label: string; labelCompact: string } {
  const label = `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m`;
  const labelCompact = `${hours}h${minutes.toString().padStart(2, "0")}`;
  return { label, labelCompact };
}

/**
 * LOS anchor for observation / short stay: prefer `admittedAt` when set (admission packet clock),
 * else encounter `createdAt` (defensive fallback).
 */
export function resolveObservationLosAnchorMs(input: {
  admittedAt: unknown;
  createdAt: unknown;
}): { anchorMs: number; anchorKind: "admittedAt" | "createdAt" } | null {
  const admittedMs = parseIsoMs(input.admittedAt);
  const createdMs = parseIsoMs(input.createdAt);
  if (admittedMs != null) {
    return { anchorMs: admittedMs, anchorKind: "admittedAt" };
  }
  if (createdMs != null) {
    return { anchorMs: createdMs, anchorKind: "createdAt" };
  }
  return null;
}

export function computeObservationOperationalSnapshot(input: {
  encounterType: string;
  status: string;
  workflowState: string;
  admittedAt: unknown;
  createdAt: unknown;
  physicianAssignedUserId?: string | null;
  nurseAssignedUserId?: string | null;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: unknown;
  trackboardOps: ObservationTrackboardOpsInput;
  nowMs?: number;
}): ObservationOperationalSnapshot | null {
  if (input.encounterType !== "INPATIENT" || input.status !== "OPEN") {
    return null;
  }

  const now =
    typeof input.nowMs === "number" && Number.isFinite(input.nowMs) ? input.nowMs : Date.now();
  const anchor = resolveObservationLosAnchorMs({
    admittedAt: input.admittedAt,
    createdAt: input.createdAt,
  });
  if (!anchor) return null;

  const losMs = Math.max(0, now - anchor.anchorMs);
  const totalMinutes = Math.floor(losMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const { label, labelCompact } = formatLosLabel(hours, minutes);

  const overnightUtcSpan = utcYmd(anchor.anchorMs) !== utcYmd(now);
  const extendedStay24h = losMs >= MS_PER_DAY;

  const ws = (input.workflowState ?? "").trim();
  const boardingOperational = ws === "ARRIVED" || ws === "TRIAGE";

  const lastReMs = parseIsoMs(input.trackboardOps.lastNursingReassessmentAt);
  let reassessmentDue = false;
  let reassessmentOverdue = false;
  if (lastReMs == null) {
    if (losMs >= OBSERVATION_REASSESSMENT_OVERDUE_MS) {
      reassessmentOverdue = true;
    } else if (losMs >= OBSERVATION_REASSESSMENT_DUE_MS) {
      reassessmentDue = true;
    }
  } else {
    const sinceRe = Math.max(0, now - lastReMs);
    if (sinceRe >= OBSERVATION_REASSESSMENT_OVERDUE_MS) {
      reassessmentOverdue = true;
    } else if (sinceRe >= OBSERVATION_REASSESSMENT_DUE_MS) {
      reassessmentDue = true;
    }
  }

  const readyForDischarge = ws === "DISCHARGE_READY";
  const dispositionPhase = ws === "DISPOSITION";

  const assignPhysicianGap = !((input.physicianAssignedUserId ?? "").trim());
  const assignRnGap = !((input.nurseAssignedUserId ?? "").trim());

  const resultsPending = (input.trackboardOps.resultsPendingCount ?? 0) > 0;
  const criticalLabsUnacked = Boolean(input.trackboardOps.criticalResultUnacknowledged);

  const vitalsMs = parseIsoMs(input.trackboardOps.lastTriageVitalsRecordedAt ?? null);
  const vitalsAgeMs = vitalsMs != null ? Math.max(0, now - vitalsMs) : null;
  const vitalsStale = vitalsAgeMs != null && vitalsAgeMs > OBSERVATION_VITALS_STALE_MS;

  const signedMs = parseIsoMs(input.providerDocumentationSignedAt ?? null);
  const providerSignedAgeMs =
    (input.providerDocumentationStatus ?? "").trim() === "SIGNED" && signedMs != null
      ? Math.max(0, now - signedMs)
      : null;

  return {
    anchorKind: anchor.anchorKind,
    anchorIso: new Date(anchor.anchorMs).toISOString(),
    losMs,
    losLabel: label,
    losLabelCompact: labelCompact,
    overnightUtcSpan,
    extendedStay24h,
    flags: {
      boardingOperational,
      reassessmentDue,
      reassessmentOverdue,
      readyForDischarge,
      dispositionPhase,
      assignPhysicianGap,
      assignRnGap,
      resultsPending,
      criticalLabsUnacked,
    },
    vitalsAgeMs,
    vitalsStale,
    providerSignedAgeMs,
  };
}

/** Schema tag for billing / export payloads (additive metadata only). */
export const OBSERVATION_STAY_EXPORT_SCHEMA_VERSION = "medora_observation_stay_summary_v1" as const;

/**
 * Closed-stay or preview LOS for observation / short stay (`INPATIENT` only).
 * No billing codes, no DRG, no clinical narrative — operational duration only.
 */
export type ObservationStaySummaryForExport = {
  schemaVersion: typeof OBSERVATION_STAY_EXPORT_SCHEMA_VERSION;
  applicable: boolean;
  carePathLabel: "observation_short_stay" | null;
  anchorKind: "admittedAt" | "createdAt" | null;
  anchorIso: string | null;
  stayEndIso: string | null;
  observationLosHours: number | null;
  observationLosMinutes: number | null;
  overnightObservationUtcSpan: boolean;
  extendedObservation24hPlus: boolean;
  /** True when `stayEndIso` comes from `previewNowMs` (open encounter), not `dischargedAt`. */
  preview: boolean;
};

/**
 * LOS end = `dischargedAt` when set; otherwise optional `previewNowMs` (e.g. `Date.now()` for open charts).
 */
export function computeObservationStaySummaryForExport(input: {
  encounterType: string;
  admittedAt: unknown;
  createdAt: unknown;
  dischargedAt: unknown | null | undefined;
  previewNowMs?: number | null;
}): ObservationStaySummaryForExport {
  const empty: ObservationStaySummaryForExport = {
    schemaVersion: OBSERVATION_STAY_EXPORT_SCHEMA_VERSION,
    applicable: false,
    carePathLabel: null,
    anchorKind: null,
    anchorIso: null,
    stayEndIso: null,
    observationLosHours: null,
    observationLosMinutes: null,
    overnightObservationUtcSpan: false,
    extendedObservation24hPlus: false,
    preview: false,
  };

  if (input.encounterType !== "INPATIENT") {
    return empty;
  }

  const anchor = resolveObservationLosAnchorMs({
    admittedAt: input.admittedAt,
    createdAt: input.createdAt,
  });

  const dischargedMs = parseIsoMs(input.dischargedAt);
  const previewMs =
    typeof input.previewNowMs === "number" && Number.isFinite(input.previewNowMs) ? input.previewNowMs : null;
  const endMs = dischargedMs ?? previewMs;
  const preview = dischargedMs == null && previewMs != null;

  if (!anchor) {
    return {
      schemaVersion: OBSERVATION_STAY_EXPORT_SCHEMA_VERSION,
      applicable: true,
      carePathLabel: "observation_short_stay",
      anchorKind: null,
      anchorIso: null,
      stayEndIso: endMs != null ? new Date(endMs).toISOString() : null,
      observationLosHours: null,
      observationLosMinutes: null,
      overnightObservationUtcSpan: false,
      extendedObservation24hPlus: false,
      preview,
    };
  }

  if (endMs == null) {
    return {
      schemaVersion: OBSERVATION_STAY_EXPORT_SCHEMA_VERSION,
      applicable: true,
      carePathLabel: "observation_short_stay",
      anchorKind: anchor.anchorKind,
      anchorIso: new Date(anchor.anchorMs).toISOString(),
      stayEndIso: null,
      observationLosHours: null,
      observationLosMinutes: null,
      overnightObservationUtcSpan: false,
      extendedObservation24hPlus: false,
      preview: false,
    };
  }

  const losMs = Math.max(0, endMs - anchor.anchorMs);
  const observationLosHours = Math.round((losMs / 3600000) * 100) / 100;
  const observationLosMinutes = Math.floor(losMs / 60000);
  const overnightObservationUtcSpan = utcYmd(anchor.anchorMs) !== utcYmd(endMs);
  const extendedObservation24hPlus = losMs >= MS_PER_DAY;

  return {
    schemaVersion: OBSERVATION_STAY_EXPORT_SCHEMA_VERSION,
    applicable: true,
    carePathLabel: "observation_short_stay",
    anchorKind: anchor.anchorKind,
    anchorIso: new Date(anchor.anchorMs).toISOString(),
    stayEndIso: new Date(endMs).toISOString(),
    observationLosHours,
    observationLosMinutes,
    overnightObservationUtcSpan,
    extendedObservation24hPlus,
    preview,
  };
}
