import type { Prisma } from "@prisma/client";

/**
 * Payload `source` discriminator for append-only discharge-summary saves on EncounterClinicalEvent.
 * Mirrors existing per-domain discriminators (e.g. ER_HANDOFF_V1, NURSING_ASSESSMENT_JSON) so
 * downstream readers can filter on a stable, non-PHI marker.
 */
export const DISCHARGE_SUMMARY_CLINICAL_EVENT_SOURCE = "DISCHARGE_SUMMARY_V1" as const;

/** Stable namespace key shared with the existing flat-blob field `Encounter.dischargeSummaryJson`. */
export const DISCHARGE_SUMMARY_NAMESPACE_V1 = "dischargeSummaryV1" as const;

/**
 * Stable JSON token for shallow value comparison. Mirrors the helper used for nursing-assessment
 * namespace change detection. Postgres JSONB key order is normalized at storage; in-memory request
 * bodies may differ in key order, so this compares "as-emitted" — false positives (extra event for
 * key-order-only differences) are acceptable in an append-only design and surface as benign extra
 * audit rows; false negatives (missing event when content changed) cannot occur because two
 * structurally-different blobs always serialize to different strings.
 */
function jsonTokenForCompare(v: unknown): string {
  if (v === undefined) return "__missing__";
  if (v === null) return "null";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return "__invalid__";
    }
  }
  return JSON.stringify(v);
}

/**
 * True when the discharge-summary JSON materially changed between the previous DB blob and the
 * incoming PATCH/close payload. Used to gate clinical-event INSERTs so that a save with no content
 * change does not produce an empty audit row in the timeline.
 *
 * NOTE: This is intentionally a content-only compare — performer identity, system save time, and
 * Prisma metadata are NOT part of the namespace blob, so they cannot create false positives.
 */
export function dischargeSummarySnapshotChanged(prev: unknown, next: unknown): boolean {
  return jsonTokenForCompare(prev) !== jsonTokenForCompare(next);
}

/**
 * Performer identity captured at save time for a discharge-summary clinical event. PHI-light by
 * design: a snapshot of who documented what, when, with stable role title and pre-computed
 * initials so summary/print readers never have to re-derive them later (and so historical
 * signatures survive future user renames or role changes).
 */
export type DischargeSummaryEventPerformer = {
  performerId: string | null;
  performerDisplayName: string;
  performerRoleTitle: string;
  performerInitials: string;
};

/**
 * Append-only payload shape for a DISCHARGE_SUMMARY_SAVED clinical event.
 *
 * Stored fields:
 * - source / namespace: stable discriminators for downstream filtering.
 * - savedAt: ISO timestamp of the system save action (denormalized — the row also has its own
 *   `createdAt`, but storing it inside the JSON makes summary/print rendering self-contained).
 * - performer*: denormalized identity snapshot, immutable for this row even if the user later
 *   renames or changes role.
 * - snapshot: deep-cloned full discharge JSON at save time. Omitted when the incoming value is
 *   null/non-object (e.g. an explicit "clear discharge" action) — the event row itself still
 *   captures the clear action via `createdAt` + performer.
 *
 * Append-only by contract: there is no UPDATE counterpart and no caller path mutates these rows.
 */
export function dischargeSummarySavedEventPayload(args: {
  snapshot: unknown;
  savedAt: Date;
} & DischargeSummaryEventPerformer): Prisma.InputJsonValue {
  const base: Record<string, unknown> = {
    source: DISCHARGE_SUMMARY_CLINICAL_EVENT_SOURCE,
    namespace: DISCHARGE_SUMMARY_NAMESPACE_V1,
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
