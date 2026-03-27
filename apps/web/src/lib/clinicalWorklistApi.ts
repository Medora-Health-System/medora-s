import { apiFetch } from "./apiClient";
import { getPendingCreateOrdersForEncounter, mergeOrders } from "@/lib/offline/pendingEncounterOrders";
import { getPendingCreateEncountersForFacility, mergeEncounters } from "@/lib/offline/pendingTrackboardEncounters";

/** Open encounters for nursing/provider worklists (same source as trackboard). */
export async function fetchOpenEncounters(facilityId: string): Promise<any[]> {
  let serverRows: unknown[] = [];
  try {
    const data = await apiFetch("/trackboard?status=OPEN", { facilityId });
    serverRows = Array.isArray(data) ? data : [];
  } catch {
    serverRows = [];
  }
  const pendingRows = await getPendingCreateEncountersForFacility(facilityId).catch(() => []);
  return mergeEncounters(serverRows, pendingRows) as any[];
}

/** Orders for one encounter (same payload as OrdersTab). */
export async function fetchOrdersForEncounter(facilityId: string, encounterId: string): Promise<unknown[]> {
  const pending = await getPendingCreateOrdersForEncounter(facilityId, encounterId).catch(() => [] as Record<string, unknown>[]);
  try {
    const data = await apiFetch(`/encounters/${encounterId}/orders`, { facilityId });
    const server = Array.isArray(data) ? data : [];
    return mergeOrders(server, pending);
  } catch {
    return mergeOrders([], pending);
  }
}

/** Open inpatient encounters (hospitalisation board — no today-only filter on API). */
export async function fetchHospitalisationEncounters(facilityId: string): Promise<any[]> {
  const data = await apiFetch("/trackboard?status=OPEN&type=INPATIENT", { facilityId });
  return Array.isArray(data) ? data : [];
}
