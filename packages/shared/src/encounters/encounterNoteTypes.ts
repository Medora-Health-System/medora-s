export const ENCOUNTER_NOTE_TYPES = ["PROVIDER", "NURSING", "TECHNICIAN", "OTHER"] as const;

export type EncounterNoteType = (typeof ENCOUNTER_NOTE_TYPES)[number];

export type EncounterNoteRecord = {
  id: string;
  encounterId: string;
  noteType: EncounterNoteType;
  body: string;
  authorDisplayName: string;
  authorRoleTitle: string;
  createdAt: string;
  /** True when synthesized from legacy erNotesV1 blob (read-only). */
  legacy?: boolean;
};

export const FORBIDDEN_ENCOUNTER_NOTE_AUDIT_KEYS = [
  "body",
  "noteBody",
  "noteText",
  "clinicalNarrative",
  "patientName",
  "firstName",
  "lastName",
  "mrn",
  "chiefComplaint",
  "diagnosisText",
  "clinicalNote",
  "manualLabel",
  "hpi",
  "mdm",
  "ros",
  "procedureNarrative",
  "payerMemberId",
] as const;

/** MEDNOTE.1A — allowlisted audit metadata keys only. */
export const ALLOWED_ENCOUNTER_NOTE_AUDIT_KEYS = [
  "encounterId",
  "patientId",
  "noteId",
  "noteType",
  "authorUserId",
  "authorRole",
  "bodyLength",
] as const;

export type EncounterNoteAuditMetadata = {
  encounterId: string;
  patientId: string;
  noteId: string;
  noteType: string;
  authorUserId: string;
  authorRole: string;
  bodyLength: number;
};

export function buildEncounterNoteAuditMetadata(
  input: EncounterNoteAuditMetadata
): EncounterNoteAuditMetadata {
  return {
    encounterId: input.encounterId,
    patientId: input.patientId,
    noteId: input.noteId,
    noteType: input.noteType,
    authorUserId: input.authorUserId,
    authorRole: input.authorRole,
    bodyLength: input.bodyLength,
  };
}

export function assertEncounterNoteAuditMetadataSafe(meta: Record<string, unknown>): void {
  for (const forbidden of FORBIDDEN_ENCOUNTER_NOTE_AUDIT_KEYS) {
    if (forbidden in meta) {
      throw new Error(`Forbidden encounter note audit key: ${forbidden}`);
    }
  }
  for (const key of Object.keys(meta)) {
    if (!(ALLOWED_ENCOUNTER_NOTE_AUDIT_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Unexpected encounter note audit key: ${key}`);
    }
  }
}

export const ENCOUNTER_NOTE_BODY_MAX = 12000;

export const ENCOUNTER_NOTE_PREVIEW_MAX = 160;
