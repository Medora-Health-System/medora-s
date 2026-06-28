import { apiFetch } from "@/lib/apiClient";
import {
  isIdempotentLifecycleAction,
  nextOrderItemStatusAfterLifecycleAction,
  orderItemLifecycleIdempotentMessageKey,
  type OrderItemLifecycleAction,
} from "@medora/shared";

export type MutateOrderItemLifecycleResult = {
  queued: boolean;
  idempotent: boolean;
  nextStatus: string;
  responseBody: unknown;
};

export function orderItemLifecycleActionPath(
  action: OrderItemLifecycleAction,
  itemId: string
): string {
  return `/orders/items/${itemId}/${action}`;
}

function readIdempotentFlag(body: unknown): boolean {
  return (
    body != null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    (body as { idempotent?: boolean }).idempotent === true
  );
}

function readQueuedFlag(body: unknown): boolean {
  return (
    body != null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    (body as { queued?: boolean }).queued === true
  );
}

/**
 * MEDUI.ORDERS.UNIFIED_ORDER_ACTION_LIFECYCLE_FIX.1 — shared POST for acknowledge / start / complete.
 */
export async function mutateOrderItemLifecycleAction(
  action: OrderItemLifecycleAction,
  itemId: string,
  facilityId: string
): Promise<MutateOrderItemLifecycleResult> {
  const responseBody = await apiFetch(orderItemLifecycleActionPath(action, itemId), {
    method: "POST",
    facilityId,
  });
  const idempotent = readIdempotentFlag(responseBody);
  const queued = readQueuedFlag(responseBody);
  const nextStatus = idempotent
    ? inferStatusAfterIdempotentAction(action, responseBody)
    : nextOrderItemStatusAfterLifecycleAction(action);
  return { queued, idempotent, nextStatus, responseBody };
}

function inferStatusAfterIdempotentAction(action: OrderItemLifecycleAction, body: unknown): string {
  if (body != null && typeof body === "object" && !Array.isArray(body)) {
    const status = (body as { status?: unknown }).status;
    if (typeof status === "string" && status.trim()) return status.trim().toUpperCase();
  }
  return nextOrderItemStatusAfterLifecycleAction(action);
}

export function orderItemLifecycleIdempotentToastKey(
  action: OrderItemLifecycleAction
): ReturnType<typeof orderItemLifecycleIdempotentMessageKey> {
  return orderItemLifecycleIdempotentMessageKey(action);
}

export function shouldTreatLifecycleErrorAsStaleState(
  action: OrderItemLifecycleAction,
  itemStatus: string | null | undefined,
  httpStatus?: number
): boolean {
  if (httpStatus !== 400) return false;
  if (isIdempotentLifecycleAction(action, itemStatus)) return true;
  return false;
}

export function orderItemLifecycleStaleStateMessageKey(): "orderLifecycle.staleState" {
  return "orderLifecycle.staleState";
}
