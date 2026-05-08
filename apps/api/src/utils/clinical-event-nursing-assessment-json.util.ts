import type { Prisma } from "@prisma/client";

export const NURSING_ASSESSMENT_JSON_EVENT_SOURCE = "NURSING_ASSESSMENT_JSON" as const;

export const NURSING_ASSESSMENT_NAMESPACE_ER_PROVIDER_MSE_V1 = "erProviderMseV1" as const;
export const NURSING_ASSESSMENT_NAMESPACE_NURSING_EVAL_V1 = "nursingEvalV1" as const;
/**
 * Append-only history namespace for ER nursing reassessment column events. Each save writes a
 * NURSING_ASSESSMENT_SAVED clinical event tagged with this namespace; the bedside grid reads
 * them back to reconstruct the per-shift documentation timeline. Append-only by design — the
 * event rows are never edited or deleted in normal flow (mirrors prior architectural guidance:
 * "do not retrofit the JSON object for history; use append-only event entities").
 */
export const NURSING_ASSESSMENT_NAMESPACE_ER_NURSING_REASSESSMENT_V1 =
  "erNursingReassessmentV1" as const;

/**
 * Trauma survey namespace inside `Encounter.nursingAssessment`. Co-stored alongside the
 * reassessment columns at save time, so a column event can carry the trauma snapshot too.
 */
export const NURSING_ASSESSMENT_NAMESPACE_ER_TRAUMA_SURVEY_V1 = "erTraumaSurveyV1" as const;

/** Namespace slice from full `nursingAssessment` JSON (undefined if absent / not an object root). */
export function getNursingAssessmentNamespace(nursingAssessment: unknown, namespaceKey: string): unknown {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return undefined;
  }
  return (nursingAssessment as Record<string, unknown>)[namespaceKey];
}

function jsonTokenForCompare(v: unknown): string {
  if (v === undefined) return "__missing__";
  if (typeof v === "object" && v !== null) {
    try {
      return JSON.stringify(v);
    } catch {
      return "__invalid__";
    }
  }
  return JSON.stringify(v);
}

/**
 * True when the namespace slice of `nursingAssessment` JSON changed between previous and next full blobs.
 */
export function nursingAssessmentNamespaceChanged(
  prevNursingAssessment: unknown,
  nextNursingAssessment: unknown,
  namespaceKey: string
): boolean {
  return (
    jsonTokenForCompare(getNursingAssessmentNamespace(prevNursingAssessment, namespaceKey)) !==
    jsonTokenForCompare(getNursingAssessmentNamespace(nextNursingAssessment, namespaceKey))
  );
}

/**
 * Deep-clone snapshot for Prisma JSON + standard payload shape for MSE / nursing eval save events.
 */
export function nursingAssessmentJsonSnapshotPayload(
  namespace:
    | typeof NURSING_ASSESSMENT_NAMESPACE_ER_PROVIDER_MSE_V1
    | typeof NURSING_ASSESSMENT_NAMESPACE_NURSING_EVAL_V1,
  snapshot: unknown
): Prisma.InputJsonValue {
  const base: Record<string, unknown> = {
    source: NURSING_ASSESSMENT_JSON_EVENT_SOURCE,
    namespace,
  };
  if (snapshot !== undefined && snapshot !== null && typeof snapshot === "object") {
    base.snapshot = JSON.parse(JSON.stringify(snapshot));
  }
  return JSON.parse(JSON.stringify(base)) as Prisma.InputJsonValue;
}

/**
 * Performer identity captured at save time for an ER nursing reassessment column event. PHI-light
 * by design: snapshot of who documented what, when, with stable role title and pre-computed
 * initials so the bedside grid never has to re-derive them later. `documentedAt` is the clinical
 * time of the documentation; the row's `createdAt` is the system save time (kept on the event row).
 */
export type ErNursingReassessmentEventPerformer = {
  performerId: string | null;
  performerDisplayName: string;
  performerRoleTitle: string;
  performerInitials: string;
};

/**
 * Append-only payload shape for an ER nursing reassessment column event. The `snapshot` field is
 * the FULL `erNursingReassessmentV1` blob at save time (deep-cloned). The `traumaSnapshot` field
 * is the FULL `erTraumaSurveyV1` blob at save time when present, so prior trauma documentation
 * remains visible alongside its column. Performer fields are denormalized so legacy users that
 * later get renamed/re-roled don't rewrite documentation history.
 */
export function erNursingReassessmentEventPayload(
  args: {
    snapshot: unknown;
    traumaSnapshot?: unknown;
    documentedAt: Date | null;
  } & ErNursingReassessmentEventPerformer
): Prisma.InputJsonValue {
  const base: Record<string, unknown> = {
    source: NURSING_ASSESSMENT_JSON_EVENT_SOURCE,
    namespace: NURSING_ASSESSMENT_NAMESPACE_ER_NURSING_REASSESSMENT_V1,
    documentedAt: args.documentedAt ? args.documentedAt.toISOString() : null,
    performerId: args.performerId,
    performerDisplayName: args.performerDisplayName,
    performerRoleTitle: args.performerRoleTitle,
    performerInitials: args.performerInitials,
  };
  if (args.snapshot !== undefined && args.snapshot !== null && typeof args.snapshot === "object") {
    base.snapshot = JSON.parse(JSON.stringify(args.snapshot));
  }
  if (
    args.traumaSnapshot !== undefined &&
    args.traumaSnapshot !== null &&
    typeof args.traumaSnapshot === "object"
  ) {
    base.traumaSnapshot = JSON.parse(JSON.stringify(args.traumaSnapshot));
  }
  return JSON.parse(JSON.stringify(base)) as Prisma.InputJsonValue;
}

/**
 * Compute compact two-letter initials (uppercase) from a display name. First letter of first
 * given name + first letter of last word, falling back to the first two letters of a single
 * name, falling back to "" when the input is empty / non-string. Stable, deterministic.
 */
export function computeDisplayNameInitials(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/u);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}
