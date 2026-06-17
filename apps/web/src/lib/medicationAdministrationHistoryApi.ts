import { apiFetch } from "@/lib/apiClient";
import type { MedicationAdministrationHistoryEntry } from "@medora/shared";

export type { MedicationAdministrationHistoryEntry };

export type FetchMedicationAdministrationHistoryOptions = {
  limit?: number;
  lookbackDays?: number;
  eventType?: string;
  orderItemId?: string;
};

export async function fetchMedicationAdministrationHistory(
  encounterId: string,
  facilityId: string,
  options: FetchMedicationAdministrationHistoryOptions = {}
): Promise<MedicationAdministrationHistoryEntry[]> {
  const params = new URLSearchParams();
  if (options.limit != null) params.set("limit", String(options.limit));
  if (options.lookbackDays != null) params.set("lookbackDays", String(options.lookbackDays));
  if (options.eventType?.trim()) params.set("eventType", options.eventType.trim());
  if (options.orderItemId?.trim()) params.set("orderItemId", options.orderItemId.trim());

  const query = params.toString();
  const path = `/encounters/${encounterId}/medication-administration-history${query ? `?${query}` : ""}`;
  const rows = await apiFetch(path, { facilityId });
  return Array.isArray(rows) ? (rows as MedicationAdministrationHistoryEntry[]) : [];
}
