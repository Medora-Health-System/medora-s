import { apiFetch } from "./apiClient";
import type {
  EncounterNoteAmendDto,
  EncounterNoteCreateDto,
  EncounterNoteType,
  EncounterNoteVoidDto,
} from "@medora/shared";

export type EncounterNoteRow = {
  id: string;
  encounterId: string;
  noteType: EncounterNoteType;
  body: string;
  authorDisplayName: string;
  authorRoleTitle: string;
  authorUserId: string;
  createdAt: string;
  legacy?: boolean;
  voidedAt: string | null;
  voidedByUserId: string | null;
  voidReasonCode: string | null;
  isAmendment: boolean;
  amendedFromNoteId: string | null;
  amendmentReason: string | null;
  requiresCosign: boolean;
  cosignedAt: string | null;
  cosignedByUserId: string | null;
  cosignRoleSnapshot: string | null;
};

export async function fetchEncounterNotes(
  encounterId: string,
  facilityId: string,
  noteType?: EncounterNoteType
): Promise<{ notes: EncounterNoteRow[] }> {
  const qs = noteType ? `?noteType=${encodeURIComponent(noteType)}` : "";
  return apiFetch(`/encounters/${encounterId}/notes${qs}`, {
    headers: { "x-facility-id": facilityId },
  }) as Promise<{
    notes: EncounterNoteRow[];
  }>;
}

export async function createEncounterNote(
  encounterId: string,
  facilityId: string,
  body: EncounterNoteCreateDto
): Promise<EncounterNoteRow> {
  return apiFetch(`/encounters/${encounterId}/notes`, {
    method: "POST",
    headers: { "x-facility-id": facilityId },
    body: JSON.stringify(body),
  }) as Promise<EncounterNoteRow>;
}

export async function amendEncounterNote(
  encounterId: string,
  noteId: string,
  facilityId: string,
  body: EncounterNoteAmendDto
): Promise<EncounterNoteRow> {
  return apiFetch(`/encounters/${encounterId}/notes/${noteId}/amend`, {
    method: "POST",
    headers: { "x-facility-id": facilityId },
    body: JSON.stringify(body),
  }) as Promise<EncounterNoteRow>;
}

export async function voidEncounterNote(
  encounterId: string,
  noteId: string,
  facilityId: string,
  body: EncounterNoteVoidDto
): Promise<EncounterNoteRow> {
  return apiFetch(`/encounters/${encounterId}/notes/${noteId}/void`, {
    method: "POST",
    headers: { "x-facility-id": facilityId },
    body: JSON.stringify(body),
  }) as Promise<EncounterNoteRow>;
}

export async function cosignEncounterNote(
  encounterId: string,
  noteId: string,
  facilityId: string
): Promise<EncounterNoteRow> {
  return apiFetch(`/encounters/${encounterId}/notes/${noteId}/cosign`, {
    method: "POST",
    headers: { "x-facility-id": facilityId },
  }) as Promise<EncounterNoteRow>;
}
