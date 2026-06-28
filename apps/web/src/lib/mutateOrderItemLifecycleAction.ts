import { apiFetch } from "@/lib/apiClient";
import {
  invalidateOrderDataCachesAfterLifecycleMutation,
  type OrderLifecycleCacheScope,
} from "@/lib/orderItemLifecycleUiSync";
import {
  isIdempotentLifecycleAction,
  nextOrderItemStatusAfterLifecycleAction,
  normalizeOrderItemStatus,
  orderItemLifecycleIdempotentMessageKey,
  type OrderItemLifecycleAction,
} from "@medora/shared";

export type MutateOrderItemLifecycleResult = {
  queued: boolean;
  idempotent: boolean;
  nextStatus: string;
  responseBody: unknown;
  itemPatch: Record<string, unknown>;
};

export type MutateOrderItemLifecycleOptions = {
  cacheScope?: OrderLifecycleCacheScope;
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

function buildItemPatch(body: unknown, nextStatus: string): Record<string, unknown> {
  const patch: Record<string, unknown> = { status: normalizeOrderItemStatus(nextStatus) };
  if (body != null && typeof body === "object" && !Array.isArray(body)) {
    const row = body as Record<string, unknown>;
    if (typeof row.lifecycleState === "string" && row.lifecycleState.trim()) {
      patch.lifecycleState = row.lifecycleState.trim().toUpperCase();
    }
    if (row.updatedAt) patch.updatedAt = row.updatedAt;
    if (row.idempotent === true) patch.idempotent = true;
  }
  return patch;
}

function resolveNextStatus(action: OrderItemLifecycleAction, body: unknown, idempotent: boolean): string {
  if (body != null && typeof body === "object" && !Array.isArray(body)) {
    const status = (body as { status?: unknown }).status;
    if (typeof status === "string" && status.trim()) {
      return normalizeOrderItemStatus(status);
    }
  }
  if (idempotent) {
    return normalizeOrderItemStatus(nextOrderItemStatusAfterLifecycleAction(action));
  }
  return normalizeOrderItemStatus(nextOrderItemStatusAfterLifecycleAction(action));
}

/**
 * MEDUI.ORDERS.UNIFIED_ORDER_ACTION_LIFECYCLE_FIX.1 — shared POST for acknowledge / start / complete.
 * MEDUI.ORDERS.INSTANT_LIFECYCLE_UI_SYNC_CERTIFICATION.1 — invalidates mutable GET caches on success.
 */
export async function mutateOrderItemLifecycleAction(
  action: OrderItemLifecycleAction,
  itemId: string,
  facilityId: string,
  options?: MutateOrderItemLifecycleOptions
): Promise<MutateOrderItemLifecycleResult> {
  const responseBody = await apiFetch(orderItemLifecycleActionPath(action, itemId), {
    method: "POST",
    facilityId,
  });
  const idempotent = readIdempotentFlag(responseBody);
  const queued = readQueuedFlag(responseBody);
  const nextStatus = resolveNextStatus(action, responseBody, idempotent);
  const itemPatch = buildItemPatch(responseBody, nextStatus);
  if (options?.cacheScope) {
    invalidateOrderDataCachesAfterLifecycleMutation(facilityId, options.cacheScope);
  }
  return { queued, idempotent, nextStatus, responseBody, itemPatch };
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
