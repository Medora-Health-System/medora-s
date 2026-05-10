import { apiFetch } from "./apiClient";
import type { HospitalisationBoardEncounterRow } from "./hospitalisationBoardTypes";
import { getPendingCreateOrdersForEncounter, mergeOrders } from "@/lib/offline/pendingEncounterOrders";

/** Open encounters for nursing/provider worklists (same source as trackboard). */
export async function fetchOpenEncounters(facilityId: string): Promise<any[]> {
  const data = await apiFetch("/trackboard?status=OPEN", { facilityId });
  return Array.isArray(data) ? data : [];
}

/**
 * Phase 10A — operational ER ownership self-assignment endpoints.
 * Returns the updated encounter row from the API on success; throws on 4xx/5xx
 * so the caller can surface the user-facing message.
 */
export async function assignProviderSelf(facilityId: string, encounterId: string): Promise<unknown> {
  return apiFetch(`/encounters/${encounterId}/assign-provider/me`, {
    method: "POST",
    facilityId,
    body: JSON.stringify({}),
  });
}

export async function assignNurseSelf(facilityId: string, encounterId: string): Promise<unknown> {
  return apiFetch(`/encounters/${encounterId}/assign-nurse/me`, {
    method: "POST",
    facilityId,
    body: JSON.stringify({}),
  });
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

/** Order lifecycle event stream for one encounter (descending by performedAt). */
export async function fetchOrderEventsForEncounter(
  facilityId: string,
  encounterId: string
): Promise<unknown[]> {
  const data = await apiFetch(`/encounters/${encounterId}/order-events`, { facilityId });
  return Array.isArray(data) ? data : [];
}

/** Open inpatient encounters (hospitalisation board — no today-only filter on API). */
export async function fetchHospitalisationEncounters(
  facilityId: string
): Promise<HospitalisationBoardEncounterRow[]> {
  const data = await apiFetch("/trackboard?status=OPEN&type=INPATIENT", { facilityId });
  return Array.isArray(data) ? (data as HospitalisationBoardEncounterRow[]) : [];
}
