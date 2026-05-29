import { apiFetch } from "./apiClient";
import type { EncounterNoteCreateDto, EncounterNoteType } from "@medora/shared";

export type EncounterNoteRow = {
  id: string;
  encounterId: string;
  noteType: EncounterNoteType;
  body: string;
  authorDisplayName: string;
  authorRoleTitle: string;
  createdAt: string;
  legacy?: boolean;
};

export async function fetchEncounterNotes(
  encounterId: string,
  facilityId: string,
  noteType?: EncounterNoteType
): Promise<{ notes: EncounterNoteRow[] }> {
  const qs = noteType ? `?noteType=${encodeURIComponent(noteType)}` : "";
  return apiFetch(`/encounters/${encounterId}/notes${qs}`, { facilityId }) as Promise<{
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  }) as Promise<EncounterNoteRow>;
}
