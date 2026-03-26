import { apiFetch } from "./apiClient";

/** Open encounters for nursing/provider worklists (same source as trackboard). */
export async function fetchOpenEncounters(facilityId: string): Promise<any[]> {
  const data = await apiFetch("/trackboard?status=OPEN", { facilityId });
  return Array.isArray(data) ? data : [];
}

/** Orders for one encounter (same payload as OrdersTab). */
export async function fetchOrdersForEncounter(facilityId: string, encounterId: string): Promise<unknown[]> {
  const data = await apiFetch(`/encounters/${encounterId}/orders`, { facilityId });
  return Array.isArray(data) ? data : [];
}

/** Open inpatient encounters (hospitalisation board — no today-only filter on API). */
export async function fetchHospitalisationEncounters(facilityId: string): Promise<any[]> {
  const data = await apiFetch("/trackboard?status=OPEN&type=INPATIENT", { facilityId });
  return Array.isArray(data) ? data : [];
}
