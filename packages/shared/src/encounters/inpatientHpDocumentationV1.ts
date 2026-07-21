/**
 * D3E — History & Physical / progress / procedure / consult / discharge notes (domain).
 */

export const INPATIENT_NOTE_KINDS = [
  "HISTORY_AND_PHYSICAL",
  "DAILY_PROGRESS",
  "PROCEDURE_NOTE",
  "CONSULTANT_NOTE",
  "DISCHARGE_SUMMARY",
] as const;

export type InpatientNoteKind = (typeof INPATIENT_NOTE_KINDS)[number];

export const INPATIENT_NOTE_STATUSES = [
  "DRAFT",
  "SIGNED",
  "AMENDED",
  "ADDENDUM",
] as const;

export type InpatientNoteStatus = (typeof INPATIENT_NOTE_STATUSES)[number];

export type InpatientClinicalNoteV1 = {
  noteId: string;
  encounterId: string;
  kind: InpatientNoteKind;
  status: InpatientNoteStatus;
  version: number;
  authorUserId: string;
  signedAt: string | null;
  amendedFromNoteId: string | null;
  bodyPreview: string;
};

export function canAmendInpatientNote(note: Pick<InpatientClinicalNoteV1, "status">): boolean {
  return note.status === "SIGNED" || note.status === "AMENDED";
}

export function nextInpatientNoteVersion(
  current: Pick<InpatientClinicalNoteV1, "version">
): number {
  return Math.max(1, Number(current.version) || 1) + 1;
}

export function inpatientNoteKindRequiresSignature(kind: InpatientNoteKind): boolean {
  return (
    kind === "HISTORY_AND_PHYSICAL" ||
    kind === "DISCHARGE_SUMMARY" ||
    kind === "CONSULTANT_NOTE" ||
    kind === "PROCEDURE_NOTE" ||
    kind === "DAILY_PROGRESS"
  );
}
