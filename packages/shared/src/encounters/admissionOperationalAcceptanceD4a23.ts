/**
 * D4A.2.3 — Operational admission acceptance (distinct from clinical SIGN).
 * Persisted under Encounter.admissionSummaryJson.operationalAcceptanceV1 — no migration.
 */

import { asAdmissionSummaryRecord } from "./admissionSummaryMerge.js";

export const ADMISSION_COMMAND_CENTER_D4A23_CERTIFICATION =
  "MEDUI.ADMISSION_COMMAND_CENTER.D4A2_3" as const;

/** Nested JSON key (preserved by mergeAdmissionSummaryFieldsPreservingNested). */
export const OPERATIONAL_ACCEPTANCE_V1_KEY = "operationalAcceptanceV1" as const;

/**
 * Capability equivalent: ADMISSION_OPERATIONAL_ACCEPT.
 * Canonical RoleCode only — CHARGE_NURSE / HOUSE_SUPERVISOR / BED_MANAGEMENT /
 * PHYSICIAN / NURSE / FACILITY_ADMIN are not Prisma RoleCode values.
 * Map: PHYSICIAN→PROVIDER, NURSE/CHARGE_NURSE→RN, FACILITY_ADMIN/BED_MANAGEMENT→ADMIN.
 */
export const ADMISSION_OPERATIONAL_ACCEPT_ROLE_CODES = [
  "ADMIN",
  "PROVIDER",
  "RN",
] as const;
export type AdmissionOperationalAcceptRoleCode =
  (typeof ADMISSION_OPERATIONAL_ACCEPT_ROLE_CODES)[number];

export const ADMISSION_OPERATIONAL_ACCEPT_CAPABILITY =
  "ADMISSION_OPERATIONAL_ACCEPT" as const;

export function actorHasAdmissionOperationalAcceptCapability(
  roleCodes: readonly string[]
): boolean {
  const set = new Set(
    roleCodes.map((r) => String(r ?? "").trim().toUpperCase()).filter(Boolean)
  );
  return ADMISSION_OPERATIONAL_ACCEPT_ROLE_CODES.some((c) => set.has(c));
}

/** Billing-only / non-ops roles never grant operational accept. */
export const ADMISSION_OPERATIONAL_ACCEPT_DENIED_SOLE_ROLES = [
  "BILLING",
  "FRONT_DESK",
  "LAB",
  "RADIOLOGY",
  "PHARMACY",
  "MEDICATION_REVIEWER",
  "MEDICATION_ADMIN",
] as const;

export const OPERATIONAL_ACCEPTANCE_STATUSES = [
  "NOT_REQUESTED",
  "ACCEPTED",
  "ACCEPTED_WITH_NOTE",
  "ON_HOLD",
  "DECLINED",
  "REDIRECTED",
  "ESCALATION_REQUIRED",
] as const;
export type OperationalAcceptanceStatus =
  (typeof OPERATIONAL_ACCEPTANCE_STATUSES)[number];

export const OPERATIONAL_HOLD_REASON_CODES = [
  "NO_BED_AVAILABLE",
  "STAFFING_LIMITATION",
  "SERVICE_REVIEW_REQUIRED",
  "CLINICAL_REASSESSMENT_REQUIRED",
  "ISOLATION_CAPABILITY_REQUIRED",
  "EQUIPMENT_REQUIRED",
  "INSURANCE_OR_ADMIN_REVIEW",
  "PATIENT_CONDITION_CHANGED",
  "OTHER",
] as const;
export type OperationalHoldReasonCode = (typeof OPERATIONAL_HOLD_REASON_CODES)[number];

export const RECEIVING_ACCEPTANCE_STATUSES = [
  "NOT_REQUESTED",
  "REQUESTED",
  "ACCEPTED",
  "ACCEPTED_WITH_CONDITIONS",
  "ON_HOLD",
  "DECLINED",
  "SUPERSEDED",
  "CANCELLED",
] as const;
export type ReceivingAcceptanceStatus = (typeof RECEIVING_ACCEPTANCE_STATUSES)[number];

export const ADMISSION_OPS_EVENT_TYPES = [
  "ADMISSION_DECISION_DRAFTED",
  "ADMISSION_DECISION_SIGNED",
  "ADMISSION_DECISION_UPDATED",
  "ADMISSION_OPERATIONALLY_ACCEPTED",
  "ADMISSION_OPERATIONAL_HOLD",
  "ADMISSION_OPERATIONALLY_DECLINED",
  "ADMISSION_OPERATIONAL_REDIRECTED",
  "ADMISSION_OPERATIONAL_ESCALATED",
  "PLACEMENT_REQUEST_CREATED",
  "PLACEMENT_REQUEST_SIGNED",
  "PLACEMENT_REQUEST_SUBMITTED",
  "PLACEMENT_REQUEST_CANCELLED",
  "BED_REQUESTED",
  "BED_ASSIGNED",
  "BED_CHANGED",
  "BED_RELEASED",
  "RECEIVING_ACCEPTANCE_REQUESTED",
  "RECEIVING_ACCEPTED",
  "RECEIVING_ACCEPTED_WITH_CONDITIONS",
  "RECEIVING_HOLD",
  "RECEIVING_DECLINED",
  "HANDOFF_STARTED",
  "HANDOFF_COMPLETED",
  "TRANSPORT_REQUESTED",
  "TRANSPORT_READY",
  "TRANSPORT_STARTED",
  "ARRIVED_DESTINATION",
  "INPATIENT_ENCOUNTER_CREATED",
  "ADMISSION_CANCELLED",
  "ADMISSION_FAILED",
  "ADMISSION_REOPENED",
] as const;
export type AdmissionOpsEventType = (typeof ADMISSION_OPS_EVENT_TYPES)[number];

export type AdmissionOpsEventV1 = {
  type: AdmissionOpsEventType;
  at: string;
  actorUserId?: string | null;
  actorDisplayRole?: string | null;
  unitCode?: string | null;
  bedKey?: string | null;
  reasonCode?: string | null;
  resultingState?: string | null;
  requestId?: string | null;
  /** Never store PHI free text here — optional short non-clinical code only. */
  noteCode?: string | null;
};

export type ReceivingAcceptanceV1 = {
  status: ReceivingAcceptanceStatus;
  acceptedAt?: string | null;
  acceptedByUserId?: string | null;
  acceptedByDisplayRole?: string | null;
  receivingService?: string | null;
  receivingUnit?: string | null;
  receivingTeam?: string | null;
  readinessState?: string | null;
  precautionsAcknowledged?: boolean;
  equipmentAcknowledged?: boolean;
  isolationAcknowledged?: boolean;
  handoffStatus?: string | null;
  note?: string | null;
  clientRequestId?: string | null;
  conditionsNote?: string | null;
};

export type OperationalAcceptanceV1 = {
  schemaVersion: 1;
  status: OperationalAcceptanceStatus;
  acceptedAt?: string | null;
  acceptedByUserId?: string | null;
  acceptedByRoleCodes?: string[];
  acceptedByDisplayRole?: string | null;
  clientRequestId?: string | null;
  receivingService?: string | null;
  receivingUnit?: string | null;
  receivingTeam?: string | null;
  note?: string | null;
  admissionDecisionRevision?: number | null;
  hold?: {
    reasonCode: OperationalHoldReasonCode | string;
    explanation?: string | null;
    responsibleTeam?: string | null;
    reassessmentTargetAt?: string | null;
    at: string;
    byUserId?: string | null;
    byDisplayRole?: string | null;
  } | null;
  decline?: {
    reasonCode?: string | null;
    explanation?: string | null;
    at: string;
    byUserId?: string | null;
    byDisplayRole?: string | null;
  } | null;
  redirect?: {
    toService?: string | null;
    toUnit?: string | null;
    explanation?: string | null;
    at: string;
    byUserId?: string | null;
    byDisplayRole?: string | null;
  } | null;
  escalation?: {
    reasonCode?: string | null;
    explanation?: string | null;
    at: string;
    byUserId?: string | null;
    byDisplayRole?: string | null;
    acknowledgedAt?: string | null;
  } | null;
  receiving?: ReceivingAcceptanceV1 | null;
  /** Cap retained in JSON; oldest dropped when exceeded. */
  events?: AdmissionOpsEventV1[];
};

const MAX_OPS_EVENTS = 40;

export function readOperationalAcceptanceV1(
  admissionSummaryJson: unknown
): OperationalAcceptanceV1 | null {
  const root = asAdmissionSummaryRecord(admissionSummaryJson);
  const raw = root[OPERATIONAL_ACCEPTANCE_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const status = String(o.status ?? "NOT_REQUESTED").toUpperCase();
  if (
    !OPERATIONAL_ACCEPTANCE_STATUSES.includes(status as OperationalAcceptanceStatus)
  ) {
    return null;
  }
  return raw as OperationalAcceptanceV1;
}

export function emptyOperationalAcceptanceV1(): OperationalAcceptanceV1 {
  return { schemaVersion: 1, status: "NOT_REQUESTED", events: [] };
}

export function appendOperationalEvent(
  prior: OperationalAcceptanceV1,
  event: AdmissionOpsEventV1
): OperationalAcceptanceV1 {
  const events = [...(prior.events ?? []), event].slice(-MAX_OPS_EVENTS);
  return { ...prior, events };
}

export function mergeOperationalAcceptanceIntoSummary(
  priorSummary: unknown,
  nextOps: OperationalAcceptanceV1
): Record<string, unknown> {
  const next = asAdmissionSummaryRecord(priorSummary);
  next[OPERATIONAL_ACCEPTANCE_V1_KEY] = nextOps;
  return next;
}

/**
 * Idempotent apply: identical clientRequestId + same terminal action → no-op success.
 * Contradictory transitions → conflict code (caller maps to HTTP).
 */
export type ApplyOperationalActionInput = {
  prior: OperationalAcceptanceV1 | null;
  action:
    | "ACCEPT"
    | "ACCEPT_WITH_NOTE"
    | "HOLD"
    | "DECLINE"
    | "REDIRECT"
    | "ESCALATE"
    | "RECEIVING_ACCEPT"
    | "RECEIVING_ACCEPT_WITH_CONDITIONS"
    | "RECEIVING_HOLD"
    | "RECEIVING_DECLINE";
  actorUserId: string;
  actorRoleCodes: readonly string[];
  actorDisplayRole: string;
  at: string;
  clientRequestId?: string | null;
  note?: string | null;
  receivingService?: string | null;
  receivingUnit?: string | null;
  receivingTeam?: string | null;
  holdReasonCode?: string | null;
  holdExplanation?: string | null;
  responsibleTeam?: string | null;
  reassessmentTargetAt?: string | null;
  redirectToService?: string | null;
  redirectToUnit?: string | null;
  declineReasonCode?: string | null;
  admissionDecisionRevision?: number | null;
  precautionsAcknowledged?: boolean;
  equipmentAcknowledged?: boolean;
  isolationAcknowledged?: boolean;
  conditionsNote?: string | null;
  expectedAdmissionDecisionAt?: string | null;
  currentAdmissionDecisionAt?: string | null;
};

export type ApplyOperationalActionResult =
  | { ok: true; ops: OperationalAcceptanceV1; idempotentReplay: boolean }
  | {
      ok: false;
      code:
        | "ADMISSION_OPERATION_ALREADY_COMPLETED"
        | "ADMISSION_OPERATION_STALE"
        | "OPERATIONAL_ROLE_NOT_AUTHORIZED"
        | "RECEIVING_ACCEPTANCE_STALE";
    };

function displayRoleFromCodes(codes: readonly string[]): string {
  const set = new Set(codes.map((c) => c.toUpperCase()));
  if (set.has("ADMIN")) return "ADMIN";
  if (set.has("PROVIDER")) return "PROVIDER";
  if (set.has("RN")) return "RN";
  return codes[0] ?? "UNKNOWN";
}

export function applyOperationalAdmissionAction(
  input: ApplyOperationalActionInput
): ApplyOperationalActionResult {
  if (!actorHasAdmissionOperationalAcceptCapability(input.actorRoleCodes)) {
    return { ok: false, code: "OPERATIONAL_ROLE_NOT_AUTHORIZED" };
  }

  const base = input.prior ?? emptyOperationalAcceptanceV1();
  const reqId = String(input.clientRequestId ?? "").trim() || null;

  if (
    reqId &&
    base.clientRequestId === reqId &&
    (base.status === "ACCEPTED" ||
      base.status === "ACCEPTED_WITH_NOTE" ||
      base.status === "ON_HOLD" ||
      base.status === "DECLINED" ||
      base.status === "REDIRECTED" ||
      base.status === "ESCALATION_REQUIRED")
  ) {
    return { ok: true, ops: base, idempotentReplay: true };
  }

  if (
    input.expectedAdmissionDecisionAt &&
    input.currentAdmissionDecisionAt &&
    input.expectedAdmissionDecisionAt !== input.currentAdmissionDecisionAt
  ) {
    return { ok: false, code: "ADMISSION_OPERATION_STALE" };
  }

  const displayRole =
    input.actorDisplayRole.trim() || displayRoleFromCodes(input.actorRoleCodes);

  const receivingActions = new Set([
    "RECEIVING_ACCEPT",
    "RECEIVING_ACCEPT_WITH_CONDITIONS",
    "RECEIVING_HOLD",
    "RECEIVING_DECLINE",
  ]);

  if (receivingActions.has(input.action)) {
    const priorRecv = base.receiving?.status ?? "NOT_REQUESTED";
    if (
      (priorRecv === "ACCEPTED" || priorRecv === "ACCEPTED_WITH_CONDITIONS") &&
      (input.action === "RECEIVING_ACCEPT" ||
        input.action === "RECEIVING_ACCEPT_WITH_CONDITIONS")
    ) {
      if (reqId && base.receiving?.clientRequestId === reqId) {
        return { ok: true, ops: base, idempotentReplay: true };
      }
      return { ok: false, code: "ADMISSION_OPERATION_ALREADY_COMPLETED" };
    }

    let recvStatus: ReceivingAcceptanceStatus = "REQUESTED";
    let eventType: AdmissionOpsEventType = "RECEIVING_ACCEPTANCE_REQUESTED";
    if (input.action === "RECEIVING_ACCEPT") {
      recvStatus = "ACCEPTED";
      eventType = "RECEIVING_ACCEPTED";
    } else if (input.action === "RECEIVING_ACCEPT_WITH_CONDITIONS") {
      recvStatus = "ACCEPTED_WITH_CONDITIONS";
      eventType = "RECEIVING_ACCEPTED_WITH_CONDITIONS";
    } else if (input.action === "RECEIVING_HOLD") {
      recvStatus = "ON_HOLD";
      eventType = "RECEIVING_HOLD";
    } else if (input.action === "RECEIVING_DECLINE") {
      recvStatus = "DECLINED";
      eventType = "RECEIVING_DECLINED";
    }

    const receiving: ReceivingAcceptanceV1 = {
      status: recvStatus,
      acceptedAt:
        recvStatus === "ACCEPTED" || recvStatus === "ACCEPTED_WITH_CONDITIONS"
          ? input.at
          : base.receiving?.acceptedAt ?? null,
      acceptedByUserId: input.actorUserId,
      acceptedByDisplayRole: displayRole,
      receivingService: input.receivingService ?? base.receiving?.receivingService ?? null,
      receivingUnit: input.receivingUnit ?? base.receiving?.receivingUnit ?? null,
      receivingTeam: input.receivingTeam ?? base.receiving?.receivingTeam ?? null,
      precautionsAcknowledged: input.precautionsAcknowledged === true,
      equipmentAcknowledged: input.equipmentAcknowledged === true,
      isolationAcknowledged: input.isolationAcknowledged === true,
      note: input.note ?? null,
      conditionsNote: input.conditionsNote ?? null,
      clientRequestId: reqId,
      handoffStatus: base.receiving?.handoffStatus ?? null,
      readinessState:
        recvStatus === "ACCEPTED" || recvStatus === "ACCEPTED_WITH_CONDITIONS"
          ? "READY"
          : recvStatus === "ON_HOLD"
            ? "HOLD"
            : "PENDING",
    };

    const ops = appendOperationalEvent(
      { ...base, receiving },
      {
        type: eventType,
        at: input.at,
        actorUserId: input.actorUserId,
        actorDisplayRole: displayRole,
        unitCode: receiving.receivingUnit ?? null,
        reasonCode: input.holdReasonCode ?? input.declineReasonCode ?? null,
        resultingState: recvStatus,
        requestId: reqId,
      }
    );
    return { ok: true, ops, idempotentReplay: false };
  }

  if (
    (base.status === "ACCEPTED" || base.status === "ACCEPTED_WITH_NOTE") &&
    (input.action === "ACCEPT" || input.action === "ACCEPT_WITH_NOTE")
  ) {
    return { ok: false, code: "ADMISSION_OPERATION_ALREADY_COMPLETED" };
  }

  let status: OperationalAcceptanceStatus = base.status;
  let eventType: AdmissionOpsEventType = "ADMISSION_OPERATIONALLY_ACCEPTED";
  let hold: OperationalAcceptanceV1["hold"] = base.hold ?? null;
  let decline: OperationalAcceptanceV1["decline"] = base.decline ?? null;
  let redirect: OperationalAcceptanceV1["redirect"] = base.redirect ?? null;
  let escalation: OperationalAcceptanceV1["escalation"] = base.escalation ?? null;

  if (input.action === "ACCEPT" || input.action === "ACCEPT_WITH_NOTE") {
    status =
      input.action === "ACCEPT_WITH_NOTE" || String(input.note ?? "").trim()
        ? "ACCEPTED_WITH_NOTE"
        : "ACCEPTED";
    eventType = "ADMISSION_OPERATIONALLY_ACCEPTED";
    hold = null;
  } else if (input.action === "HOLD") {
    status = "ON_HOLD";
    eventType = "ADMISSION_OPERATIONAL_HOLD";
    hold = {
      reasonCode: (input.holdReasonCode as OperationalHoldReasonCode) || "OTHER",
      explanation: input.holdExplanation ?? input.note ?? null,
      responsibleTeam: input.responsibleTeam ?? null,
      reassessmentTargetAt: input.reassessmentTargetAt ?? null,
      at: input.at,
      byUserId: input.actorUserId,
      byDisplayRole: displayRole,
    };
  } else if (input.action === "DECLINE") {
    status = "DECLINED";
    eventType = "ADMISSION_OPERATIONALLY_DECLINED";
    decline = {
      reasonCode: input.declineReasonCode ?? null,
      explanation: input.note ?? null,
      at: input.at,
      byUserId: input.actorUserId,
      byDisplayRole: displayRole,
    };
  } else if (input.action === "REDIRECT") {
    status = "REDIRECTED";
    eventType = "ADMISSION_OPERATIONAL_REDIRECTED";
    redirect = {
      toService: input.redirectToService ?? null,
      toUnit: input.redirectToUnit ?? null,
      explanation: input.note ?? null,
      at: input.at,
      byUserId: input.actorUserId,
      byDisplayRole: displayRole,
    };
  } else if (input.action === "ESCALATE") {
    status = "ESCALATION_REQUIRED";
    eventType = "ADMISSION_OPERATIONAL_ESCALATED";
    escalation = {
      reasonCode: input.holdReasonCode ?? null,
      explanation: input.note ?? null,
      at: input.at,
      byUserId: input.actorUserId,
      byDisplayRole: displayRole,
    };
  }

  const ops = appendOperationalEvent(
    {
      ...base,
      status,
      acceptedAt:
        status === "ACCEPTED" || status === "ACCEPTED_WITH_NOTE"
          ? input.at
          : base.acceptedAt ?? null,
      acceptedByUserId:
        status === "ACCEPTED" || status === "ACCEPTED_WITH_NOTE"
          ? input.actorUserId
          : base.acceptedByUserId ?? null,
      acceptedByRoleCodes: [...input.actorRoleCodes],
      acceptedByDisplayRole: displayRole,
      clientRequestId: reqId ?? base.clientRequestId ?? null,
      receivingService: input.receivingService ?? base.receivingService ?? null,
      receivingUnit: input.receivingUnit ?? base.receivingUnit ?? null,
      receivingTeam: input.receivingTeam ?? base.receivingTeam ?? null,
      note: input.note ?? base.note ?? null,
      admissionDecisionRevision:
        input.admissionDecisionRevision ?? base.admissionDecisionRevision ?? null,
      hold,
      decline,
      redirect,
      escalation,
    },
    {
      type: eventType,
      at: input.at,
      actorUserId: input.actorUserId,
      actorDisplayRole: displayRole,
      unitCode: input.receivingUnit ?? null,
      reasonCode:
        input.holdReasonCode ?? input.declineReasonCode ?? null,
      resultingState: status,
      requestId: reqId,
    }
  );

  return { ok: true, ops, idempotentReplay: false };
}

/** Clinical packet fields that operational acceptance must never rewrite. */
export const CLINICAL_ADMISSION_PACKET_PROTECTED_KEYS = [
  "admissionReason",
  "serviceUnit",
  "admissionDiagnosis",
  "careLevel",
  "conditionAtAdmission",
  "initialPlan",
  "responsiblePhysicianName",
  "admissionDiagnosesV1",
  "admissionPacketV1",
  "admissionDecisionMode",
  "admissionDecisionAt",
  "admissionDecisionByUserId",
] as const;
