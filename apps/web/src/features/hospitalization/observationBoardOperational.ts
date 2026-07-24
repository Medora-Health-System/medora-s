import {
  projectHospitalBoardAssignments,
  readHospitalAssignmentBag,
  type ObservationOperationalSnapshot,
} from "@medora/shared";

/** Minimal row shape for board analytics (trackboard INPATIENT list). */
export type ObservationBoardRowInput = {
  id: string;
  status: string;
  /** For "recent first" sort (trackboard row). */
  createdAt?: string | null;
  observationOps?: ObservationOperationalSnapshot | null;
  trackboardOps?: {
    resultsPendingCount?: number;
    criticalResultUnacknowledged?: boolean;
  } | null;
  triage?: { esi?: number | null } | null;
  patient?: { firstName?: string | null; lastName?: string | null } | null;
  physicianAssignedUserId?: string | null;
  nurseAssignedUserId?: string | null;
  /** D4A.3.0 — hospital bag preferred over ED columns when present. */
  admissionSummaryJson?: unknown;
};

export type ObservationBoardCensusSummary = {
  activeObservationPatients: number;
  rnUnassignedCount: number;
  providerUnassignedCount: number;
  reassessmentOverdueCount: number;
  providerReassessmentOverdueCount: number;
  rnReassessmentOverdueCount: number;
  vitalsStaleCount: number;
  /** Patients with ≥1 pending result aggregate on trackboard. */
  pendingResultsPatientsCount: number;
  /** Sum of pending counts (workload hint). */
  sumPendingResultsCounts: number;
  criticalResultPatientsCount: number;
  los24hOrMoreCount: number;
  /** Workflow DISCHARGE_READY while encounter still open. */
  dischargeReadyOpenCount: number;
};

export type ObservationBoardOperationalFilterId =
  | ""
  | "needs_attention"
  /** Either role unassigned (RN or physician). */
  | "unassigned"
  | "needs_rn"
  | "needs_provider"
  | "reassess_overdue"
  | "rn_reassess_overdue"
  | "provider_reassess_overdue"
  | "ready_discharge"
  | "los24"
  | "pending_results"
  | "vitals_stale";

/** Spec-aligned sort keys (read-only list ordering). */
export type ObservationBoardSortId =
  | "default"
  | "los_desc"
  | "reassess_desc"
  | "pending_desc"
  | "ready_discharge_desc";

export type ObservationBoardStaffingPressure = {
  patientsWithAssignedRn: number;
  distinctRnIds: number;
  avgPatientsPerRn: number | null;
  patientsWithAssignedProvider: number;
  distinctProviderIds: number;
  avgPatientsPerProvider: number | null;
  /** Patient missing RN or missing provider (operational ownership gap). */
  unassignedEitherRolePatientCount: number;
  /** Up to `max` patient display names: unassigned for any role, worst ESI first. */
  highestRiskUnassignedPatientNames: string[];
};

function snapshot(row: ObservationBoardRowInput): ObservationOperationalSnapshot | null {
  return row.observationOps ?? null;
}

export function observationBoardRnAssignmentGap(row: ObservationBoardRowInput): boolean {
  const bag = readHospitalAssignmentBag(row.admissionSummaryJson);
  if (bag) {
    return projectHospitalBoardAssignments(bag).nurseUnassigned;
  }
  const o = snapshot(row);
  if (o) return o.flags.assignRnGap;
  return !((row.nurseAssignedUserId ?? "").trim());
}

export function observationBoardProviderAssignmentGap(row: ObservationBoardRowInput): boolean {
  const bag = readHospitalAssignmentBag(row.admissionSummaryJson);
  if (bag) {
    return projectHospitalBoardAssignments(bag).providerUnassigned;
  }
  const o = snapshot(row);
  if (o) return o.flags.assignPhysicianGap;
  return !((row.physicianAssignedUserId ?? "").trim());
}

function patientDisplayName(row: ObservationBoardRowInput): string {
  const f = (row.patient?.firstName ?? "").trim();
  const l = (row.patient?.lastName ?? "").trim();
  const n = `${f} ${l}`.trim();
  return n || "—";
}

/** Lower ESI = higher acuity risk for sorting (unknown ESI → stable bucket). */
function esiRiskRank(esi: number | null | undefined): number {
  if (esi == null || Number.isNaN(esi)) return 5;
  return esi;
}

/**
 * Higher = more operational attention (visibility / sort only — no clinical authority).
 */
export function observationRowOperationalAttentionScore(row: ObservationBoardRowInput): number {
  const o = snapshot(row);
  let s = 0;
  if (o?.flags.criticalLabsUnacked) s += 100;
  if (o?.flags.reassessmentOverdue) s += 70;
  else if (o?.flags.reassessmentDue) s += 35;
  if (o?.vitalsStale) s += 45;
  if (o?.extendedStay24h) s += 30;
  if (observationBoardProviderAssignmentGap(row)) s += 22;
  if (observationBoardRnAssignmentGap(row)) s += 22;
  const pend = row.trackboardOps?.resultsPendingCount ?? 0;
  if (pend > 0) s += 15;
  if (o?.flags.readyForDischarge) s += 12;
  if (o?.flags.dispositionPhase) s += 6;
  if (o?.losMs != null && Number.isFinite(o.losMs)) s += Math.min(25, Math.floor(o.losMs / 3_600_000));
  return s;
}

export function computeObservationBoardCensus(rows: ReadonlyArray<ObservationBoardRowInput>): ObservationBoardCensusSummary {
  const empty: ObservationBoardCensusSummary = {
    activeObservationPatients: 0,
    rnUnassignedCount: 0,
    providerUnassignedCount: 0,
    reassessmentOverdueCount: 0,
    providerReassessmentOverdueCount: 0,
    rnReassessmentOverdueCount: 0,
    vitalsStaleCount: 0,
    pendingResultsPatientsCount: 0,
    sumPendingResultsCounts: 0,
    criticalResultPatientsCount: 0,
    los24hOrMoreCount: 0,
    dischargeReadyOpenCount: 0,
  };
  if (!Array.isArray(rows) || rows.length === 0) return empty;

  let activeObservationPatients = 0;
  let rnUnassignedCount = 0;
  let providerUnassignedCount = 0;
  let reassessmentOverdueCount = 0;
  let providerReassessmentOverdueCount = 0;
  let rnReassessmentOverdueCount = 0;
  let vitalsStaleCount = 0;
  let pendingResultsPatientsCount = 0;
  let sumPendingResultsCounts = 0;
  let criticalResultPatientsCount = 0;
  let los24hOrMoreCount = 0;
  let dischargeReadyOpenCount = 0;

  for (const row of rows) {
    if ((row.status ?? "").trim() !== "OPEN") continue;
    activeObservationPatients += 1;
    const o = snapshot(row);
    if (observationBoardRnAssignmentGap(row)) rnUnassignedCount += 1;
    if (observationBoardProviderAssignmentGap(row)) providerUnassignedCount += 1;
    if (o?.flags.reassessmentOverdue) reassessmentOverdueCount += 1;
    if (o?.flags.providerReassessmentOverdue) providerReassessmentOverdueCount += 1;
    if (o?.flags.rnObservationReassessmentOverdue) rnReassessmentOverdueCount += 1;
    if (o?.vitalsStale) vitalsStaleCount += 1;
    const pend = typeof row.trackboardOps?.resultsPendingCount === "number" ? row.trackboardOps.resultsPendingCount : 0;
    if (pend > 0) {
      pendingResultsPatientsCount += 1;
      sumPendingResultsCounts += pend;
    }
    if (row.trackboardOps?.criticalResultUnacknowledged) criticalResultPatientsCount += 1;
    if (o?.extendedStay24h) los24hOrMoreCount += 1;
    if (o?.flags.readyForDischarge) dischargeReadyOpenCount += 1;
  }

  return {
    activeObservationPatients,
    rnUnassignedCount,
    providerUnassignedCount,
    reassessmentOverdueCount,
    providerReassessmentOverdueCount,
    rnReassessmentOverdueCount,
    vitalsStaleCount,
    pendingResultsPatientsCount,
    sumPendingResultsCounts,
    criticalResultPatientsCount,
    los24hOrMoreCount,
    dischargeReadyOpenCount,
  };
}

export function computeObservationBoardStaffingPressure(
  rows: ReadonlyArray<ObservationBoardRowInput>,
  options?: { maxUnassignedRiskNames?: number }
): ObservationBoardStaffingPressure {
  const maxNames = Math.min(8, Math.max(1, options?.maxUnassignedRiskNames ?? 3));
  const rnCounts = new Map<string, number>();
  const mdCounts = new Map<string, number>();
  let patientsWithAssignedRn = 0;
  let patientsWithAssignedProvider = 0;
  let unassignedEitherRolePatientCount = 0;
  const unassignedRiskRows: ObservationBoardRowInput[] = [];

  for (const row of rows) {
    if ((row.status ?? "").trim() !== "OPEN") continue;
    const rnId = (row.nurseAssignedUserId ?? "").trim();
    const mdId = (row.physicianAssignedUserId ?? "").trim();
    if (rnId) {
      patientsWithAssignedRn += 1;
      rnCounts.set(rnId, (rnCounts.get(rnId) ?? 0) + 1);
    }
    if (mdId) {
      patientsWithAssignedProvider += 1;
      mdCounts.set(mdId, (mdCounts.get(mdId) ?? 0) + 1);
    }
    const unassigned = observationBoardRnAssignmentGap(row) || observationBoardProviderAssignmentGap(row);
    if (unassigned) {
      unassignedEitherRolePatientCount += 1;
      unassignedRiskRows.push(row);
    }
  }

  unassignedRiskRows.sort((a, b) => esiRiskRank(a.triage?.esi) - esiRiskRank(b.triage?.esi));
  const highestRiskUnassignedPatientNames = unassignedRiskRows.slice(0, maxNames).map(patientDisplayName);

  const distinctRnIds = rnCounts.size;
  const distinctProviderIds = mdCounts.size;
  const avgPatientsPerRn =
    distinctRnIds > 0 && patientsWithAssignedRn > 0 ? Math.round((patientsWithAssignedRn / distinctRnIds) * 10) / 10 : null;
  const avgPatientsPerProvider =
    distinctProviderIds > 0 && patientsWithAssignedProvider > 0
      ? Math.round((patientsWithAssignedProvider / distinctProviderIds) * 10) / 10
      : null;

  return {
    patientsWithAssignedRn,
    distinctRnIds,
    avgPatientsPerRn,
    patientsWithAssignedProvider,
    distinctProviderIds,
    avgPatientsPerProvider,
    unassignedEitherRolePatientCount,
    highestRiskUnassignedPatientNames,
  };
}

export function observationBoardRowMatchesOperationalFilter(
  row: ObservationBoardRowInput,
  filterId: ObservationBoardOperationalFilterId
): boolean {
  if (!filterId) return true;
  const o = snapshot(row);
  const pend = row.trackboardOps?.resultsPendingCount ?? 0;
  const criticalUnacked = Boolean(row.trackboardOps?.criticalResultUnacknowledged);

  if (filterId === "needs_attention") {
    return Boolean(
      criticalUnacked ||
        o?.flags.criticalLabsUnacked ||
        o?.vitalsStale ||
        o?.flags.reassessmentOverdue ||
        o?.extendedStay24h ||
        observationBoardRnAssignmentGap(row) ||
        observationBoardProviderAssignmentGap(row) ||
        pend > 0 ||
        o?.flags.readyForDischarge
    );
  }
  if (filterId === "unassigned") {
    return observationBoardRnAssignmentGap(row) || observationBoardProviderAssignmentGap(row);
  }
  if (filterId === "needs_rn") {
    return observationBoardRnAssignmentGap(row);
  }
  if (filterId === "needs_provider") {
    return observationBoardProviderAssignmentGap(row);
  }
  if (filterId === "reassess_overdue") {
    return Boolean(o?.flags.reassessmentOverdue);
  }
  if (filterId === "rn_reassess_overdue") {
    return Boolean(o?.flags.rnObservationReassessmentOverdue);
  }
  if (filterId === "provider_reassess_overdue") {
    return Boolean(o?.flags.providerReassessmentOverdue);
  }
  if (filterId === "ready_discharge") {
    return Boolean(o?.flags.readyForDischarge);
  }
  if (filterId === "los24") {
    return Boolean(o?.extendedStay24h);
  }
  if (filterId === "pending_results") {
    return pend > 0;
  }
  if (filterId === "vitals_stale") {
    return Boolean(o?.vitalsStale);
  }
  return true;
}

function rowCreatedAtMs(row: ObservationBoardRowInput): number {
  const s = (row.createdAt ?? "").trim();
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Stable read-only ordering for the observation board list (ties → more recent first).
 */
export function compareObservationBoardRows(
  a: ObservationBoardRowInput,
  b: ObservationBoardRowInput,
  sortId: ObservationBoardSortId
): number {
  if (sortId === "default") {
    return rowCreatedAtMs(b) - rowCreatedAtMs(a);
  }
  if (sortId === "los_desc") {
    const d = (b.observationOps?.losMs ?? 0) - (a.observationOps?.losMs ?? 0);
    if (d !== 0) return d;
    return rowCreatedAtMs(b) - rowCreatedAtMs(a);
  }
  if (sortId === "reassess_desc") {
    const bo = b.observationOps?.flags.reassessmentOverdue ? 1 : 0;
    const ao = a.observationOps?.flags.reassessmentOverdue ? 1 : 0;
    if (bo !== ao) return bo - ao;
    return rowCreatedAtMs(b) - rowCreatedAtMs(a);
  }
  if (sortId === "pending_desc") {
    const bp = b.trackboardOps?.resultsPendingCount ?? 0;
    const ap = a.trackboardOps?.resultsPendingCount ?? 0;
    if (bp !== ap) return bp - ap;
    return rowCreatedAtMs(b) - rowCreatedAtMs(a);
  }
  if (sortId === "ready_discharge_desc") {
    const br = b.observationOps?.flags.readyForDischarge ? 1 : 0;
    const ar = a.observationOps?.flags.readyForDischarge ? 1 : 0;
    if (br !== ar) return br - ar;
    return rowCreatedAtMs(b) - rowCreatedAtMs(a);
  }
  return 0;
}
