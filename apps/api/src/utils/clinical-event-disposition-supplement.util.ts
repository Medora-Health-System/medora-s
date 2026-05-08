import type { Prisma } from "@prisma/client";

/**
 * Payload `source` discriminator for append-only ER disposition supplement saves on
 * EncounterClinicalEvent. Mirrors existing per-domain discriminators (DISCHARGE_SUMMARY_V1,
 * ADMISSION_SUMMARY_V1, ER_HANDOFF_V1, etc.) so downstream readers can filter on a stable,
 * non-PHI marker.
 */
export const DISPOSITION_SUPPLEMENT_CLINICAL_EVENT_SOURCE = "DISPOSITION_SUPPLEMENT_V1" as const;

/**
 * Stable namespace key shared with the existing flat-blob slot
 * `Encounter.nursingAssessment.erDispositionV1`. Persisted clinical content (LWBS narrative,
 * transfer handoff note, AMA risks discussed, deceased note, signature) lives there; the
 * event-row payload is a deep-cloned snapshot of the same shape at save time.
 */
export const DISPOSITION_SUPPLEMENT_NAMESPACE_V1 = "erDispositionV1" as const;

/** Read the `erDispositionV1` slice of a `nursingAssessment` JSON blob. */
function readDispositionNamespace(nursingAssessment: unknown): Record<string, unknown> | null {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return null;
  }
  const raw = (nursingAssessment as Record<string, unknown>)[DISPOSITION_SUPPLEMENT_NAMESPACE_V1];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

/**
 * Stable token for material-change comparison.
 *
 * IMPORTANT — `signature` is excluded from the comparison. The frontend re-stamps the
 * disposition signature (`savedAt` + `savedByDisplayName`) on every save so users can re-confirm
 * documentation; if signature were part of the diff, every Save click would emit a new event row
 * even when no clinical content changed (timeline noise, redundant audit volume). The signature
 * IS still stored inside `payloadJson.snapshot` so historical signatures remain immutable per
 * row; the change-detection just filters it out.
 *
 * Otherwise mirrors the reassessment material-change pattern.
 */
function dispositionSupplementMaterialToken(nursingAssessment: unknown): string {
  const ns = readDispositionNamespace(nursingAssessment);
  if (!ns) return "__missing__";
  const { signature, ...rest } = ns as Record<string, unknown> & { signature?: unknown };
  void signature;
  try {
    return JSON.stringify(rest);
  } catch {
    return "__invalid__";
  }
}

/**
 * True when the `erDispositionV1` namespace inside `nursingAssessment` materially changed
 * between the previous DB blob and the incoming PATCH payload, EXCLUDING the auto-stamped
 * `signature` sub-object.
 *
 * NOTE: false positives (key-order-only differences in clinical fields) are acceptable in an
 * append-only design and surface as benign extra audit rows; false negatives (clinical content
 * change missed) cannot occur because two structurally-different rests always serialize to
 * different strings.
 */
export function dispositionSupplementSnapshotChanged(
  prevNursingAssessment: unknown,
  nextNursingAssessment: unknown
): boolean {
  return (
    dispositionSupplementMaterialToken(prevNursingAssessment) !==
    dispositionSupplementMaterialToken(nextNursingAssessment)
  );
}

/** Pure read helper — returns the `erDispositionV1` slice or `undefined` if absent. */
export function getDispositionSupplementSnapshot(nursingAssessment: unknown): unknown {
  const ns = readDispositionNamespace(nursingAssessment);
  return ns ?? undefined;
}

/**
 * Performer identity captured at save time for an ER disposition supplement clinical event.
 * PHI-light by design: a snapshot of who documented what, when, with stable role title and
 * pre-computed initials so summary/print readers never have to re-derive them later (and so
 * historical signatures survive future user renames or role changes).
 */
export type DispositionSupplementEventPerformer = {
  performerId: string | null;
  performerDisplayName: string;
  performerRoleTitle: string;
  performerInitials: string;
};

/**
 * Append-only payload shape for a DISPOSITION_SUPPLEMENT_SAVED clinical event.
 *
 * Stored fields:
 * - source / namespace: stable discriminators for downstream filtering.
 * - savedAt: ISO timestamp of the system save action (denormalized — the row also has its own
 *   `createdAt`, but storing it inside the JSON makes summary/print rendering self-contained).
 * - performer*: denormalized identity snapshot, immutable for this row even if the user later
 *   renames or changes role.
 * - snapshot: deep-cloned full `erDispositionV1` slice at save time, INCLUDING the inline
 *   `signature` object. Omitted when the slice is absent / non-object — the event row itself
 *   still captures the action via `createdAt` + performer.
 *
 * Append-only by contract: there is no UPDATE counterpart and no caller path mutates these rows.
 */
export function dispositionSupplementSavedEventPayload(
  args: {
    snapshot: unknown;
    savedAt: Date;
  } & DispositionSupplementEventPerformer
): Prisma.InputJsonValue {
  const base: Record<string, unknown> = {
    source: DISPOSITION_SUPPLEMENT_CLINICAL_EVENT_SOURCE,
    namespace: DISPOSITION_SUPPLEMENT_NAMESPACE_V1,
    savedAt: args.savedAt.toISOString(),
    performerId: args.performerId,
    performerDisplayName: args.performerDisplayName,
    performerRoleTitle: args.performerRoleTitle,
    performerInitials: args.performerInitials,
  };
  if (args.snapshot !== undefined && args.snapshot !== null && typeof args.snapshot === "object") {
    base.snapshot = JSON.parse(JSON.stringify(args.snapshot));
  }
  return JSON.parse(JSON.stringify(base)) as Prisma.InputJsonValue;
}
