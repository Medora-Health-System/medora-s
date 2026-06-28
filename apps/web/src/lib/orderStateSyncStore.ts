/**
 * MEDUI.ORDERS.UNIFIED_ORDER_STATE_SYNCHRONIZATION_CERTIFICATION.1
 * MEDUI.ORDERS.CLIENT_STATE_ENGINE_PRODUCTION_AUDIT_AND_CERTIFICATION.1
 * Lightweight unified order-item lifecycle state synchronization.
 *
 * CRITICAL: mergeOrderPayload / mergeWorklistPayload are read-only projections.
 * Never write to the store during merge — that caused recursive listener loops.
 */

import {
  normalizeOrderItemStatus,
  orderItemStatusProgressRank,
  orderItemStatusWouldRegress,
  type OrderItemLifecycleAction,
} from "@medora/shared";

export const MEDORA_ORDER_ITEM_SYNC = "medora:order-item-sync";

export type OrderItemSyncSource = "optimistic" | "post" | "background" | "remote";

export type OrderItemSyncEntry = {
  itemId: string;
  patch: Record<string, unknown>;
  status: string;
  lifecycleState?: string;
  mutationSequence: number;
  localMutationSequence: number;
  updatedAtMs: number | null;
  receivedAtMs: number;
  source: OrderItemSyncSource;
  pendingAction: OrderItemLifecycleAction | null;
};

type SyncListener = (itemId: string) => void;

const STORE_METADATA_PATCH_KEYS = new Set(["idempotent"]);

const entries = new Map<string, OrderItemSyncEntry>();
const listeners = new Set<SyncListener>();
const pendingNotifyIds = new Set<string>();
let globalMutationSequence = 0;
let broadcastInitialized = false;
let notifyScheduled = false;
let broadcastChannel: BroadcastChannel | null = null;

function parseUpdatedAtMs(value: unknown): number | null {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === "string" && value.trim()) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function extractStatus(patch: Record<string, unknown>, fallback?: string): string {
  const raw = patch.status;
  if (typeof raw === "string" && raw.trim()) return normalizeOrderItemStatus(raw);
  return fallback ? normalizeOrderItemStatus(fallback) : "";
}

function extractLifecycleState(patch: Record<string, unknown>): string | undefined {
  const raw = patch.lifecycleState;
  if (typeof raw === "string" && raw.trim()) return raw.trim().toUpperCase();
  return undefined;
}

function patchForItemProjection(patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!STORE_METADATA_PATCH_KEYS.has(key)) out[key] = value;
  }
  return out;
}

function scheduleNotifyListeners(itemId: string): void {
  pendingNotifyIds.add(itemId);
  if (notifyScheduled) return;
  notifyScheduled = true;
  queueMicrotask(() => {
    notifyScheduled = false;
    const ids = [...pendingNotifyIds];
    pendingNotifyIds.clear();
    for (const listener of listeners) {
      for (const id of ids) listener(id);
    }
  });
}

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (broadcastChannel) return broadcastChannel;
  try {
    broadcastChannel = new BroadcastChannel("medora-order-item-sync");
    return broadcastChannel;
  } catch {
    return null;
  }
}

export function resetOrderStateSyncStoreForTests(): void {
  entries.clear();
  listeners.clear();
  pendingNotifyIds.clear();
  globalMutationSequence = 0;
  broadcastInitialized = false;
  notifyScheduled = false;
  broadcastChannel = null;
}

export function subscribeToOrderItem(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOrderItemSnapshot(itemId: string): OrderItemSyncEntry | null {
  return entries.get(itemId) ?? null;
}

export function markOrderItemPending(itemId: string, action: OrderItemLifecycleAction): void {
  const existing = entries.get(itemId);
  if (existing) {
    entries.set(itemId, { ...existing, pendingAction: action });
    return;
  }
  entries.set(itemId, {
    itemId,
    patch: {},
    status: "",
    mutationSequence: 0,
    localMutationSequence: 0,
    updatedAtMs: null,
    receivedAtMs: Date.now(),
    source: "optimistic",
    pendingAction: action,
  });
}

export function clearOrderItemPending(itemId: string): void {
  const existing = entries.get(itemId);
  if (!existing) return;
  entries.set(itemId, { ...existing, pendingAction: null });
}

export function preventStaleOverwrite(
  authoritative: OrderItemSyncEntry,
  incoming: { status: string; updatedAtMs?: number | null }
): boolean {
  const incomingStatus = normalizeOrderItemStatus(incoming.status);
  if (orderItemStatusWouldRegress(authoritative.status, incomingStatus)) return true;
  if (orderItemStatusProgressRank(incomingStatus) > orderItemStatusProgressRank(authoritative.status)) {
    return false;
  }
  if (authoritative.source === "optimistic" || authoritative.source === "post") {
    if (incoming.updatedAtMs != null && authoritative.updatedAtMs != null) {
      return incoming.updatedAtMs < authoritative.updatedAtMs;
    }
    return authoritative.mutationSequence > 0;
  }
  if (incoming.updatedAtMs != null && authoritative.updatedAtMs != null) {
    return incoming.updatedAtMs < authoritative.updatedAtMs;
  }
  return false;
}

export function reconcileByVersionOrTimestamp(
  itemId: string,
  incomingPatch: Record<string, unknown>,
  incomingMeta: { source: OrderItemSyncSource; updatedAtMs?: number | null }
): OrderItemSyncEntry | null {
  return upsertOrderItemPatch(itemId, incomingPatch, incomingMeta.source, {
    updatedAtMs: incomingMeta.updatedAtMs ?? parseUpdatedAtMs(incomingPatch.updatedAt),
    suppressNotify: incomingMeta.source === "background",
  });
}

export function upsertOrderItemPatch(
  itemId: string,
  patch: Record<string, unknown>,
  source: OrderItemSyncSource,
  options?: {
    pendingAction?: OrderItemLifecycleAction | null;
    updatedAtMs?: number | null;
    suppressNotify?: boolean;
  }
): OrderItemSyncEntry | null {
  const existing = entries.get(itemId);
  const incomingStatus = extractStatus(patch, existing?.status);
  const incomingUpdatedAtMs =
    options?.updatedAtMs ?? parseUpdatedAtMs(patch.updatedAt) ?? existing?.updatedAtMs ?? null;

  if (existing && source === "background") {
    if (
      preventStaleOverwrite(existing, {
        status: incomingStatus,
        updatedAtMs: incomingUpdatedAtMs,
      })
    ) {
      return null;
    }
  }

  const nextSequence = source === "background" ? existing?.mutationSequence ?? 0 : ++globalMutationSequence;
  const localMutationSequence =
    source === "background" ? existing?.localMutationSequence ?? 0 : globalMutationSequence;

  const entry: OrderItemSyncEntry = {
    itemId,
    patch: patchForItemProjection({ ...(existing?.patch ?? {}), ...patch }),
    status: incomingStatus || existing?.status || "",
    lifecycleState: extractLifecycleState(patch) ?? existing?.lifecycleState,
    mutationSequence: nextSequence,
    localMutationSequence,
    updatedAtMs: incomingUpdatedAtMs,
    receivedAtMs: Date.now(),
    source,
    pendingAction:
      options?.pendingAction !== undefined ? options.pendingAction : existing?.pendingAction ?? null,
  };

  entries.set(itemId, entry);

  if (!options?.suppressNotify && source !== "background") {
    scheduleNotifyListeners(itemId);
    broadcastOrderItemUpdate(entry);
  }

  return entry;
}

export function rollbackOrderItemPatch(itemId: string, previousStatus: string): void {
  clearOrderItemPending(itemId);
  if (!previousStatus) {
    entries.delete(itemId);
    scheduleNotifyListeners(itemId);
    return;
  }
  upsertOrderItemPatch(itemId, { status: previousStatus }, "post");
}

function walkOrderItems(order: unknown, visit: (item: Record<string, unknown>) => void): void {
  if (!order || typeof order !== "object") return;
  const items = (order as Record<string, unknown>).items;
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (item && typeof item === "object") visit(item as Record<string, unknown>);
  }
}

function walkPayloadItems(payload: unknown, visit: (item: Record<string, unknown>) => void): void {
  if (payload == null) return;
  if (Array.isArray(payload)) {
    for (const order of payload) walkOrderItems(order, visit);
    return;
  }
  walkOrderItems(payload, visit);
}

/** Silent store refresh from server GET — call before setState, never from merge. */
export function reconcileServerPayloadIntoStore(payload: unknown): void {
  walkPayloadItems(payload, (item) => {
    const itemId = String(item.id ?? "");
    if (!itemId) return;
    upsertOrderItemPatch(
      itemId,
      {
        status: item.status,
        lifecycleState: item.lifecycleState,
        updatedAt: item.updatedAt,
      },
      "background",
      {
        updatedAtMs: parseUpdatedAtMs(item.updatedAt),
        suppressNotify: true,
      }
    );
  });
}

/** Ingest server GET payload: update store silently, return immutable merged view. */
export function ingestServerOrderPayload<T>(payload: T): T {
  if (payload == null) return payload;
  reconcileServerPayloadIntoStore(payload);
  return mergeOrderPayload(payload);
}

function applySnapshotToItem(item: Record<string, unknown>): Record<string, unknown> {
  const itemId = String(item.id ?? "");
  if (!itemId) return { ...item };

  const snap = getOrderItemSnapshot(itemId);
  if (!snap) return { ...item };

  const incomingStatus = normalizeOrderItemStatus(String(item.status ?? ""));
  const incomingUpdatedAtMs = parseUpdatedAtMs(item.updatedAt);

  const overlay = (): Record<string, unknown> => ({
    ...item,
    ...snap.patch,
    status: snap.status,
    ...(snap.lifecycleState ? { lifecycleState: snap.lifecycleState } : {}),
  });

  if (snap.source === "optimistic" || snap.source === "post" || snap.source === "remote") {
    if (preventStaleOverwrite(snap, { status: incomingStatus, updatedAtMs: incomingUpdatedAtMs })) {
      return overlay();
    }
    if (incomingUpdatedAtMs == null || snap.updatedAtMs == null) {
      return overlay();
    }
    if (incomingUpdatedAtMs <= snap.updatedAtMs) {
      return overlay();
    }
  }

  if (preventStaleOverwrite(snap, { status: incomingStatus, updatedAtMs: incomingUpdatedAtMs })) {
    return overlay();
  }

  return { ...item };
}

function patchOrderCollection(order: unknown): unknown {
  if (!order || typeof order !== "object") return order;
  const o = order as Record<string, unknown>;
  if (!Array.isArray(o.items)) return { ...o };
  return {
    ...o,
    items: o.items.map((item) => {
      if (!item || typeof item !== "object") return item;
      return applySnapshotToItem(item as Record<string, unknown>);
    }),
  };
}

/** Read-only projection of store state onto orders payload. */
export function mergeOrderPayload<T>(orders: T): T {
  if (orders == null) return orders;
  if (Array.isArray(orders)) {
    return orders.map((entry) => patchOrderCollection(entry)) as T;
  }
  return patchOrderCollection(orders) as T;
}

/** Read-only projection for lab/radiology worklist queue rows. */
export function mergeWorklistPayload<T>(queue: T): T {
  return mergeOrderPayload(queue);
}

export function broadcastOrderItemUpdate(entry: OrderItemSyncEntry): void {
  if (typeof window === "undefined") return;
  getBroadcastChannel()?.postMessage(entry);
}

function applyRemoteEntry(entry: OrderItemSyncEntry): void {
  const existing = entries.get(entry.itemId);
  if (existing && existing.localMutationSequence >= entry.localMutationSequence) return;
  entries.set(entry.itemId, { ...entry, source: "remote" });
  scheduleNotifyListeners(entry.itemId);
}

export function initOrderStateSyncBroadcast(): () => void {
  if (typeof window === "undefined" || broadcastInitialized) return () => {};
  broadcastInitialized = true;

  const channel = getBroadcastChannel();
  const onMessage = (event: MessageEvent<OrderItemSyncEntry>) => {
    if (event.data?.itemId) applyRemoteEntry(event.data);
  };
  channel?.addEventListener("message", onMessage);

  return () => {
    channel?.removeEventListener("message", onMessage);
    broadcastInitialized = false;
  };
}

if (typeof window !== "undefined") {
  initOrderStateSyncBroadcast();
}
