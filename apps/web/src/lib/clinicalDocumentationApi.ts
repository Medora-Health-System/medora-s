import { apiFetch } from "./apiClient";
import type { ClinicalDocumentationEntryCreateDto } from "@medora/shared";

export type ClinicalDocumentationEntryRow = {
  id: string;
  encounterId: string;
  category: string;
  cardId: string;
  cardTitleEn: string;
  cardTitleFr: string;
  authorUserId: string;
  authorDisplayName: string;
  authorRoleTitle: string;
  createdAt: string;
  payloadJson: Record<string, unknown>;
  payloadSummary: Array<{ key: string; value: string }>;
  voidedAt: string | null;
  requiresWitnessSignature: boolean;
  witnessStatus: "NOT_REQUIRED" | "PENDING_WITNESS" | "WITNESSED";
  witnessedAt: string | null;
  witnessedByUserId: string | null;
  witnessDisplayName: string | null;
  witnessRoleTitle: string | null;
};

export async function fetchClinicalDocumentationEntries(
  encounterId: string,
  facilityId: string
): Promise<{ entries: ClinicalDocumentationEntryRow[] }> {
  return apiFetch(`/encounters/${encounterId}/clinical-documentation`, {
    headers: { "x-facility-id": facilityId },
  }) as Promise<{ entries: ClinicalDocumentationEntryRow[] }>;
}

export async function createClinicalDocumentationEntry(
  encounterId: string,
  facilityId: string,
  body: ClinicalDocumentationEntryCreateDto
): Promise<ClinicalDocumentationEntryRow> {
  return apiFetch(`/encounters/${encounterId}/clinical-documentation`, {
    method: "POST",
    headers: { "x-facility-id": facilityId },
    body: JSON.stringify(body),
  }) as Promise<ClinicalDocumentationEntryRow>;
}

export async function witnessClinicalDocumentationEntry(
  encounterId: string,
  entryId: string,
  facilityId: string
): Promise<ClinicalDocumentationEntryRow> {
  return apiFetch(`/encounters/${encounterId}/clinical-documentation/${entryId}/witness`, {
    method: "POST",
    headers: { "x-facility-id": facilityId },
  }) as Promise<ClinicalDocumentationEntryRow>;
}
