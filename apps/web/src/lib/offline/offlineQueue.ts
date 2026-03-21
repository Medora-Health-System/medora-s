import { idbDelete, idbList, idbSet } from "./offlineDb";
import type { OfflineQueueItem, OfflineQueueItemType } from "./offlineTypes";
type QueueRow = OfflineQueueItem & { localKey: string };

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function enqueueOfflineAction(
  type: OfflineQueueItemType,
  endpoint: string,
  method: "POST" | "PATCH" | "PUT",
  payload: unknown,
  facilityId: string
): Promise<OfflineQueueItem> {
  const item: QueueRow = {
    id: newId(),
    localKey: "",
    type,
    endpoint,
    method,
    payload,
    facilityId,
    createdAt: new Date().toISOString(),
    status: "pending",
    retryCount: 0,
    lastError: null,
  };
  item.localKey = item.id;
  await idbSet("sync_queue", item);
  return item;
}

export async function listQueueItems(): Promise<OfflineQueueItem[]> {
  const rows = await idbList<(OfflineQueueItem & { localKey?: string })>("sync_queue");
  return rows
    .map((r) => ({ ...r, id: r.id || r.localKey || "" }))
    .filter((r) => Boolean(r.id))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function patchQueueItem(
  id: string,
  patch: Partial<OfflineQueueItem>
): Promise<void> {
  const rows = await listQueueItems();
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  await idbSet("sync_queue", {
    ...row,
    ...patch,
    localKey: id,
  } as QueueRow);
}

export async function removeQueueItem(id: string): Promise<void> {
  await idbDelete("sync_queue", id);
}
