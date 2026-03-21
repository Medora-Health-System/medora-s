import { listQueueItems, patchQueueItem, removeQueueItem } from "./offlineQueue";
import type { ConnectivityStatus } from "./offlineTypes";

const OFFLINE_SYNC_EVENT = "medora:offline-sync-status";
let syncing = false;

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
    const active = items.filter((i) => i.status === "pending" || i.status === "failed");
    if (!active.length) {
      emitStatus("online", 0);
      return;
    }
    emitStatus("syncing", active.length);
    for (const item of active) {
      await patchQueueItem(item.id, { status: "syncing" });
      try {
        const res = await fetch(`/api/backend${item.endpoint}`, {
          method: item.method,
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-facility-id": item.facilityId,
          },
          body: JSON.stringify(item.payload ?? {}),
        });
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
