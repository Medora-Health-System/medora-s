/**
 * Central medication order governance rendering rules for Orders surfaces.
 * Keeps MAR dose completion separate from standing order lifecycle governance.
 */

import {
  isMedicationOrderLifecycleGovernanceDeferred,
  resolveMedicationOrderLifecycleStatus,
  shouldSkipOrderLineCompletionForMar,
  type MedicationOrderLifecycleStatus,
} from "@medora/shared";

/** Medication START/STOP/Administer execution lives in unified MAR only (M1.8B.7K.5). */
export const MEDICATION_ADMINISTRATION_EXECUTION_IN_MAR_ONLY = true;

const PRESCRIBER_ROLES = new Set(["PROVIDER", "ADMIN", "MEDORA_SUPER_ADMIN"]);

/** Chart-admin MAR intents; extend for future inpatient infusion types without changing call sites. */
const MAR_MANAGED_FULFILLMENT_INTENTS = new Set(["", "ADMINISTER_CHART"]);

export type MedicationGovernanceHideReason =
  | "NOT_MEDICATION_ORDER"
  | "INACTIVE_STANDING_ORDER"
  | null;

export type MedicationGovernancePermissionsInput = {
  canPrescribeProp?: boolean;
  roles?: string[] | null;
  encounterSigned?: boolean;
};

export type MedicationOrderGovernancePermissionAudit = {
  canPrescribeProp: boolean;
  roles: string[];
  effectiveCanPrescribe: boolean;
  source: "prop" | "roles" | "none";
};

export type MedicationGovernanceRenderState = {
  shouldRender: boolean;
  canMutate: boolean;
  hiddenReason: MedicationGovernanceHideReason;
  hiddenReasonCode: string;
  normalizedLifecycleStatus: MedicationOrderLifecycleStatus;
  isMedicationOrder: boolean;
  isStandingActiveOrder: boolean;
  isMarManagedOrder: boolean;
  permission: MedicationOrderGovernancePermissionAudit;
  effectiveCanPrescribe: boolean;
};

/** True when user may mutate medication order lifecycle from the Orders section. */
export function resolveMedicationOrderGovernanceCanPrescribe(
  roles: string[] | null | undefined
): boolean {
  if (!roles?.length) return false;
  return roles.some((role) => PRESCRIBER_ROLES.has(String(role).trim().toUpperCase()));
}

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

/**
 * Medication order line in Orders UI — order type MEDICATION; item type may be omitted on legacy rows.
 * Applies to IVPB, chemo, PCA, insulin drip, TPN, blood products, and outpatient infusion when typed MEDICATION.
 */
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
 * PRN / ON_DEMAND lines may retain COMPLETED workflow status after MAR while lifecycle
 * stays ACTIVE (MEDUI.ED.MAR.H2). Provider governance must mirror nurse pending semantics.
 */
export function isMedicationOrderLineStandingContinuityDespiteTerminalWorkflow(
  item: Record<string, unknown>
): boolean {
  const workflowStatus = String(item.status ?? "").trim().toUpperCase();
  if (
    workflowStatus !== "COMPLETED" &&
    workflowStatus !== "RESULTED" &&
    workflowStatus !== "VERIFIED"
  ) {
    return false;
  }
  return shouldSkipOrderLineCompletionForMar({
    frequencyCode: typeof item.frequencyCode === "string" ? item.frequencyCode : null,
    directionsSig: typeof item.notes === "string" ? item.notes : null,
    orderRoute: typeof item.route === "string" ? item.route : null,
    doseGatedMarPathUsed: false,
  });
}

/**
 * Standing/recurring medication orders (e.g. Q12H IVPB, PRN) remain provider-governable after
 * a MAR dose is completed. Only terminal order-line workflow statuses suppress open-list actions,
 * except repeating PRN / ON_DEMAND continuity rows.
 */
export function isStandingMedicationOrderLineActiveInOrders(
  item: Record<string, unknown>
): boolean {
  const workflowStatus = String(item.status ?? "").trim().toUpperCase();
  if (workflowStatus === "CANCELLED") return false;
  if (workflowStatus === "COMPLETED" || workflowStatus === "RESULTED" || workflowStatus === "VERIFIED") {
    if (!isMedicationOrderLineStandingContinuityDespiteTerminalWorkflow(item)) {
      return false;
    }
  }
  const lifecycle = normalizeMedicationOrderLifecycleStatus(item.medicationLifecycleStatus);
  if (lifecycle === "DISCONTINUED" || lifecycle === "SUPERSEDED" || lifecycle === "CANCELED_ENTERED_IN_ERROR") {
    return false;
  }
  if (lifecycle === "COMPLETED" || lifecycle === "EXPIRED") {
    return false;
  }
  return true;
}

/** MAR-managed chart-admin medication row (ADMINISTER_CHART intent or legacy empty intent). */
export function isMarManagedMedicationOrderItem(
  orderType: string,
  item: Record<string, unknown>
): boolean {
  if (!MEDICATION_ADMINISTRATION_EXECUTION_IN_MAR_ONLY) return false;
  if (!isMedicationOrderLineItem(orderType, item)) return false;
  const intent = String(item.medicationFulfillmentIntent ?? "").trim().toUpperCase();
  return MAR_MANAGED_FULFILLMENT_INTENTS.has(intent);
}

/** @deprecated Use isMarManagedMedicationOrderItem with orderType. */
export function isChartAdminMedicationOrderItem(item: Record<string, unknown>): boolean {
  return isMarManagedMedicationOrderItem("MEDICATION", item);
}

function resolveHiddenReason(input: {
  isMedicationOrder: boolean;
  isStandingActiveOrder: boolean;
  effectiveCanPrescribe: boolean;
}): MedicationGovernanceHideReason {
  if (!input.isMedicationOrder) return "NOT_MEDICATION_ORDER";
  if (!input.isStandingActiveOrder && !input.effectiveCanPrescribe) {
    return "INACTIVE_STANDING_ORDER";
  }
  return null;
}

/**
 * Single source of truth for provider medication governance visibility and mutation rights
 * across ER Orders, encounter Orders tab, and lifecycle panel gating.
 */
export function resolveMedicationGovernanceRenderState(input: {
  orderType: string;
  orderItem: Record<string, unknown>;
  permissions: MedicationGovernancePermissionsInput;
}): MedicationGovernanceRenderState {
  const orderItem = input.orderItem;
  const permission = auditMedicationOrderGovernancePermissions({
    canPrescribeProp: input.permissions.canPrescribeProp ?? false,
    roles: input.permissions.roles,
  });
  const isMedicationOrder = isMedicationOrderLineItem(input.orderType, orderItem);
  const normalizedLifecycleStatus = normalizeMedicationOrderLifecycleStatus(
    orderItem.medicationLifecycleStatus
  );
  const isStandingActiveOrder = isStandingMedicationOrderLineActiveInOrders(orderItem);
  const isMarManagedOrder = isMarManagedMedicationOrderItem(input.orderType, orderItem);
  const hiddenReason = resolveHiddenReason({
    isMedicationOrder,
    isStandingActiveOrder,
    effectiveCanPrescribe: permission.effectiveCanPrescribe,
  });
  const shouldRender =
    isMedicationOrder && (isStandingActiveOrder || permission.effectiveCanPrescribe);
  const governanceDeferred = isMedicationOrderLifecycleGovernanceDeferred(normalizedLifecycleStatus);
  const lifecycleAllowsMutation =
    normalizedLifecycleStatus === "ACTIVE" || normalizedLifecycleStatus === "ON_HOLD";
  const canMutate =
    permission.effectiveCanPrescribe &&
    !input.permissions.encounterSigned &&
    isStandingActiveOrder &&
    !governanceDeferred &&
    lifecycleAllowsMutation;

  return {
    shouldRender,
    canMutate,
    hiddenReason: shouldRender ? null : hiddenReason,
    hiddenReasonCode: shouldRender ? "" : hiddenReason ?? "UNKNOWN",
    normalizedLifecycleStatus,
    isMedicationOrder,
    isStandingActiveOrder,
    isMarManagedOrder,
    permission,
    effectiveCanPrescribe: permission.effectiveCanPrescribe,
  };
}

/** Convenience wrapper for conditional JSX mounting. */
export function shouldRenderMedicationGovernance(
  orderType: string,
  orderItem: Record<string, unknown>,
  permissions: MedicationGovernancePermissionsInput
): boolean {
  return resolveMedicationGovernanceRenderState({ orderType, orderItem, permissions }).shouldRender;
}
