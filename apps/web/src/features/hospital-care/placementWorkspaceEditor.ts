/**
 * ED.HOSP.1G.3 — Placement Workspace editor gates.
 * Follows the server state machine: REQUESTED → ACCEPTED → BED_ASSIGNED.
 * ASSIGN_BED is not allowed from REQUESTED.
 */

import type { PlacementQueueAction } from "@medora/shared";

const ADMIN = "ADMIN";
const RN = "RN";

const AWAITING_STATUSES = new Set(["SIGNED", "REQUESTED", "UNDER_REVIEW"]);
const ASSIGNED_STATUSES = new Set([
  "BED_ASSIGNED",
  "READY_FOR_TRANSFER",
  "DEPARTED_ED",
  "ARRIVED_DESTINATION",
  "COMPLETED",
]);

const NURSE_TRANSPORT_ACTIONS = new Set<PlacementQueueAction>([
  "MARK_READY",
  "MARK_DEPARTED",
  "MARK_ARRIVED",
]);

export type PlacementEditorMode = "awaiting_acceptance" | "assign_bed" | "assigned" | "closed";

export function roleCodesUpper(roles: readonly string[]): string[] {
  return roles.map((r) => String(r ?? "").trim().toUpperCase()).filter(Boolean);
}

export function isFacilityAdmin(roles: readonly string[]): boolean {
  return roleCodesUpper(roles).includes(ADMIN);
}

export function placementEditorMode(status?: string | null): PlacementEditorMode {
  const s = String(status ?? "")
    .trim()
    .toUpperCase();
  if (ASSIGNED_STATUSES.has(s)) return "assigned";
  if (s === "ACCEPTED") return "assign_bed";
  if (AWAITING_STATUSES.has(s)) return "awaiting_acceptance";
  return "closed";
}

/** ADMIN may edit unit/room/bed only after ACCEPT (ACCEPTED). */
export function canEditPlacementAssignment(
  roles: readonly string[],
  status?: string | null
): boolean {
  return isFacilityAdmin(roles) && placementEditorMode(status) === "assign_bed";
}

export function canAcceptPlacement(
  roles: readonly string[],
  status?: string | null
): boolean {
  return isFacilityAdmin(roles) && placementEditorMode(status) === "awaiting_acceptance";
}

export function isUnitSelectorEnabled(input: {
  roles: readonly string[];
  status?: string | null;
}): boolean {
  return canEditPlacementAssignment(input.roles, input.status);
}

export function isRoomSelectorEnabled(input: {
  roles: readonly string[];
  status?: string | null;
  unitCode?: string | null;
}): boolean {
  return (
    canEditPlacementAssignment(input.roles, input.status) &&
    Boolean(String(input.unitCode ?? "").trim())
  );
}

export function isBedSelectorEnabled(input: {
  roles: readonly string[];
  status?: string | null;
  roomKey?: string | null;
}): boolean {
  return (
    canEditPlacementAssignment(input.roles, input.status) &&
    Boolean(String(input.roomKey ?? "").trim())
  );
}

export function isAcceptingProviderEditable(input: {
  roles: readonly string[];
  status?: string | null;
}): boolean {
  return canEditPlacementAssignment(input.roles, input.status);
}

/**
 * UI-only projection of existing server authorization.
 * ADMIN: ACCEPT / ASSIGN_BED / transport.
 * RN: transport only (READY / DEPARTED / ARRIVED).
 * PROVIDER: no placement mutation controls on this workspace.
 */
export function canRunPlacementWorkspaceAction(
  action: PlacementQueueAction,
  roles: readonly string[]
): boolean {
  const r = roleCodesUpper(roles);
  if (r.includes(ADMIN)) return true;
  if (NURSE_TRANSPORT_ACTIONS.has(action) && r.includes(RN)) return true;
  return false;
}

export function shouldAutoSelectSoleEligibleUnit(input: {
  roles: readonly string[];
  status?: string | null;
  currentUnitCode?: string | null;
  eligibleUnitCount: number;
}): boolean {
  return (
    canEditPlacementAssignment(input.roles, input.status) &&
    !String(input.currentUnitCode ?? "").trim() &&
    input.eligibleUnitCount === 1
  );
}

export function assignBedSelectionReady(input: {
  unitCode?: string | null;
  roomKey?: string | null;
  bedKey?: string | null;
  roomHasBeds: boolean;
  selectedBedOccupied: boolean;
}): boolean {
  if (!String(input.unitCode ?? "").trim() || !String(input.roomKey ?? "").trim()) {
    return false;
  }
  if (input.roomHasBeds && !String(input.bedKey ?? "").trim()) {
    return false;
  }
  if (input.selectedBedOccupied) return false;
  return true;
}

export type PlacementTransitionErrorKind =
  | "unableToAccept"
  | "unableToAssign"
  | "bedTaken"
  | "stale"
  | "noPermissionAccept"
  | "noPermissionAssign"
  | "selectDestination";

export function placementTransitionErrorKind(
  error: unknown,
  action: PlacementQueueAction
): PlacementTransitionErrorKind {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: number }).status)
      : 0;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : String(error ?? "");
  const lower = message.toLowerCase();

  if (status === 403) {
    return action === "ACCEPT" ? "noPermissionAccept" : "noPermissionAssign";
  }
  if (status === 409) {
    if (/no longer available/i.test(lower)) return "bedTaken";
    return "stale";
  }
  if (/no longer available/i.test(lower)) return "bedTaken";
  if (/version conflict/i.test(lower)) return "stale";
  if (/requires unit and room/i.test(lower)) {
    return "selectDestination";
  }
  if (action === "ACCEPT") return "unableToAccept";
  if (action === "ASSIGN_BED") return "unableToAssign";
  return "stale";
}

export function primaryActionLabelKey(
  action: PlacementQueueAction | null
):
  | "acceptPlacement"
  | "assignBed"
  | "readyForTransfer"
  | "markDeparted"
  | "markArrived"
  | null {
  if (action === "ACCEPT") return "acceptPlacement";
  if (action === "ASSIGN_BED") return "assignBed";
  if (action === "MARK_READY") return "readyForTransfer";
  if (action === "MARK_DEPARTED") return "markDeparted";
  if (action === "MARK_ARRIVED") return "markArrived";
  return null;
}

export function placementSectionHeadingKey(input: {
  roles: readonly string[];
  status?: string | null;
}): "awaitingAcceptance" | "bedPlacement" | "bedPlacementPending" | "assignmentSummary" {
  const mode = placementEditorMode(input.status);
  if (mode === "awaiting_acceptance") return "awaitingAcceptance";
  if (mode === "assign_bed") {
    return canEditPlacementAssignment(input.roles, input.status)
      ? "bedPlacement"
      : "bedPlacementPending";
  }
  return "assignmentSummary";
}

/** Canonical hospital accepting provider is an explicit placement acceptance identity. */
export function hasCanonicalHospitalAcceptingProvider(
  acceptingProviderUserId?: string | null
): boolean {
  return Boolean(String(acceptingProviderUserId ?? "").trim());
}

export function responsiblePhysicianNameFromEncounter(
  encounter: Record<string, unknown> | null | undefined
): string | null {
  const summary = encounter?.admissionSummaryJson;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  const name = String((summary as Record<string, unknown>).responsiblePhysicianName ?? "").trim();
  return name || null;
}

export function placementReadOnlyProviderLine(input: {
  acceptingProviderUserId?: string | null;
  acceptingProviderNameSnapshot?: string | null;
  responsiblePhysicianName?: string | null;
}): { kind: "accepting" | "admitting"; name: string | null } {
  if (hasCanonicalHospitalAcceptingProvider(input.acceptingProviderUserId)) {
    const name = String(input.acceptingProviderNameSnapshot ?? "").trim() || null;
    return { kind: "accepting", name };
  }
  const name =
    String(input.responsiblePhysicianName ?? "").trim() ||
    String(input.acceptingProviderNameSnapshot ?? "").trim() ||
    null;
  return { kind: "admitting", name };
}

export function acceptingProviderFieldsForTransition(input: {
  acceptingProviderUserId?: string | null;
  acceptingProviderName?: string | null;
}): {
  acceptingProviderUserId?: string;
  acceptingProviderNameSnapshot?: string;
} {
  const userId = String(input.acceptingProviderUserId ?? "").trim();
  if (!userId) return {};
  const name = String(input.acceptingProviderName ?? "").trim();
  return {
    acceptingProviderUserId: userId,
    ...(name ? { acceptingProviderNameSnapshot: name } : {}),
  };
}
