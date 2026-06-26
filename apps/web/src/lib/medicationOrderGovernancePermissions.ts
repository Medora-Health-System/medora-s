/**
 * Provider medication order governance — permission and row classification helpers.
 * Keeps MAR dose completion separate from standing order lifecycle governance.
 */

import {
  resolveMedicationOrderLifecycleStatus,
  type MedicationOrderLifecycleStatus,
} from "@medora/shared";

const PRESCRIBER_ROLES = new Set(["PROVIDER", "ADMIN", "MEDORA_SUPER_ADMIN"]);

/** True when user may mutate medication order lifecycle from the Orders section. */
export function resolveMedicationOrderGovernanceCanPrescribe(
  roles: string[] | null | undefined
): boolean {
  if (!roles?.length) return false;
  return roles.some((role) => PRESCRIBER_ROLES.has(String(role).trim().toUpperCase()));
}

/** Medication order line in Orders UI — order type MEDICATION; item type may be omitted on legacy rows. */
export function isMedicationOrderLineItem(
  orderType: string,
  item: Record<string, unknown>
): boolean {
  if (String(orderType ?? "").trim().toUpperCase() !== "MEDICATION") return false;
  const catalogType = String(item.catalogItemType ?? "").trim().toUpperCase();
  if (!catalogType) return true;
  return catalogType === "MEDICATION";
}

/** Normalize lifecycle status for display and action gating (legacy rows → ACTIVE). */
export function normalizeMedicationOrderLifecycleStatus(
  raw: unknown
): MedicationOrderLifecycleStatus {
  return resolveMedicationOrderLifecycleStatus(
    typeof raw === "string" ? raw : raw == null ? null : String(raw)
  );
}

/**
 * Standing/recurring medication orders (e.g. Q12H IVPB) remain provider-governable after
 * a MAR dose is completed. Only terminal order-line workflow statuses suppress open-list actions.
 */
export function isStandingMedicationOrderLineActiveInOrders(
  item: Record<string, unknown>
): boolean {
  const workflowStatus = String(item.status ?? "").trim().toUpperCase();
  if (workflowStatus === "CANCELLED") return false;
  if (workflowStatus === "COMPLETED" || workflowStatus === "RESULTED" || workflowStatus === "VERIFIED") {
    return false;
  }
  const lifecycle = normalizeMedicationOrderLifecycleStatus(item.medicationLifecycleStatus);
  if (lifecycle === "DISCONTINUED" || lifecycle === "SUPERSEDED" || lifecycle === "CANCELED_ENTERED_IN_ERROR") {
    return false;
  }
  return true;
}

/** MAR-managed chart-admin medication row (ADMINISTER_CHART intent). */
export function isChartAdminMedicationOrderItem(item: Record<string, unknown>): boolean {
  if (!isMedicationOrderLineItem("MEDICATION", item)) return false;
  const intent = String(item.medicationFulfillmentIntent ?? "").trim().toUpperCase();
  return !intent || intent === "ADMINISTER_CHART";
}

export type MedicationOrderGovernancePermissionAudit = {
  canPrescribeProp: boolean;
  roles: string[];
  effectiveCanPrescribe: boolean;
  source: "prop" | "roles" | "none";
};

export function auditMedicationOrderGovernancePermissions(input: {
  canPrescribeProp: boolean;
  roles?: string[] | null;
}): MedicationOrderGovernancePermissionAudit {
  const roles = Array.isArray(input.roles) ? input.roles : [];
  const fromRoles = resolveMedicationOrderGovernanceCanPrescribe(roles);
  const effectiveCanPrescribe = input.canPrescribeProp || fromRoles;
  return {
    canPrescribeProp: input.canPrescribeProp,
    roles,
    effectiveCanPrescribe,
    source: input.canPrescribeProp ? "prop" : fromRoles ? "roles" : "none",
  };
}
