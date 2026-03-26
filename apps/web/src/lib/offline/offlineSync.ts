import { listQueueItems, patchQueueItem, removeQueueItem } from "./offlineQueue";
import type { ConnectivityStatus } from "./offlineTypes";

const OFFLINE_SYNC_EVENT = "medora:offline-sync-status";
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

export async function processOfflineQueueOnce(): Promise<void> {
  if (syncing || typeof window === "undefined" || !navigator.onLine) return;
  syncing = true;
  try {
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
        await removeQueueItem(item.id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Échec de synchronisation";
        await patchQueueItem(item.id, {
          status: "failed",
          retryCount: (item.retryCount || 0) + 1,
          lastError: msg,
        });
      }
    }
    const remaining = await getQueuePendingCount();
    emitStatus(remaining > 0 ? "degraded" : "online", remaining);
  } finally {
    syncing = false;
  }
}
