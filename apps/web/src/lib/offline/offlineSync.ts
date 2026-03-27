import { listQueueItems, patchQueueItem, removeQueueItem } from "./offlineQueue";
import { idbGet, idbSet } from "./offlineDb";
import type { ConnectivityStatus, OfflineCacheRecord } from "./offlineTypes";

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

/** Après replay réussi de create_patient : mappe id temporaire client → id serveur (Phase 2 offline). */
async function persistTempPatientIdAfterCreatePatientReplay(
  item: { type: string; payload: unknown; facilityId: string },
  res: Response
): Promise<void> {
  if (item.type !== "create_patient") return;
  const raw = item.payload;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return;
  const clientTempId = (raw as Record<string, unknown>).clientTempId;
  if (typeof clientTempId !== "string" || !clientTempId.trim()) return;

  const text = await res.text();
  let realId: string | null = null;
  try {
    const trimmed = text.trim();
    if (!trimmed) return;
    const json = JSON.parse(trimmed) as unknown;
    if (json !== null && typeof json === "object" && !Array.isArray(json) && "id" in json) {
      const id = (json as { id: unknown }).id;
      if (typeof id === "string" && id.length > 0) realId = id;
    }
  } catch {
    return;
  }
  if (!realId) return;

  const tempKey = `temp-${clientTempId.trim()}`;
  const row: OfflineCacheRecord<{ realPatientId: string }> = {
    localKey: tempKey,
    updatedAt: new Date().toISOString(),
    facilityId: item.facilityId,
    patientId: realId,
    data: { realPatientId: realId },
  };
  await idbSet("patient_summaries", row);
}

/** POST /patients/:id/encounters ou …/encounters/outpatient — aligné sur queueTypeForRequest (apiClient). */
const CREATE_ENCOUNTER_PATH_RE = /^\/patients\/([^/]+)(\/encounters(?:\/outpatient)?)$/;

/**
 * Pour create_encounter avec patient temporaire : réécrit l’URL avec l’id serveur si la map existe.
 * Si patient temp et map absente : différer (le patient n’est pas encore synchronisé).
 */
async function resolveCreateEncounterEndpointForReplay(item: {
  type: string;
  endpoint: string;
}): Promise<{ endpoint: string } | { defer: true }> {
  if (item.type !== "create_encounter") {
    return { endpoint: item.endpoint };
  }
  const m = item.endpoint.match(CREATE_ENCOUNTER_PATH_RE);
  if (!m) {
    return { endpoint: item.endpoint };
  }
  const patientSegment = m[1];
  const suffix = m[2];
  if (!patientSegment.startsWith("temp-")) {
    return { endpoint: item.endpoint };
  }
  const row = await idbGet<OfflineCacheRecord<{ realPatientId: string }>>("patient_summaries", patientSegment);
  const realId = row?.patientId ?? row?.data?.realPatientId;
  if (typeof realId !== "string" || !realId) {
    return { defer: true };
  }
  return { endpoint: `/patients/${realId}${suffix}` };
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
      const resolved = await resolveCreateEncounterEndpointForReplay(item);
      if ("defer" in resolved) {
        await patchQueueItem(item.id, { status: "pending", lastError: null });
        continue;
      }
      const endpointToReplay = resolved.endpoint;
      const res = await replayQueueItemRequest(
        endpointToReplay,
        item.method,
        item.facilityId,
        JSON.stringify(item.payload ?? {})
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      if (item.type === "create_patient") {
        try {
          await persistTempPatientIdAfterCreatePatientReplay(item, res);
        } catch {
          /* persistance best-effort — ne bloque pas la file */
        }
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
