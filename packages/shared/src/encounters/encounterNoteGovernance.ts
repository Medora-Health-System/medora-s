import { z } from "zod";
import {
  ENCOUNTER_NOTE_BODY_MAX,
  ENCOUNTER_NOTE_TYPES,
  type EncounterNoteType,
} from "./encounterNoteTypes.js";

export const ENCOUNTER_NOTE_VOID_REASON_CODES = [
  "WRONG_PATIENT",
  "DUPLICATE_ENTRY",
  "ENTERED_IN_ERROR",
  "TRAINING_RECORD",
  "OTHER",
] as const;

export type EncounterNoteVoidReasonCode = (typeof ENCOUNTER_NOTE_VOID_REASON_CODES)[number];

export const encounterNoteAmendDtoSchema = z.object({
  body: z.string().trim().min(1).max(ENCOUNTER_NOTE_BODY_MAX),
  amendmentReason: z.string().trim().min(1).max(500),
});

export type EncounterNoteAmendDto = z.infer<typeof encounterNoteAmendDtoSchema>;

export const encounterNoteVoidDtoSchema = z.object({
  voidReasonCode: z.enum(ENCOUNTER_NOTE_VOID_REASON_CODES),
});

export type EncounterNoteVoidDto = z.infer<typeof encounterNoteVoidDtoSchema>;

/** Default cosign requirement by note type (facility override deferred). */
export function defaultRequiresCosignForNoteType(
  noteType: EncounterNoteType
): boolean {
  switch (noteType) {
    case "PROVIDER":
    case "NURSING":
      return false;
    case "TECHNICIAN":
    case "OTHER":
    default:
      return false;
  }
}

export type EncounterNoteGovernanceFields = {
  authorUserId: string;
  voidedAt: string | null;
  voidedByUserId: string | null;
  voidReasonCode: EncounterNoteVoidReasonCode | null;
  isAmendment: boolean;
  amendedFromNoteId: string | null;
  amendmentReason: string | null;
  requiresCosign: boolean;
  cosignedAt: string | null;
  cosignedByUserId: string | null;
  cosignRoleSnapshot: string | null;
};

export function encounterNotePendingCosign(
  note: Pick<EncounterNoteGovernanceFields, "requiresCosign" | "cosignedAt" | "voidedAt">
): boolean {
  return note.requiresCosign && !note.cosignedAt && !note.voidedAt;
}

/** Roles allowed to void or cosign encounter notes (authorized reviewers). */
export const ENCOUNTER_NOTE_REVIEWER_ROLE_CODES = ["PROVIDER", "ADMIN"] as const;

export function canReviewEncounterNotes(roleCodes: readonly string[]): boolean {
  const upper = new Set(roleCodes.map((c) => String(c).trim().toUpperCase()));
  return ENCOUNTER_NOTE_REVIEWER_ROLE_CODES.some((r) => upper.has(r));
}

export function canAmendEncounterNote(
  note: Pick<EncounterNoteGovernanceFields, "authorUserId" | "voidedAt"> & { legacy?: boolean },
  userId: string | undefined
): boolean {
  if (!userId || note.legacy || note.voidedAt) return false;
  return note.authorUserId === userId;
}

export function canVoidEncounterNote(
  note: Pick<EncounterNoteGovernanceFields, "voidedAt"> & { legacy?: boolean },
  roleCodes: readonly string[]
): boolean {
  if (note.legacy || note.voidedAt) return false;
  return canReviewEncounterNotes(roleCodes);
}

export function canCosignEncounterNote(
  note: Pick<EncounterNoteGovernanceFields, "requiresCosign" | "cosignedAt" | "voidedAt"> & {
    legacy?: boolean;
  },
  roleCodes: readonly string[]
): boolean {
  if (note.legacy || note.voidedAt || !note.requiresCosign || note.cosignedAt) return false;
  return canReviewEncounterNotes(roleCodes);
}

/** Map relational note row to legal chart / API shape. */
export function mapEncounterNoteForLegalChart(row: {
  id: string;
  noteType: string;
  body: string;
  authorUserId?: string;
  authorDisplayNameSnapshot?: string;
  authorDisplayName?: string;
  authorRoleSnapshot?: string;
  authorRoleTitle?: string;
  createdAt: Date | string;
  voidedAt?: Date | string | null;
  voidedByUserId?: string | null;
  voidReasonCode?: string | null;
  isAmendment?: boolean;
  amendedFromNoteId?: string | null;
  amendmentReason?: string | null;
  requiresCosign?: boolean;
  cosignedAt?: Date | string | null;
  cosignedByUserId?: string | null;
  cosignRoleSnapshot?: string | null;
  legacy?: boolean;
}) {
  const createdAt =
    row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt);
  const voidedAt =
    row.voidedAt == null
      ? null
      : row.voidedAt instanceof Date
        ? row.voidedAt.toISOString()
        : String(row.voidedAt);
  const cosignedAt =
    row.cosignedAt == null
      ? null
      : row.cosignedAt instanceof Date
        ? row.cosignedAt.toISOString()
        : String(row.cosignedAt);
  return {
    id: row.id,
    noteType: row.noteType,
    body: row.body,
    authorDisplayName: row.authorDisplayNameSnapshot ?? row.authorDisplayName ?? "—",
    authorRoleTitle: row.authorRoleSnapshot ?? row.authorRoleTitle ?? "—",
    authorUserId: row.authorUserId ?? null,
    createdAt,
    voidedAt,
    voidedByUserId: row.voidedByUserId ?? null,
    voidReasonCode: row.voidReasonCode ?? null,
    isAmendment: row.isAmendment ?? false,
    amendedFromNoteId: row.amendedFromNoteId ?? null,
    amendmentReason: row.amendmentReason ?? null,
    requiresCosign: row.requiresCosign ?? false,
    cosignedAt,
    cosignedByUserId: row.cosignedByUserId ?? null,
    cosignRoleSnapshot: row.cosignRoleSnapshot ?? null,
    ...(row.legacy ? { legacy: true as const } : {}),
  };
}

/** Sort notes chronologically for legal chart display (oldest first). */
export function sortEncounterNotesChronological<T extends { createdAt: string }>(
  notes: readonly T[]
): T[] {
  return [...notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
