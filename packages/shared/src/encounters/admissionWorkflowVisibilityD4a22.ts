/**
 * D4A.2.2 — Admission workflow visibility (status, timeline, simulation).
 * Read-model helpers only. Does not create placement rows or inpatient encounters.
 */

import { asAdmissionSummaryRecord } from "./admissionSummaryMerge.js";
import { readAdmissionPacketV1 } from "./smartAdmissionPacketD4a2.js";
import { readAdaptiveEdNursingExecution } from "./adaptiveEdNursingExecutionD4a2.js";
import {
  InternalPlacementStatus,
  type InternalPlacementStatus as PlacementStatus,
} from "./internalPlacementStatusMachine.js";

export const ADMISSION_WORKFLOW_VISIBILITY_D4A22_CERTIFICATION =
  "MEDUI.ADMISSION_WORKFLOW_VISIBILITY.D4A2_2" as const;

/** High-level physician-facing admission workflow status (A–E). */
export const ADMISSION_WORKFLOW_STATUS_CODES = [
  "DECISION_SIGNED_NO_PLACEMENT",
  "PLACEMENT_REQUESTED_WAITING_BED",
  "BED_ASSIGNED_WAITING_RECEIVING",
  "ARRIVED_INPATIENT_CREATED",
  "ADMISSION_CANCELLED",
  "DECISION_DRAFT",
  "NO_ADMISSION_DECISION",
] as const;
export type AdmissionWorkflowStatusCode = (typeof ADMISSION_WORKFLOW_STATUS_CODES)[number];

export const ADMISSION_TIMELINE_NODE_IDS = [
  "PHYSICIAN_DECISION",
  "PLACEMENT_REQUEST",
  "BED_ASSIGNMENT",
  "RECEIVING_ACCEPTANCE",
  "PATIENT_TRANSPORT",
  "INPATIENT_ENCOUNTER",
] as const;
export type AdmissionTimelineNodeId = (typeof ADMISSION_TIMELINE_NODE_IDS)[number];

export const ADMISSION_TIMELINE_NODE_STATES = [
  "COMPLETED",
  "PENDING",
  "WAITING",
  "CANCELLED",
  "FAILED",
  "NOT_CREATED",
] as const;
export type AdmissionTimelineNodeState = (typeof ADMISSION_TIMELINE_NODE_STATES)[number];

export type AdmissionTimelineNode = {
  id: AdmissionTimelineNodeId;
  state: AdmissionTimelineNodeState;
  at?: string | null;
};

export type AdmissionWorkflowSnapshotInput = {
  admissionSummaryJson?: unknown;
  nursingAssessment?: unknown;
  /** Active InternalPlacementRequest status when available; null when placement OFF / none. */
  placementStatus?: string | null;
  placementRequestedAt?: string | null;
  placementAssignedAt?: string | null;
  placementAcceptedAt?: string | null;
  placementDepartedEdAt?: string | null;
  placementArrivedAt?: string | null;
  receivingEncounterId?: string | null;
  placementWorkflowEnabled?: boolean;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  cancelledByDisplay?: string | null;
  simulationStage?: AdmissionSimulationStage;
};

export type AdmissionWorkflowVisibilityModel = {
  statusCode: AdmissionWorkflowStatusCode;
  decisionMode: "DRAFT" | "SIGN" | "CANCELLED" | "NONE";
  decisionAt: string | null;
  decisionByUserId: string | null;
  edEncounterRemainsOpen: true;
  inpatientEncounterExists: boolean;
  receivingEncounterId: string | null;
  placementWorkflowEnabled: boolean;
  placementStatus: string | null;
  timeline: AdmissionTimelineNode[];
  cancellation: {
    reason: string | null;
    at: string | null;
    byDisplay: string | null;
  } | null;
  /** Never claim "submitted to placement" when placement is OFF or absent. */
  falselyImpliesPlacementSubmitted: boolean;
  /** True when timeline/status include client-only simulation overlays. */
  simulationActive: boolean;
  simulationStage: AdmissionSimulationStage;
};

function placementRank(status: string | null | undefined): number {
  const s = String(status ?? "").trim().toUpperCase();
  const order: Record<string, number> = {
    [InternalPlacementStatus.DRAFT]: 1,
    [InternalPlacementStatus.SIGNED]: 2,
    [InternalPlacementStatus.REQUESTED]: 3,
    [InternalPlacementStatus.UNDER_REVIEW]: 4,
    [InternalPlacementStatus.ACCEPTED]: 5,
    [InternalPlacementStatus.BED_ASSIGNED]: 6,
    [InternalPlacementStatus.READY_FOR_TRANSFER]: 7,
    [InternalPlacementStatus.DEPARTED_ED]: 8,
    [InternalPlacementStatus.ARRIVED_DESTINATION]: 9,
    [InternalPlacementStatus.COMPLETED]: 10,
    [InternalPlacementStatus.CANCELLED]: -1,
    [InternalPlacementStatus.DECLINED]: -1,
    [InternalPlacementStatus.EXPIRED]: -1,
    [InternalPlacementStatus.ERROR_REVIEW]: -2,
  };
  return order[s] ?? 0;
}

export function resolveAdmissionWorkflowStatus(
  input: AdmissionWorkflowSnapshotInput
): AdmissionWorkflowStatusCode {
  const root = asAdmissionSummaryRecord(input.admissionSummaryJson);
  const mode = String(root.admissionDecisionMode ?? "").toUpperCase();
  const cancelled =
    String(root.admissionDecisionCancelled ?? "").toLowerCase() === "true" ||
    Boolean(input.cancellationReason) ||
    String(input.placementStatus ?? "").toUpperCase() === InternalPlacementStatus.CANCELLED;
  if (cancelled && mode !== "SIGN") {
    return "ADMISSION_CANCELLED";
  }
  if (mode !== "SIGN") {
    return mode === "DRAFT" ? "DECISION_DRAFT" : "NO_ADMISSION_DECISION";
  }
  if (cancelled) return "ADMISSION_CANCELLED";

  const rank = placementRank(input.placementStatus);
  const hasIp = Boolean(String(input.receivingEncounterId ?? "").trim()) || rank >= 9;
  if (hasIp) return "ARRIVED_INPATIENT_CREATED";
  if (rank >= 6) return "BED_ASSIGNED_WAITING_RECEIVING";
  if (rank >= 3) return "PLACEMENT_REQUESTED_WAITING_BED";
  return "DECISION_SIGNED_NO_PLACEMENT";
}

export function buildAdmissionWorkflowTimeline(
  input: AdmissionWorkflowSnapshotInput
): AdmissionTimelineNode[] {
  const root = asAdmissionSummaryRecord(input.admissionSummaryJson);
  const mode = String(root.admissionDecisionMode ?? "").toUpperCase();
  const decisionAt = typeof root.admissionDecisionAt === "string" ? root.admissionDecisionAt : null;
  const rank = placementRank(input.placementStatus);
  const cancelled =
    resolveAdmissionWorkflowStatus(input) === "ADMISSION_CANCELLED" ||
    String(input.placementStatus ?? "").toUpperCase() === InternalPlacementStatus.CANCELLED;
  const failed =
    String(input.placementStatus ?? "").toUpperCase() === InternalPlacementStatus.ERROR_REVIEW;

  const node = (
    id: AdmissionTimelineNodeId,
    state: AdmissionTimelineNodeState,
    at?: string | null
  ): AdmissionTimelineNode => ({ id, state, at: at ?? null });

  if (cancelled) {
    return [
      node("PHYSICIAN_DECISION", mode === "SIGN" ? "COMPLETED" : "CANCELLED", decisionAt),
      node("PLACEMENT_REQUEST", "CANCELLED", input.placementRequestedAt),
      node("BED_ASSIGNMENT", "CANCELLED", input.placementAssignedAt),
      node("RECEIVING_ACCEPTANCE", "CANCELLED", input.placementAcceptedAt),
      node("PATIENT_TRANSPORT", "CANCELLED", input.placementDepartedEdAt),
      node("INPATIENT_ENCOUNTER", "NOT_CREATED", null),
    ];
  }

  const decisionState: AdmissionTimelineNodeState =
    mode === "SIGN" ? "COMPLETED" : mode === "DRAFT" ? "WAITING" : "PENDING";

  let placementNode: AdmissionTimelineNodeState = "PENDING";
  if (failed) placementNode = "FAILED";
  else if (rank >= 3) placementNode = "COMPLETED";
  else if (rank >= 1) placementNode = "WAITING";
  else if (mode === "SIGN" && !input.placementWorkflowEnabled) placementNode = "PENDING";

  let bedState: AdmissionTimelineNodeState = rank >= 3 ? "WAITING" : "PENDING";
  if (rank >= 6) bedState = "COMPLETED";
  if (failed && rank < 6) bedState = "FAILED";

  // Product narrative: Placement → Bed → Receiving acceptance → Transport → IP.
  // Machine ranks ACCEPTED before BED_ASSIGNED; UI waits for receiving until READY_FOR_TRANSFER+.
  let receivingState: AdmissionTimelineNodeState = "PENDING";
  if (rank >= 7) receivingState = "COMPLETED";
  else if (rank >= 6) receivingState = "WAITING";

  let transportState: AdmissionTimelineNodeState = "PENDING";
  if (rank >= 8) transportState = "COMPLETED";
  else if (rank >= 7) transportState = "WAITING";

  let ipState: AdmissionTimelineNodeState = "NOT_CREATED";
  if (input.receivingEncounterId || rank >= 9) ipState = "COMPLETED";
  else if (rank >= 8) ipState = "WAITING";

  return [
    node("PHYSICIAN_DECISION", decisionState, decisionAt),
    node("PLACEMENT_REQUEST", placementNode, input.placementRequestedAt),
    node("BED_ASSIGNMENT", bedState, input.placementAssignedAt),
    node("RECEIVING_ACCEPTANCE", receivingState, input.placementAcceptedAt),
    node("PATIENT_TRANSPORT", transportState, input.placementDepartedEdAt),
    node(
      "INPATIENT_ENCOUNTER",
      ipState,
      ipState === "COMPLETED" ? input.placementArrivedAt ?? null : null
    ),
  ];
}

export function buildAdmissionWorkflowVisibilityModel(
  input: AdmissionWorkflowSnapshotInput
): AdmissionWorkflowVisibilityModel {
  const stage = input.simulationStage ?? "NONE";
  const effective =
    stage === "NONE" ? input : applyAdmissionWorkflowSimulation(input, stage);
  const root = asAdmissionSummaryRecord(effective.admissionSummaryJson);
  const modeRaw = String(root.admissionDecisionMode ?? "").toUpperCase();
  const statusCode = resolveAdmissionWorkflowStatus(effective);
  const decisionMode =
    statusCode === "ADMISSION_CANCELLED"
      ? "CANCELLED"
      : modeRaw === "SIGN"
        ? "SIGN"
        : modeRaw === "DRAFT"
          ? "DRAFT"
          : "NONE";
  // Real IP existence only — simulation never invents a navigable receiving encounter.
  const inpatientEncounterExists = Boolean(
    String(input.receivingEncounterId ?? "").trim()
  );

  return {
    statusCode,
    decisionMode,
    decisionAt: typeof root.admissionDecisionAt === "string" ? root.admissionDecisionAt : null,
    decisionByUserId:
      typeof root.admissionDecisionByUserId === "string" ? root.admissionDecisionByUserId : null,
    edEncounterRemainsOpen: true,
    inpatientEncounterExists,
    receivingEncounterId: input.receivingEncounterId?.trim() || null,
    placementWorkflowEnabled: effective.placementWorkflowEnabled === true,
    placementStatus: effective.placementStatus?.trim() || null,
    timeline: buildAdmissionWorkflowTimeline(effective),
    cancellation:
      statusCode === "ADMISSION_CANCELLED"
        ? {
            reason: effective.cancellationReason ?? null,
            at: effective.cancelledAt ?? null,
            byDisplay: effective.cancelledByDisplay ?? null,
          }
        : null,
    falselyImpliesPlacementSubmitted: false,
    simulationActive: stage !== "NONE",
    simulationStage: stage,
  };
}

/** Simulation stages — client overlay only; never persists. */
export const ADMISSION_SIMULATION_STAGES = [
  "NONE",
  "PLACEMENT_CREATED",
  "BED_ASSIGNED",
  "RECEIVING_ACCEPTED",
  "PATIENT_ARRIVED",
] as const;
export type AdmissionSimulationStage = (typeof ADMISSION_SIMULATION_STAGES)[number];

export function applyAdmissionWorkflowSimulation(
  base: AdmissionWorkflowSnapshotInput,
  stage: AdmissionSimulationStage
): AdmissionWorkflowSnapshotInput {
  if (stage === "NONE") return { ...base, placementWorkflowEnabled: base.placementWorkflowEnabled };
  const now = new Date().toISOString();
  const simulated: AdmissionWorkflowSnapshotInput = {
    ...base,
    placementWorkflowEnabled: true,
  };
  if (stage === "PLACEMENT_CREATED") {
    simulated.placementStatus = InternalPlacementStatus.REQUESTED;
    simulated.placementRequestedAt = now;
  } else if (stage === "BED_ASSIGNED") {
    simulated.placementStatus = InternalPlacementStatus.BED_ASSIGNED;
    simulated.placementRequestedAt = now;
    simulated.placementAssignedAt = now;
    simulated.placementAcceptedAt = now;
  } else if (stage === "RECEIVING_ACCEPTED") {
    simulated.placementStatus = InternalPlacementStatus.READY_FOR_TRANSFER;
    simulated.placementRequestedAt = now;
    simulated.placementAssignedAt = now;
    simulated.placementAcceptedAt = now;
  } else if (stage === "PATIENT_ARRIVED") {
    simulated.placementStatus = InternalPlacementStatus.ARRIVED_DESTINATION;
    simulated.placementRequestedAt = now;
    simulated.placementAssignedAt = now;
    simulated.placementAcceptedAt = now;
    simulated.placementDepartedEdAt = now;
    simulated.placementArrivedAt = now;
    // Simulation must NOT invent a real receiving encounter id that could be navigated.
    simulated.receivingEncounterId = null;
  }
  return simulated;
}

/** Package preview fields derived from chart JSON (read-only). */
export type AdmissionPackagePreviewModel = {
  signed: boolean;
  draftLabelRequired: boolean;
  reasonForAdmission: string | null;
  primaryDiagnosis: string | null;
  secondaryDiagnoses: string[];
  service: string | null;
  levelOfCare: string | null;
  conditionStatus: string | null;
  conditionNarrative: string | null;
  initialPlanNarrative: string | null;
  structuredPlanItems: Array<{
    display: string;
    status: string;
    selectedForNarrative: boolean;
  }>;
  decisionAt: string | null;
  responsiblePhysician: string | null;
  nursingPathway: string | null;
  nursingCompleted: boolean;
  provenanceByField: Record<string, string | null>;
};

export function buildAdmissionPackagePreview(input: {
  admissionSummaryJson?: unknown;
  nursingAssessment?: unknown;
}): AdmissionPackagePreviewModel {
  const root = asAdmissionSummaryRecord(input.admissionSummaryJson);
  const packet = readAdmissionPacketV1(input.admissionSummaryJson);
  const diagnoses =
    root.admissionDiagnosesV1 && typeof root.admissionDiagnosesV1 === "object"
      ? (root.admissionDiagnosesV1 as Record<string, unknown>)
      : {};
  const nursing = readAdaptiveEdNursingExecution(input.nursingAssessment);
  const mode = String(root.admissionDecisionMode ?? "").toUpperCase();
  const signed = mode === "SIGN";
  return {
    signed,
    draftLabelRequired: !signed && mode === "DRAFT",
    reasonForAdmission:
      String(root.admissionReason ?? packet.fields.admissionReason?.value ?? "").trim() || null,
    primaryDiagnosis: String(diagnoses.primaryDisplay ?? root.admissionDiagnosis ?? "").trim() || null,
    secondaryDiagnoses: Array.isArray(diagnoses.secondaryDisplays)
      ? diagnoses.secondaryDisplays.map((s) => String(s)).filter(Boolean)
      : [],
    service:
      packet.admittingServiceCode ||
      String(root.serviceUnit ?? "").trim() ||
      null,
    levelOfCare:
      packet.levelOfCareCode || String(root.careLevel ?? "").trim() || null,
    conditionStatus: packet.conditionStatus ?? null,
    conditionNarrative:
      String(root.conditionAtAdmission ?? packet.fields.conditionAtAdmission?.value ?? "").trim() ||
      null,
    initialPlanNarrative:
      String(root.initialPlan ?? packet.fields.initialPlan?.value ?? "").trim() || null,
    structuredPlanItems: (packet.structuredInitialPlan?.items ?? []).map((i) => ({
      display: i.display,
      status: i.status,
      selectedForNarrative: i.selectedForNarrative,
    })),
    decisionAt: typeof root.admissionDecisionAt === "string" ? root.admissionDecisionAt : null,
    responsiblePhysician: String(root.responsiblePhysicianName ?? "").trim() || null,
    nursingPathway: nursing?.pathway ?? null,
    nursingCompleted: Boolean(nursing?.completedAt),
    provenanceByField: {
      admissionReason: packet.fields.admissionReason?.origin ?? null,
      initialPlan: packet.fields.initialPlan?.origin ?? null,
      conditionAtAdmission: packet.fields.conditionAtAdmission?.origin ?? null,
    },
  };
}

/**
 * Placement readiness audit (documentation object — not an activator).
 * Safe-to-activate answers remain NO until D3C is confirmed in the target DB.
 */
export const PLACEMENT_READINESS_AUDIT_D4A22 = [
  {
    step: "ADMISSION_DECISION",
    api: "POST /encounters/:id/admission/decision",
    controller: "EncountersController.recordAdmissionDecision",
    service: "EncountersService.recordAdmissionDecision",
    prisma: "Encounter.admissionSummaryJson",
    featureFlag: null,
    migrationDependency: null,
    currentStatus: "LIVE",
    safeToActivate: true,
    failureBehavior: "Coded 400/403/409; ED remains open",
  },
  {
    step: "INTERNAL_PLACEMENT_REQUEST",
    api: "via recordAdmissionDecision → InternalPlacementService.createDraft/sign/submit",
    controller: "EncountersController (nested); InternalPlacementController",
    service: "InternalPlacementService.createDraft / signDraft / submitRequested",
    prisma: "InternalPlacementRequest",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "20261025120000_internal_placement_request_d3c (+ D3B)",
    currentStatus: "GATED_OFF",
    safeToActivate: false,
    failureBehavior: "Skipped when flag OFF; throws when ON and schema missing",
  },
  {
    step: "PLACEMENT_QUEUE",
    api: "GET placement queue / listFacilityQueue",
    controller: "InternalPlacementController",
    service: "InternalPlacementService.listFacilityQueue",
    prisma: "InternalPlacementRequest",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "D3C",
    currentStatus: "GATED_OFF",
    safeToActivate: false,
    failureBehavior: "FEATURE_DISABLED empty list when OFF",
  },
  {
    step: "BED_ASSIGNMENT",
    api: "POST/PATCH placement transition → BED_ASSIGNED",
    controller: "InternalPlacementController.transition",
    service: "InternalPlacementService.transition",
    prisma: "InternalPlacementRequest.assigned*",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "D3C",
    currentStatus: "GATED_OFF",
    safeToActivate: false,
    failureBehavior: "assertWorkflowEnabled / status machine reject",
  },
  {
    step: "RECEIVING_ACCEPTANCE",
    api: "transition → ACCEPTED / READY_FOR_TRANSFER",
    controller: "InternalPlacementController.transition",
    service: "InternalPlacementService.transition",
    prisma: "InternalPlacementRequest",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "D3C",
    currentStatus: "GATED_OFF",
    safeToActivate: false,
    failureBehavior: "role/status machine gates",
  },
  {
    step: "TRANSPORT",
    api: "transition → DEPARTED_ED",
    controller: "InternalPlacementController.transition",
    service: "InternalPlacementService.transition",
    prisma: "InternalPlacementRequest.departedEdAt",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "D3C",
    currentStatus: "GATED_OFF",
    safeToActivate: false,
    failureBehavior: "status machine gates",
  },
  {
    step: "INPATIENT_ENCOUNTER_CREATION",
    api: "transition → ARRIVED_DESTINATION",
    controller: "InternalPlacementController.transition",
    service: "InternalPlacementService.transition (tx.encounter.create)",
    prisma: "Encounter (INPATIENT) + receivingEncounterId",
    featureFlag: "RECEIVING_ENCOUNTER_FOUNDATION_ENABLED (+ placement ON)",
    migrationDependency: "D3C (+ D3B for episode link)",
    currentStatus: "GATED_OFF",
    safeToActivate: false,
    failureBehavior: "No IP create when receiving foundation OFF",
  },
] as const;

/**
 * Exact inpatient creation gate (placement path).
 * There is no named createInpatientEncounter() — creation is inline
 * `tx.encounter.create` inside InternalPlacementService.transition at ARRIVED_DESTINATION.
 */
export const INPATIENT_CREATION_GATE_D4A22 = {
  file: "apps/api/src/encounters/internal-placement.service.ts",
  method: "transition",
  createCallsite: "tx.encounter.create",
  triggerStatus: "ARRIVED_DESTINATION",
  controller: "apps/api/src/encounters/internal-placement.controller.ts",
  controllerMethod: "transition",
  requires: [
    "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    "RECEIVING_ENCOUNTER_FOUNDATION_ENABLED",
    "InternalPlacementRequest exists",
    "prior bed assignment in status machine path",
    "READY_FOR_TRANSFER → DEPARTED_ED → ARRIVED_DESTINATION",
    "arrival transition authorized",
  ],
  notOnPhysicianSign: true,
  alternateDirectPath:
    "apps/api/src/encounters/inpatient-operations.service.ts#createDirectAdmission",
} as const;

export function isAdmissionSimulationAllowed(env?: {
  NODE_ENV?: string | null;
  ADMISSION_WORKFLOW_SIMULATION_ENABLED?: string | null;
}): boolean {
  const node = String(env?.NODE_ENV ?? "").trim().toLowerCase();
  if (node === "production") return false;
  const flag = String(env?.ADMISSION_WORKFLOW_SIMULATION_ENABLED ?? "")
    .trim()
    .toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  // Dev/test default: allow simulation overlays (no DB writes).
  return node !== "production";
}

export type { PlacementStatus };
