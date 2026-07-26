/**
 * MEDUI.D4B.1 — Thin Nest-facing adapter helpers for EncounterNote reference path.
 * Does not expose unrestricted mutation; existing EncounterNotesService remains authority.
 */

import {
  adaptEncounterNoteToEnterpriseClinicalDocument,
  buildEnterpriseClinicalDocumentLegalProjection,
  orderEnterpriseClinicalDocumentVersionHistory,
  paginateEnterpriseClinicalDocumentVersionHistory,
  type EnterpriseClinicalDocument,
  type EnterpriseClinicalDocumentCareSetting,
  type EnterpriseClinicalDocumentLegalProjection,
} from "@medora/shared";

export type EncounterNoteFoundationRow = {
  id: string;
  encounterId: string;
  patientId: string;
  facilityId: string;
  noteType: string;
  body: string;
  authorUserId: string;
  authorDisplayName: string;
  authorRoleTitle: string;
  createdAt: string;
  voidedAt?: string | null;
  voidReasonCode?: string | null;
  isAmendment?: boolean;
  amendedFromNoteId?: string | null;
  amendmentReason?: string | null;
  requiresCosign?: boolean;
  cosignedAt?: string | null;
  cosignedByUserId?: string | null;
  cosignRoleSnapshot?: string | null;
  legacy?: boolean;
};

export function projectEncounterNotesAsEnterpriseClinicalDocuments(input: {
  notes: ReadonlyArray<EncounterNoteFoundationRow>;
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  hospitalEpisodeId?: string | null;
  currentAssignedClinicianUserId?: string | null;
}): EnterpriseClinicalDocument[] {
  return input.notes.map((note) =>
    adaptEncounterNoteToEnterpriseClinicalDocument({
      ...note,
      careSetting: input.careSetting,
      hospitalEpisodeId: input.hospitalEpisodeId,
      currentAssignedClinicianUserId: input.currentAssignedClinicianUserId,
    })
  );
}

export function projectEncounterNotesLegalRecords(input: {
  notes: ReadonlyArray<EncounterNoteFoundationRow>;
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  limit?: number;
  offset?: number;
}): {
  projections: EnterpriseClinicalDocumentLegalProjection[];
  total: number;
  limit: number;
  offset: number;
} {
  const docs = projectEncounterNotesAsEnterpriseClinicalDocuments({
    notes: input.notes,
    careSetting: input.careSetting,
  });
  const ordered = orderEnterpriseClinicalDocumentVersionHistory(
    docs.map((d) => ({
      documentId: d.documentId,
      createdAt: d.createdAt,
      doc: d,
    }))
  );
  const page = paginateEnterpriseClinicalDocumentVersionHistory(ordered, {
    limit: input.limit,
    offset: input.offset,
  });
  return {
    projections: page.items.map((row) => buildEnterpriseClinicalDocumentLegalProjection(row.doc)),
    total: page.total,
    limit: page.limit,
    offset: page.offset,
  };
}
