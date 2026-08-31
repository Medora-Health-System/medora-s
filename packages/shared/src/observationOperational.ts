/**
 * Phase 13B / 13C — Observation / short-stay operational snapshot and stay summaries (computed only).
 * No persistence, no billing codes, no disposition string changes.
 * Safe for INPATIENT (observation board) rows; returns null for other types where noted.
 *
 * D4A.4.3 — assignPhysicianGap / assignRnGap use certified enterprise ownership
 * (hospital bag PRIMARY_*); never ED columns as active OBS/IP care team under STRICT.
 */

import { resolveObservationAssignmentGaps } from "./encounters/enterpriseOperationalOwnershipCompletionD4a43.js";
import { isObservationOperationalStay } from "./encounters/hospitalDestinationIntent.js";

export const OBSERVATION_REASSESSMENT_DUE_MS = 2 * 60 * 60 * 1000;
export const OBSERVATION_REASSESSMENT_OVERDUE_MS = 4 * 60 * 60 * 1000;
export const OBSERVATION_VITALS_STALE_MS = 4 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ObservationTrackboardOpsInput = {
  resultsPendingCount: number;
  criticalResultUnacknowledged: boolean;
  lastNursingReassessmentAt: string | null;
  /** Phase 13G-B — last PROVIDER role observation reassessment clinical event (ISO), if any. */
  lastProviderObservationReassessmentAt?: string | null;
  /**
   * Phase 13G-C — last RN observation reassessment only (`OBSERVATION_REASSESSMENT_V1` + role RN).
   * Excludes ER `erNursingReassessmentV1` so observation due/overdue lanes stay accurate on INPATIENT.
   */
  lastRnObservationReassessmentAt?: string | null;
  firstDispositionDocAt: string | null;
  lastTriageVitalsRecordedAt?: string | null;
};

/**
 * Merge optional trackboard payload (list/board APIs) with triage vitals timestamps for encounter-detail
 * observation snapshots. Pure; no I/O.
 */
export function mergeObservationTrackboardOpsInput(
  trackboard: Partial<ObservationTrackboardOpsInput> | null | undefined,
  triageLastAt: string | null | undefined
): ObservationTrackboardOpsInput {
  return {
    resultsPendingCount: typeof trackboard?.resultsPendingCount === "number" ? trackboard.resultsPendingCount : 0,
    criticalResultUnacknowledged: Boolean(trackboard?.criticalResultUnacknowledged),
    lastNursingReassessmentAt:
      typeof trackboard?.lastNursingReassessmentAt === "string" ? trackboard.lastNursingReassessmentAt : null,
    lastProviderObservationReassessmentAt:
      typeof trackboard?.lastProviderObservationReassessmentAt === "string"
        ? trackboard.lastProviderObservationReassessmentAt
        : null,
    lastRnObservationReassessmentAt:
      typeof trackboard?.lastRnObservationReassessmentAt === "string"
        ? trackboard.lastRnObservationReassessmentAt
        : null,
    firstDispositionDocAt:
      typeof trackboard?.firstDispositionDocAt === "string" ? trackboard.firstDispositionDocAt : null,
    lastTriageVitalsRecordedAt:
      triageLastAt ??
      (typeof trackboard?.lastTriageVitalsRecordedAt === "string" ? trackboard.lastTriageVitalsRecordedAt : null),
  };
}

export type ObservationOperationalFlags = {
  /** Early observation workflow (arrived / triage corridor). */
  boardingOperational: boolean;
  /** Any lane (provider or RN observation) in the 2h–4h window. */
  reassessmentDue: boolean;
  /** Any lane ≥4h since last role-specific reassessment or anchor when none. */
  reassessmentOverdue: boolean;
  /** Provider observation reassessment lane only (13G-C). */
  providerReassessmentDue: boolean;
  providerReassessmentOverdue: boolean;
  /** RN observation reassessment lane only (excludes ER namespace). */
  rnObservationReassessmentDue: boolean;
  rnObservationReassessmentOverdue: boolean;
  readyForDischarge: boolean;
  /** Workflow in disposition phase (transfer / discharge work-up). */
  dispositionPhase: boolean;
  assignPhysicianGap: boolean;
  assignRnGap: boolean;
  resultsPending: boolean;
  criticalLabsUnacked: boolean;
};

/** Read-only operational blocker (computed guidance, not a clinical rule). */
export type ObservationOperationalBlocker = {
  id: ObservationOperationalBlockerId;
  severity: "critical" | "warning" | "info";
  /** Lower sorts first (higher operational urgency). */
  sortPriority: number;
};

export type ObservationOperationalBlockerId =
  | "CRITICAL_RESULT_UNACKED"
  | "VITALS_STALE"
  | "PROVIDER_REASSESSMENT_OVERDUE"
  | "RN_REASSESSMENT_OVERDUE"
  | "PROVIDER_REASSESSMENT_DUE"
  | "RN_REASSESSMENT_DUE"
  | "PENDING_RESULTS"
  | "NO_PROVIDER_ASSIGNED"
  | "NO_RN_ASSIGNED"
  | "LOS_ESCALATION_24H"
  | "DISCHARGE_READY_DOC_GAP";

export type ObservationReadinessLineId =
  | "CONTINUE_OBSERVATION"
  | "NEEDS_REASSESSMENT"
  | "NEEDS_RESULTS_REVIEW"
  | "READY_FOR_DISCHARGE_WORKFLOW"
  | "NEEDS_ESCALATION_REVIEW";

export type ObservationReadinessLine = {
  id: ObservationReadinessLineId;
  /** When true, the line is highlighted as applicable (informational). */
  active: boolean;
};

export type ObservationReassessmentLaneState = {
  lastAtIso: string | null;
  due: boolean;
  overdue: boolean;
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
  /** Echo of first disposition-related clinical doc (admission/discharge summary), for read-only blockers. */
  firstDispositionDocAt: string | null;
  reassessmentLanes: {
    provider: ObservationReassessmentLaneState;
    rnObservation: ObservationReassessmentLaneState;
  };
  operationalBlockers: ObservationOperationalBlocker[];
  readinessLines: ObservationReadinessLine[];
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

/**
 * Phase 13G-C — per-lane reassessment clock: same thresholds as legacy combined logic,
 * but anchored independently when that lane has no event yet.
 */
export function computeObservationReassessmentLaneState(input: {
  anchorMs: number;
  nowMs: number;
  lastEventMs: number | null;
}): { due: boolean; overdue: boolean } {
  const { anchorMs, nowMs, lastEventMs } = input;
  if (lastEventMs == null) {
    const sinceAnchor = Math.max(0, nowMs - anchorMs);
    if (sinceAnchor >= OBSERVATION_REASSESSMENT_OVERDUE_MS) {
      return { due: false, overdue: true };
    }
    if (sinceAnchor >= OBSERVATION_REASSESSMENT_DUE_MS) {
      return { due: true, overdue: false };
    }
    return { due: false, overdue: false };
  }
  const since = Math.max(0, nowMs - lastEventMs);
  if (since >= OBSERVATION_REASSESSMENT_OVERDUE_MS) {
    return { due: false, overdue: true };
  }
  if (since >= OBSERVATION_REASSESSMENT_DUE_MS) {
    return { due: true, overdue: false };
  }
  return { due: false, overdue: false };
}

function laneDisplayIso(v: string | null | undefined): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s !== "" ? s : null;
}

function buildObservationOperationalBlockers(input: {
  flags: ObservationOperationalFlags;
  vitalsStale: boolean;
  extendedStay24h: boolean;
  readyForDischarge: boolean;
  firstDispositionDocAt: string | null;
}): ObservationOperationalBlocker[] {
  const out: ObservationOperationalBlocker[] = [];
  const { flags, vitalsStale, extendedStay24h, readyForDischarge, firstDispositionDocAt } = input;

  if (flags.criticalLabsUnacked) {
    out.push({ id: "CRITICAL_RESULT_UNACKED", severity: "critical", sortPriority: 10 });
  }
  if (vitalsStale) {
    out.push({ id: "VITALS_STALE", severity: "warning", sortPriority: 20 });
  }
  if (flags.providerReassessmentOverdue) {
    out.push({ id: "PROVIDER_REASSESSMENT_OVERDUE", severity: "warning", sortPriority: 30 });
  }
  if (flags.rnObservationReassessmentOverdue) {
    out.push({ id: "RN_REASSESSMENT_OVERDUE", severity: "warning", sortPriority: 35 });
  }
  if (flags.resultsPending) {
    out.push({ id: "PENDING_RESULTS", severity: "info", sortPriority: 40 });
  }
  if (readyForDischarge && firstDispositionDocAt == null) {
    out.push({ id: "DISCHARGE_READY_DOC_GAP", severity: "info", sortPriority: 45 });
  }
  if (extendedStay24h) {
    out.push({ id: "LOS_ESCALATION_24H", severity: "warning", sortPriority: 50 });
  }
  if (flags.assignPhysicianGap) {
    out.push({ id: "NO_PROVIDER_ASSIGNED", severity: "warning", sortPriority: 55 });
  }
  if (flags.assignRnGap) {
    out.push({ id: "NO_RN_ASSIGNED", severity: "warning", sortPriority: 60 });
  }
  if (flags.providerReassessmentDue) {
    out.push({ id: "PROVIDER_REASSESSMENT_DUE", severity: "info", sortPriority: 70 });
  }
  if (flags.rnObservationReassessmentDue) {
    out.push({ id: "RN_REASSESSMENT_DUE", severity: "info", sortPriority: 75 });
  }

  out.sort((a, b) => a.sortPriority - b.sortPriority);
  return out;
}

function buildObservationReadinessLines(input: {
  flags: ObservationOperationalFlags;
  vitalsStale: boolean;
  extendedStay24h: boolean;
  dispositionPhase: boolean;
}): ObservationReadinessLine[] {
  const { flags, vitalsStale, extendedStay24h, dispositionPhase } = input;
  const anyReassessPressure =
    flags.reassessmentDue ||
    flags.reassessmentOverdue ||
    flags.providerReassessmentDue ||
    flags.providerReassessmentOverdue ||
    flags.rnObservationReassessmentDue ||
    flags.rnObservationReassessmentOverdue;

  const continueObs =
    !flags.criticalLabsUnacked &&
    !vitalsStale &&
    !flags.providerReassessmentOverdue &&
    !flags.rnObservationReassessmentOverdue;

  return [
    { id: "CONTINUE_OBSERVATION", active: continueObs },
    { id: "NEEDS_REASSESSMENT", active: anyReassessPressure },
    { id: "NEEDS_RESULTS_REVIEW", active: flags.resultsPending },
    { id: "READY_FOR_DISCHARGE_WORKFLOW", active: flags.readyForDischarge },
    {
      id: "NEEDS_ESCALATION_REVIEW",
      active: (extendedStay24h || dispositionPhase) && !flags.readyForDischarge,
    },
  ];
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

/**
 * Ignore reassessment timestamps before the LOS anchor (defensive; avoids skew from
 * unrelated earlier events if clocks or data are inconsistent).
 */
function effectiveReassessmentEventMs(anchorMs: number, lastEventMs: number | null): number | null {
  if (lastEventMs == null || !Number.isFinite(lastEventMs)) return null;
  if (lastEventMs < anchorMs) return null;
  return lastEventMs;
}

export function computeObservationOperationalSnapshot(input: {
  encounterType: string;
  status: string;
  workflowState: string;
  admittedAt: unknown;
  createdAt: unknown;
  physicianAssignedUserId?: string | null;
  nurseAssignedUserId?: string | null;
  /** D4A.4.3 — required for hospital ownership authority (bag). */
  admissionSummaryJson?: unknown;
  billingClassification?: string | null;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: unknown;
  trackboardOps: ObservationTrackboardOpsInput;
  nowMs?: number;
  placementRequestedEncounterType?: string | null;
}): ObservationOperationalSnapshot | null {
  if (
    !isObservationOperationalStay({
      encounterType: input.encounterType,
      status: input.status,
      admissionSummaryJson: input.admissionSummaryJson,
      billingClassification: input.billingClassification,
      placementRequestedEncounterType: input.placementRequestedEncounterType,
    })
  ) {
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

  const lastRnObsReMsRaw = parseIsoMs(input.trackboardOps.lastRnObservationReassessmentAt ?? null);
  const lastProvObsReMsRaw = parseIsoMs(input.trackboardOps.lastProviderObservationReassessmentAt ?? null);
  const lastRnObsReMs = effectiveReassessmentEventMs(anchor.anchorMs, lastRnObsReMsRaw);
  const lastProvObsReMs = effectiveReassessmentEventMs(anchor.anchorMs, lastProvObsReMsRaw);

  const providerLane = computeObservationReassessmentLaneState({
    anchorMs: anchor.anchorMs,
    nowMs: now,
    lastEventMs: lastProvObsReMs,
  });
  const rnLane = computeObservationReassessmentLaneState({
    anchorMs: anchor.anchorMs,
    nowMs: now,
    lastEventMs: lastRnObsReMs,
  });

  const reassessmentOverdue = providerLane.overdue || rnLane.overdue;
  const reassessmentDue = !reassessmentOverdue && (providerLane.due || rnLane.due);

  const firstDispositionDocAt =
    typeof input.trackboardOps.firstDispositionDocAt === "string"
      ? input.trackboardOps.firstDispositionDocAt
      : null;
  const readyForDischarge = ws === "DISCHARGE_READY";
  const dispositionPhase = ws === "DISPOSITION";

  // D4A.4.3 — operational ownership gaps from certified resolver (STRICT bag for OBS/IP).
  const assignmentGaps = resolveObservationAssignmentGaps({
    type: input.encounterType,
    billingClassification: input.billingClassification,
    admissionSummaryJson: input.admissionSummaryJson,
    physicianAssignedUserId: input.physicianAssignedUserId,
    nurseAssignedUserId: input.nurseAssignedUserId,
  });
  const assignPhysicianGap = assignmentGaps.assignPhysicianGap;
  const assignRnGap = assignmentGaps.assignRnGap;

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

  const flags: ObservationOperationalFlags = {
    boardingOperational,
    reassessmentDue,
    reassessmentOverdue,
    providerReassessmentDue: providerLane.due,
    providerReassessmentOverdue: providerLane.overdue,
    rnObservationReassessmentDue: rnLane.due,
    rnObservationReassessmentOverdue: rnLane.overdue,
    readyForDischarge,
    dispositionPhase,
    assignPhysicianGap,
    assignRnGap,
    resultsPending,
    criticalLabsUnacked,
  };

  const operationalBlockers = buildObservationOperationalBlockers({
    flags,
    vitalsStale,
    extendedStay24h,
    readyForDischarge,
    firstDispositionDocAt,
  });

  const readinessLines = buildObservationReadinessLines({
    flags,
    vitalsStale,
    extendedStay24h,
    dispositionPhase,
  });

  return {
    anchorKind: anchor.anchorKind,
    anchorIso: new Date(anchor.anchorMs).toISOString(),
    losMs,
    losLabel: label,
    losLabelCompact: labelCompact,
    overnightUtcSpan,
    extendedStay24h,
    flags,
    vitalsAgeMs,
    vitalsStale,
    providerSignedAgeMs,
    firstDispositionDocAt,
    reassessmentLanes: {
      provider: {
        lastAtIso: laneDisplayIso(input.trackboardOps.lastProviderObservationReassessmentAt),
        due: providerLane.due,
        overdue: providerLane.overdue,
      },
      rnObservation: {
        lastAtIso: laneDisplayIso(input.trackboardOps.lastRnObservationReassessmentAt),
        due: rnLane.due,
        overdue: rnLane.overdue,
      },
    },
    operationalBlockers,
    readinessLines,
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
