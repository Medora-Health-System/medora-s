/**
 * MEDUI.ORDERS.UNIFIED_ORDER_ACTION_LIFECYCLE_FIX.1
 * MEDUI.ORDERS.ORDER_LIFECYCLE_ENGINE_FREEZE_CERTIFICATION.1
 *
 * ORDER_LIFECYCLE_ENGINE_FROZEN — Certified non-MAR order lifecycle rules (acknowledge / start / complete).
 * Future modules (including Order Sets) MUST reuse this module and MUST NOT duplicate lifecycle rules
 * or create parallel state stores.
 */

export type OrderItemLifecycleAction = "acknowledge" | "start" | "complete";

const ACKNOWLEDGE_FROM = new Set(["PLACED", "PENDING", "SIGNED"]);
const START_FROM = new Set(["ACKNOWLEDGED"]);
const COMPLETE_FROM = new Set(["IN_PROGRESS"]);

const AT_OR_BEYOND_ACKNOWLEDGED = new Set([
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "COMPLETED",
  "RESULTED",
  "VERIFIED",
]);

const AT_OR_BEYOND_IN_PROGRESS = new Set(["IN_PROGRESS", "COMPLETED", "RESULTED", "VERIFIED"]);

const AT_OR_BEYOND_COMPLETED = new Set(["COMPLETED", "RESULTED", "VERIFIED"]);

const TERMINAL = new Set(["COMPLETED", "RESULTED", "VERIFIED", "CANCELLED"]);

export function normalizeOrderItemStatus(status: string | null | undefined): string {
  return String(status ?? "").trim().toUpperCase();
}

export function orderItemIsTerminalStatus(status: string | null | undefined): boolean {
  return TERMINAL.has(normalizeOrderItemStatus(status));
}

export function orderItemNeedsAcknowledge(status: string | null | undefined): boolean {
  return ACKNOWLEDGE_FROM.has(normalizeOrderItemStatus(status));
}

export function orderItemAllowsStart(status: string | null | undefined): boolean {
  return START_FROM.has(normalizeOrderItemStatus(status));
}

export function orderItemAllowsComplete(status: string | null | undefined): boolean {
  return COMPLETE_FROM.has(normalizeOrderItemStatus(status));
}

/** Next workflow step for a line item, or null when no action applies. */
export function resolveOrderItemWorkflowAction(
  status: string | null | undefined
): OrderItemLifecycleAction | null {
  if (orderItemNeedsAcknowledge(status)) return "acknowledge";
  if (orderItemAllowsStart(status)) return "start";
  if (orderItemAllowsComplete(status)) return "complete";
  return null;
}

export function nextOrderItemStatusAfterLifecycleAction(action: OrderItemLifecycleAction): string {
  if (action === "acknowledge") return "ACKNOWLEDGED";
  if (action === "start") return "IN_PROGRESS";
  return "COMPLETED";
}

/** True when repeating the action should be treated as safe success (no new event). */
export function isIdempotentLifecycleAction(
  action: OrderItemLifecycleAction,
  status: string | null | undefined
): boolean {
  const st = normalizeOrderItemStatus(status);
  if (action === "acknowledge") return AT_OR_BEYOND_ACKNOWLEDGED.has(st);
  if (action === "start") return AT_OR_BEYOND_IN_PROGRESS.has(st);
  return AT_OR_BEYOND_COMPLETED.has(st);
}

export function lifecycleActionMayProceedFromStatus(
  action: OrderItemLifecycleAction,
  status: string | null | undefined
): boolean {
  const st = normalizeOrderItemStatus(status);
  if (action === "acknowledge") return ACKNOWLEDGE_FROM.has(st);
  if (action === "start") return START_FROM.has(st) || st === "PLACED" || st === "PENDING";
  return COMPLETE_FROM.has(st);
}

export type OrderItemLifecycleIdempotentMessageKey =
  | "orderLifecycle.alreadyAcknowledged"
  | "orderLifecycle.alreadyStarted"
  | "orderLifecycle.alreadyCompleted"
  | "orderLifecycle.staleState";

export function orderItemLifecycleIdempotentMessageKey(
  action: OrderItemLifecycleAction
): OrderItemLifecycleIdempotentMessageKey {
  if (action === "acknowledge") return "orderLifecycle.alreadyAcknowledged";
  if (action === "start") return "orderLifecycle.alreadyStarted";
  return "orderLifecycle.alreadyCompleted";
}

/** Monotonic lifecycle rank — higher means further along workflow. */
export function orderItemStatusProgressRank(status: string | null | undefined): number {
  const st = normalizeOrderItemStatus(status);
  if (st === "VERIFIED") return 60;
  if (st === "RESULTED") return 50;
  if (st === "COMPLETED") return 40;
  if (st === "IN_PROGRESS") return 30;
  if (st === "ACKNOWLEDGED") return 20;
  if (st === "CANCELLED") return 100;
  if (st === "DRAFT") return 0;
  if (st === "PLACED" || st === "PENDING" || st === "SIGNED" || st === "ORDERED") return 10;
  return 0;
}

/** True when incoming status would regress workflow vs current authoritative status. */
export function orderItemStatusWouldRegress(
  currentStatus: string | null | undefined,
  incomingStatus: string | null | undefined
): boolean {
  return orderItemStatusProgressRank(incomingStatus) < orderItemStatusProgressRank(currentStatus);
}
