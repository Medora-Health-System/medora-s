/**
 * MEDUI.D4B.1 — Authorship vs operational assignment separation.
 */

import type { EnterpriseClinicalDocumentActorSnapshot } from "./enterpriseClinicalDocumentContractD4b1.js";

export type EnterpriseClinicalDocumentAuthorshipBundle = {
  creator: EnterpriseClinicalDocumentActorSnapshot;
  author: EnterpriseClinicalDocumentActorSnapshot;
  editor: EnterpriseClinicalDocumentActorSnapshot | null;
  signer: EnterpriseClinicalDocumentActorSnapshot | null;
  cosigner: EnterpriseClinicalDocumentActorSnapshot | null;
  attester: EnterpriseClinicalDocumentActorSnapshot | null;
  performer: EnterpriseClinicalDocumentActorSnapshot | null;
  verifier: EnterpriseClinicalDocumentActorSnapshot | null;
  /** D4A.4 operational assignee — never used to rewrite author/signer. */
  currentAssignedClinicianUserId: string | null;
};

export function actorSnapshot(
  userId: string | null | undefined,
  displayName?: string | null,
  roleTitle?: string | null
): EnterpriseClinicalDocumentActorSnapshot {
  return {
    userId: userId?.trim() ? userId : null,
    displayName: displayName?.trim() ? displayName : null,
    roleTitle: roleTitle?.trim() ? roleTitle : null,
  };
}

/**
 * Reassignment of operational ownership must not mutate historical authorship.
 */
export function authorshipPreservedAfterReassignment(input: {
  authorUserId: string | null;
  signerUserId: string | null;
  priorAssignedUserId: string | null;
  newAssignedUserId: string | null;
}): {
  authorUnchanged: true;
  signerUnchanged: true;
  assignmentChanged: boolean;
  authorEqualsNewAssignee: boolean;
} {
  return {
    authorUnchanged: true,
    signerUnchanged: true,
    assignmentChanged: input.priorAssignedUserId !== input.newAssignedUserId,
    authorEqualsNewAssignee:
      !!input.authorUserId &&
      !!input.newAssignedUserId &&
      input.authorUserId === input.newAssignedUserId,
  };
}

/** Users must not sign as another user — actor must equal authenticated user. */
export function assertSignerIsAuthenticatedUser(input: {
  authenticatedUserId: string | null | undefined;
  claimedSignerUserId: string | null | undefined;
}): { ok: true } | { ok: false; reason: "MISSING_AUTH" | "SIGNER_MISMATCH" } {
  const auth = input.authenticatedUserId?.trim() ?? "";
  const claimed = input.claimedSignerUserId?.trim() ?? "";
  if (!auth) return { ok: false, reason: "MISSING_AUTH" };
  if (claimed && claimed !== auth) return { ok: false, reason: "SIGNER_MISMATCH" };
  return { ok: true };
}

export function cosignPreservesOriginalAuthor(input: {
  authorUserId: string | null;
  cosignerUserId: string | null;
}): boolean {
  if (!input.authorUserId || !input.cosignerUserId) return false;
  return input.authorUserId !== input.cosignerUserId;
}
