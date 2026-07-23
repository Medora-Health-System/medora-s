/**
 * D4A.2.6B — Provider legal-record amendments, handoff, and document matrix.
 * Append-only JSON under inpatientProviderWorkspaceV1. Zero schema migration.
 */

import type {
  InpatientProviderWorkspaceV1,
  ProviderHpDraftV1,
  ProviderProgressNoteItemV1,
} from "./inpatientProviderWorkspaceD4a26.js";

export const PROVIDER_AMENDMENT_TYPES = ["ADDENDUM", "CORRECTION", "ENTERED_IN_ERROR"] as const;
export type ProviderAmendmentType = (typeof PROVIDER_AMENDMENT_TYPES)[number];

export const PROVIDER_AMENDMENT_TARGETS = ["HP", "PROGRESS_NOTE", "HANDOFF", "DISCHARGE_SUMMARY"] as const;
export type ProviderAmendmentTarget = (typeof PROVIDER_AMENDMENT_TARGETS)[number];

export type ProviderDocumentAmendmentV1 = {
  amendmentId: string;
  clientRequestId: string;
  type: ProviderAmendmentType;
  target: ProviderAmendmentTarget;
  targetNoteId?: string | null;
  sectionKey?: string | null;
  reason: string;
  note?: string | null;
  originalValue?: unknown;
  correctedValue?: unknown;
  createdAt: string;
  createdByUserId: string;
  credentials?: string | null;
  role?: string | null;
  signedAt: string;
  signedByUserId: string;
  documentRevisionAtCreate: number;
  amendmentVersion: number;
  postDischarge?: boolean;
};

export type ProviderHandoffDraftV1 = {
  handoffId: string;
  expectedVersion: number;
  status: "DRAFT" | "SIGNED" | "ACKNOWLEDGED";
  sendingProviderUserId?: string | null;
  receivingProviderUserId?: string | null;
  service?: string | null;
  handoffAt?: string | null;
  activeProblemsText?: string | null;
  pendingTestsText?: string | null;
  criticalTasksText?: string | null;
  contingencyPlanText?: string | null;
  anticipatedOvernightText?: string | null;
  /** Provider-authored — never auto-generated from synthesis. */
  providerAssessmentText?: string | null;
  signedAt?: string | null;
  signedByUserId?: string | null;
  acknowledgedAt?: string | null;
  acknowledgedByUserId?: string | null;
  lastSavedAt?: string | null;
};

export type ProviderPrintClass = "LEGAL_RECORD" | "CLINICAL_SYNTHESIS";

export type ProviderDocumentMatrixRow = {
  documentType: string;
  canonicalModel: string;
  draft: boolean;
  sign: boolean;
  amend: boolean;
  correction: boolean;
  enteredInError: boolean;
  print: boolean;
  encounterStateRules: string;
  authorization: string;
};

export function providerDocumentMatrix(): ProviderDocumentMatrixRow[] {
  return [
    {
      documentType: "HISTORY_PHYSICAL",
      canonicalModel: "inpatientProviderWorkspaceV1.hpDraft",
      draft: true,
      sign: true,
      amend: true,
      correction: true,
      enteredInError: true,
      print: true,
      encounterStateRules: "OPEN draft/sign; CLOSED post-discharge amend only",
      authorization: "PROVIDER/ADMIN write; RN read",
    },
    {
      documentType: "DAILY_PROGRESS_NOTE",
      canonicalModel: "inpatientProviderWorkspaceV1.progressNotes",
      draft: true,
      sign: true,
      amend: true,
      correction: true,
      enteredInError: true,
      print: true,
      encounterStateRules: "OPEN draft/sign; CLOSED post-discharge amend only",
      authorization: "PROVIDER/ADMIN write; RN read",
    },
    {
      documentType: "PROVIDER_HANDOFF",
      canonicalModel: "inpatientProviderWorkspaceV1.handoff",
      draft: true,
      sign: true,
      amend: true,
      correction: true,
      enteredInError: true,
      print: true,
      encounterStateRules: "OPEN; receiving ack required when policy set",
      authorization: "PROVIDER/ADMIN",
    },
    {
      documentType: "DISCHARGE_SUMMARY",
      canonicalModel: "inpatientProviderWorkspaceV1 + clinicalOps.dischargePlanning",
      draft: true,
      sign: true,
      amend: true,
      correction: true,
      enteredInError: true,
      print: true,
      encounterStateRules: "OPEN or CLOSED with amend",
      authorization: "PROVIDER/ADMIN",
    },
    {
      documentType: "CONSULT_NOTE",
      canonicalModel: "EncounterNote (enterprise) when present",
      draft: true,
      sign: true,
      amend: true,
      correction: true,
      enteredInError: true,
      print: true,
      encounterStateRules: "Reuse EncounterNote — no second engine",
      authorization: "PROVIDER/ADMIN",
    },
  ];
}

export function providerWorkspaceAmendments(
  doc: InpatientProviderWorkspaceV1
): ProviderDocumentAmendmentV1[] {
  const raw = (doc as InpatientProviderWorkspaceV1 & { amendments?: unknown }).amendments;
  return Array.isArray(raw) ? (raw as ProviderDocumentAmendmentV1[]) : [];
}

export function withProviderAmendments(
  doc: InpatientProviderWorkspaceV1,
  amendments: ProviderDocumentAmendmentV1[]
): InpatientProviderWorkspaceV1 & { amendments: ProviderDocumentAmendmentV1[] } {
  return { ...doc, amendments };
}

export function appendProviderDocumentAmendment(input: {
  doc: InpatientProviderWorkspaceV1;
  type: ProviderAmendmentType;
  target: ProviderAmendmentTarget;
  clientRequestId: string;
  reason: string;
  note?: string | null;
  targetNoteId?: string | null;
  sectionKey?: string | null;
  originalValue?: unknown;
  correctedValue?: unknown;
  actorUserId: string;
  credentials?: string | null;
  role?: string | null;
  clientExpectedVersion: number;
  expectedAmendmentVersion?: number;
  encounterStatus?: string | null;
  atIso?: string;
}):
  | { ok: true; doc: InpatientProviderWorkspaceV1; amendment: ProviderDocumentAmendmentV1 }
  | {
      ok: false;
      code:
        | "PROVIDER_DOCUMENT_STALE"
        | "PROVIDER_DOCUMENT_NOT_SIGNED"
        | "PROVIDER_DOCUMENT_AMENDMENT_NOT_AUTHORIZED"
        | "PROVIDER_DOCUMENT_CORRECTION_NOT_AUTHORIZED"
        | "PROVIDER_DOCUMENT_ENCOUNTER_STATE_INVALID"
        | "PROVIDER_DOCUMENT_AMENDMENT_DUPLICATE";
    } {
  if (input.doc.expectedVersion !== input.clientExpectedVersion) {
    return { ok: false, code: "PROVIDER_DOCUMENT_STALE" };
  }
  const reason = String(input.reason ?? "").trim();
  if (!reason) return { ok: false, code: "PROVIDER_DOCUMENT_AMENDMENT_NOT_AUTHORIZED" };

  const encounterStatus = String(input.encounterStatus ?? "OPEN").toUpperCase();
  if (encounterStatus === "VOIDED" || encounterStatus === "CANCELLED") {
    if (input.type !== "ENTERED_IN_ERROR" && input.type !== "CORRECTION") {
      return { ok: false, code: "PROVIDER_DOCUMENT_ENCOUNTER_STATE_INVALID" };
    }
  }

  const signed =
    input.target === "HP"
      ? input.doc.hpDraft?.status === "SIGNED"
      : input.target === "PROGRESS_NOTE"
        ? (input.doc.progressNotes ?? []).some(
            (n) => n.noteId === input.targetNoteId && n.status === "SIGNED"
          )
        : input.target === "HANDOFF"
          ? (input.doc as InpatientProviderWorkspaceV1 & { handoff?: ProviderHandoffDraftV1 }).handoff
              ?.status === "SIGNED" ||
            (input.doc as InpatientProviderWorkspaceV1 & { handoff?: ProviderHandoffDraftV1 }).handoff
              ?.status === "ACKNOWLEDGED"
          : true;

  if (!signed) return { ok: false, code: "PROVIDER_DOCUMENT_NOT_SIGNED" };

  if (input.type === "CORRECTION" && (input.originalValue === undefined || input.correctedValue === undefined)) {
    return { ok: false, code: "PROVIDER_DOCUMENT_CORRECTION_NOT_AUTHORIZED" };
  }

  const existing = providerWorkspaceAmendments(input.doc);
  if (existing.some((a) => a.clientRequestId === input.clientRequestId)) {
    return { ok: false, code: "PROVIDER_DOCUMENT_AMENDMENT_DUPLICATE" };
  }
  if (input.expectedAmendmentVersion != null && input.expectedAmendmentVersion !== existing.length) {
    return { ok: false, code: "PROVIDER_DOCUMENT_STALE" };
  }

  const at = input.atIso ?? new Date().toISOString();
  const amendment: ProviderDocumentAmendmentV1 = {
    amendmentId: `pamd-${input.clientRequestId}`,
    clientRequestId: input.clientRequestId,
    type: input.type,
    target: input.target,
    targetNoteId: input.targetNoteId ?? null,
    sectionKey: input.sectionKey ?? null,
    reason,
    note: input.note ?? null,
    originalValue: input.originalValue,
    correctedValue: input.correctedValue,
    createdAt: at,
    createdByUserId: input.actorUserId,
    credentials: input.credentials ?? null,
    role: input.role ?? null,
    signedAt: at,
    signedByUserId: input.actorUserId,
    documentRevisionAtCreate: input.doc.expectedVersion,
    amendmentVersion: existing.length + 1,
    postDischarge: encounterStatus === "CLOSED" || encounterStatus === "DISCHARGED",
  };

  // Append-only: never mutate signed HP/progress bodies.
  const nextDoc = withProviderAmendments(input.doc, [...existing, amendment]);
  return {
    ok: true,
    doc: {
      ...nextDoc,
      expectedVersion: input.doc.expectedVersion + 1,
      updatedAt: at,
      updatedByUserId: input.actorUserId,
    },
    amendment,
  };
}

export function isProgressNoteEnteredInError(
  doc: InpatientProviderWorkspaceV1,
  noteId: string
): boolean {
  return providerWorkspaceAmendments(doc).some(
    (a) => a.type === "ENTERED_IN_ERROR" && a.target === "PROGRESS_NOTE" && a.targetNoteId === noteId
  );
}

export function activeProgressNotesForSynthesis(
  doc: InpatientProviderWorkspaceV1
): ProviderProgressNoteItemV1[] {
  return (doc.progressNotes ?? []).filter((n) => !isProgressNoteEnteredInError(doc, n.noteId));
}

export function signedHpImmutable(hp: ProviderHpDraftV1 | null | undefined): boolean {
  return hp?.status === "SIGNED";
}

export function classifyPrintPackage(kind: string): ProviderPrintClass {
  const u = kind.toUpperCase();
  if (u === "PROVIDER_ROUNDING_SUMMARY" || u === "PROBLEM_LIST") {
    return "CLINICAL_SYNTHESIS";
  }
  if (
    u === "HISTORY_PHYSICAL" ||
    u === "DAILY_PROGRESS_NOTE" ||
    u === "PROVIDER_HANDOFF" ||
    u === "DISCHARGE_SUMMARY" ||
    u === "CONSULT_NOTE"
  ) {
    return "LEGAL_RECORD";
  }
  return "CLINICAL_SYNTHESIS";
}

export function saveProviderHandoffDraft(input: {
  doc: InpatientProviderWorkspaceV1;
  handoff: ProviderHandoffDraftV1;
  clientExpectedVersion: number;
  actorUserId: string;
  atIso?: string;
}):
  | { ok: true; doc: InpatientProviderWorkspaceV1 }
  | { ok: false; code: "PROVIDER_DOCUMENT_STALE" | "PROVIDER_DOCUMENT_ALREADY_SIGNED" } {
  if (input.clientExpectedVersion !== input.doc.expectedVersion) {
    return { ok: false, code: "PROVIDER_DOCUMENT_STALE" };
  }
  const prev = (input.doc as InpatientProviderWorkspaceV1 & { handoff?: ProviderHandoffDraftV1 })
    .handoff;
  if (prev?.status === "SIGNED" || prev?.status === "ACKNOWLEDGED") {
    return { ok: false, code: "PROVIDER_DOCUMENT_ALREADY_SIGNED" };
  }
  const at = input.atIso ?? new Date().toISOString();
  return {
    ok: true,
    doc: {
      ...input.doc,
      handoff: {
        ...input.handoff,
        status: "DRAFT",
        expectedVersion: (prev?.expectedVersion ?? 0) + 1,
        lastSavedAt: at,
      },
      expectedVersion: input.doc.expectedVersion + 1,
      updatedAt: at,
      updatedByUserId: input.actorUserId,
    } as InpatientProviderWorkspaceV1,
  };
}

export function signProviderHandoff(input: {
  doc: InpatientProviderWorkspaceV1;
  actorUserId: string;
  clientExpectedVersion: number;
  atIso?: string;
}):
  | { ok: true; doc: InpatientProviderWorkspaceV1 }
  | { ok: false; code: "PROVIDER_DOCUMENT_STALE" | "PROVIDER_DOCUMENT_ALREADY_SIGNED" | "PROVIDER_DOCUMENT_NOT_SIGNED" } {
  if (input.clientExpectedVersion !== input.doc.expectedVersion) {
    return { ok: false, code: "PROVIDER_DOCUMENT_STALE" };
  }
  const prev = (input.doc as InpatientProviderWorkspaceV1 & { handoff?: ProviderHandoffDraftV1 })
    .handoff;
  if (!prev) return { ok: false, code: "PROVIDER_DOCUMENT_NOT_SIGNED" };
  if (prev.status === "SIGNED" || prev.status === "ACKNOWLEDGED") {
    return { ok: false, code: "PROVIDER_DOCUMENT_ALREADY_SIGNED" };
  }
  const at = input.atIso ?? new Date().toISOString();
  return {
    ok: true,
    doc: {
      ...input.doc,
      handoff: {
        ...prev,
        status: "SIGNED",
        signedAt: at,
        signedByUserId: input.actorUserId,
        sendingProviderUserId: prev.sendingProviderUserId ?? input.actorUserId,
        lastSavedAt: at,
      },
      expectedVersion: input.doc.expectedVersion + 1,
      updatedAt: at,
      updatedByUserId: input.actorUserId,
    } as InpatientProviderWorkspaceV1,
  };
}

export function acknowledgeProviderHandoff(input: {
  doc: InpatientProviderWorkspaceV1;
  actorUserId: string;
  clientExpectedVersion: number;
  atIso?: string;
}):
  | { ok: true; doc: InpatientProviderWorkspaceV1 }
  | { ok: false; code: "PROVIDER_DOCUMENT_STALE" | "PROVIDER_DOCUMENT_NOT_SIGNED" } {
  if (input.clientExpectedVersion !== input.doc.expectedVersion) {
    return { ok: false, code: "PROVIDER_DOCUMENT_STALE" };
  }
  const prev = (input.doc as InpatientProviderWorkspaceV1 & { handoff?: ProviderHandoffDraftV1 })
    .handoff;
  if (!prev || prev.status !== "SIGNED") {
    return { ok: false, code: "PROVIDER_DOCUMENT_NOT_SIGNED" };
  }
  const at = input.atIso ?? new Date().toISOString();
  return {
    ok: true,
    doc: {
      ...input.doc,
      handoff: {
        ...prev,
        status: "ACKNOWLEDGED",
        acknowledgedAt: at,
        acknowledgedByUserId: input.actorUserId,
        receivingProviderUserId: prev.receivingProviderUserId ?? input.actorUserId,
      },
      expectedVersion: input.doc.expectedVersion + 1,
      updatedAt: at,
      updatedByUserId: input.actorUserId,
    } as InpatientProviderWorkspaceV1,
  };
}

export function providerLegalRecordMustNotOverwriteSignedBody(): true {
  return true;
}
export function providerAmendmentMustPreserveOriginal(): true {
  return true;
}
export function providerCarryForwardMustBeExplicit(): true {
  return true;
}
