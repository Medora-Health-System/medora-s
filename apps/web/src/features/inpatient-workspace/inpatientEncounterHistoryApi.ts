/**
 * INP.HIST.1A — client for CLOSED inpatient encounter archive.
 */

import { apiFetch } from "@/lib/apiClient";
import { fetchOrdersForEncounter } from "@/lib/clinicalWorklistApi";

export const INPATIENT_ALL_ENCOUNTERS_DEFAULT_LIMIT = 50;

export type InpatientEncountersArchiveApiRow = {
  id: string;
  status: string;
  type: string;
  createdAt: string;
  admittedAt: string | null;
  dischargedAt: string | null;
  roomLabel: string | null;
  dateRangeLabel: string;
  encounterTypeLabel: string;
  courseSummary: string;
  dispositionLabel: string | null;
  originatingEdEncounterId: string | null;
  timelineIncomplete: boolean;
  patient: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    dob: string | null;
    mrn: string | null;
  } | null;
};

export type InpatientEncountersArchiveResponse = {
  rows: InpatientEncountersArchiveApiRow[];
  total: number;
  limit: number;
  offset: number;
};

export function inpatientAllEncountersPath(): string {
  return "/app/hospitalisation/inpatient?mode=allEncounters";
}

export function inpatientActivePatientsPath(): string {
  return "/app/hospitalisation/inpatient";
}

/**
 * Archive View Record → enterprise closed medical-record shell only.
 * Never routes to the live inpatient active workspace.
 */
export function inpatientHistoryRecordHref(row: { id: string; status?: string }): string {
  return `/app/encounters/${encodeURIComponent(row.id)}?from=inpatientAllEncounters`;
}

export function inpatientHistoryEdRecordHref(edEncounterId: string): string {
  return `/app/emergency/chart/${encodeURIComponent(edEncounterId)}`;
}

export async function fetchInpatientEncountersArchive(params: {
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<InpatientEncountersArchiveResponse> {
  const q = new URLSearchParams();
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.startDate?.trim()) q.set("startDate", params.startDate.trim());
  if (params.endDate?.trim()) q.set("endDate", params.endDate.trim());
  q.set("limit", String(params.limit ?? INPATIENT_ALL_ENCOUNTERS_DEFAULT_LIMIT));
  q.set("offset", String(params.offset ?? 0));
  return apiFetch(`/inpatient-operations/encounters/archive?${q.toString()}`);
}

/**
 * Load encounter + triage + orders for archive medical-record print.
 * Reuses the same canonical endpoints as inpatient Summary print inputs.
 * Does not hard-code empty orders when orders exist.
 */
export async function loadInpatientArchiveMedicalRecordPrintInputs(params: {
  facilityId: string;
  encounterId: string;
}): Promise<{
  encounter: Record<string, unknown>;
  triage: Record<string, unknown> | null;
  orders: Array<Record<string, unknown>>;
}> {
  const { facilityId, encounterId } = params;
  const encounter = (await apiFetch(`/encounters/${encodeURIComponent(encounterId)}`, {
    facilityId,
  })) as Record<string, unknown>;

  const [triageSettled, ordersSettled] = await Promise.allSettled([
    apiFetch(`/encounters/${encodeURIComponent(encounterId)}/triage`, { facilityId }),
    fetchOrdersForEncounter(facilityId, encounterId),
  ]);

  let triage: Record<string, unknown> | null = null;
  if (triageSettled.status === "fulfilled" && triageSettled.value) {
    const raw = triageSettled.value;
    triage =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : null;
  }

  const ordersRaw =
    ordersSettled.status === "fulfilled" && Array.isArray(ordersSettled.value)
      ? ordersSettled.value
      : [];
  const orders = ordersRaw.filter(
    (row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === "object" && !Array.isArray(row)
  );

  return { encounter, triage, orders };
}
