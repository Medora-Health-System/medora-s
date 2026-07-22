/**
 * D3E.8A — Admission intent origination, observation conversion & legacy reconciliation.
 * Reuses HospitalAdmissionCorrelationV1 from D3E.8.
 */

import {
  MEDICATION_TRANSITION_ACTIONS,
  type MedicationTransitionAction,
} from "./medicationAdmissionTransitionV1.js";
import {
  buildHospitalAdmissionCorrelationV1,
  canTransitionAdmissionCorrelationStatus,
  evaluateLegacyAdmissionLinkage,
  hospitalEpisodeAloneCannotProveCorrelation,
  type AdmissionCorrelationStatus,
  type HospitalAdmissionCorrelationV1,
  type LegacyReconciliationDecision,
} from "./hospitalAdmissionCorrelationV1.js";

export const ADMISSION_INTENT_ORIGINATION_CERTIFICATION_ID =
  "MEDUI.ADMISSION_INTENT_ORIGINATION_OBS_CONVERSION.D3E8A" as const;

export const PLACEMENT_ADMISSION_CORRELATION_ID_KEY = "admissionCorrelationId" as const;

const ACTIVE_STATUSES: AdmissionCorrelationStatus[] = [
  "INTENT_CREATED",
  "PLACEMENT_REQUESTED",
  "ACCEPTED",
  "RECEIVING_STARTED",
  "ENCOUNTER_CREATED",
  "ARRIVED",
  "ACTIVE",
];

export type AdmissionCorrelationMutationPatch = Partial<
  Pick<
    HospitalAdmissionCorrelationV1,
    | "status"
    | "internalPlacementRequestId"
    | "receivingEncounterId"
    | "hospitalEpisodeId"
    | "destinationUnitId"
    | "requestedAdmissionAt"
    | "receivingStartedAt"
    | "arrivedAt"
    | "completedAt"
    | "receivingUserId"
    | "admissionSource"
  >
>;

export type AdmissionCorrelationMutationResult =
  | { ok: true; correlation: HospitalAdmissionCorrelationV1 }
  | { ok: false; code: "VERSION_CONFLICT"; detail: string; currentVersion: number }
  | { ok: false; code: "INVALID_TRANSITION"; detail: string; from: AdmissionCorrelationStatus; to: AdmissionCorrelationStatus };

export type AdmissionIntentOriginationPlanStep = {
  order: number;
  action: "CREATE_CORRELATION" | "ATTACH_PLACEMENT" | "ADVANCE_STATUS";
  targetStatus: AdmissionCorrelationStatus;
  detail: string;
};

export type EdAdmitIntentOriginationPlan = {
  certificationId: typeof ADMISSION_INTENT_ORIGINATION_CERTIFICATION_ID;
  steps: AdmissionIntentOriginationPlanStep[];
  initialCorrelation: HospitalAdmissionCorrelationV1;
  finalCorrelation: HospitalAdmissionCorrelationV1;
  placementRequestId: string;
};

export type AttachPlacementPlanResult =
  | {
      ok: true;
      correlation: HospitalAdmissionCorrelationV1;
      placementSpecialNeeds: Record<string, unknown>;
    }
  | { ok: false; code: "PLACEMENT_MISMATCH" | "CORRELATION_CONFLICT"; detail: string };

export type ExistingAdmissionIntentEvaluation =
  | { code: "OK_CREATE" }
  | { code: "EXISTING_ADMISSION_INTENT"; correlation: HospitalAdmissionCorrelationV1 };

export type ObservationConversionPlan = {
  certificationId: typeof ADMISSION_INTENT_ORIGINATION_CERTIFICATION_ID;
  correlation: HospitalAdmissionCorrelationV1;
  createNewInpatient: true;
  preserveObservationEncounterType: true;
  medicationTransitionRequired: MedicationTransitionAction;
  steps: AdmissionIntentOriginationPlanStep[];
};

export type CancelBeforeArrivalPlan = {
  allowed: true;
  correlation: HospitalAdmissionCorrelationV1;
  cancelPlacement: true;
  releaseBedIfNotArrived: true;
  createReceivingEncounter: false;
};

export type CancelBeforeArrivalDenied = {
  allowed: false;
  code: "INVALID_STATUS" | "ALREADY_ARRIVED";
  detail: string;
};

export type CancelAfterReceivingPlan = {
  allowed: true;
  correlation: HospitalAdmissionCorrelationV1;
  voidReceivingEncounter: true;
  preserveReceivingRecord: true;
  preserveCorrelationLinkage: true;
  releaseBedWhenSafe: boolean;
};

export type CancelAfterReceivingDenied = {
  allowed: false;
  code: "INVALID_STATUS" | "NO_RECEIVING_ENCOUNTER";
  detail: string;
};

export type AdmissionOrphanFindingSeverity = "HARD_ERROR" | "REVIEW_REQUIRED" | "INFORMATIONAL";

export type AdmissionOrphanFinding = {
  code: string;
  severity: AdmissionOrphanFindingSeverity;
  detail: string;
  correlationId?: string | null;
  placementRequestId?: string | null;
  receivingEncounterId?: string | null;
  bedId?: string | null;
};

export type LegacyReconciliationEvidenceInput = {
  placementReceivingEncounterId?: string | null;
  candidateEncounterId?: string | null;
  explicitIntakeLinkage?: boolean;
  idempotencyKeyMatch?: boolean;
  samePatientOnly?: boolean;
  sameFacilityOnly?: boolean;
  sameEpisodeOnly?: boolean;
  admittedAtProximityOnly?: boolean;
  sameUnitOnly?: boolean;
  sameBedOnly?: boolean;
  openInpatientOnly?: boolean;
};

export type LegacyReconciliationEvidenceDecision =
  | LegacyReconciliationDecision
  | { action: "REVIEW_REQUIRED"; code: "ADMISSION_CORRELATION_REVIEW_REQUIRED"; detail: string };

export type AdmissionJourneyLifecycleStep = {
  order: number;
  stepKey: string;
  labelKey: string;
  statusGate: AdmissionCorrelationStatus;
  reached: boolean;
  current: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function trimOrNull(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  return s ? s : null;
}

export function isActiveAdmissionCorrelationStatus(
  status: AdmissionCorrelationStatus
): boolean {
  return status !== "CANCELLED" && status !== "COMPLETED";
}

export function applyAdmissionCorrelationMutation(
  current: HospitalAdmissionCorrelationV1,
  expectedVersion: number,
  patch: AdmissionCorrelationMutationPatch
): AdmissionCorrelationMutationResult {
  if (current.correlationVersion !== expectedVersion) {
    return {
      ok: false,
      code: "VERSION_CONFLICT",
      detail: `Expected correlationVersion ${expectedVersion}, found ${current.correlationVersion}`,
      currentVersion: current.correlationVersion,
    };
  }

  const nextStatus = patch.status ?? current.status;
  if (nextStatus !== current.status && !canTransitionAdmissionCorrelationStatus(current.status, nextStatus)) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      detail: `Cannot transition from ${current.status} to ${nextStatus}`,
      from: current.status,
      to: nextStatus,
    };
  }

  const next: HospitalAdmissionCorrelationV1 = {
    ...current,
    ...patch,
    status: nextStatus,
    correlationVersion: current.correlationVersion + 1,
  };

  return { ok: true, correlation: next };
}

export function planEdAdmitIntentOrigination(input: {
  patientId: string;
  facilityId: string;
  sourceEncounterId: string;
  placementRequestId: string;
  initiatedByUserId: string;
  destinationUnitId?: string | null;
  hospitalEpisodeId?: string | null;
  idempotencyKey?: string | null;
  requestedAdmissionAt?: string | null;
  serverGeneratedId?: string | null;
}): EdAdmitIntentOriginationPlan {
  const placementRequestId = String(input.placementRequestId ?? "").trim();
  const initialCorrelation = buildHospitalAdmissionCorrelationV1({
    admissionIntent: "ED_ADMIT_TO_INPATIENT",
    status: "INTENT_CREATED",
    patientId: input.patientId,
    facilityId: input.facilityId,
    sourceEncounterId: input.sourceEncounterId,
    initiatedByUserId: input.initiatedByUserId,
    destinationUnitId: input.destinationUnitId,
    hospitalEpisodeId: input.hospitalEpisodeId,
    idempotencyKey: input.idempotencyKey,
    requestedAdmissionAt: input.requestedAdmissionAt,
    serverGeneratedId: input.serverGeneratedId,
    admissionSource: "ED",
  });

  const attached = buildHospitalAdmissionCorrelationV1({
    ...initialCorrelation,
    internalPlacementRequestId: placementRequestId,
    correlationVersion: initialCorrelation.correlationVersion,
  });

  const finalCorrelation = buildHospitalAdmissionCorrelationV1({
    ...attached,
    status: "PLACEMENT_REQUESTED",
    requestedAdmissionAt:
      attached.requestedAdmissionAt ?? new Date().toISOString(),
    correlationVersion: attached.correlationVersion,
  });

  return {
    certificationId: ADMISSION_INTENT_ORIGINATION_CERTIFICATION_ID,
    steps: [
      {
        order: 1,
        action: "CREATE_CORRELATION",
        targetStatus: "INTENT_CREATED",
        detail: "Create admission correlation at ED admit intent",
      },
      {
        order: 2,
        action: "ATTACH_PLACEMENT",
        targetStatus: "INTENT_CREATED",
        detail: "Attach placement to correlation at creation",
      },
      {
        order: 3,
        action: "ADVANCE_STATUS",
        targetStatus: "PLACEMENT_REQUESTED",
        detail: "Advance correlation to placement requested",
      },
    ],
    initialCorrelation,
    finalCorrelation,
    placementRequestId,
  };
}

export function planAttachPlacementToCorrelation(input: {
  correlation: HospitalAdmissionCorrelationV1;
  placementId: string;
  placementPatientId: string;
  placementFacilityId: string;
  specialPlacementNeedsJson?: unknown;
}): AttachPlacementPlanResult {
  const placementId = String(input.placementId ?? "").trim();
  if (!placementId) {
    return { ok: false, code: "PLACEMENT_MISMATCH", detail: "Missing placement id" };
  }
  if (input.correlation.patientId !== input.placementPatientId) {
    return {
      ok: false,
      code: "CORRELATION_CONFLICT",
      detail: "Placement patient does not match correlation",
    };
  }
  if (input.correlation.facilityId !== input.placementFacilityId) {
    return {
      ok: false,
      code: "CORRELATION_CONFLICT",
      detail: "Placement facility does not match correlation",
    };
  }
  if (
    input.correlation.internalPlacementRequestId &&
    input.correlation.internalPlacementRequestId !== placementId
  ) {
    return {
      ok: false,
      code: "CORRELATION_CONFLICT",
      detail: "Correlation already linked to a different placement",
    };
  }

  const correlation = buildHospitalAdmissionCorrelationV1({
    ...input.correlation,
    internalPlacementRequestId: placementId,
  });

  const placementSpecialNeeds = placementSpecialNeedsWithCorrelation(
    input.specialPlacementNeedsJson,
    correlation.admissionCorrelationId
  );

  const storedId = readPlacementAdmissionCorrelationId(placementSpecialNeeds);
  if (storedId !== correlation.admissionCorrelationId) {
    return {
      ok: false,
      code: "PLACEMENT_MISMATCH",
      detail: "Bidirectional placement correlation linkage failed",
    };
  }

  return { ok: true, correlation, placementSpecialNeeds };
}

export function evaluateExistingAdmissionIntent(input: {
  sourceEncounterId: string;
  destinationContext: "INPATIENT";
  existingCorrelations: HospitalAdmissionCorrelationV1[];
}): ExistingAdmissionIntentEvaluation {
  const sourceId = String(input.sourceEncounterId ?? "").trim();
  if (!sourceId || input.destinationContext !== "INPATIENT") {
    return { code: "OK_CREATE" };
  }

  for (const corr of input.existingCorrelations) {
    if (
      corr.sourceEncounterId === sourceId &&
      corr.destinationEncounterContext === "INPATIENT" &&
      isActiveAdmissionCorrelationStatus(corr.status)
    ) {
      return { code: "EXISTING_ADMISSION_INTENT", correlation: corr };
    }
  }

  return { code: "OK_CREATE" };
}

export function planObservationToInpatientConversion(input: {
  patientId: string;
  facilityId: string;
  sourceObservationEncounterId: string;
  sourceEncounterType: string;
  medicationTransitionAction: MedicationTransitionAction;
  destinationUnitId?: string | null;
  hospitalEpisodeId?: string | null;
  idempotencyKey?: string | null;
  initiatedByUserId: string;
  serverGeneratedId?: string | null;
}): ObservationConversionPlan | { ok: false; code: string; detail: string } {
  const obsType = String(input.sourceEncounterType ?? "").trim().toUpperCase();
  if (obsType !== "OBSERVATION") {
    return {
      ok: false,
      code: "INVALID_SOURCE_ENCOUNTER",
      detail: "Source must be an explicit OBSERVATION encounter",
    };
  }

  const action = String(input.medicationTransitionAction ?? "")
    .trim()
    .toUpperCase() as MedicationTransitionAction;
  if (!MEDICATION_TRANSITION_ACTIONS.includes(action)) {
    return {
      ok: false,
      code: "EXPLICIT_MEDICATION_TRANSITION_REQUIRED",
      detail: "Medication transition action must be explicit",
    };
  }

  const correlation = buildHospitalAdmissionCorrelationV1({
    admissionIntent: "OBSERVATION_CONVERSION",
    status: "INTENT_CREATED",
    patientId: input.patientId,
    facilityId: input.facilityId,
    sourceEncounterId: input.sourceObservationEncounterId,
    destinationUnitId: input.destinationUnitId,
    hospitalEpisodeId: input.hospitalEpisodeId,
    idempotencyKey: input.idempotencyKey,
    initiatedByUserId: input.initiatedByUserId,
    admissionSource: "OBSERVATION",
    serverGeneratedId: input.serverGeneratedId,
  });

  return {
    certificationId: ADMISSION_INTENT_ORIGINATION_CERTIFICATION_ID,
    correlation,
    createNewInpatient: true,
    preserveObservationEncounterType: true,
    medicationTransitionRequired: action,
    steps: [
      {
        order: 1,
        action: "CREATE_CORRELATION",
        targetStatus: "INTENT_CREATED",
        detail: "Create observation conversion admission correlation",
      },
      {
        order: 2,
        action: "ADVANCE_STATUS",
        targetStatus: "PLACEMENT_REQUESTED",
        detail: "Initiate inpatient placement or direct receiving workflow",
      },
    ],
  };
}

const CANCEL_BEFORE_ARRIVAL_STATUSES: AdmissionCorrelationStatus[] = [
  "INTENT_CREATED",
  "PLACEMENT_REQUESTED",
  "ACCEPTED",
];

export type CancelBeforeArrivalResult =
  | ({ ok: true } & CancelBeforeArrivalPlan)
  | ({ ok: false } & CancelBeforeArrivalDenied)
  | Extract<AdmissionCorrelationMutationResult, { ok: false }>;

export function planCancelAdmissionBeforeArrival(input: {
  correlation: HospitalAdmissionCorrelationV1;
  patientArrived: boolean;
  expectedVersion: number;
}): CancelBeforeArrivalResult {
  if (input.patientArrived) {
    return {
      ok: false,
      allowed: false,
      code: "ALREADY_ARRIVED",
      detail: "Patient has arrived — use post-receiving cancellation",
    };
  }
  if (!CANCEL_BEFORE_ARRIVAL_STATUSES.includes(input.correlation.status)) {
    return {
      ok: false,
      allowed: false,
      code: "INVALID_STATUS",
      detail: `Cancellation before arrival not allowed from ${input.correlation.status}`,
    };
  }

  const mutated = applyAdmissionCorrelationMutation(input.correlation, input.expectedVersion, {
    status: "CANCELLED",
    completedAt: new Date().toISOString(),
  });
  if (!mutated.ok) return mutated;

  return {
    ok: true,
    allowed: true,
    correlation: mutated.correlation,
    cancelPlacement: true,
    releaseBedIfNotArrived: true,
    createReceivingEncounter: false,
  };
}

export type CancelAfterReceivingResult =
  | ({ ok: true } & CancelAfterReceivingPlan)
  | ({ ok: false } & CancelAfterReceivingDenied)
  | Extract<AdmissionCorrelationMutationResult, { ok: false }>;

export function planCancelAfterReceivingStarted(input: {
  correlation: HospitalAdmissionCorrelationV1;
  expectedVersion: number;
  patientArrived: boolean;
}): CancelAfterReceivingResult {
  const cancellable: AdmissionCorrelationStatus[] = [
    "RECEIVING_STARTED",
    "ENCOUNTER_CREATED",
  ];
  if (!cancellable.includes(input.correlation.status)) {
    return {
      ok: false,
      allowed: false,
      code: "INVALID_STATUS",
      detail: `Post-receiving cancellation not allowed from ${input.correlation.status}`,
    };
  }
  if (!input.correlation.receivingEncounterId) {
    return {
      ok: false,
      allowed: false,
      code: "NO_RECEIVING_ENCOUNTER",
      detail: "No receiving encounter to void",
    };
  }

  const mutated = applyAdmissionCorrelationMutation(input.correlation, input.expectedVersion, {
    status: "CANCELLED",
    completedAt: new Date().toISOString(),
  });
  if (!mutated.ok) return mutated;

  return {
    ok: true,
    allowed: true,
    correlation: mutated.correlation,
    voidReceivingEncounter: true,
    preserveReceivingRecord: true,
    preserveCorrelationLinkage: true,
    releaseBedWhenSafe: !input.patientArrived,
  };
}

export type AdmissionOrphanDiagnosticInput = {
  correlation?: HospitalAdmissionCorrelationV1 | null;
  placement?: {
    id: string;
    patientId: string;
    facilityId: string;
    status?: string | null;
    receivingEncounterId?: string | null;
    admissionCorrelationId?: string | null;
    specialPlacementNeedsJson?: unknown;
  } | null;
  receivingEncounter?: {
    id: string;
    patientId: string;
    facilityId: string;
    admissionSummaryJson?: unknown;
  } | null;
  bed?: {
    id: string;
    status?: string | null;
    reservedForPlacementId?: string | null;
  } | null;
  placementRequired?: boolean;
};

export function diagnoseAdmissionOrphans(
  input: AdmissionOrphanDiagnosticInput
): AdmissionOrphanFinding[] {
  const findings: AdmissionOrphanFinding[] = [];
  const corr = input.correlation;
  const placement = input.placement;

  if (placement && !corr) {
    findings.push({
      code: "PLACEMENT_WITHOUT_CORRELATION",
      severity: "REVIEW_REQUIRED",
      detail: "Active placement has no admission correlation",
      placementRequestId: placement.id,
    });
  }

  if (corr && input.placementRequired && !corr.internalPlacementRequestId && !placement) {
    findings.push({
      code: "CORRELATION_WITHOUT_PLACEMENT",
      severity: "REVIEW_REQUIRED",
      detail: "Correlation requires placement but none is linked",
      correlationId: corr.admissionCorrelationId,
    });
  }

  if (corr && placement) {
    if (placement.patientId !== corr.patientId) {
      findings.push({
        code: "CORRELATION_PLACEMENT_PATIENT_MISMATCH",
        severity: "HARD_ERROR",
        detail: "Placement belongs to a different patient than correlation",
        correlationId: corr.admissionCorrelationId,
        placementRequestId: placement.id,
      });
    }
    if (corr.internalPlacementRequestId && corr.internalPlacementRequestId !== placement.id) {
      findings.push({
        code: "CORRELATION_PLACEMENT_ID_MISMATCH",
        severity: "HARD_ERROR",
        detail: "Correlation placement id does not match placement record",
        correlationId: corr.admissionCorrelationId,
        placementRequestId: placement.id,
      });
    }
    const needsId = readPlacementAdmissionCorrelationId(placement.specialPlacementNeedsJson);
    const explicitId = trimOrNull(placement.admissionCorrelationId) ?? needsId;
    if (explicitId && explicitId !== corr.admissionCorrelationId) {
      findings.push({
        code: "PLACEMENT_CORRELATION_ID_MISMATCH",
        severity: "HARD_ERROR",
        detail: "Placement references a different admission correlation",
        correlationId: corr.admissionCorrelationId,
        placementRequestId: placement.id,
      });
    }
    if (
      corr.receivingEncounterId &&
      placement.receivingEncounterId &&
      corr.receivingEncounterId !== placement.receivingEncounterId
    ) {
      findings.push({
        code: "PLACEMENT_RECEIVING_MISMATCH",
        severity: "HARD_ERROR",
        detail: "Placement receiving encounter differs from correlation",
        correlationId: corr.admissionCorrelationId,
        placementRequestId: placement.id,
        receivingEncounterId: corr.receivingEncounterId,
      });
    }
    if (corr.status === "CANCELLED" && placement.status && !["CANCELLED", "CLOSED"].includes(String(placement.status).toUpperCase())) {
      findings.push({
        code: "CANCELLED_CORRELATION_ACTIVE_PLACEMENT",
        severity: "HARD_ERROR",
        detail: "Correlation cancelled but placement remains active",
        correlationId: corr.admissionCorrelationId,
        placementRequestId: placement.id,
      });
    }
  }

  if (corr?.status === "CANCELLED" && input.bed) {
    const bedStatus = String(input.bed.status ?? "").toUpperCase();
    if (bedStatus === "OCCUPIED" || bedStatus === "RESERVED") {
      findings.push({
        code: "CANCELLED_CORRELATION_OCCUPIED_BED",
        severity: "HARD_ERROR",
        detail: "Correlation cancelled but bed remains reserved or occupied",
        correlationId: corr.admissionCorrelationId,
        bedId: input.bed.id,
      });
    }
  }

  if (input.receivingEncounter && !corr) {
    findings.push({
      code: "RECEIVING_WITHOUT_CORRELATION",
      severity: "REVIEW_REQUIRED",
      detail: "Receiving encounter has no admission correlation",
      receivingEncounterId: input.receivingEncounter.id,
    });
  }

  if (findings.length === 0 && corr) {
    findings.push({
      code: "ADMISSION_LINKAGE_HEALTHY",
      severity: "INFORMATIONAL",
      detail: "No orphan admission linkage issues detected",
      correlationId: corr.admissionCorrelationId,
    });
  }

  return findings;
}

export function evaluateLegacyReconciliationEvidence(
  input: LegacyReconciliationEvidenceInput
): LegacyReconciliationEvidenceDecision {
  const base = evaluateLegacyAdmissionLinkage({
    placementReceivingEncounterId: input.placementReceivingEncounterId,
    candidateEncounterId: input.candidateEncounterId,
    explicitIntakeLinkage: input.explicitIntakeLinkage,
    samePatientOnly: input.samePatientOnly,
    sameEpisodeOnly: input.sameEpisodeOnly,
    admittedAtProximityOnly: input.admittedAtProximityOnly,
    sameUnitOnly: input.sameUnitOnly,
  });

  if (base.action === "LINK") return base;

  if (input.idempotencyKeyMatch === true) {
    return { action: "LINK", reason: "EXPLICIT_INTAKE_LINKAGE" };
  }

  const insufficient =
    input.samePatientOnly ||
    input.sameFacilityOnly ||
    input.sameEpisodeOnly ||
    input.admittedAtProximityOnly ||
    input.sameUnitOnly ||
    input.sameBedOnly ||
    input.openInpatientOnly;

  if (insufficient) {
    return {
      action: "REVIEW_REQUIRED",
      code: "ADMISSION_CORRELATION_REVIEW_REQUIRED",
      detail: "Ambiguous legacy linkage — insufficient explicit evidence",
    };
  }

  return base;
}

const JOURNEY_STEP_DEFS: Array<{
  stepKey: string;
  labelKey: string;
  statusGate: AdmissionCorrelationStatus;
}> = [
  { stepKey: "admission_decision", labelKey: "admissionJourney.admissionDecision", statusGate: "INTENT_CREATED" },
  { stepKey: "placement_requested", labelKey: "admissionJourney.placementRequested", statusGate: "PLACEMENT_REQUESTED" },
  { stepKey: "placement_accepted", labelKey: "admissionJourney.placementAccepted", statusGate: "ACCEPTED" },
  { stepKey: "bed_assigned", labelKey: "admissionJourney.bedAssigned", statusGate: "ACCEPTED" },
  { stepKey: "receiving_started", labelKey: "admissionJourney.receivingStarted", statusGate: "RECEIVING_STARTED" },
  { stepKey: "encounter_created", labelKey: "admissionJourney.encounterCreated", statusGate: "ENCOUNTER_CREATED" },
  { stepKey: "arrived_on_unit", labelKey: "admissionJourney.arrivedOnUnit", statusGate: "ARRIVED" },
  { stepKey: "active_admission", labelKey: "admissionJourney.activeAdmission", statusGate: "ACTIVE" },
];

function statusRank(status: AdmissionCorrelationStatus): number {
  const order: AdmissionCorrelationStatus[] = [
    "INTENT_CREATED",
    "PLACEMENT_REQUESTED",
    "ACCEPTED",
    "RECEIVING_STARTED",
    "ENCOUNTER_CREATED",
    "ARRIVED",
    "ACTIVE",
    "COMPLETED",
    "CANCELLED",
  ];
  const idx = order.indexOf(status);
  return idx >= 0 ? idx : -1;
}

export function admissionJourneyLifecycleSteps(
  correlation: HospitalAdmissionCorrelationV1
): AdmissionJourneyLifecycleStep[] {
  const currentRank = statusRank(correlation.status);
  const cancelled = correlation.status === "CANCELLED";

  return JOURNEY_STEP_DEFS.map((def, index) => {
    const gateRank = statusRank(def.statusGate);
    const reached = !cancelled && currentRank >= gateRank;
    const nextGate = JOURNEY_STEP_DEFS[index + 1]?.statusGate;
    const nextRank = nextGate ? statusRank(nextGate) : Number.MAX_SAFE_INTEGER;
    const current = !cancelled && currentRank >= gateRank && currentRank < nextRank;

    return {
      order: index + 1,
      stepKey: def.stepKey,
      labelKey: def.labelKey,
      statusGate: def.statusGate,
      reached,
      current,
    };
  });
}

export function readPlacementAdmissionCorrelationId(
  specialPlacementNeedsJson: unknown
): string | null {
  const root = asRecord(specialPlacementNeedsJson);
  if (!root) return null;
  return trimOrNull(root[PLACEMENT_ADMISSION_CORRELATION_ID_KEY]);
}

export function placementSpecialNeedsWithCorrelation(
  specialPlacementNeedsJson: unknown,
  admissionCorrelationId: string
): Record<string, unknown> {
  const root = asRecord(specialPlacementNeedsJson) ?? {};
  return {
    ...root,
    [PLACEMENT_ADMISSION_CORRELATION_ID_KEY]: admissionCorrelationId,
  };
}

export function planDirectScheduledTransferIntentOrigination(input: {
  admissionIntent: "DIRECT_ADMISSION" | "SCHEDULED_ADMISSION" | "TRANSFER_IN";
  patientId: string;
  facilityId: string;
  initiatedByUserId: string;
  requestedAdmissionAt?: string | null;
  admissionSource?: string | null;
  serverGeneratedId?: string | null;
}): {
  correlation: HospitalAdmissionCorrelationV1;
  createsBeforeReceiving: true;
} {
  const correlation = buildHospitalAdmissionCorrelationV1({
    admissionIntent: input.admissionIntent,
    status: "INTENT_CREATED",
    patientId: input.patientId,
    facilityId: input.facilityId,
    initiatedByUserId: input.initiatedByUserId,
    requestedAdmissionAt: input.requestedAdmissionAt,
    admissionSource: input.admissionSource,
    serverGeneratedId: input.serverGeneratedId,
  });
  return { correlation, createsBeforeReceiving: true };
}

export function hospitalEpisodeIsContinuityNotIdentity(): true {
  return hospitalEpisodeAloneCannotProveCorrelation();
}

export function activeAdmissionCorrelationStatuses(): readonly AdmissionCorrelationStatus[] {
  return ACTIVE_STATUSES;
}
