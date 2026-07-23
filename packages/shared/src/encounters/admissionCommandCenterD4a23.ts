/**
 * D4A.2.3 — Hospital Admission Command Center read model helpers.
 * Derives rows, filters, SLA timers, event timeline, and metrics from existing data.
 */

import { asAdmissionSummaryRecord } from "./admissionSummaryMerge.js";
import { readAdmissionPacketV1 } from "./smartAdmissionPacketD4a2.js";
import {
  readOperationalAcceptanceV1,
  type AdmissionOpsEventV1,
  type AdmissionOpsEventType,
  type OperationalAcceptanceV1,
} from "./admissionOperationalAcceptanceD4a23.js";
import {
  resolveAdmissionWorkflowStatus,
  type AdmissionWorkflowStatusCode,
} from "./admissionWorkflowVisibilityD4a22.js";
import { InternalPlacementStatus } from "./internalPlacementStatusMachine.js";

export const ADMISSION_COMMAND_CENTER_FILTERS = [
  "ALL_PENDING",
  "WAITING_FOR_PLACEMENT",
  "WAITING_FOR_BED",
  "BED_ASSIGNED",
  "WAITING_FOR_RECEIVING_ACCEPTANCE",
  "READY_FOR_TRANSPORT",
  "TRANSPORT_IN_PROGRESS",
  "ARRIVED_AT_DESTINATION",
  "INPATIENT_ENCOUNTER_CREATED",
  "ON_HOLD",
  "CANCELLED",
  "FAILED_NEEDS_ATTENTION",
] as const;
export type AdmissionCommandCenterFilter =
  (typeof ADMISSION_COMMAND_CENTER_FILTERS)[number];

export const ADMISSION_COMMAND_CENTER_SORTS = [
  "LONGEST_WAITING",
  "DECISION_TIME",
  "BED_ASSIGNMENT_TIME",
  "SERVICE",
  "UNIT",
  "PATIENT_NAME",
  "CLINICAL_PRIORITY",
] as const;
export type AdmissionCommandCenterSort =
  (typeof ADMISSION_COMMAND_CENTER_SORTS)[number];

export const SLA_DISPLAY_STATES = [
  "NORMAL",
  "APPROACHING_TARGET",
  "OVER_TARGET",
  "CRITICAL_DELAY",
] as const;
export type SlaDisplayState = (typeof SLA_DISPLAY_STATES)[number];

/** Dev-safe display thresholds (minutes). Not clinical policy. */
export const ADMISSION_SLA_THRESHOLDS_MINUTES = {
  decisionToOpsAccept: { approach: 15, over: 30, critical: 60 },
  decisionToPlacement: { approach: 20, over: 45, critical: 90 },
  placementToBed: { approach: 30, over: 60, critical: 120 },
  bedToReceiving: { approach: 15, over: 30, critical: 60 },
  receivingToTransport: { approach: 15, over: 30, critical: 60 },
  transportToArrival: { approach: 20, over: 45, critical: 90 },
  decisionToArrival: { approach: 90, over: 180, critical: 360 },
  currentState: { approach: 20, over: 45, critical: 90 },
} as const;

export type AdmissionCommandCenterRowInput = {
  encounterId: string;
  facilityId: string;
  encounterType?: string | null;
  encounterStatus?: string | null;
  patientDisplayName?: string | null;
  patientId?: string | null;
  roomLabel?: string | null;
  chiefComplaint?: string | null;
  admissionSummaryJson?: unknown;
  placementStatus?: string | null;
  placementRequestedAt?: string | null;
  placementAssignedAt?: string | null;
  placementAcceptedAt?: string | null;
  placementDepartedEdAt?: string | null;
  placementArrivedAt?: string | null;
  placementReadyForTransferAt?: string | null;
  assignedUnitCode?: string | null;
  assignedBedKey?: string | null;
  receivingEncounterId?: string | null;
  placementWorkflowEnabled?: boolean;
  /** Optional documented clinical priority — never inferred from diagnosis. */
  clinicalPriority?: string | null;
  nowMs?: number;
};

export type AdmissionSlaTimers = {
  decisionToOpsAcceptMs: number | null;
  decisionToPlacementMs: number | null;
  placementToBedMs: number | null;
  bedToReceivingMs: number | null;
  receivingToTransportMs: number | null;
  transportToArrivalMs: number | null;
  decisionToArrivalMs: number | null;
  decisionToInpatientMs: number | null;
  currentStateElapsedMs: number | null;
  currentStateEnteredAt: string | null;
};

export type AdmissionCommandCenterRow = {
  encounterId: string;
  facilityId: string;
  patientDisplayName: string | null;
  patientId: string | null;
  currentLocation: string | null;
  encounterType: string | null;
  admissionSource: string;
  decisionStatus: AdmissionWorkflowStatusCode;
  operationalFilter: AdmissionCommandCenterFilter;
  primaryDiagnosis: string | null;
  secondaryDiagnosisCount: number;
  requestedService: string | null;
  requestedLevelOfCare: string | null;
  conditionOnAdmission: string | null;
  placementStatus: string | null;
  unit: string | null;
  bed: string | null;
  receivingAcceptance: string;
  transportStatus: string;
  inpatientEncounterStatus: "NOT_CREATED" | "CREATED";
  receivingEncounterId: string | null;
  responsibleProvider: string | null;
  lastOperationalActor: string | null;
  decisionAt: string | null;
  operationalAcceptedAt: string | null;
  elapsedCurrentStateMs: number | null;
  elapsedSinceDecisionMs: number | null;
  sla: AdmissionSlaTimers;
  slaDisplayState: SlaDisplayState;
  placementWorkflowEnabled: boolean;
  /** True only when a durable placement request exists (never invent when placement OFF). */
  hasDurablePlacementRequest: boolean;
  /** Always false when messaging is correct — never claim submit without durable IPR. */
  falselyImpliesPlacementSubmitted: boolean;
  operationalStatus: string;
  holdReasonCode: string | null;
  clinicalPriority: string | null;
};

function parseIsoMs(v: string | null | undefined): number | null {
  if (!v || typeof v !== "string") return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

/** Display: 8 min | 42 min | 1 hr 16 min | 3 hr 05 min */
export function formatAdmissionSlaDuration(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hrs} hr ${String(mins).padStart(2, "0")} min`;
}

export function resolveSlaDisplayState(
  elapsedMs: number | null,
  thresholds: { approach: number; over: number; critical: number }
): SlaDisplayState {
  if (elapsedMs == null || !Number.isFinite(elapsedMs) || elapsedMs < 0) return "NORMAL";
  const min = elapsedMs / 60000;
  if (min >= thresholds.critical) return "CRITICAL_DELAY";
  if (min >= thresholds.over) return "OVER_TARGET";
  if (min >= thresholds.approach) return "APPROACHING_TARGET";
  return "NORMAL";
}

function diffMs(end: string | null | undefined, start: string | null | undefined): number | null {
  const e = parseIsoMs(end);
  const s = parseIsoMs(start);
  if (e == null || s == null) return null;
  const d = e - s;
  return d >= 0 ? d : null;
}

export function computeAdmissionSlaTimers(input: {
  decisionAt: string | null;
  operationalAcceptedAt: string | null;
  placementRequestedAt: string | null;
  bedAssignedAt: string | null;
  receivingAcceptedAt: string | null;
  transportStartedAt: string | null;
  arrivedAt: string | null;
  inpatientCreatedAt: string | null;
  currentStateEnteredAt: string | null;
  nowMs: number;
}): AdmissionSlaTimers {
  return {
    decisionToOpsAcceptMs: diffMs(input.operationalAcceptedAt, input.decisionAt),
    decisionToPlacementMs: diffMs(input.placementRequestedAt, input.decisionAt),
    placementToBedMs: diffMs(input.bedAssignedAt, input.placementRequestedAt),
    bedToReceivingMs: diffMs(input.receivingAcceptedAt, input.bedAssignedAt),
    receivingToTransportMs: diffMs(input.transportStartedAt, input.receivingAcceptedAt),
    transportToArrivalMs: diffMs(input.arrivedAt, input.transportStartedAt),
    decisionToArrivalMs: diffMs(input.arrivedAt, input.decisionAt),
    decisionToInpatientMs: diffMs(input.inpatientCreatedAt, input.decisionAt),
    currentStateElapsedMs:
      input.currentStateEnteredAt != null
        ? Math.max(0, input.nowMs - (parseIsoMs(input.currentStateEnteredAt) ?? input.nowMs))
        : null,
    currentStateEnteredAt: input.currentStateEnteredAt,
  };
}

export function resolveOperationalFilter(input: {
  decisionStatus: AdmissionWorkflowStatusCode;
  ops: OperationalAcceptanceV1 | null;
  placementStatus?: string | null;
  receivingEncounterId?: string | null;
  placementReadyForTransferAt?: string | null;
  placementDepartedEdAt?: string | null;
  placementArrivedAt?: string | null;
}): AdmissionCommandCenterFilter {
  if (input.decisionStatus === "ADMISSION_CANCELLED") return "CANCELLED";
  const p = String(input.placementStatus ?? "").toUpperCase();
  if (p === InternalPlacementStatus.ERROR_REVIEW) return "FAILED_NEEDS_ATTENTION";
  if (input.ops?.status === "ON_HOLD" || input.ops?.status === "ESCALATION_REQUIRED") {
    return "ON_HOLD";
  }
  if (
    input.receivingEncounterId ||
    p === InternalPlacementStatus.ARRIVED_DESTINATION ||
    p === InternalPlacementStatus.COMPLETED
  ) {
    return "INPATIENT_ENCOUNTER_CREATED";
  }
  if (input.placementArrivedAt || p === InternalPlacementStatus.ARRIVED_DESTINATION) {
    return "ARRIVED_AT_DESTINATION";
  }
  if (input.placementDepartedEdAt || p === InternalPlacementStatus.DEPARTED_ED) {
    return "TRANSPORT_IN_PROGRESS";
  }
  if (
    input.placementReadyForTransferAt ||
    p === InternalPlacementStatus.READY_FOR_TRANSFER
  ) {
    return "READY_FOR_TRANSPORT";
  }
  const recv = input.ops?.receiving?.status;
  if (p === InternalPlacementStatus.BED_ASSIGNED) {
    if (recv === "ACCEPTED" || recv === "ACCEPTED_WITH_CONDITIONS") {
      return "READY_FOR_TRANSPORT";
    }
    return "WAITING_FOR_RECEIVING_ACCEPTANCE";
  }
  if (
    p === InternalPlacementStatus.REQUESTED ||
    p === InternalPlacementStatus.UNDER_REVIEW ||
    p === InternalPlacementStatus.ACCEPTED
  ) {
    return "WAITING_FOR_BED";
  }
  if (input.decisionStatus === "PLACEMENT_REQUESTED_WAITING_BED") return "WAITING_FOR_BED";
  if (input.decisionStatus === "BED_ASSIGNED_WAITING_RECEIVING") {
    return "WAITING_FOR_RECEIVING_ACCEPTANCE";
  }
  if (input.decisionStatus === "DECISION_SIGNED_NO_PLACEMENT") {
    return "WAITING_FOR_PLACEMENT";
  }
  return "ALL_PENDING";
}

export function buildAdmissionCommandCenterRow(
  input: AdmissionCommandCenterRowInput
): AdmissionCommandCenterRow {
  const nowMs = input.nowMs ?? Date.now();
  const root = asAdmissionSummaryRecord(input.admissionSummaryJson);
  const packet = readAdmissionPacketV1(input.admissionSummaryJson);
  const ops = readOperationalAcceptanceV1(input.admissionSummaryJson);
  const diagnoses =
    root.admissionDiagnosesV1 && typeof root.admissionDiagnosesV1 === "object"
      ? (root.admissionDiagnosesV1 as Record<string, unknown>)
      : {};
  const decisionStatus = resolveAdmissionWorkflowStatus({
    admissionSummaryJson: input.admissionSummaryJson,
    placementStatus: input.placementStatus,
    receivingEncounterId: input.receivingEncounterId,
    placementWorkflowEnabled: input.placementWorkflowEnabled,
  });
  const decisionAt =
    typeof root.admissionDecisionAt === "string" ? root.admissionDecisionAt : null;
  const operationalAcceptedAt = ops?.acceptedAt ?? null;
  const receivingAcceptedAt =
    ops?.receiving?.acceptedAt ?? input.placementAcceptedAt ?? null;

  const primaryDiagnosis =
    String(diagnoses.primaryDisplay ?? root.admissionDiagnosis ?? "").trim() || null;
  const secondaryDiagnosisCount = Array.isArray(diagnoses.secondaryDisplays)
    ? diagnoses.secondaryDisplays.length
    : 0;

  const filter = resolveOperationalFilter({
    decisionStatus,
    ops,
    placementStatus: input.placementStatus,
    receivingEncounterId: input.receivingEncounterId,
    placementReadyForTransferAt: input.placementReadyForTransferAt,
    placementDepartedEdAt: input.placementDepartedEdAt,
    placementArrivedAt: input.placementArrivedAt,
  });

  const currentStateEnteredAt =
    filter === "ON_HOLD"
      ? ops?.hold?.at ?? decisionAt
      : filter === "WAITING_FOR_RECEIVING_ACCEPTANCE"
        ? input.placementAssignedAt ?? decisionAt
        : filter === "WAITING_FOR_BED"
          ? input.placementRequestedAt ?? decisionAt
          : filter === "TRANSPORT_IN_PROGRESS"
            ? input.placementDepartedEdAt ?? decisionAt
            : filter === "READY_FOR_TRANSPORT"
              ? receivingAcceptedAt ?? input.placementReadyForTransferAt ?? decisionAt
              : decisionAt;

  const sla = computeAdmissionSlaTimers({
    decisionAt,
    operationalAcceptedAt,
    placementRequestedAt: input.placementRequestedAt ?? null,
    bedAssignedAt: input.placementAssignedAt ?? null,
    receivingAcceptedAt,
    transportStartedAt: input.placementDepartedEdAt ?? null,
    arrivedAt: input.placementArrivedAt ?? null,
    inpatientCreatedAt: input.receivingEncounterId
      ? input.placementArrivedAt ?? decisionAt
      : null,
    currentStateEnteredAt,
    nowMs,
  });

  const slaDisplayState = resolveSlaDisplayState(
    sla.currentStateElapsedMs,
    ADMISSION_SLA_THRESHOLDS_MINUTES.currentState
  );

  const lastEvent = ops?.events?.[ops.events.length - 1];
  const placementOn = input.placementWorkflowEnabled === true;
  const hasDurablePlacement = Boolean(
    input.placementStatus &&
      String(input.placementStatus).toUpperCase() !== "" &&
      placementRankSafe(input.placementStatus) >= 3
  );

  return {
    encounterId: input.encounterId,
    facilityId: input.facilityId,
    patientDisplayName: input.patientDisplayName?.trim() || null,
    patientId: input.patientId?.trim() || null,
    currentLocation: input.roomLabel?.trim() || null,
    encounterType: input.encounterType?.trim() || null,
    admissionSource: String(input.encounterType ?? "EMERGENCY").toUpperCase(),
    decisionStatus,
    operationalFilter: filter,
    primaryDiagnosis,
    secondaryDiagnosisCount,
    requestedService:
      packet?.admittingServiceCode?.trim() ||
      (typeof root.serviceUnit === "string" ? root.serviceUnit : null),
    requestedLevelOfCare:
      packet?.levelOfCareCode?.trim() ||
      (typeof root.careLevel === "string" ? root.careLevel : null),
    conditionOnAdmission:
      packet?.conditionStatus?.trim() ||
      (typeof root.conditionAtAdmission === "string" ? root.conditionAtAdmission : null),
    placementStatus: input.placementStatus ?? null,
    unit: input.assignedUnitCode ?? ops?.receivingUnit ?? null,
    bed: input.assignedBedKey ?? null,
    receivingAcceptance: ops?.receiving?.status ?? "NOT_REQUESTED",
    transportStatus: resolveTransportLabel(input),
    inpatientEncounterStatus: input.receivingEncounterId ? "CREATED" : "NOT_CREATED",
    receivingEncounterId: input.receivingEncounterId ?? null,
    responsibleProvider:
      typeof root.responsiblePhysicianName === "string"
        ? root.responsiblePhysicianName
        : null,
    lastOperationalActor: lastEvent?.actorDisplayRole ?? ops?.acceptedByDisplayRole ?? null,
    decisionAt,
    operationalAcceptedAt,
    elapsedCurrentStateMs: sla.currentStateElapsedMs,
    elapsedSinceDecisionMs: decisionAt
      ? Math.max(0, nowMs - (parseIsoMs(decisionAt) ?? nowMs))
      : null,
    sla,
    slaDisplayState,
    placementWorkflowEnabled: placementOn,
    hasDurablePlacementRequest: hasDurablePlacement,
    falselyImpliesPlacementSubmitted: false,
    operationalStatus: ops?.status ?? "NOT_REQUESTED",
    holdReasonCode: ops?.hold?.reasonCode ?? null,
    clinicalPriority: input.clinicalPriority?.trim() || null,
  };
}

function placementRankSafe(status: string | null | undefined): number {
  const s = String(status ?? "").trim().toUpperCase();
  const order: Record<string, number> = {
    [InternalPlacementStatus.REQUESTED]: 3,
    [InternalPlacementStatus.UNDER_REVIEW]: 4,
    [InternalPlacementStatus.ACCEPTED]: 5,
    [InternalPlacementStatus.BED_ASSIGNED]: 6,
    [InternalPlacementStatus.READY_FOR_TRANSFER]: 7,
    [InternalPlacementStatus.DEPARTED_ED]: 8,
    [InternalPlacementStatus.ARRIVED_DESTINATION]: 9,
    [InternalPlacementStatus.COMPLETED]: 10,
  };
  return order[s] ?? 0;
}

function resolveTransportLabel(input: AdmissionCommandCenterRowInput): string {
  const p = String(input.placementStatus ?? "").toUpperCase();
  if (p === InternalPlacementStatus.ARRIVED_DESTINATION) return "ARRIVED";
  if (p === InternalPlacementStatus.DEPARTED_ED) return "IN_PROGRESS";
  if (p === InternalPlacementStatus.READY_FOR_TRANSFER) return "READY";
  return "PENDING";
}

export function filterAdmissionCommandCenterRows(
  rows: readonly AdmissionCommandCenterRow[],
  filter: AdmissionCommandCenterFilter
): AdmissionCommandCenterRow[] {
  if (filter === "ALL_PENDING") {
    return rows.filter(
      (r) =>
        r.operationalFilter !== "CANCELLED" &&
        r.operationalFilter !== "INPATIENT_ENCOUNTER_CREATED"
    );
  }
  return rows.filter((r) => r.operationalFilter === filter);
}

export function sortAdmissionCommandCenterRows(
  rows: readonly AdmissionCommandCenterRow[],
  sort: AdmissionCommandCenterSort
): AdmissionCommandCenterRow[] {
  const copy = [...rows];
  const name = (r: AdmissionCommandCenterRow) =>
    (r.patientDisplayName ?? "").localeCompare(r.patientDisplayName ?? "", undefined, {
      sensitivity: "base",
    });
  copy.sort((a, b) => {
    switch (sort) {
      case "LONGEST_WAITING":
        return (b.elapsedCurrentStateMs ?? 0) - (a.elapsedCurrentStateMs ?? 0);
      case "DECISION_TIME":
        return (parseIsoMs(a.decisionAt) ?? 0) - (parseIsoMs(b.decisionAt) ?? 0);
      case "BED_ASSIGNMENT_TIME":
        return (
          (parseIsoMs(a.sla.currentStateEnteredAt) ?? 0) -
          (parseIsoMs(b.sla.currentStateEnteredAt) ?? 0)
        );
      case "SERVICE":
        return (a.requestedService ?? "").localeCompare(b.requestedService ?? "");
      case "UNIT":
        return (a.unit ?? "").localeCompare(b.unit ?? "");
      case "CLINICAL_PRIORITY": {
        const pa = a.clinicalPriority ?? "";
        const pb = b.clinicalPriority ?? "";
        if (pa && pb) {
          const byPri = pa.localeCompare(pb);
          return byPri !== 0 ? byPri : name(a);
        }
        if (pa) return -1;
        if (pb) return 1;
        return (b.elapsedCurrentStateMs ?? 0) - (a.elapsedCurrentStateMs ?? 0);
      }
      case "PATIENT_NAME":
      default:
        return name(a);
    }
  });
  return copy;
}

/**
 * Derived event stream — no new event table.
 * Combines durable ops events + placement timestamps + decision meta.
 */
export function buildAdmissionOpsEventTimeline(input: {
  admissionSummaryJson?: unknown;
  placementStatus?: string | null;
  placementRequestedAt?: string | null;
  placementAssignedAt?: string | null;
  placementAcceptedAt?: string | null;
  placementDepartedEdAt?: string | null;
  placementArrivedAt?: string | null;
  receivingEncounterId?: string | null;
  assignedUnitCode?: string | null;
  assignedBedKey?: string | null;
}): AdmissionOpsEventV1[] {
  const root = asAdmissionSummaryRecord(input.admissionSummaryJson);
  const ops = readOperationalAcceptanceV1(input.admissionSummaryJson);
  const derived: AdmissionOpsEventV1[] = [];
  const mode = String(root.admissionDecisionMode ?? "").toUpperCase();
  const decisionAt =
    typeof root.admissionDecisionAt === "string" ? root.admissionDecisionAt : null;
  const decisionBy =
    typeof root.admissionDecisionByUserId === "string" ? root.admissionDecisionByUserId : null;

  if (mode === "DRAFT" && decisionAt) {
    derived.push({
      type: "ADMISSION_DECISION_DRAFTED",
      at: decisionAt,
      actorUserId: decisionBy,
      actorDisplayRole: "PROVIDER",
      resultingState: "DRAFT",
    });
  }
  if (mode === "SIGN" && decisionAt) {
    derived.push({
      type: "ADMISSION_DECISION_SIGNED",
      at: decisionAt,
      actorUserId: decisionBy,
      actorDisplayRole: "PROVIDER",
      resultingState: "SIGN",
    });
  }

  if (input.placementRequestedAt) {
    derived.push({
      type: "PLACEMENT_REQUEST_SUBMITTED",
      at: input.placementRequestedAt,
      resultingState: input.placementStatus ?? "REQUESTED",
    });
  }
  if (input.placementAssignedAt) {
    derived.push({
      type: "BED_ASSIGNED",
      at: input.placementAssignedAt,
      unitCode: input.assignedUnitCode ?? null,
      bedKey: input.assignedBedKey ?? null,
      resultingState: "BED_ASSIGNED",
    });
  }
  // Bed assignment must NOT imply receiving acceptance — only explicit ops or placement ACCEPTED after bed.
  if (ops?.receiving?.acceptedAt) {
    derived.push({
      type:
        ops.receiving.status === "ACCEPTED_WITH_CONDITIONS"
          ? "RECEIVING_ACCEPTED_WITH_CONDITIONS"
          : "RECEIVING_ACCEPTED",
      at: ops.receiving.acceptedAt,
      actorUserId: ops.receiving.acceptedByUserId,
      actorDisplayRole: ops.receiving.acceptedByDisplayRole,
      unitCode: ops.receiving.receivingUnit,
      resultingState: ops.receiving.status,
    });
  } else if (
    input.placementAcceptedAt &&
    placementRankSafe(input.placementStatus) >= 7
  ) {
    derived.push({
      type: "RECEIVING_ACCEPTED",
      at: input.placementAcceptedAt,
      unitCode: input.assignedUnitCode ?? null,
      resultingState: "ACCEPTED",
    });
  }
  if (input.placementDepartedEdAt) {
    derived.push({
      type: "TRANSPORT_STARTED",
      at: input.placementDepartedEdAt,
      resultingState: "DEPARTED_ED",
    });
  }
  if (input.placementArrivedAt) {
    derived.push({
      type: "ARRIVED_DESTINATION",
      at: input.placementArrivedAt,
      resultingState: "ARRIVED_DESTINATION",
    });
  }
  if (input.receivingEncounterId && input.placementArrivedAt) {
    derived.push({
      type: "INPATIENT_ENCOUNTER_CREATED",
      at: input.placementArrivedAt,
      resultingState: "CREATED",
    });
  }

  const fromOps = ops?.events ?? [];
  const merged = [...derived, ...fromOps];
  // Deduplicate by type+at+requestId
  const seen = new Set<string>();
  const unique: AdmissionOpsEventV1[] = [];
  for (const e of merged) {
    const key = `${e.type}|${e.at}|${e.requestId ?? ""}|${e.actorUserId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(e);
  }
  unique.sort((a, b) => (parseIsoMs(a.at) ?? 0) - (parseIsoMs(b.at) ?? 0));
  return unique;
}

export type AdmissionCommandCenterMetrics = {
  pendingAdmissions: number;
  waitingForPlacement: number;
  waitingForBeds: number;
  assignedBeds: number;
  waitingForReceivingAcceptance: number;
  readyForTransport: number;
  currentlyTransporting: number;
  onHold: number;
  overTarget: number;
  averageCurrentWaitMs: number | null;
  longestCurrentWaitMs: number | null;
  metricsKind: "LIVE_OPERATIONAL";
};

export function computeAdmissionCommandCenterMetrics(
  rows: readonly AdmissionCommandCenterRow[]
): AdmissionCommandCenterMetrics {
  const pending = filterAdmissionCommandCenterRows(rows, "ALL_PENDING");
  const waits = pending
    .map((r) => r.elapsedCurrentStateMs)
    .filter((n): n is number => n != null && Number.isFinite(n));
  const avg =
    waits.length > 0 ? waits.reduce((a, b) => a + b, 0) / waits.length : null;
  const longest = waits.length > 0 ? Math.max(...waits) : null;
  return {
    pendingAdmissions: pending.length,
    waitingForPlacement: rows.filter((r) => r.operationalFilter === "WAITING_FOR_PLACEMENT")
      .length,
    waitingForBeds: rows.filter((r) => r.operationalFilter === "WAITING_FOR_BED").length,
    assignedBeds: rows.filter(
      (r) =>
        r.operationalFilter === "BED_ASSIGNED" ||
        r.operationalFilter === "WAITING_FOR_RECEIVING_ACCEPTANCE" ||
        r.operationalFilter === "READY_FOR_TRANSPORT"
    ).length,
    waitingForReceivingAcceptance: rows.filter(
      (r) => r.operationalFilter === "WAITING_FOR_RECEIVING_ACCEPTANCE"
    ).length,
    readyForTransport: rows.filter((r) => r.operationalFilter === "READY_FOR_TRANSPORT")
      .length,
    currentlyTransporting: rows.filter((r) => r.operationalFilter === "TRANSPORT_IN_PROGRESS")
      .length,
    onHold: rows.filter((r) => r.operationalFilter === "ON_HOLD").length,
    overTarget: rows.filter(
      (r) =>
        r.slaDisplayState === "OVER_TARGET" || r.slaDisplayState === "CRITICAL_DELAY"
    ).length,
    averageCurrentWaitMs: avg,
    longestCurrentWaitMs: longest,
    metricsKind: "LIVE_OPERATIONAL",
  };
}

/** Extended simulation stages for command-center UX (client-only). */
export const ADMISSION_COMMAND_SIMULATION_STAGES = [
  "NONE",
  "OPS_ACCEPTED_RN",
  "OPS_ACCEPTED_HOUSE_SUPERVISOR",
  "BED_ASSIGNED",
  "RECEIVING_NURSE_ACCEPTED",
  "TRANSPORT_READY",
  "ARRIVED",
  "INPATIENT_CREATED_DISPLAY",
] as const;
export type AdmissionCommandSimulationStage =
  (typeof ADMISSION_COMMAND_SIMULATION_STAGES)[number];

export function applyCommandCenterSimulationOverlay(
  row: AdmissionCommandCenterRow,
  stage: AdmissionCommandSimulationStage
): AdmissionCommandCenterRow {
  if (stage === "NONE") return { ...row, falselyImpliesPlacementSubmitted: false };
  const base = { ...row, placementWorkflowEnabled: true };
  switch (stage) {
    case "OPS_ACCEPTED_RN":
      return {
        ...base,
        operationalStatus: "ACCEPTED",
        lastOperationalActor: "RN (SIMULATION)",
        operationalFilter: "WAITING_FOR_PLACEMENT",
      };
    case "OPS_ACCEPTED_HOUSE_SUPERVISOR":
      return {
        ...base,
        operationalStatus: "ACCEPTED",
        lastOperationalActor: "ADMIN (SIMULATION)",
        operationalFilter: "WAITING_FOR_PLACEMENT",
      };
    case "BED_ASSIGNED":
      return {
        ...base,
        operationalFilter: "WAITING_FOR_RECEIVING_ACCEPTANCE",
        placementStatus: InternalPlacementStatus.BED_ASSIGNED,
        unit: row.unit ?? "MED-SURG",
        bed: row.bed ?? "SIM-01",
        receivingAcceptance: "NOT_REQUESTED",
      };
    case "RECEIVING_NURSE_ACCEPTED":
      return {
        ...base,
        operationalFilter: "READY_FOR_TRANSPORT",
        placementStatus: InternalPlacementStatus.BED_ASSIGNED,
        receivingAcceptance: "ACCEPTED",
        lastOperationalActor: "RN (SIMULATION)",
      };
    case "TRANSPORT_READY":
      return {
        ...base,
        operationalFilter: "READY_FOR_TRANSPORT",
        transportStatus: "READY",
        placementStatus: InternalPlacementStatus.READY_FOR_TRANSFER,
      };
    case "ARRIVED":
      return {
        ...base,
        operationalFilter: "ARRIVED_AT_DESTINATION",
        transportStatus: "ARRIVED",
        placementStatus: InternalPlacementStatus.ARRIVED_DESTINATION,
        inpatientEncounterStatus: "NOT_CREATED",
      };
    case "INPATIENT_CREATED_DISPLAY":
      return {
        ...base,
        operationalFilter: "INPATIENT_ENCOUNTER_CREATED",
        inpatientEncounterStatus: "CREATED",
        placementStatus: InternalPlacementStatus.ARRIVED_DESTINATION,
        receivingEncounterId: row.receivingEncounterId ?? "sim-display-only",
      };
    default:
      return base;
  }
}

export type { AdmissionOpsEventType };
