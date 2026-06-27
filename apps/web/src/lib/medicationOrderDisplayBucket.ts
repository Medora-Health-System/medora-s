/**
 * Medication order list bucketing for ER Orders (Open vs Completed vs Closed).
 * Dose completion on MAR does not close a standing order; provider lifecycle does.
 */

import {
  normalizeMedicationOrderLifecycleStatus,
  isMedicationOrderLineItem,
} from "@/lib/medicationOrderGovernancePermissions";

export type MedicationOrderDisplayBucket =
  | "OPEN"
  | "COMPLETED"
  | "CANCELED_OR_DISCONTINUED"
  | "SUPERSEDED"
  | "HIDDEN";

const TERMINAL_WORKFLOW_STATUSES = new Set(["COMPLETED", "RESULTED", "VERIFIED", "CANCELLED"]);

/** Infer medication row when parent order type is unavailable. */
export function isMedicationOrderItemRow(item: Record<string, unknown>): boolean {
  return isMedicationOrderLineItem("MEDICATION", item);
}

/** True when at least one MAR administration exists on the order line. */
export function medicationOrderItemHasMarAdministration(item: Record<string, unknown>): boolean {
  const admins = item.medicationAdministrations;
  if (Array.isArray(admins) && admins.length > 0) return true;
  if (item.completedAt && item.completedByNurse) return true;
  return false;
}

/**
 * Resolve which ER Orders section should display this medication line.
 * Returns null for non-medication rows (use workflow status helpers instead).
 */
export function resolveMedicationOrderDisplayBucket(input: {
  orderType?: string;
  orderItem: Record<string, unknown>;
  hasMarAdministration?: boolean;
}): MedicationOrderDisplayBucket | null {
  const orderType = String(input.orderType ?? "").trim().toUpperCase();
  const item = input.orderItem;
  const isMedication =
    orderType === "MEDICATION" || (orderType ? false : isMedicationOrderItemRow(item));
  if (!isMedication) return null;

  const workflowStatus = String(item.status ?? "").trim().toUpperCase();
  if (workflowStatus === "CANCELLED") return "HIDDEN";

  const lifecycle = normalizeMedicationOrderLifecycleStatus(item.medicationLifecycleStatus);
  const hasMar =
    input.hasMarAdministration ?? medicationOrderItemHasMarAdministration(item);

  if (TERMINAL_WORKFLOW_STATUSES.has(workflowStatus) && workflowStatus !== "CANCELLED") {
    return "COMPLETED";
  }

  switch (lifecycle) {
    case "ACTIVE":
      return "OPEN";
    case "ON_HOLD":
      return "OPEN";
    case "DISCONTINUED":
      return hasMar ? "COMPLETED" : "CANCELED_OR_DISCONTINUED";
    case "SUPERSEDED":
      return "SUPERSEDED";
    case "COMPLETED":
    case "EXPIRED":
      return "COMPLETED";
    case "CANCELED_ENTERED_IN_ERROR":
      return "CANCELED_OR_DISCONTINUED";
    default:
      return "OPEN";
  }
}

export function isMedicationOrderOpenForErDashboard(
  item: Record<string, unknown>,
  orderType?: string
): boolean {
  const bucket = resolveMedicationOrderDisplayBucket({ orderType, orderItem: item });
  if (bucket === null) return true;
  return bucket === "OPEN";
}

export function isMedicationOrderClosedForErCompleted(
  item: Record<string, unknown>,
  orderType?: string
): boolean {
  const bucket = resolveMedicationOrderDisplayBucket({ orderType, orderItem: item });
  if (bucket === null) return false;
  return bucket === "COMPLETED" || bucket === "CANCELED_OR_DISCONTINUED" || bucket === "SUPERSEDED";
}

export function medicationOrderLifecycleClosedPerformedAt(item: Record<string, unknown>): string {
  const lifecycleAt = item.medicationLifecycleAt;
  if (lifecycleAt instanceof Date) return lifecycleAt.toISOString();
  if (typeof lifecycleAt === "string" && lifecycleAt.trim()) return lifecycleAt.trim();
  const updatedAt = item.updatedAt;
  if (updatedAt instanceof Date) return updatedAt.toISOString();
  if (typeof updatedAt === "string" && updatedAt.trim()) return updatedAt.trim();
  return "";
}
