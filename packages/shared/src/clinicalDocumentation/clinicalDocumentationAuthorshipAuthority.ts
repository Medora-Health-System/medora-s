/**
 * MEDUI.CP.1A / enterprise clinical authorship.
 *
 * Authors may correct their own documentation.
 * Everyone else documents forward — never overwrites another author’s content.
 *
 * Reuse this helper across clinical documentation domains (Care Plan, notes, etc.).
 */

export const CLINICAL_DOCUMENTATION_NOT_AUTHOR = "CLINICAL_DOCUMENTATION_NOT_AUTHOR" as const;
export const CARE_PLAN_COMPONENT_NOT_AUTHOR = "CARE_PLAN_COMPONENT_NOT_AUTHOR" as const;

export type ClinicalAuthorshipDenialCode =
  | typeof CLINICAL_DOCUMENTATION_NOT_AUTHOR
  | typeof CARE_PLAN_COMPONENT_NOT_AUTHOR
  | (string & {});

/**
 * True when the authenticated actor is the durable clinical author of the record.
 * Administrative role alone never satisfies this check.
 */
export function isSameClinicalAuthor(
  authorUserId: string | null | undefined,
  actorUserId: string | null | undefined
): boolean {
  const author = typeof authorUserId === "string" ? authorUserId.trim() : "";
  const actor = typeof actorUserId === "string" ? actorUserId.trim() : "";
  return Boolean(author && actor && author === actor);
}

/**
 * Server-side gate for modifying authored clinical content.
 * Callers map `code` to HTTP 403 ForbiddenException (or equivalent).
 */
export function assertSameClinicalAuthor(input: {
  authorUserId: string | null | undefined;
  actorUserId: string | null | undefined;
  /** Domain-specific denial code; defaults to CLINICAL_DOCUMENTATION_NOT_AUTHOR */
  code?: ClinicalAuthorshipDenialCode;
}): { ok: true } | { ok: false; code: ClinicalAuthorshipDenialCode } {
  if (!isSameClinicalAuthor(input.authorUserId, input.actorUserId)) {
    return { ok: false, code: input.code ?? CLINICAL_DOCUMENTATION_NOT_AUTHOR };
  }
  return { ok: true };
}
