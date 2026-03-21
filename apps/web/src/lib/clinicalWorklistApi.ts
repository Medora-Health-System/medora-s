import { apiFetch } from "./apiClient";

/** Open encounters for nursing/provider worklists (same source as trackboard). */
export async function fetchOpenEncounters(facilityId: string): Promise<any[]> {
  const data = await apiFetch("/trackboard?status=OPEN", { facilityId });
  return Array.isArray(data) ? data : [];
}
