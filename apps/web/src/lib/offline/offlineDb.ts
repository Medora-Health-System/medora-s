import type { OfflineStoreName } from "./offlineTypes";

const DB_NAME = "medora-offline-v1";
const DB_VERSION = 1;

const STORES: OfflineStoreName[] = [
  "catalog_medications",
  "catalog_lab",
  "catalog_imaging",
  "patient_summaries",
  "encounter_summaries",
  "latest_vitals",
  "followups",
  "sync_queue",
];

let dbPromise: Promise<IDBDatabase> | null = null;

function ensureBrowser() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    throw new Error("IndexedDB indisponible.");
  }
}

export function openOfflineDb(): Promise<IDBDatabase> {
  ensureBrowser();
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) {
          db.createObjectStore(s, { keyPath: "localKey" });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Erreur IndexedDB"));
  });
  return dbPromise;
}

export async function idbGet<T>(store: OfflineStoreName, key: string): Promise<T | null> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("Lecture IndexedDB impossible"));
  });
}

export async function idbSet<T extends { localKey: string }>(store: OfflineStoreName, value: T): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Écriture IndexedDB impossible"));
  });
}

export async function idbDelete(store: OfflineStoreName, key: string): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Suppression IndexedDB impossible"));
  });
}

export async function idbList<T>(store: OfflineStoreName): Promise<T[]> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error("Lecture IndexedDB impossible"));
  });
}
