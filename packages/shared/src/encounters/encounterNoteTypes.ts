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
  /** MEDNOTE.2 — governance fields (relational notes only). */
  authorUserId?: string;
  voidedAt?: string | null;
  voidedByUserId?: string | null;
  voidReasonCode?: string | null;
  isAmendment?: boolean;
  amendedFromNoteId?: string | null;
  amendmentReason?: string | null;
  requiresCosign?: boolean;
  cosignedAt?: string | null;
  cosignedByUserId?: string | null;
  cosignRoleSnapshot?: string | null;
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
  "amendedFromNoteId",
  "amendedByUserId",
  "voidedByUserId",
  "cosignedByUserId",
  "reasonCode",
  "isAmendment",
] as const;

export type EncounterNoteAuditMetadata = {
  encounterId: string;
  patientId: string;
  noteId: string;
  noteType?: string;
  authorUserId?: string;
  authorRole?: string;
  bodyLength?: number;
  amendedFromNoteId?: string;
  amendedByUserId?: string;
  voidedByUserId?: string;
  cosignedByUserId?: string;
  reasonCode?: string;
  isAmendment?: boolean;
};

export function buildEncounterNoteAuditMetadata(
  input: EncounterNoteAuditMetadata
): EncounterNoteAuditMetadata {
  const out: EncounterNoteAuditMetadata = {
    encounterId: input.encounterId,
    patientId: input.patientId,
    noteId: input.noteId,
  };
  if (input.noteType != null) out.noteType = input.noteType;
  if (input.authorUserId != null) out.authorUserId = input.authorUserId;
  if (input.authorRole != null) out.authorRole = input.authorRole;
  if (input.bodyLength != null) out.bodyLength = input.bodyLength;
  if (input.amendedFromNoteId != null) out.amendedFromNoteId = input.amendedFromNoteId;
  if (input.amendedByUserId != null) out.amendedByUserId = input.amendedByUserId;
  if (input.voidedByUserId != null) out.voidedByUserId = input.voidedByUserId;
  if (input.cosignedByUserId != null) out.cosignedByUserId = input.cosignedByUserId;
  if (input.reasonCode != null) out.reasonCode = input.reasonCode;
  if (input.isAmendment != null) out.isAmendment = input.isAmendment;
  return out;
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
