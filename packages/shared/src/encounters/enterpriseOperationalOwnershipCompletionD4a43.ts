/**
 * MEDUI.D4A.4.3 — Enterprise Operational Ownership Completion.
 *
 * Thin operational adapters over D4A.4.1 `resolveActiveEncounterOwnership`.
 * Does NOT introduce a second ownership engine, bag schema, or ACL.
 *
 * Migrated consumers: order-cancel assignee match, observation assign gaps,
 * observation board staffing/gaps, encounter chrome active provider display.
 *
 * STRICT OBS/IP: missing/empty bag → UNASSIGNED (never silent ED fallback).
 * Security: assignment ≠ chart authorization.
 */

import {
  ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID,
  resolveActiveEncounterOwnership,
  type ActiveEncounterOwnershipProjection,
  type OwnershipCompatibilityMode,
  type ResolveActiveEncounterOwnershipInput,
} from "./enterpriseEncounterOwnershipResolverD4a41.js";

export const ENTERPRISE_OPERATIONAL_OWNERSHIP_COMPLETION_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_OPERATIONAL_OWNERSHIP_COMPLETION.D4A4_3" as const;

export type OperationalOwnershipEncounterFields = ResolveActiveEncounterOwnershipInput;

/** Assignee ids for order-cancel policy match (operational ownership only). */
export type OrderCancelOperationalAssignees = {
  certification: typeof ENTERPRISE_OPERATIONAL_OWNERSHIP_COMPLETION_CERTIFICATION_ID;
  ownershipResolverCertification: typeof ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID;
  careSetting: ActiveEncounterOwnershipProjection["careSetting"];
  compatibilityMode: OwnershipCompatibilityMode;
  /** PRIMARY_PROVIDER (ED physician on EMERGENCY; bag primary on OBS/IP). */
  physicianAssignedUserId: string | null;
  /** PRIMARY_RN (ED nurse on EMERGENCY; bag primary on OBS/IP). */
  nurseAssignedUserId: string | null;
  ownership: ActiveEncounterOwnershipProjection;
};

export type ObservationAssignmentGapsProjection = {
  certification: typeof ENTERPRISE_OPERATIONAL_OWNERSHIP_COMPLETION_CERTIFICATION_ID;
  ownershipResolverCertification: typeof ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID;
  assignPhysicianGap: boolean;
  assignRnGap: boolean;
  primaryProviderUserId: string | null;
  primaryNurseUserId: string | null;
  primaryProviderDisplayName: string | null;
  primaryNurseDisplayName: string | null;
  clinicalAttendingDisplayName: string | null;
  ownership: ActiveEncounterOwnershipProjection;
};

function isAssigned(ownership: ActiveEncounterOwnershipProjection, role: "provider" | "nurse"): boolean {
  const slot = role === "provider" ? ownership.primaryProvider : ownership.primaryNurse;
  return slot.assignmentStatus === "ASSIGNED" && Boolean(slot.userId?.trim());
}

/**
 * Map D4A.4.1 ownership → cancel-policy encounter assignee fields.
 * Callers must still enforce RBAC separately (assignment ≠ authorization).
 */
export function resolveOrderCancelOperationalAssignees(
  input: OperationalOwnershipEncounterFields
): OrderCancelOperationalAssignees {
  const ownership = resolveActiveEncounterOwnership(input);
  return {
    certification: ENTERPRISE_OPERATIONAL_OWNERSHIP_COMPLETION_CERTIFICATION_ID,
    ownershipResolverCertification: ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID,
    careSetting: ownership.careSetting,
    compatibilityMode: ownership.compatibilityMode,
    physicianAssignedUserId: ownership.primaryProvider.userId,
    nurseAssignedUserId: ownership.primaryNurse.userId,
    ownership,
  };
}

/** Observation / hospital assign gaps from certified ownership (STRICT). */
export function resolveObservationAssignmentGaps(
  input: OperationalOwnershipEncounterFields
): ObservationAssignmentGapsProjection {
  const ownership = resolveActiveEncounterOwnership(input);
  return {
    certification: ENTERPRISE_OPERATIONAL_OWNERSHIP_COMPLETION_CERTIFICATION_ID,
    ownershipResolverCertification: ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID,
    assignPhysicianGap: !isAssigned(ownership, "provider"),
    assignRnGap: !isAssigned(ownership, "nurse"),
    primaryProviderUserId: ownership.primaryProvider.userId,
    primaryNurseUserId: ownership.primaryNurse.userId,
    primaryProviderDisplayName: ownership.primaryProvider.displayName,
    primaryNurseDisplayName: ownership.primaryNurse.displayName,
    clinicalAttendingDisplayName: ownership.clinicalAttending.displayName,
    ownership,
  };
}

/**
 * Active provider display for shared encounter chrome.
 * ED: caller should prefer joined `physicianAssigned` names (resolver has no ED displayName).
 * OBS/IP: bag clinical attending, else PRIMARY_PROVIDER displayName; never invent ED column names.
 */
export function resolveActiveProviderDisplayName(input: {
  ownershipInput: OperationalOwnershipEncounterFields;
  /** ED relation display when authority is ED columns. */
  edPhysicianDisplayName?: string | null;
}): string {
  const ownership = resolveActiveEncounterOwnership(input.ownershipInput);
  if (ownership.authoritySource === "ED_ENCOUNTER_COLUMNS") {
    const ed = (input.edPhysicianDisplayName ?? "").trim();
    return ed || "—";
  }
  const attending = (ownership.clinicalAttending.displayName ?? "").trim();
  if (attending) return attending;
  const primary = (ownership.primaryProvider.displayName ?? "").trim();
  if (primary) return primary;
  return "—";
}
