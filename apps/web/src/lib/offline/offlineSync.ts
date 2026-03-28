import { listQueueItems, patchQueueItem, removeQueueItem } from "./offlineQueue";
import type { ConnectivityStatus, OfflineQueueItem } from "./offlineTypes";

const OFFLINE_SYNC_EVENT = "medora:offline-sync-status";
/** Cross-tab exclusive replay (Web Locks); same name in every tab/window. */
const OFFLINE_SYNC_LOCK_NAME = "medora-offline-sync";
let syncing = false;

/** Same 401 + POST /api/auth/refresh + one retry as apiFetch (avoids importing apiClient → circular dependency). */
async function replayQueueItemRequest(
  endpoint: string,
  method: string,
  facilityId: string,
  body: string
): Promise<Response> {
  const doFetch = () =>
    fetch(`/api/backend${endpoint}`, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-facility-id": facilityId,
      },
      body,
    });
  let attempt = 0;
  let response!: Response;
  while (attempt < 2) {
    response = await doFetch();
    if (response.status !== 401 || attempt === 1) break;
    const skipRefresh = endpoint.startsWith("/auth/") || endpoint.includes("/auth/");
    if (skipRefresh || typeof window === "undefined") break;
    const ref = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (!ref.ok) break;
    attempt++;
  }
  return response;
}

/** GET with same 401 + refresh + retry as replay (avoids importing apiFetch → circular dependency). */
async function fetchBackendGetJson(endpoint: string, facilityId: string): Promise<unknown | null> {
  const doFetch = () =>
    fetch(`/api/backend${endpoint}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-facility-id": facilityId,
      },
    });
  let attempt = 0;
  let response!: Response;
  while (attempt < 2) {
    response = await doFetch();
    if (response.status !== 401 || attempt === 1) break;
    const skipRefresh = endpoint.startsWith("/auth/") || endpoint.includes("/auth/");
    if (skipRefresh || typeof window === "undefined") break;
    const ref = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (!ref.ok) break;
    attempt++;
  }
  if (!response.ok) return null;
  const text = await response.text().catch(() => "");
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function findOrderItemInWorklistOrders(
  orders: unknown,
  itemId: string
): { status?: string; pharmacyDispenseRecord?: unknown | null } | null {
  if (!Array.isArray(orders)) return null;
  for (const order of orders) {
    if (!order || typeof order !== "object") continue;
    const items = (order as { items?: unknown[] }).items;
    if (!Array.isArray(items)) continue;
    for (const it of items) {
      if (!it || typeof it !== "object") continue;
      if ((it as { id?: string }).id === itemId) {
        return it as { status?: string; pharmacyDispenseRecord?: unknown | null };
      }
    }
  }
  return null;
}

const ACK_ITEM_PATH = /^\/orders\/items\/([^/]+)\/acknowledge$/;

/**
 * Returns true when the queued action should not be replayed (stale / duplicate).
 * If server state cannot be read, returns false so normal replay still runs.
 */
async function shouldSkipStaleReplay(queueItem: OfflineQueueItem): Promise<boolean> {
  const facilityId = queueItem.facilityId;
  const endpoint = queueItem.endpoint;

  const ackMatch = queueItem.method === "POST" ? ACK_ITEM_PATH.exec(endpoint) : null;
  if (ackMatch) {
    const itemId = ackMatch[1];
    const [lab, rad, pharma] = await Promise.all([
      fetchBackendGetJson("/worklists/lab", facilityId),
      fetchBackendGetJson("/worklists/radiology", facilityId),
      fetchBackendGetJson("/worklists/pharmacy", facilityId),
    ]);
    if (lab === null || rad === null || pharma === null) return false;
    const found =
      findOrderItemInWorklistOrders(lab, itemId) ??
      findOrderItemInWorklistOrders(rad, itemId) ??
      findOrderItemInWorklistOrders(pharma, itemId);
    if (!found) return true;
    const s = found.status ?? "";
    if (s !== "PLACED" && s !== "PENDING" && s !== "SIGNED") return true;
    return false;
  }

  if (queueItem.method === "POST" && endpoint === "/pharmacy/dispenses/record-order") {
    const payload =
      queueItem.payload && typeof queueItem.payload === "object" && !Array.isArray(queueItem.payload)
        ? (queueItem.payload as Record<string, unknown>)
        : {};
    const orderItemId =
      typeof payload.orderItemId === "string" ? payload.orderItemId : null;
    if (!orderItemId) return true;
    const pharma = await fetchBackendGetJson("/worklists/pharmacy", facilityId);
    if (pharma === null) return false;
    const found = findOrderItemInWorklistOrders(pharma, orderItemId);
    if (!found) return true;
    if (found.pharmacyDispenseRecord) return true;
    return false;
  }

  return false;
}

function emitStatus(status: ConnectivityStatus, pendingCount: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OFFLINE_SYNC_EVENT, {
      detail: { status, pendingCount },
    })
  );
}

export function getOfflineSyncEventName() {
  return OFFLINE_SYNC_EVENT;
}

export async function getQueuePendingCount(): Promise<number> {
  const rows = await listQueueItems();
  return rows.filter((r) => r.status === "pending" || r.status === "failed" || r.status === "syncing").length;
}

async function runOfflineQueueReplayBody(): Promise<void> {
  const items = await listQueueItems();
  for (const row of items) {
    if (row.status === "syncing") {
      await patchQueueItem(row.id, {
        status: "pending",
        lastError: null,
      });
    }
  }
  const itemsAfterReset = await listQueueItems();
  const active = itemsAfterReset.filter((i) => i.status === "pending" || i.status === "failed");
  if (!active.length) {
    emitStatus("online", 0);
    return;
  }
  emitStatus("syncing", active.length);
  for (const item of active) {
    await patchQueueItem(item.id, { status: "syncing" });
    try {
      const skip = await shouldSkipStaleReplay(item);
      if (skip) {
        console.warn("Replay skipped: stale or invalid state");
        await removeQueueItem(item.id);
        continue;
      }
      const res = await replayQueueItemRequest(
        item.endpoint,
        item.method,
        item.facilityId,
        JSON.stringify(item.payload ?? {})
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Échec de synchronisation";
      await patchQueueItem(item.id, {
        status: "failed",
        retryCount: (item.retryCount || 0) + 1,
        lastError: msg,
      });
      continue;
    }
    try {
      await removeQueueItem(item.id);
    } catch (removeErr: unknown) {
      const msg = removeErr instanceof Error ? removeErr.message : "Échec suppression locale";
      try {
        await patchQueueItem(item.id, {
          status: "synced",
          lastError: `Nettoyage local : ${msg}`,
        });
      } catch {
        try {
          await patchQueueItem(item.id, { status: "synced", lastError: null });
        } catch {
          /* IndexedDB indisponible ou ligne absente — évite de marquer failed comme erreur serveur */
        }
      }
    }
  }
  const remaining = await getQueuePendingCount();
  emitStatus(remaining > 0 ? "degraded" : "online", remaining);
}

export async function processOfflineQueueOnce(): Promise<void> {
  if (syncing || typeof window === "undefined" || !navigator.onLine) return;

  const lockManager = typeof navigator !== "undefined" && navigator.locks ? navigator.locks : null;

  if (lockManager) {
    await lockManager.request(OFFLINE_SYNC_LOCK_NAME, { mode: "exclusive" }, async () => {
      if (typeof window === "undefined" || !navigator.onLine) return;
      if (syncing) return;
      syncing = true;
      try {
        await runOfflineQueueReplayBody();
      } finally {
        syncing = false;
      }
    });
    return;
  }

  syncing = true;
  try {
    await runOfflineQueueReplayBody();
  } finally {
    syncing = false;
  }
}
