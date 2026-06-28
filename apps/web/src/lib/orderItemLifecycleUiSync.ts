/**
 * MEDUI.ORDERS.INSTANT_LIFECYCLE_UI_SYNC_CERTIFICATION.1
 * MEDUI.ORDERS.UNIFIED_ORDER_STATE_SYNCHRONIZATION_CERTIFICATION.1
 * Shared optimistic lifecycle UI patch + unified order state store integration.
 */

import {
  nextOrderItemStatusAfterLifecycleAction,
  normalizeOrderItemStatus,
  type OrderItemLifecycleAction,
} from "@medora/shared";
import { invalidateGetRequestDedupeForPath } from "@/lib/getRequestDedupe";
import {
  clearOrderItemPending,
  markOrderItemPending,
  mergeOrderPayload,
  mergeWorklistPayload,
  rollbackOrderItemPatch,
  upsertOrderItemPatch,
} from "@/lib/orderStateSyncStore";

export type OrderLifecycleCacheScope = {
  encounterId?: string;
  orderId?: string;
  worklists?: Array<"lab" | "radiology">;
};

export type NormalizedLifecycleMutation = {
  itemId: string;
  status: string;
  idempotent: boolean;
  queued: boolean;
  itemPatch: Record<string, unknown>;
};

export function getOptimisticOrderItemStatusForAction(
  action: OrderItemLifecycleAction,
  _currentStatus?: string | null
): string {
  return nextOrderItemStatusAfterLifecycleAction(action);
}

function readResponseRecord(body: unknown): Record<string, unknown> | null {
  if (body == null || typeof body !== "object" || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

export function normalizeOrderLifecycleMutationResponse(
  action: OrderItemLifecycleAction,
  itemId: string,
  body: unknown
): NormalizedLifecycleMutation {
  const row = readResponseRecord(body);
  const idempotent = row?.idempotent === true;
  const queued = row?.queued === true;
  const statusRaw = row?.status;
  const status =
    typeof statusRaw === "string" && statusRaw.trim()
      ? normalizeOrderItemStatus(statusRaw)
      : getOptimisticOrderItemStatusForAction(action);
  const lifecycleState =
    typeof row?.lifecycleState === "string" && row.lifecycleState.trim()
      ? row.lifecycleState.trim().toUpperCase()
      : undefined;
  const itemPatch: Record<string, unknown> = { status };
  if (lifecycleState) itemPatch.lifecycleState = lifecycleState;
  if (row?.updatedAt) itemPatch.updatedAt = row.updatedAt;
  return { itemId, status, idempotent, queued, itemPatch };
}

function patchItemInOrder(order: unknown, itemId: string, patch: Record<string, unknown>): unknown {
  if (!order || typeof order !== "object") return order;
  const o = order as Record<string, unknown>;
  if (!Array.isArray(o.items)) return order;
  return {
    ...o,
    items: o.items.map((item) => {
      if (!item || typeof item !== "object") return item;
      const row = item as Record<string, unknown>;
      if (String(row.id ?? "") !== itemId) return item;
      return { ...row, ...patch };
    }),
  };
}

/** Patch one line inside an orders array, single order, or worklist queue. */
export function mergeUpdatedOrderItemIntoOrderCollections(
  collection: unknown,
  itemId: string,
  patch: Record<string, unknown>
): unknown {
  if (Array.isArray(collection)) {
    return collection.map((entry) => patchItemInOrder(entry, itemId, patch));
  }
  return patchItemInOrder(collection, itemId, patch);
}

export function applyOrderItemLifecyclePatch(
  target: unknown,
  itemId: string,
  nextStatus: string,
  extraPatch?: Record<string, unknown>
): unknown {
  return mergeUpdatedOrderItemIntoOrderCollections(target, itemId, {
    status: normalizeOrderItemStatus(nextStatus),
    ...(extraPatch ?? {}),
  });
}

export function invalidateOrderDataCachesAfterLifecycleMutation(
  facilityId: string,
  scope: OrderLifecycleCacheScope
): void {
  if (scope.encounterId) {
    invalidateGetRequestDedupeForPath(`/encounters/${scope.encounterId}/orders`, facilityId);
    invalidateGetRequestDedupeForPath(`/encounters/${scope.encounterId}/order-events`, facilityId);
  }
  if (scope.orderId) {
    invalidateGetRequestDedupeForPath(`/orders/${scope.orderId}`, facilityId);
  }
  for (const kind of scope.worklists ?? []) {
    invalidateGetRequestDedupeForPath(`/worklists/${kind}`, facilityId);
  }
}

export type LifecycleUiMutationHandlers = {
  applyOptimistic: (nextStatus: string) => void;
  reconcile: (patch: Record<string, unknown>) => void;
  rollback: () => void;
  forceRevert: (previousStatus: string) => void;
};

export type OrderLifecycleCollectionKind = "orders" | "worklist";

/** Wire unified store + local React collection updates. */
export function createOrderLifecycleMutationHandlers(input: {
  itemId: string;
  action: OrderItemLifecycleAction;
  collectionKind: OrderLifecycleCollectionKind;
  applyCollection: (transform: (prev: unknown) => unknown) => void;
}): LifecycleUiMutationHandlers {
  const mergeCollection = (raw: unknown) =>
    input.collectionKind === "worklist" ? mergeWorklistPayload(raw) : mergeOrderPayload(raw);

  return {
    applyOptimistic: (nextStatus) => {
      markOrderItemPending(input.itemId, input.action);
      upsertOrderItemPatch(
        input.itemId,
        { status: nextStatus },
        "optimistic",
        { pendingAction: input.action }
      );
      input.applyCollection((prev) => mergeCollection(prev));
    },
    reconcile: (patch) => {
      upsertOrderItemPatch(input.itemId, patch, "post");
      clearOrderItemPending(input.itemId);
      input.applyCollection((prev) => mergeCollection(prev));
    },
    rollback: () => {
      clearOrderItemPending(input.itemId);
    },
    forceRevert: (previousStatus) => {
      rollbackOrderItemPatch(input.itemId, previousStatus);
      input.applyCollection((prev) => mergeCollection(prev));
    },
  };
}

export async function runOrderItemLifecycleUiMutation(input: {
  action: OrderItemLifecycleAction;
  itemId: string;
  facilityId: string;
  currentStatus?: string | null;
  handlers: LifecycleUiMutationHandlers;
  mutate: (
    action: OrderItemLifecycleAction,
    itemId: string,
    facilityId: string
  ) => Promise<{ nextStatus: string; idempotent: boolean; queued: boolean; responseBody: unknown }>;
}): Promise<NormalizedLifecycleMutation> {
  const previousStatus = normalizeOrderItemStatus(input.currentStatus);
  const optimisticStatus = getOptimisticOrderItemStatusForAction(input.action, input.currentStatus);
  input.handlers.applyOptimistic(optimisticStatus);
  try {
    const result = await input.mutate(input.action, input.itemId, input.facilityId);
    const normalized = normalizeOrderLifecycleMutationResponse(
      input.action,
      input.itemId,
      result.responseBody
    );
    input.handlers.reconcile(normalized.itemPatch);
    return normalized;
  } catch (err) {
    input.handlers.rollback();
    if (previousStatus) {
      input.handlers.forceRevert(previousStatus);
    } else {
      rollbackOrderItemPatch(input.itemId, "");
    }
    throw err;
  }
}

export { mergeOrderPayload, mergeWorklistPayload };
