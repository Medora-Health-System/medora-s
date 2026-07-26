import { resolveActiveProviderDisplayName } from "@medora/shared";

/**
 * Assigned provider display — never raw UUID (fallback em dash when names missing).
 * ED: uses joined physicianAssigned names.
 */
export function formatEncounterProviderAssigned(enc: {
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
}): string {
  const s = `${enc.physicianAssigned?.firstName ?? ""} ${enc.physicianAssigned?.lastName ?? ""}`.trim();
  return s || "—";
}

/**
 * D4A.4.3 — Active operational provider display for shared encounter chrome.
 * EMERGENCY: ED physicianAssigned relation names.
 * OBS/IP: hospital bag clinical attending / PRIMARY_PROVIDER (STRICT; never ED name as fallback).
 */
export function formatActiveEncounterProviderAssigned(enc: {
  type?: string | null;
  billingClassification?: string | null;
  admissionSummaryJson?: unknown;
  physicianAssignedUserId?: string | null;
  nurseAssignedUserId?: string | null;
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
}): string {
  const edName = `${enc.physicianAssigned?.firstName ?? ""} ${enc.physicianAssigned?.lastName ?? ""}`.trim();
  return resolveActiveProviderDisplayName({
    ownershipInput: {
      type: enc.type,
      billingClassification: enc.billingClassification,
      admissionSummaryJson: enc.admissionSummaryJson,
      physicianAssignedUserId: enc.physicianAssignedUserId,
      nurseAssignedUserId: enc.nurseAssignedUserId,
    },
    edPhysicianDisplayName: edName || null,
  });
}

/** @deprecated Use {@link formatEncounterProviderAssigned} */
export const formatEncounterPhysicianAssignedFr = formatEncounterProviderAssigned;
