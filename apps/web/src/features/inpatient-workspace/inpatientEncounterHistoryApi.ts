/**
 * INP.HIST.1A — client for lightweight inpatient encounter archive.
 */

import { apiFetch } from "@/lib/apiClient";
import { inpatientActiveWorkspacePath } from "./inpatientWorkspacePaths";

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

/** Closed/cancelled → enterprise read-only viewer; OPEN → Summary (read-only projection). */
export function inpatientHistoryRecordHref(row: {
  id: string;
  status: string;
}): string {
  const status = String(row.status ?? "").toUpperCase();
  if (status === "CLOSED" || status === "CANCELLED") {
    return `/app/encounters/${encodeURIComponent(row.id)}?from=inpatientAllEncounters`;
  }
  return `${inpatientActiveWorkspacePath(row.id)}?section=summary`;
}

export function inpatientHistoryEdRecordHref(edEncounterId: string): string {
  return `/app/emergency/chart/${encodeURIComponent(edEncounterId)}`;
}

export async function fetchInpatientEncountersArchive(params: {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<InpatientEncountersArchiveResponse> {
  const q = new URLSearchParams();
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.status?.trim()) q.set("status", params.status.trim());
  if (params.startDate?.trim()) q.set("startDate", params.startDate.trim());
  if (params.endDate?.trim()) q.set("endDate", params.endDate.trim());
  q.set("limit", String(params.limit ?? INPATIENT_ALL_ENCOUNTERS_DEFAULT_LIMIT));
  q.set("offset", String(params.offset ?? 0));
  return apiFetch(`/inpatient-operations/encounters/archive?${q.toString()}`);
}
