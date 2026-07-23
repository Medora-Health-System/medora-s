/**
 * D4A.2.4 — Admission operations convergence & placement activation readiness.
 * Documentation + dual-mode contracts. Does not enable placement flags or migrations.
 */

import { asAdmissionSummaryRecord } from "./admissionSummaryMerge.js";
import {
  readOperationalAcceptanceV1,
  type AdmissionOpsEventV1,
  type OperationalAcceptanceV1,
} from "./admissionOperationalAcceptanceD4a23.js";
import {
  buildAdmissionOpsEventTimeline,
  computeAdmissionSlaTimers,
  formatAdmissionSlaDuration,
  type AdmissionSlaTimers,
} from "./admissionCommandCenterD4a23.js";
import { InternalPlacementStatus } from "./internalPlacementStatusMachine.js";

export const ADMISSION_OPERATIONS_CONVERGENCE_D4A24_CERTIFICATION =
  "MEDUI.ADMISSION_OPERATIONS_CONVERGENCE.D4A2_4" as const;

export const ADMISSION_OPERATIONS_MODES = ["PLACEMENT_OFF", "PLACEMENT_ON"] as const;
export type AdmissionOperationsMode = (typeof ADMISSION_OPERATIONS_MODES)[number];

export function resolveAdmissionOperationsMode(
  placementWorkflowEnabled: boolean
): AdmissionOperationsMode {
  return placementWorkflowEnabled ? "PLACEMENT_ON" : "PLACEMENT_OFF";
}

/** Canonical ED workflow position for operational acceptance (enterprise target). */
export const ED_OPERATIONAL_ACCEPTANCE_POSITION =
  "AFTER_CLINICAL_SIGN_BEFORE_OR_AT_PLACEMENT_SUBMIT" as const;

/**
 * Capability identifiers (facility-scoped evaluation).
 * RoleCode lacks CHARGE_NURSE / HOUSE_SUPERVISOR / BED_MANAGEMENT — map via
 * RoleCode defaults until a durable user-capability store exists.
 */
export const ADMISSION_OPS_CAPABILITIES = [
  "ADMISSION_OPERATIONAL_ACCEPT",
  "ADMISSION_RECEIVING_ACCEPT",
  "ADMISSION_HOLD",
  "ADMISSION_ESCALATE",
  "BED_ASSIGN",
  "TRANSPORT_COORDINATE",
  "ARRIVAL_CONFIRM",
] as const;
export type AdmissionOpsCapability = (typeof ADMISSION_OPS_CAPABILITIES)[number];

/** Default RoleCode → capability grants (clinic MVP; not a second RoleCode enum). */
export const ADMISSION_OPS_CAPABILITY_DEFAULTS: Record<
  AdmissionOpsCapability,
  readonly string[]
> = {
  ADMISSION_OPERATIONAL_ACCEPT: ["ADMIN", "PROVIDER", "RN"],
  ADMISSION_RECEIVING_ACCEPT: ["ADMIN", "PROVIDER", "RN"],
  ADMISSION_HOLD: ["ADMIN", "PROVIDER", "RN"],
  ADMISSION_ESCALATE: ["ADMIN", "PROVIDER", "RN"],
  BED_ASSIGN: ["ADMIN"],
  TRANSPORT_COORDINATE: ["ADMIN", "PROVIDER", "RN"],
  ARRIVAL_CONFIRM: ["ADMIN", "PROVIDER", "RN"],
};

/**
 * Additive capability model required for charge-nurse / house-supervisor without
 * promoting users to ADMIN. NOT implemented as migration in this phase.
 */
export const ADMISSION_OPS_CAPABILITY_ADDITIVE_MODEL_PROPOSAL = {
  requiresMigration: true,
  approvalRequired: true,
  table: "FacilityUserCapability",
  fields: [
    "id uuid PK",
    "facilityId FK Facility RESTRICT",
    "userId FK User RESTRICT",
    "capability string",
    "isActive boolean",
    "grantedByUserId nullable",
    "grantedAt timestamptz",
    "revokedAt nullable",
  ],
  indexes: ["(facilityId, userId, capability) unique where isActive", "(facilityId, capability)"],
  uniqueness: "one active grant per (facility, user, capability)",
  backwardCompatible: "defaults continue to derive from RoleCode when no grants",
  interimWithoutMigration:
    "RoleCode ADMIN|PROVIDER|RN defaults only; charge/house supervisor map to RN/ADMIN",
} as const;

export function actorHasAdmissionOpsCapability(
  capability: AdmissionOpsCapability,
  roleCodes: readonly string[],
  /** Future: explicit facility grants. Ignored until table exists. */
  explicitGrants?: readonly string[] | null
): boolean {
  const roles = new Set(
    roleCodes.map((r) => String(r ?? "").trim().toUpperCase()).filter(Boolean)
  );
  if (roles.has("BILLING") && roles.size === 1) return false;
  if (explicitGrants?.some((g) => g === capability)) return true;
  const allowed = ADMISSION_OPS_CAPABILITY_DEFAULTS[capability];
  return allowed.some((c) => roles.has(c));
}

export type StateAuthorityRow = {
  state: string;
  currentSource: string;
  futureSourceWhenD3cEnabled: string;
  readProjection: string;
  writerEndpoint: string;
  owningService: string;
  featureFlag: string | null;
  migrationDependency: string | null;
  duplicateStateExists: boolean;
};

/** Authoritative source matrix — one durable authority after placement activation. */
export const ADMISSION_STATE_AUTHORITY_MATRIX_D4A24: readonly StateAuthorityRow[] = [
  {
    state: "ADMISSION_DECISION_SIGNED",
    currentSource: "Encounter.admissionSummaryJson.admissionDecisionMode/At/By",
    futureSourceWhenD3cEnabled: "same (clinical authority unchanged)",
    readProjection: "Command Center / Admission Review",
    writerEndpoint: "POST /encounters/:id/admission/decision",
    owningService: "EncountersService.recordAdmissionDecision",
    featureFlag: null,
    migrationDependency: null,
    duplicateStateExists: false,
  },
  {
    state: "OPERATIONAL_ADMISSION_ACCEPTANCE",
    currentSource: "admissionSummaryJson.operationalAcceptanceV1",
    futureSourceWhenD3cEnabled:
      "operationalAcceptanceV1 (pre-placement metadata) — not a placement SM",
    readProjection: "Command Center row.operationalStatus",
    writerEndpoint: "POST /encounters/:id/admission/operational-action",
    owningService: "AdmissionCommandCenterService.recordOperationalAction",
    featureFlag: null,
    migrationDependency: null,
    duplicateStateExists: false,
  },
  {
    state: "PLACEMENT_REQUEST_CREATION",
    currentSource: "InternalPlacementRequest (when flag ON; else none)",
    futureSourceWhenD3cEnabled: "InternalPlacementRequest",
    readProjection: "InternalPlacementService.getActiveForEncounter",
    writerEndpoint: "POST …/internal-placement/draft (+ SIGN path)",
    owningService: "InternalPlacementService.createDraft",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "20261025120000_internal_placement_request_d3c",
    duplicateStateExists: false,
  },
  {
    state: "PLACEMENT_QUEUE_SUBMISSION",
    currentSource: "InternalPlacementRequest.status=REQUESTED",
    futureSourceWhenD3cEnabled: "same",
    readProjection: "listFacilityQueue",
    writerEndpoint: "submitRequested / SIGN→submit",
    owningService: "InternalPlacementService.submitRequested",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "D3C",
    duplicateStateExists: false,
  },
  {
    state: "REQUESTED_SERVICE",
    currentSource: "admission packet / IPR.requestedService",
    futureSourceWhenD3cEnabled: "IPR.requestedService (placement) + clinical packet (clinical)",
    readProjection: "Command Center requestedService",
    writerEndpoint: "admission decision / placement draft",
    owningService: "EncountersService / InternalPlacementService",
    featureFlag: null,
    migrationDependency: null,
    duplicateStateExists: true,
  },
  {
    state: "REQUESTED_UNIT",
    currentSource: "IPR.requestedUnitCode / ops receivingUnit (JSON)",
    futureSourceWhenD3cEnabled: "IPR.requestedUnitCode only",
    readProjection: "Command Center unit (requested vs assigned)",
    writerEndpoint: "placement draft update",
    owningService: "InternalPlacementService",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "D3C",
    duplicateStateExists: true,
  },
  {
    state: "ASSIGNED_UNIT",
    currentSource: "IPR.assignedUnitCode",
    futureSourceWhenD3cEnabled: "IPR.assignedUnitCode",
    readProjection: "Command Center unit",
    writerEndpoint: "placement transition → BED_ASSIGNED",
    owningService: "InternalPlacementService.transition",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "D3C",
    duplicateStateExists: false,
  },
  {
    state: "ASSIGNED_BED",
    currentSource: "IPR.assignedBedKey",
    futureSourceWhenD3cEnabled: "IPR.assignedBedKey",
    readProjection: "Command Center bed",
    writerEndpoint: "placement transition → BED_ASSIGNED",
    owningService: "InternalPlacementService.transition",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "D3C",
    duplicateStateExists: false,
  },
  {
    state: "RECEIVING_ACCEPTANCE",
    currentSource:
      "DUPLICATE RISK: operationalAcceptanceV1.receiving vs IPR ACCEPTED/READY_FOR_TRANSFER",
    futureSourceWhenD3cEnabled:
      "InternalPlacementRequest transitions only (READY_FOR_TRANSFER after bed)",
    readProjection: "converged receivingAuthority projection",
    writerEndpoint: "placement transition (ON) / denied durable (OFF)",
    owningService: "InternalPlacementService.transition",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "D3C",
    duplicateStateExists: true,
  },
  {
    state: "OPERATIONAL_HOLD",
    currentSource: "operationalAcceptanceV1.hold",
    futureSourceWhenD3cEnabled: "operationalAcceptanceV1.hold (ops) + IPR ERROR_REVIEW (placement)",
    readProjection: "Command Center ON_HOLD filter",
    writerEndpoint: "POST operational-action HOLD",
    owningService: "AdmissionCommandCenterService",
    featureFlag: null,
    migrationDependency: null,
    duplicateStateExists: false,
  },
  {
    state: "RECEIVING_HOLD",
    currentSource: "ops.receiving ON_HOLD (JSON) — not production when placement OFF",
    futureSourceWhenD3cEnabled: "IPR status / acceptanceNotes — not ops.receiving JSON",
    readProjection: "placement projection",
    writerEndpoint: "placement transition",
    owningService: "InternalPlacementService",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "D3C",
    duplicateStateExists: true,
  },
  {
    state: "TRANSPORT_READINESS",
    currentSource: "IPR.READY_FOR_TRANSFER",
    futureSourceWhenD3cEnabled: "IPR.READY_FOR_TRANSFER",
    readProjection: "Command Center READY_FOR_TRANSPORT",
    writerEndpoint: "placement transition",
    owningService: "InternalPlacementService.transition",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "D3C",
    duplicateStateExists: false,
  },
  {
    state: "TRANSPORT_STARTED",
    currentSource: "IPR.DEPARTED_ED / departedEdAt",
    futureSourceWhenD3cEnabled: "same",
    readProjection: "Command Center TRANSPORT_IN_PROGRESS",
    writerEndpoint: "placement transition",
    owningService: "InternalPlacementService.transition",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "D3C",
    duplicateStateExists: false,
  },
  {
    state: "ARRIVAL",
    currentSource: "IPR.ARRIVED_DESTINATION / arrivedDestinationAt",
    futureSourceWhenD3cEnabled: "same",
    readProjection: "Command Center ARRIVED_AT_DESTINATION",
    writerEndpoint: "placement transition",
    owningService: "InternalPlacementService.transition",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "D3C",
    duplicateStateExists: false,
  },
  {
    state: "INPATIENT_ENCOUNTER_CREATION",
    currentSource: "tx.encounter.create at ARRIVED_DESTINATION (+ direct-admit path)",
    futureSourceWhenD3cEnabled: "same placement gate; direct admit separate",
    readProjection: "receivingEncounterId present",
    writerEndpoint: "InternalPlacementService.transition ARRIVED_DESTINATION",
    owningService: "InternalPlacementService",
    featureFlag: "RECEIVING_ENCOUNTER_FOUNDATION_ENABLED",
    migrationDependency: "D3C (+ D3B episode)",
    duplicateStateExists: false,
  },
  {
    state: "CANCELLATION",
    currentSource: "admission cancel clears JSON; IPR CANCELLED",
    futureSourceWhenD3cEnabled: "both coordinated — cancel decision + cancel IPR",
    readProjection: "ADMISSION_CANCELLED / CANCELLED filter",
    writerEndpoint: "POST admission/cancel; placement cancel",
    owningService: "EncountersService / InternalPlacementService",
    featureFlag: null,
    migrationDependency: null,
    duplicateStateExists: true,
  },
  {
    state: "FAILURE",
    currentSource: "IPR.ERROR_REVIEW",
    futureSourceWhenD3cEnabled: "same",
    readProjection: "FAILED_NEEDS_ATTENTION",
    writerEndpoint: "placement transition",
    owningService: "InternalPlacementService",
    featureFlag: "INTERNAL_PLACEMENT_WORKFLOW_ENABLED",
    migrationDependency: "D3C",
    duplicateStateExists: false,
  },
  {
    state: "REOPENING",
    currentSource: "not fully modeled — new decision / new IPR",
    futureSourceWhenD3cEnabled: "explicit ADMISSION_REOPENED event + new IPR if needed",
    readProjection: "none",
    writerEndpoint: "TBD",
    owningService: "TBD",
    featureFlag: null,
    migrationDependency: null,
    duplicateStateExists: false,
  },
] as const;

export const ADMISSION_SOURCE_KINDS = [
  "ED_ADMISSION",
  "OBSERVATION_CONVERSION",
  "DIRECT_ADMISSION",
  "SCHEDULED_ADMISSION",
  "TRANSFER_IN",
] as const;
export type AdmissionSourceKind = (typeof ADMISSION_SOURCE_KINDS)[number];

export type CanonicalAdmissionWorkflowBySource = {
  source: AdmissionSourceKind;
  sequence: readonly string[];
  notes: string;
};

export const CANONICAL_ADMISSION_WORKFLOWS_D4A24: readonly CanonicalAdmissionWorkflowBySource[] =
  [
    {
      source: "ED_ADMISSION",
      sequence: [
        "CLINICAL_SIGN",
        "OPERATIONAL_ACCEPT",
        "CREATE_REUSE_PLACEMENT",
        "SUBMIT_QUEUE",
        "ASSIGN_BED",
        "RECEIVING_ACCEPT",
        "TRANSPORT",
        "ARRIVAL",
        "CREATE_INPATIENT",
      ],
      notes:
        "Preferred enterprise path. Current interim when placement ON: SIGN may create/submit IPR immediately — ops accept remains pre-placement metadata and must not invent receiving.",
    },
    {
      source: "OBSERVATION_CONVERSION",
      sequence: [
        "OBS_INTENT",
        "DIRECT_OR_PLACEMENT_PATH",
        "CREATE_INPATIENT",
        "CORRELATION_UPDATE",
      ],
      notes: "Uses inpatient-operations convert + correlation; may bypass ED placement SM.",
    },
    {
      source: "DIRECT_ADMISSION",
      sequence: [
        "INTAKE",
        "CREATE_INPATIENT",
        "BED_ASSIGN_AT_CREATE",
        "RECEIVING_STARTED",
        "CORRELATION",
      ],
      notes: "Creates IP at intake when DIRECT_INPATIENT_ADMISSION_ENABLED — separate from ED SIGN.",
    },
    {
      source: "SCHEDULED_ADMISSION",
      sequence: ["INTAKE_SCHEDULED", "ARRIVAL_DAY", "CREATE_INPATIENT"],
      notes: "Intake form exists; limited Command Center federation today.",
    },
    {
      source: "TRANSFER_IN",
      sequence: ["INTAKE_EXTERNAL_TRANSFER", "CREATE_INPATIENT"],
      notes: "Intake source exists; limited Command Center federation today.",
    },
  ] as const;

/** Actions that may write operationalAcceptanceV1 in each mode. */
export const PLACEMENT_OFF_ALLOWED_OPS_ACTIONS = [
  "ACCEPT",
  "ACCEPT_WITH_NOTE",
  "HOLD",
  "DECLINE",
  "REDIRECT",
  "ESCALATE",
] as const;

export const PLACEMENT_ON_ALLOWED_OPS_JSON_ACTIONS = [
  "ACCEPT",
  "ACCEPT_WITH_NOTE",
  "HOLD",
  "DECLINE",
  "REDIRECT",
  "ESCALATE",
] as const;

/** Receiving/bed/transport/arrival must not write to ops JSON when placement ON. */
export const PLACEMENT_DOMAIN_ACTIONS = [
  "RECEIVING_ACCEPT",
  "RECEIVING_ACCEPT_WITH_CONDITIONS",
  "RECEIVING_HOLD",
  "RECEIVING_DECLINE",
] as const;

export type OpsActionRouting =
  | { route: "OPS_JSON"; mode: AdmissionOperationsMode }
  | { route: "PLACEMENT_SERVICE"; mode: "PLACEMENT_ON"; reason: string }
  | { route: "DENIED"; code: string; message: string };

export function routeOperationalAdmissionAction(
  action: string,
  mode: AdmissionOperationsMode
): OpsActionRouting {
  const a = String(action ?? "").toUpperCase();
  if (mode === "PLACEMENT_OFF") {
    if ((PLACEMENT_OFF_ALLOWED_OPS_ACTIONS as readonly string[]).includes(a)) {
      return { route: "OPS_JSON", mode };
    }
    if ((PLACEMENT_DOMAIN_ACTIONS as readonly string[]).includes(a)) {
      return {
        route: "DENIED",
        code: "PLACEMENT_WORKFLOW_UNAVAILABLE",
        message:
          "Receiving/bed/transport acceptance is not durable while placement workflow is unavailable. Use developer simulation for display-only demos.",
      };
    }
    return {
      route: "DENIED",
      code: "ADMISSION_OPERATION_STALE",
      message: "Unsupported operational action.",
    };
  }
  // PLACEMENT_ON
  if ((PLACEMENT_ON_ALLOWED_OPS_JSON_ACTIONS as readonly string[]).includes(a)) {
    return { route: "OPS_JSON", mode };
  }
  if ((PLACEMENT_DOMAIN_ACTIONS as readonly string[]).includes(a)) {
    return {
      route: "PLACEMENT_SERVICE",
      mode: "PLACEMENT_ON",
      reason: "Receiving authority is InternalPlacementRequest transitions only.",
    };
  }
  return {
    route: "DENIED",
    code: "ADMISSION_OPERATION_STALE",
    message: "Unsupported operational action.",
  };
}

/**
 * Receiving display authority — never invent production receiving when placement OFF.
 * When placement ON, ignore ops.receiving JSON.
 */
export function resolveReceivingAcceptanceAuthority(input: {
  placementWorkflowEnabled: boolean;
  placementStatus?: string | null;
  placementAcceptedAt?: string | null;
  placementReadyForTransferAt?: string | null;
  assignedBedKey?: string | null;
  ops?: OperationalAcceptanceV1 | null;
  simulationActive?: boolean;
}): {
  displayStatus: string;
  authority: "NONE" | "PLACEMENT" | "SIMULATION" | "OPS_JSON_LEGACY_IGNORED";
  bedImpliesReceiving: false;
} {
  const bedImpliesReceiving = false as const;
  if (input.simulationActive) {
    return {
      displayStatus: input.ops?.receiving?.status ?? "NOT_REQUESTED",
      authority: "SIMULATION",
      bedImpliesReceiving,
    };
  }
  if (!input.placementWorkflowEnabled) {
    return {
      displayStatus: "NOT_AVAILABLE",
      authority: "NONE",
      bedImpliesReceiving,
    };
  }
  const p = String(input.placementStatus ?? "").toUpperCase();
  // Product narrative: after bed, waiting for receiving until READY_FOR_TRANSFER+.
  if (
    p === InternalPlacementStatus.READY_FOR_TRANSFER ||
    p === InternalPlacementStatus.DEPARTED_ED ||
    p === InternalPlacementStatus.ARRIVED_DESTINATION ||
    p === InternalPlacementStatus.COMPLETED
  ) {
    return { displayStatus: "ACCEPTED", authority: "PLACEMENT", bedImpliesReceiving };
  }
  if (p === InternalPlacementStatus.BED_ASSIGNED) {
    return {
      displayStatus: "WAITING",
      authority: "PLACEMENT",
      bedImpliesReceiving,
    };
  }
  if (p === InternalPlacementStatus.ACCEPTED && !input.assignedBedKey) {
    // Machine ACCEPTED before bed — expose as placement accepted, not unit receiving-after-bed.
    return {
      displayStatus: "PLACEMENT_ACCEPTED_AWAITING_BED",
      authority: "PLACEMENT",
      bedImpliesReceiving,
    };
  }
  return {
    displayStatus: "NOT_REQUESTED",
    authority: "PLACEMENT",
    bedImpliesReceiving,
  };
}

/**
 * Converged event projection — placement OFF strips durable placement/receiving/transport events
 * unless they have real placement timestamps (should be none when OFF).
 * Simulation events must be labeled by caller; this adapter never marks simulation as real.
 */
export function buildConvergedAdmissionEventProjection(input: {
  admissionSummaryJson?: unknown;
  placementWorkflowEnabled: boolean;
  placementStatus?: string | null;
  placementRequestedAt?: string | null;
  placementAssignedAt?: string | null;
  placementAcceptedAt?: string | null;
  placementDepartedEdAt?: string | null;
  placementArrivedAt?: string | null;
  placementReadyForTransferAt?: string | null;
  receivingEncounterId?: string | null;
  assignedUnitCode?: string | null;
  assignedBedKey?: string | null;
  simulationActive?: boolean;
}): AdmissionOpsEventV1[] {
  const mode = resolveAdmissionOperationsMode(input.placementWorkflowEnabled);
  const base = buildAdmissionOpsEventTimeline({
    admissionSummaryJson: input.admissionSummaryJson,
    placementStatus: mode === "PLACEMENT_ON" ? input.placementStatus : null,
    placementRequestedAt: mode === "PLACEMENT_ON" ? input.placementRequestedAt : null,
    placementAssignedAt: mode === "PLACEMENT_ON" ? input.placementAssignedAt : null,
    placementAcceptedAt: mode === "PLACEMENT_ON" ? input.placementAcceptedAt : null,
    placementDepartedEdAt: mode === "PLACEMENT_ON" ? input.placementDepartedEdAt : null,
    placementArrivedAt: mode === "PLACEMENT_ON" ? input.placementArrivedAt : null,
    receivingEncounterId: mode === "PLACEMENT_ON" ? input.receivingEncounterId : null,
    assignedUnitCode: mode === "PLACEMENT_ON" ? input.assignedUnitCode : null,
    assignedBedKey: mode === "PLACEMENT_ON" ? input.assignedBedKey : null,
  });

  // Strip ops.receiving-derived events when placement ON (authority is IPR).
  // buildAdmissionOpsEventTimeline may include them from ops JSON — filter here.
  const ops = readOperationalAcceptanceV1(input.admissionSummaryJson);
  let events = base;
  if (mode === "PLACEMENT_ON") {
    events = events.filter((e) => {
      const receivingTypes = new Set([
        "RECEIVING_ACCEPTED",
        "RECEIVING_ACCEPTED_WITH_CONDITIONS",
        "RECEIVING_HOLD",
        "RECEIVING_DECLINED",
        "RECEIVING_ACCEPTANCE_REQUESTED",
      ]);
      if (!receivingTypes.has(e.type)) return true;
      // Keep only if tied to placement timestamps (placementAcceptedAt path), not ops-only.
      return Boolean(input.placementAcceptedAt || input.placementReadyForTransferAt);
    });
    // Drop receiving events that only came from ops.receiving without placement ready.
    if (!input.placementReadyForTransferAt && !input.placementAcceptedAt) {
      events = events.filter(
        (e) =>
          !String(e.type).startsWith("RECEIVING_") ||
          e.at === input.placementAcceptedAt
      );
    }
    // Prefer stripping all ops-receiving if ops had receiving but placement has no receiving stamp
    if (ops?.receiving?.acceptedAt && !input.placementReadyForTransferAt) {
      events = events.filter(
        (e) =>
          !(
            String(e.type).startsWith("RECEIVING_") &&
            e.at === ops.receiving?.acceptedAt
          )
      );
    }
  } else {
    // PLACEMENT_OFF: remove placement/receiving/transport/arrival durable claims
    const banned = new Set([
      "PLACEMENT_REQUEST_CREATED",
      "PLACEMENT_REQUEST_SIGNED",
      "PLACEMENT_REQUEST_SUBMITTED",
      "BED_ASSIGNED",
      "BED_CHANGED",
      "RECEIVING_ACCEPTED",
      "RECEIVING_ACCEPTED_WITH_CONDITIONS",
      "RECEIVING_HOLD",
      "RECEIVING_DECLINED",
      "RECEIVING_ACCEPTANCE_REQUESTED",
      "TRANSPORT_STARTED",
      "TRANSPORT_READY",
      "TRANSPORT_REQUESTED",
      "ARRIVED_DESTINATION",
      "INPATIENT_ENCOUNTER_CREATED",
    ]);
    events = events.filter((e) => !banned.has(e.type));
    // Keep ops accept/hold events from ops.events
  }

  if (input.simulationActive) {
    // Caller must label; do not emit as real — return ops-only + decision, no fake placement.
    return events;
  }

  // Stable sort: timestamp, then type, then requestId
  return [...events].sort((a, b) => {
    const ta = Date.parse(a.at) || 0;
    const tb = Date.parse(b.at) || 0;
    if (ta !== tb) return ta - tb;
    const ct = String(a.type).localeCompare(String(b.type));
    if (ct !== 0) return ct;
    return String(a.requestId ?? "").localeCompare(String(b.requestId ?? ""));
  });
}

export type ConvergedSlaView = {
  timers: AdmissionSlaTimers;
  unavailableIntervals: string[];
  mode: AdmissionOperationsMode;
  /**
   * Enterprise boarding definition NOT chosen — do not label as ED boarding time.
   * Documented candidates only.
   */
  boardingTimeDefinitionStatus: "NOT_CHOSEN";
  boardingTimeCandidates: {
    edArrivalToEdDeparture: string;
    admissionDecisionToEdDeparture: string;
  };
};

export function computeConvergedAdmissionSla(input: {
  placementWorkflowEnabled: boolean;
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
}): ConvergedSlaView {
  const mode = resolveAdmissionOperationsMode(input.placementWorkflowEnabled);
  const unavailable: string[] = [];
  if (mode === "PLACEMENT_OFF") {
    unavailable.push(
      "decisionToPlacementMs",
      "placementToBedMs",
      "bedToReceivingMs",
      "receivingToTransportMs",
      "transportToArrivalMs",
      "decisionToArrivalMs",
      "decisionToInpatientMs"
    );
    const timers = computeAdmissionSlaTimers({
      decisionAt: input.decisionAt,
      operationalAcceptedAt: input.operationalAcceptedAt,
      placementRequestedAt: null,
      bedAssignedAt: null,
      receivingAcceptedAt: null,
      transportStartedAt: null,
      arrivedAt: null,
      inpatientCreatedAt: null,
      currentStateEnteredAt: input.currentStateEnteredAt,
      nowMs: input.nowMs,
    });
    return {
      timers: {
        ...timers,
        decisionToPlacementMs: null,
        placementToBedMs: null,
        bedToReceivingMs: null,
        receivingToTransportMs: null,
        transportToArrivalMs: null,
        decisionToArrivalMs: null,
        decisionToInpatientMs: null,
      },
      unavailableIntervals: unavailable,
      mode,
      boardingTimeDefinitionStatus: "NOT_CHOSEN",
      boardingTimeCandidates: {
        edArrivalToEdDeparture: "patient ED arrival → physical ED departure",
        admissionDecisionToEdDeparture: "admission decision signed → physical ED departure",
      },
    };
  }
  return {
    timers: computeAdmissionSlaTimers(input),
    unavailableIntervals: [],
    mode,
    boardingTimeDefinitionStatus: "NOT_CHOSEN",
    boardingTimeCandidates: {
      edArrivalToEdDeparture: "patient ED arrival → physical ED departure",
      admissionDecisionToEdDeparture: "admission decision signed → physical ED departure",
    },
  };
}

export function formatSlaOrUnavailable(
  ms: number | null | undefined,
  unavailable: boolean
): string {
  if (unavailable) return "unavailable";
  return formatAdmissionSlaDuration(ms) ?? "unavailable";
}

export function detectAdmissionSourceKind(
  admissionSummaryJson: unknown,
  encounterType?: string | null
): AdmissionSourceKind {
  const root = asAdmissionSummaryRecord(admissionSummaryJson);
  const src = String(root.admissionSource ?? "").toUpperCase();
  if (src === "OBSERVATION_CONVERSION" || root.observationEncounterId) {
    return "OBSERVATION_CONVERSION";
  }
  if (src === "SCHEDULED" || src === "SCHEDULED_ADMISSION") return "SCHEDULED_ADMISSION";
  if (src === "EXTERNAL_TRANSFER" || src === "TRANSFER_IN") return "TRANSFER_IN";
  if (
    (root.d3e7DirectAdmission === true ||
      root.d3e6dHospitalAdmissionIntake === true ||
      src === "DIRECT" ||
      src === "EMERGENCY_DEPARTMENT") &&
    String(encounterType ?? "").toUpperCase() === "INPATIENT"
  ) {
    return "DIRECT_ADMISSION";
  }
  if (String(encounterType ?? "").toUpperCase() === "EMERGENCY") return "ED_ADMISSION";
  if (String(encounterType ?? "").toUpperCase() === "INPATIENT") return "DIRECT_ADMISSION";
  return "ED_ADMISSION";
}

/** Display state labels for Command Center (mode-aware). */
export function resolveConvergedDisplayState(input: {
  placementWorkflowEnabled: boolean;
  decisionSigned: boolean;
  operationalStatus: string;
  hasDurablePlacementRequest: boolean;
  placementStatus?: string | null;
  receivingDisplay: string;
  transportStatus: string;
  inpatientEncounterId?: string | null;
  onHold: boolean;
  cancelled: boolean;
  failed: boolean;
}): string {
  if (input.cancelled) return "CANCELLED";
  if (input.failed) return "FAILED";
  if (input.onHold) return "HELD";
  if (input.inpatientEncounterId) return "IP_ENCOUNTER_CREATED";
  if (!input.decisionSigned) return "DECISION_UNSIGNED";
  if (!input.placementWorkflowEnabled) {
    if (
      input.operationalStatus === "ACCEPTED" ||
      input.operationalStatus === "ACCEPTED_WITH_NOTE"
    ) {
      return "OPERATIONALLY_ACCEPTED_PLACEMENT_UNAVAILABLE";
    }
    return "DECISION_SIGNED_PLACEMENT_UNAVAILABLE";
  }
  const p = String(input.placementStatus ?? "").toUpperCase();
  if (p === InternalPlacementStatus.ARRIVED_DESTINATION) return "ARRIVED";
  if (p === InternalPlacementStatus.DEPARTED_ED) return "TRANSPORT_IN_PROGRESS";
  if (p === InternalPlacementStatus.READY_FOR_TRANSFER) return "READY_FOR_TRANSPORT";
  if (p === InternalPlacementStatus.BED_ASSIGNED) {
    return input.receivingDisplay === "ACCEPTED"
      ? "RECEIVING_ACCEPTED"
      : "WAITING_FOR_RECEIVING";
  }
  if (p === InternalPlacementStatus.REQUESTED || p === InternalPlacementStatus.UNDER_REVIEW) {
    return "SUBMITTED_TO_QUEUE";
  }
  if (p === InternalPlacementStatus.ACCEPTED) return "PLACEMENT_ACCEPTED_AWAITING_BED";
  if (p === InternalPlacementStatus.SIGNED || p === InternalPlacementStatus.DRAFT) {
    return "PLACEMENT_REQUEST_CREATED";
  }
  if (input.hasDurablePlacementRequest) return "PLACEMENT_REQUEST_CREATED";
  if (
    input.operationalStatus === "ACCEPTED" ||
    input.operationalStatus === "ACCEPTED_WITH_NOTE"
  ) {
    return "OPERATIONALLY_ACCEPTED";
  }
  return "DECISION_SIGNED";
}

export const D3B_D3C_SCHEMA_REQUIREMENTS = {
  d3bMigration: "20261024120000_hospital_episode_foundation_d3b",
  d3cMigration: "20261025120000_internal_placement_request_d3c",
  hospitalEpisode: {
    uniqueOriginatingEncounter: true,
    partialUniqueActiveFacilityPatient: true,
  },
  internalPlacementRequest: {
    partialUniqueActiveOriginatingEncounter: true,
    partialUniqueReceivingEncounter: true,
  },
  productionSchemaVerification: "PRODUCTION SCHEMA NOT VERIFIED",
} as const;

export const SAFE_ACTIVATION_SEQUENCE_D4A24 = [
  "1. Verify production schema: D3B + D3C applied (query _prisma_migrations)",
  "2. Verify uniqueness constraints present on InternalPlacementRequest + HospitalEpisode",
  "3. Enable HOSPITAL_EPISODE_FOUNDATION_ENABLED in non-prod; smoke episode create",
  "4. Enable RECEIVING_ENCOUNTER_FOUNDATION_ENABLED in non-prod; smoke ARRIVED→IP",
  "5. Enable INTERNAL_PLACEMENT_WORKFLOW_ENABLED in non-prod only",
  "6. Run Command Center dual-mode tests + placement transition idempotency suite",
  "7. Confirm SIGN does not create IP; ARRIVED_DESTINATION creates exactly one IP",
  "8. Confirm receiving authority is placement-only (no ops.receiving writes)",
  "9. Confirm RN/PROVIDER/ADMIN capabilities; billing denied",
  "10. Production enable only after PRODUCTION SCHEMA VERIFIED + staged rollout",
] as const;

export const ACTIVATION_SAFETY_CONFIRMATIONS_D4A24 = {
  onePlacementRequestPerOriginating: true,
  oneIpOnArrived: true,
  arrivedIdempotent: true,
  cancelledBlocksIp: true,
  bedChangeInvalidatesStaleReceiving: "REQUIRES_PLACEMENT_VERSION_CHECK",
  crossFacilityDenied: true,
  edRemainsOpenUntilArrivalPath: true,
  admissionCorrelationPreserved: true,
  hospitalEpisodeContinuity: true,
  failureAfterBedCanResume: true,
} as const;
