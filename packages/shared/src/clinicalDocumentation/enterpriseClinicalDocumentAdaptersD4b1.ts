/**
 * MEDUI.D4B.1 — Adapters from existing documentation architectures into the
 * enterprise clinical document contract. Prefer adapters over Prisma migrations.
 */

import type {
  EnterpriseClinicalDocument,
  EnterpriseClinicalDocumentCareSetting,
  EnterpriseClinicalDocumentDiscipline,
  EnterpriseClinicalDocumentLifecycleState,
} from "./enterpriseClinicalDocumentContractD4b1.js";
import { ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION } from "./enterpriseClinicalDocumentContractD4b1.js";
import { actorSnapshot } from "./enterpriseClinicalDocumentAuthorshipD4b1.js";

export type EncounterNoteAdapterInput = {
  id: string;
  encounterId: string;
  patientId: string;
  facilityId: string;
  noteType: "PROVIDER" | "NURSING" | "TECHNICIAN" | "OTHER" | string;
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
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  hospitalEpisodeId?: string | null;
  currentAssignedClinicianUserId?: string | null;
  legacy?: boolean;
};

function noteDiscipline(noteType: string): EnterpriseClinicalDocumentDiscipline {
  switch (String(noteType).toUpperCase()) {
    case "PROVIDER":
      return "PROVIDER";
    case "NURSING":
      return "NURSING";
    case "TECHNICIAN":
      return "TECHNICIAN";
    default:
      return "OTHER";
  }
}

function noteDocumentTypeId(noteType: string): string {
  switch (String(noteType).toUpperCase()) {
    case "PROVIDER":
      return "encounter_note.provider";
    case "NURSING":
      return "encounter_note.nursing";
    case "TECHNICIAN":
      return "encounter_note.technician";
    default:
      return "encounter_note.nursing";
  }
}

function noteLifecycle(note: EncounterNoteAdapterInput): EnterpriseClinicalDocumentLifecycleState {
  if (note.voidedAt) {
    return note.voidReasonCode === "ENTERED_IN_ERROR" ? "ENTERED_IN_ERROR" : "VOIDED";
  }
  if (note.isAmendment) return "AMENDED";
  if (note.requiresCosign && !note.cosignedAt) return "COSIGN_REQUIRED";
  if (note.cosignedAt) return "COSIGNED";
  // Encounter notes are durable on create (append-only) — map to SIGNED.
  return "SIGNED";
}

/** Reference adapter: EncounterNote → enterprise clinical document. */
export function adaptEncounterNoteToEnterpriseClinicalDocument(
  note: EncounterNoteAdapterInput
): EnterpriseClinicalDocument {
  const lifecycleState = noteLifecycle(note);
  const author = actorSnapshot(note.authorUserId, note.authorDisplayName, note.authorRoleTitle);
  const cosigner = note.cosignedByUserId
    ? actorSnapshot(note.cosignedByUserId, null, note.cosignRoleSnapshot)
    : null;
  const enteredInError = note.voidReasonCode === "ENTERED_IN_ERROR";
  const voided = !!note.voidedAt;
  return {
    contractVersion: ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION,
    documentId: note.id,
    sourceArchitecture: "ENCOUNTER_NOTE",
    patientId: note.patientId,
    encounterId: note.encounterId,
    hospitalEpisodeId: note.hospitalEpisodeId ?? null,
    facilityId: note.facilityId,
    careSetting: note.careSetting ?? "UNKNOWN",
    discipline: noteDiscipline(note.noteType),
    documentTypeId: noteDocumentTypeId(note.noteType),
    templateVersion: note.legacy ? "LEGACY_ER_NOTES_V1" : "MEDNOTE.2",
    creator: author,
    author,
    responsibleSigner: author,
    cosigner,
    currentAssignedClinicianUserId: note.currentAssignedClinicianUserId ?? null,
    createdAt: note.createdAt,
    serviceAt: note.createdAt,
    lastEditedAt: null,
    signedAt: note.createdAt,
    amendedAt: note.isAmendment ? note.createdAt : null,
    lifecycleState,
    structured: null,
    narrative: {
      sections: [
        {
          key: "body",
          title: "Note",
          text: note.body,
          lateEntry: false,
        },
      ],
    },
    validation: { fieldValid: note.body.trim().length > 0, issues: [] },
    completeness: {
      clinicallyComplete: note.body.trim().length > 0,
      signatureReady: note.body.trim().length > 0,
      missingIndicators: note.body.trim().length > 0 ? [] : ["body"],
      acknowledgedExceptions: [],
    },
    lineage: {
      priorVersionId: note.amendedFromNoteId ?? null,
      currentVersionId: note.id,
      supersedesId: note.amendedFromNoteId ?? null,
      amendedFromId: note.amendedFromNoteId ?? null,
      amendmentReason: note.amendmentReason ?? null,
      correctionReason: null,
      lateEntryLabeled: false,
    },
    legalRecordVisible: !voided || enteredInError,
    printExportEligible: true,
    enteredInError,
    voided,
  };
}

export type EdocEntryAdapterInput = {
  id: string;
  facilityId: string;
  encounterId: string;
  patientId: string;
  category: string;
  cardId: string;
  payloadJson: Record<string, unknown>;
  authorUserId: string;
  authorDisplayNameSnapshot: string;
  authorRoleSnapshot: string;
  createdAt: string;
  voidedAt?: string | null;
  requiresWitnessSignature?: boolean;
  witnessedAt?: string | null;
  witnessedByUserId?: string | null;
  witnessDisplayNameSnapshot?: string | null;
  witnessRoleSnapshot?: string | null;
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  hospitalEpisodeId?: string | null;
  schemaVersion?: string;
};

export function adaptEdocEntryToEnterpriseClinicalDocument(
  entry: EdocEntryAdapterInput
): EnterpriseClinicalDocument {
  const author = actorSnapshot(
    entry.authorUserId,
    entry.authorDisplayNameSnapshot,
    entry.authorRoleSnapshot
  );
  const cosigner =
    entry.witnessedByUserId != null
      ? actorSnapshot(
          entry.witnessedByUserId,
          entry.witnessDisplayNameSnapshot,
          entry.witnessRoleSnapshot
        )
      : null;
  const voided = !!entry.voidedAt;
  let lifecycleState: EnterpriseClinicalDocumentLifecycleState = "SIGNED";
  if (voided) lifecycleState = "VOIDED";
  else if (entry.requiresWitnessSignature && !entry.witnessedAt) lifecycleState = "COSIGN_REQUIRED";
  else if (entry.witnessedAt) lifecycleState = "COSIGNED";

  return {
    contractVersion: ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION,
    documentId: entry.id,
    sourceArchitecture: "EDOC_ENTRY",
    patientId: entry.patientId,
    encounterId: entry.encounterId,
    hospitalEpisodeId: entry.hospitalEpisodeId ?? null,
    facilityId: entry.facilityId,
    careSetting: entry.careSetting ?? "UNKNOWN",
    discipline: "NURSING",
    documentTypeId: "edoc.structured_entry",
    templateVersion: entry.schemaVersion ?? `EDOC:${entry.cardId}`,
    creator: author,
    author,
    responsibleSigner: author,
    cosigner,
    currentAssignedClinicianUserId: null,
    createdAt: entry.createdAt,
    serviceAt: entry.createdAt,
    lastEditedAt: null,
    signedAt: entry.createdAt,
    amendedAt: null,
    lifecycleState,
    structured: {
      schemaId: entry.cardId,
      schemaVersion: entry.schemaVersion ?? entry.cardId,
      payload: entry.payloadJson,
    },
    narrative: null,
    validation: { fieldValid: true, issues: [] },
    completeness: {
      clinicallyComplete: true,
      signatureReady: !entry.requiresWitnessSignature || !!entry.witnessedAt,
      missingIndicators:
        entry.requiresWitnessSignature && !entry.witnessedAt ? ["witness"] : [],
      acknowledgedExceptions: [],
    },
    lineage: {
      priorVersionId: null,
      currentVersionId: entry.id,
      supersedesId: null,
      amendedFromId: null,
      amendmentReason: null,
      correctionReason: null,
      lateEntryLabeled: false,
    },
    legalRecordVisible: true,
    printExportEligible: true,
    enteredInError: false,
    voided,
  };
}

export type ProviderDocumentationShellAdapterInput = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  status: "DRAFT" | "SIGNED" | string;
  signedAt?: string | null;
  signedByUserId?: string | null;
  signedByDisplayName?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  hospitalEpisodeId?: string | null;
  currentAssignedClinicianUserId?: string | null;
  narrativeText?: string | null;
};

export function adaptProviderDocumentationShellToEnterpriseClinicalDocument(
  shell: ProviderDocumentationShellAdapterInput
): EnterpriseClinicalDocument {
  const status = String(shell.status).toUpperCase();
  const lifecycleState: EnterpriseClinicalDocumentLifecycleState =
    status === "SIGNED" ? "SIGNED" : "DRAFT";
  const signer = shell.signedByUserId
    ? actorSnapshot(shell.signedByUserId, shell.signedByDisplayName, "PROVIDER")
    : null;
  const emptyAuthor = actorSnapshot(null, null, "PROVIDER");
  return {
    contractVersion: ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION,
    documentId: `provider-shell:${shell.encounterId}`,
    sourceArchitecture: "PROVIDER_DOCUMENTATION_SHELL",
    patientId: shell.patientId,
    encounterId: shell.encounterId,
    hospitalEpisodeId: shell.hospitalEpisodeId ?? null,
    facilityId: shell.facilityId,
    careSetting: shell.careSetting ?? "UNKNOWN",
    discipline: "PROVIDER",
    documentTypeId: "provider.documentation_shell",
    templateVersion: "PROVIDER_SHELL.1",
    creator: signer ?? emptyAuthor,
    author: signer ?? emptyAuthor,
    responsibleSigner: signer,
    cosigner: null,
    currentAssignedClinicianUserId: shell.currentAssignedClinicianUserId ?? null,
    createdAt: shell.createdAt ?? shell.updatedAt ?? new Date(0).toISOString(),
    serviceAt: shell.signedAt ?? null,
    lastEditedAt: shell.updatedAt ?? null,
    signedAt: shell.signedAt ?? null,
    amendedAt: null,
    lifecycleState,
    structured: null,
    narrative: shell.narrativeText
      ? { sections: [{ key: "provider_body", text: shell.narrativeText }] }
      : null,
    validation: { fieldValid: true, issues: [] },
    completeness: {
      clinicallyComplete: status === "SIGNED",
      signatureReady: status !== "SIGNED",
      missingIndicators: status === "SIGNED" ? [] : ["provider_signature"],
      acknowledgedExceptions: [],
    },
    lineage: {
      priorVersionId: null,
      currentVersionId: `provider-shell:${shell.encounterId}`,
      supersedesId: null,
      amendedFromId: null,
      amendmentReason: null,
      correctionReason: null,
      lateEntryLabeled: false,
    },
    legalRecordVisible: true,
    printExportEligible: true,
    enteredInError: false,
    voided: false,
  };
}

export type NursingAdmissionAdapterInput = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  documentationStatus: "DRAFT" | "SIGNED" | "AMENDED" | string;
  signedAt?: string | null;
  signedByUserId?: string | null;
  signedByDisplayName?: string | null;
  careSetting?: EnterpriseClinicalDocumentCareSetting | "UNKNOWN";
  hospitalEpisodeId?: string | null;
};

export function adaptNursingAdmissionToEnterpriseClinicalDocument(
  admission: NursingAdmissionAdapterInput
): EnterpriseClinicalDocument {
  const status = String(admission.documentationStatus).toUpperCase();
  let lifecycleState: EnterpriseClinicalDocumentLifecycleState = "DRAFT";
  if (status === "SIGNED") lifecycleState = "SIGNED";
  if (status === "AMENDED") lifecycleState = "AMENDED";
  const author = actorSnapshot(
    admission.signedByUserId,
    admission.signedByDisplayName,
    "NURSING"
  );
  return {
    contractVersion: ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION,
    documentId: `nursing-admission:${admission.encounterId}`,
    sourceArchitecture: "NURSING_ADMISSION",
    patientId: admission.patientId,
    encounterId: admission.encounterId,
    hospitalEpisodeId: admission.hospitalEpisodeId ?? null,
    facilityId: admission.facilityId,
    careSetting: admission.careSetting ?? "INPATIENT",
    discipline: "NURSING",
    documentTypeId: "nursing.admission_assessment",
    templateVersion: "D4A.1",
    creator: author,
    author,
    responsibleSigner: admission.signedByUserId ? author : null,
    cosigner: null,
    currentAssignedClinicianUserId: null,
    createdAt: admission.signedAt ?? new Date(0).toISOString(),
    serviceAt: admission.signedAt ?? null,
    lastEditedAt: null,
    signedAt: admission.signedAt ?? null,
    amendedAt: status === "AMENDED" ? admission.signedAt ?? null : null,
    lifecycleState,
    structured: {
      schemaId: "medSurgNursingAdmissionV1",
      schemaVersion: "D4A.1",
      payload: { documentationStatus: admission.documentationStatus },
    },
    narrative: null,
    validation: { fieldValid: true, issues: [] },
    completeness: {
      clinicallyComplete: status === "SIGNED" || status === "AMENDED",
      signatureReady: status === "DRAFT",
      missingIndicators: status === "DRAFT" ? ["nurse_signature"] : [],
      acknowledgedExceptions: [],
    },
    lineage: {
      priorVersionId: null,
      currentVersionId: `nursing-admission:${admission.encounterId}`,
      supersedesId: null,
      amendedFromId: null,
      amendmentReason: null,
      correctionReason: null,
      lateEntryLabeled: false,
    },
    legalRecordVisible: true,
    printExportEligible: true,
    enteredInError: false,
    voided: false,
  };
}

/**
 * Integrity helpers — patient/encounter reassignment forbidden after document creation.
 */
export function assertDocumentIdentityImmutable(input: {
  originalPatientId: string;
  originalEncounterId: string;
  proposedPatientId: string;
  proposedEncounterId: string;
}): { ok: true } | { ok: false; reason: "PATIENT_REASSIGNMENT" | "ENCOUNTER_REASSIGNMENT" } {
  if (input.originalPatientId !== input.proposedPatientId) {
    return { ok: false, reason: "PATIENT_REASSIGNMENT" };
  }
  if (input.originalEncounterId !== input.proposedEncounterId) {
    return { ok: false, reason: "ENCOUNTER_REASSIGNMENT" };
  }
  return { ok: true };
}
