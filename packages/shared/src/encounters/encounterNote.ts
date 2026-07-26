import { z } from "zod";
import { ENCOUNTER_NOTE_BODY_MAX, ENCOUNTER_NOTE_TYPES } from "./encounterNoteTypes.js";

export const encounterNoteCreateDtoSchema = z.object({
  noteType: z.enum(ENCOUNTER_NOTE_TYPES),
  body: z.string().trim().min(1).max(ENCOUNTER_NOTE_BODY_MAX),
});

export type EncounterNoteCreateDto = z.infer<typeof encounterNoteCreateDtoSchema>;

/** Default note type from primary facility role code. */
export function defaultEncounterNoteTypeForRole(roleCode: string | null | undefined): (typeof ENCOUNTER_NOTE_TYPES)[number] {
  const code = String(roleCode ?? "").trim().toUpperCase();
  if (code === "PROVIDER" || code === "ADMIN") return "PROVIDER";
  if (code === "RN") return "NURSING";
  if (
    code === "LAB" ||
    code === "RADIOLOGY" ||
    code === "PHARMACY" ||
    code === "PATIENT_CARE_TECH"
  ) {
    return "TECHNICIAN";
  }
  return "OTHER";
}

export function encounterNotePreview(body: string, max = 160): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function filterEncounterNotesByType<T extends { noteType: string }>(
  notes: readonly T[],
  filter: "ALL" | (typeof ENCOUNTER_NOTE_TYPES)[number]
): T[] {
  if (filter === "ALL") return [...notes];
  return notes.filter((n) => n.noteType === filter);
}

export function sortEncounterNotesNewestFirst<T extends { createdAt: string }>(notes: readonly T[]): T[] {
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
