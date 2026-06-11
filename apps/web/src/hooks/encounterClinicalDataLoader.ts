import { apiFetch } from "@/lib/apiClient";
import { fetchMedicationPassQueue } from "@/lib/medicationPassQueueApi";
import { getPendingCreateOrdersForEncounter, mergeOrders } from "@/lib/offline/pendingEncounterOrders";
import { getPendingMedicationAdminsFromQueue } from "@/lib/pendingMedicationAdminsFromQueue";
import {
  createEncounterClinicalDataPerfCounters,
  perfClinicalDataLog,
  type EncounterClinicalDataPerfCounters,
} from "./encounterClinicalDataPerf";
import type { EncounterClinicalRefreshScope } from "./encounterClinicalDataTypes";

type InFlightEntry = { promise: Promise<unknown>; reused: boolean };

const inFlightByKey = new Map<string, InFlightEntry>();

/** Test hook — reset module dedupe state between tests. */
export function resetEncounterClinicalDataLoaderForTests(): void {
  inFlightByKey.clear();
}

function dedupeKey(facilityId: string, encounterId: string, scope: EncounterClinicalRefreshScope): string {
  return `${facilityId}:${encounterId}:${scope}`;
}

async function dedupedFetch<T>(
  key: string,
  counters: EncounterClinicalDataPerfCounters,
  counterStarted: keyof EncounterClinicalDataPerfCounters,
  counterReused: keyof EncounterClinicalDataPerfCounters,
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const existing = inFlightByKey.get(key);
  if (existing) {
    counters[counterReused] += 1;
    perfClinicalDataLog(`${label} reused in-flight fetch`, { key });
    return existing.promise as Promise<T>;
  }
  counters[counterStarted] += 1;
  perfClinicalDataLog(`${label} fetch started`, { key });
  const promise = fn().finally(() => {
    inFlightByKey.delete(key);
  });
  inFlightByKey.set(key, { promise, reused: false });
  return promise;
}

export type FetchEncounterOrdersResult = {
  orders: unknown[];
};

export async function fetchEncounterOrdersBundle(input: {
  facilityId: string;
  encounterId: string;
  counters?: EncounterClinicalDataPerfCounters;
}): Promise<FetchEncounterOrdersResult> {
  const counters = input.counters ?? createEncounterClinicalDataPerfCounters();
  const key = dedupeKey(input.facilityId, input.encounterId, "orders");
  return dedupedFetch(key, counters, "ordersFetchStarted", "ordersFetchReused", "orders", async () => {
    const [pendingOrders, serverOrders] = await Promise.all([
      getPendingCreateOrdersForEncounter(input.facilityId, input.encounterId).catch(
        () => [] as Record<string, unknown>[]
      ),
      apiFetch(`/encounters/${input.encounterId}/orders`, { facilityId: input.facilityId }),
    ]);
    const orders = mergeOrders(Array.isArray(serverOrders) ? serverOrders : [], pendingOrders);
    return { orders };
  });
}

export type FetchEncounterMarBundleResult = {
  medicationAdministrations: unknown[];
};

export async function fetchEncounterMarBundle(input: {
  facilityId: string;
  encounterId: string;
  pendingSyncFirstName: string;
  pendingSyncLastName: string;
  counters?: EncounterClinicalDataPerfCounters;
}): Promise<FetchEncounterMarBundleResult> {
  const counters = input.counters ?? createEncounterClinicalDataPerfCounters();
  const key = dedupeKey(input.facilityId, input.encounterId, "mar");
  return dedupedFetch(key, counters, "marFetchStarted", "marFetchReused", "medication-administrations", async () => {
    const [pendingAdmins, serverAdmins] = await Promise.all([
      getPendingMedicationAdminsFromQueue(
        input.facilityId,
        input.encounterId,
        input.pendingSyncFirstName,
        input.pendingSyncLastName
      ).catch(() => [] as unknown[]),
      apiFetch(`/encounters/${input.encounterId}/medication-administrations`, {
        facilityId: input.facilityId,
      }),
    ]);
    const medicationAdministrations = [
      ...(Array.isArray(serverAdmins) ? serverAdmins : []),
      ...(Array.isArray(pendingAdmins) ? pendingAdmins : []),
    ];
    return { medicationAdministrations };
  });
}

export type FetchEncounterOrderEventsResult = {
  orderEvents: unknown[];
};

export async function fetchEncounterOrderEventsBundle(input: {
  facilityId: string;
  encounterId: string;
  counters?: EncounterClinicalDataPerfCounters;
}): Promise<FetchEncounterOrderEventsResult> {
  const counters = input.counters ?? createEncounterClinicalDataPerfCounters();
  const key = dedupeKey(input.facilityId, input.encounterId, "orderEvents");
  return dedupedFetch(
    key,
    counters,
    "orderEventsFetchStarted",
    "orderEventsFetchReused",
    "order-events",
    async () => {
      const ev = await apiFetch(`/encounters/${input.encounterId}/order-events`, {
        facilityId: input.facilityId,
      });
      return { orderEvents: Array.isArray(ev) ? ev : [] };
    }
  );
}

export async function fetchEncounterPassQueueBundle(input: {
  facilityId: string;
  encounterId: string;
  counters?: EncounterClinicalDataPerfCounters;
}) {
  const counters = input.counters ?? createEncounterClinicalDataPerfCounters();
  const key = dedupeKey(input.facilityId, input.encounterId, "passQueue");
  return dedupedFetch(key, counters, "passQueueFetchStarted", "passQueueFetchReused", "pass-queue", async () => {
    return fetchMedicationPassQueue(input.facilityId, {
      encounterId: input.encounterId,
      includeUpcoming: true,
    });
  });
}
