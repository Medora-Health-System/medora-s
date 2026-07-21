/**
 * D3C — server-owned InternalPlacementRequest status machine.
 * Clients cannot set arbitrary statuses; only listed transitions are valid.
 */

export const InternalPlacementStatus = {
  DRAFT: "DRAFT",
  SIGNED: "SIGNED",
  REQUESTED: "REQUESTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  ACCEPTED: "ACCEPTED",
  BED_ASSIGNED: "BED_ASSIGNED",
  READY_FOR_TRANSFER: "READY_FOR_TRANSFER",
  DEPARTED_ED: "DEPARTED_ED",
  ARRIVED_DESTINATION: "ARRIVED_DESTINATION",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
  ERROR_REVIEW: "ERROR_REVIEW",
} as const;

export type InternalPlacementStatus =
  (typeof InternalPlacementStatus)[keyof typeof InternalPlacementStatus];

export const InternalPlacementRequestedEncounterType = {
  OBSERVATION: "OBSERVATION",
  INPATIENT: "INPATIENT",
} as const;

export type InternalPlacementRequestedEncounterType =
  (typeof InternalPlacementRequestedEncounterType)[keyof typeof InternalPlacementRequestedEncounterType];

export const ReceivingEncounterLifecycle = {
  NONE: "NONE",
  PLANNED: "PLANNED",
  READY: "READY",
  ACTIVE: "ACTIVE",
  CANCELLED: "CANCELLED",
} as const;

export type ReceivingEncounterLifecycle =
  (typeof ReceivingEncounterLifecycle)[keyof typeof ReceivingEncounterLifecycle];

export const InternalPlacementActorRole = {
  PROVIDER: "PROVIDER",
  BED_MANAGEMENT: "BED_MANAGEMENT",
  ED_NURSE: "ED_NURSE",
  RECEIVING_NURSE: "RECEIVING_NURSE",
  ADMIN: "ADMIN",
  SERVER: "SERVER",
} as const;

export type InternalPlacementActorRole =
  (typeof InternalPlacementActorRole)[keyof typeof InternalPlacementActorRole];

export const INTERNAL_PLACEMENT_TERMINAL_STATUSES: ReadonlySet<InternalPlacementStatus> =
  new Set([
    InternalPlacementStatus.COMPLETED,
    InternalPlacementStatus.CANCELLED,
    InternalPlacementStatus.DECLINED,
    InternalPlacementStatus.EXPIRED,
    InternalPlacementStatus.ERROR_REVIEW,
  ]);

/** Active (non-terminal) — used for uniqueness / duplicate prevention. */
export function isInternalPlacementStatusActive(status: string): boolean {
  return !INTERNAL_PLACEMENT_TERMINAL_STATUSES.has(status as InternalPlacementStatus);
}

type TransitionRule = {
  to: InternalPlacementStatus;
  roles: ReadonlyArray<InternalPlacementActorRole>;
};

const TRANSITIONS: Record<InternalPlacementStatus, TransitionRule[]> = {
  DRAFT: [
    { to: InternalPlacementStatus.SIGNED, roles: [InternalPlacementActorRole.PROVIDER, InternalPlacementActorRole.ADMIN] },
    { to: InternalPlacementStatus.REQUESTED, roles: [InternalPlacementActorRole.PROVIDER, InternalPlacementActorRole.ADMIN] },
    { to: InternalPlacementStatus.CANCELLED, roles: [InternalPlacementActorRole.PROVIDER, InternalPlacementActorRole.ADMIN] },
  ],
  SIGNED: [
    { to: InternalPlacementStatus.REQUESTED, roles: [InternalPlacementActorRole.PROVIDER, InternalPlacementActorRole.ADMIN] },
    { to: InternalPlacementStatus.DRAFT, roles: [InternalPlacementActorRole.PROVIDER, InternalPlacementActorRole.ADMIN] },
    { to: InternalPlacementStatus.CANCELLED, roles: [InternalPlacementActorRole.PROVIDER, InternalPlacementActorRole.ADMIN] },
  ],
  REQUESTED: [
    { to: InternalPlacementStatus.UNDER_REVIEW, roles: [InternalPlacementActorRole.BED_MANAGEMENT, InternalPlacementActorRole.ADMIN] },
    { to: InternalPlacementStatus.ACCEPTED, roles: [InternalPlacementActorRole.BED_MANAGEMENT, InternalPlacementActorRole.ADMIN] },
    { to: InternalPlacementStatus.DECLINED, roles: [InternalPlacementActorRole.BED_MANAGEMENT, InternalPlacementActorRole.ADMIN] },
    { to: InternalPlacementStatus.CANCELLED, roles: [InternalPlacementActorRole.PROVIDER, InternalPlacementActorRole.ADMIN] },
  ],
  UNDER_REVIEW: [
    { to: InternalPlacementStatus.ACCEPTED, roles: [InternalPlacementActorRole.BED_MANAGEMENT, InternalPlacementActorRole.ADMIN] },
    { to: InternalPlacementStatus.DECLINED, roles: [InternalPlacementActorRole.BED_MANAGEMENT, InternalPlacementActorRole.ADMIN] },
    { to: InternalPlacementStatus.CANCELLED, roles: [InternalPlacementActorRole.PROVIDER, InternalPlacementActorRole.ADMIN] },
  ],
  ACCEPTED: [
    { to: InternalPlacementStatus.BED_ASSIGNED, roles: [InternalPlacementActorRole.BED_MANAGEMENT, InternalPlacementActorRole.ADMIN] },
    { to: InternalPlacementStatus.CANCELLED, roles: [InternalPlacementActorRole.PROVIDER, InternalPlacementActorRole.BED_MANAGEMENT, InternalPlacementActorRole.ADMIN] },
  ],
  BED_ASSIGNED: [
    { to: InternalPlacementStatus.READY_FOR_TRANSFER, roles: [InternalPlacementActorRole.ED_NURSE, InternalPlacementActorRole.ADMIN] },
    { to: InternalPlacementStatus.BED_ASSIGNED, roles: [InternalPlacementActorRole.BED_MANAGEMENT, InternalPlacementActorRole.ADMIN] },
    { to: InternalPlacementStatus.CANCELLED, roles: [InternalPlacementActorRole.PROVIDER, InternalPlacementActorRole.BED_MANAGEMENT, InternalPlacementActorRole.ADMIN] },
  ],
  READY_FOR_TRANSFER: [
    { to: InternalPlacementStatus.DEPARTED_ED, roles: [InternalPlacementActorRole.ED_NURSE, InternalPlacementActorRole.ADMIN] },
    { to: InternalPlacementStatus.BED_ASSIGNED, roles: [InternalPlacementActorRole.BED_MANAGEMENT, InternalPlacementActorRole.ADMIN] },
    { to: InternalPlacementStatus.CANCELLED, roles: [InternalPlacementActorRole.PROVIDER, InternalPlacementActorRole.ADMIN] },
  ],
  DEPARTED_ED: [
    { to: InternalPlacementStatus.ARRIVED_DESTINATION, roles: [InternalPlacementActorRole.RECEIVING_NURSE, InternalPlacementActorRole.ADMIN] },
  ],
  ARRIVED_DESTINATION: [
    { to: InternalPlacementStatus.COMPLETED, roles: [InternalPlacementActorRole.SERVER, InternalPlacementActorRole.ADMIN] },
  ],
  COMPLETED: [],
  CANCELLED: [],
  DECLINED: [],
  EXPIRED: [],
  ERROR_REVIEW: [
    { to: InternalPlacementStatus.CANCELLED, roles: [InternalPlacementActorRole.ADMIN] },
  ],
};

export type InternalPlacementTransitionResult =
  | { ok: true }
  | { ok: false; reason: "INVALID_STATUS" | "TERMINAL" | "TRANSITION_NOT_ALLOWED" | "ROLE_NOT_ALLOWED" };

export function validateInternalPlacementTransition(
  from: string,
  to: string,
  role: InternalPlacementActorRole
): InternalPlacementTransitionResult {
  if (!(from in TRANSITIONS) || !(to in InternalPlacementStatus)) {
    return { ok: false, reason: "INVALID_STATUS" };
  }
  const fromStatus = from as InternalPlacementStatus;
  const toStatus = to as InternalPlacementStatus;
  if (INTERNAL_PLACEMENT_TERMINAL_STATUSES.has(fromStatus) && fromStatus !== InternalPlacementStatus.ERROR_REVIEW) {
    return { ok: false, reason: "TERMINAL" };
  }
  const allowed = TRANSITIONS[fromStatus] ?? [];
  const match = allowed.find((r) => r.to === toStatus);
  if (!match) return { ok: false, reason: "TRANSITION_NOT_ALLOWED" };
  if (
    role !== InternalPlacementActorRole.ADMIN &&
    !match.roles.includes(role)
  ) {
    return { ok: false, reason: "ROLE_NOT_ALLOWED" };
  }
  return { ok: true };
}

/** Trackboard-facing label keys (UI maps to French). */
export function projectInternalPlacementTrackboardLabel(
  status: string | null | undefined
): string | null {
  if (!status) return null;
  switch (status) {
    case InternalPlacementStatus.SIGNED:
      return "ADMISSION_DECISION_SIGNED";
    case InternalPlacementStatus.REQUESTED:
      return "PLACEMENT_REQUESTED";
    case InternalPlacementStatus.UNDER_REVIEW:
      return "UNDER_REVIEW";
    case InternalPlacementStatus.ACCEPTED:
      return "ACCEPTED_AWAITING_BED";
    case InternalPlacementStatus.BED_ASSIGNED:
      return "BED_ASSIGNED";
    case InternalPlacementStatus.READY_FOR_TRANSFER:
      return "READY_FOR_TRANSFER";
    case InternalPlacementStatus.DEPARTED_ED:
      return "DEPARTED_ED";
    case InternalPlacementStatus.ARRIVED_DESTINATION:
      return "ARRIVED_DESTINATION";
    case InternalPlacementStatus.COMPLETED:
      return "PLACEMENT_COMPLETED";
    case InternalPlacementStatus.CANCELLED:
      return "PLACEMENT_CANCELLED";
    case InternalPlacementStatus.DECLINED:
      return "PLACEMENT_DECLINED";
    default:
      return status === InternalPlacementStatus.DRAFT ? "PLACEMENT_DRAFT" : null;
  }
}

/** False BED_ASSIGNED from ED roomLabel alone is forbidden. */
export function placementBedAssignedFromRoomLabelAlone(): false {
  return false;
}

/** False ARRIVED from handoff alone is forbidden. */
export function placementArrivedFromHandoffAlone(): false {
  return false;
}
