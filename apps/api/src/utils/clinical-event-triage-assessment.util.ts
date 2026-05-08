import type { Prisma } from "@prisma/client";

/**
 * Payload `source` discriminator for append-only triage assessment saves on
 * EncounterClinicalEvent. Mirrors existing per-domain discriminators (DISCHARGE_SUMMARY_V1,
 * ADMISSION_SUMMARY_V1, DISPOSITION_SUPPLEMENT_V1, ER_HANDOFF_V1, etc.) so downstream readers
 * can filter on a stable, non-PHI marker.
 */
export const TRIAGE_ASSESSMENT_CLINICAL_EVENT_SOURCE = "TRIAGE_ASSESSMENT_V1" as const;

/**
 * Stable namespace key for the triage assessment append-only history. Triage flat fields are
 * stored on the `Triage` row directly (not under a JSON namespace key on the encounter) — the
 * `namespace` here is purely a payload-level discriminator and does not correspond to a JSONB
 * path inside any wider blob.
 */
export const TRIAGE_ASSESSMENT_NAMESPACE_V1 = "triageAssessmentV1" as const;

/**
 * Subset of `Triage` row fields that this event is responsible for preserving against silent
 * overwrite. Vitals are intentionally EXCLUDED — they already have their own append-only history
 * via `TriageVitalsReading` rows + `VITALS_RECORDED` clinical events. System / metadata fields
 * (`id`, `encounterId`, `facilityId`, `createdByUserId`, `updatedByUserId`, `createdAt`,
 * `updatedAt`) are excluded too — they're not clinical content.
 */
export type TriageAssessmentSnapshotInput = {
  chiefComplaint?: string | null;
  esi?: number | null;
  onsetAt?: Date | string | null;
  strokeScreen?: unknown;
  sepsisScreen?: unknown;
  triageCompleteAt?: Date | string | null;
};

/**
 * Build a normalized snapshot object containing only the clinically meaningful triage flat
 * fields. Empty-string / null / undefined / blank-trimmed values are dropped so a no-content
 * triage row produces an empty `{}` snapshot. Used for both material-change comparison AND for
 * the `payloadJson.snapshot` value in the event row.
 */
function buildTriageAssessmentSnapshot(
  input: TriageAssessmentSnapshotInput | null | undefined
): Record<string, unknown> {
  if (!input) return {};
  const out: Record<string, unknown> = {};
  if (typeof input.chiefComplaint === "string" && input.chiefComplaint.trim()) {
    out.chiefComplaint = input.chiefComplaint.trim();
  }
  if (typeof input.esi === "number" && Number.isFinite(input.esi)) {
    out.esi = input.esi;
  }
  if (input.onsetAt instanceof Date) {
    out.onsetAt = input.onsetAt.toISOString();
  } else if (typeof input.onsetAt === "string" && input.onsetAt.trim()) {
    out.onsetAt = input.onsetAt.trim();
  }
  if (
    input.strokeScreen !== undefined &&
    input.strokeScreen !== null &&
    typeof input.strokeScreen === "object"
  ) {
    out.strokeScreen = JSON.parse(JSON.stringify(input.strokeScreen));
  }
  if (
    input.sepsisScreen !== undefined &&
    input.sepsisScreen !== null &&
    typeof input.sepsisScreen === "object"
  ) {
    out.sepsisScreen = JSON.parse(JSON.stringify(input.sepsisScreen));
  }
  if (input.triageCompleteAt instanceof Date) {
    out.triageCompleteAt = input.triageCompleteAt.toISOString();
  } else if (typeof input.triageCompleteAt === "string" && input.triageCompleteAt.trim()) {
    out.triageCompleteAt = input.triageCompleteAt.trim();
  }
  return out;
}

/**
 * Stable token for material-change comparison.
 *
 * IMPORTANT — `vitalsJson` is INTENTIONALLY excluded: vitals already have their own append-only
 * history (`TriageVitalsReading` rows + `EncounterClinicalEvent.VITALS_RECORDED`). Including
 * vitals here would emit duplicate event rows.
 *
 * IMPORTANT — system / metadata fields (`updatedByUserId`, `updatedAt`, `createdByUserId`,
 * `createdAt`, `id`) are excluded: they're not clinical content and they always change on every
 * save, so including them would emit a redundant event row for every Save click even when no
 * clinical content changed.
 *
 * False positives (key-order-only differences in JSON sub-objects like strokeScreen /
 * sepsisScreen) are acceptable in an append-only design and surface as benign extra audit rows.
 * False negatives (clinical content change missed) cannot occur because two structurally-
 * different normalized snapshots always serialize to different strings.
 */
function triageAssessmentMaterialToken(input: TriageAssessmentSnapshotInput | null | undefined): string {
  const norm = buildTriageAssessmentSnapshot(input);
  if (Object.keys(norm).length === 0) return "__empty__";
  try {
    return JSON.stringify(norm);
  } catch {
    return "__invalid__";
  }
}

/**
 * True when the triage flat fields materially changed between the previous DB row and the
 * post-upsert row, EXCLUDING vitals and system metadata. Used to gate INSERTs of
 * `TRIAGE_ASSESSMENT_SAVED` events.
 */
export function triageAssessmentSnapshotChanged(
  prev: TriageAssessmentSnapshotInput | null | undefined,
  next: TriageAssessmentSnapshotInput | null | undefined
): boolean {
  return triageAssessmentMaterialToken(prev) !== triageAssessmentMaterialToken(next);
}

/**
 * Performer identity captured at save time for a triage assessment clinical event. PHI-light by
 * design: a snapshot of who documented what, when, with stable role title and pre-computed
 * initials so summary/print readers never have to re-derive them later (and so historical
 * signatures survive future user renames or role changes).
 */
export type TriageAssessmentEventPerformer = {
  performerId: string | null;
  performerDisplayName: string;
  performerRoleTitle: string;
  performerInitials: string;
};

/**
 * Append-only payload shape for a TRIAGE_ASSESSMENT_SAVED clinical event.
 *
 * Stored fields:
 * - source / namespace: stable discriminators for downstream filtering.
 * - savedAt: ISO timestamp of the system save action (denormalized — the row also has its own
 *   `createdAt`, but storing it inside the JSON makes summary/print rendering self-contained).
 * - performer*: denormalized identity snapshot, immutable for this row even if the user later
 *   renames or changes role.
 * - snapshot: normalized triage flat-field map at save time (post-upsert state, excluding
 *   vitals + system metadata). Present even when empty so readers can reconstruct the full
 *   sequence (e.g. "row was reset").
 *
 * Append-only by contract: there is no UPDATE counterpart and no caller path mutates these rows.
 */
export function triageAssessmentSavedEventPayload(
  args: {
    snapshot: TriageAssessmentSnapshotInput;
    savedAt: Date;
  } & TriageAssessmentEventPerformer
): Prisma.InputJsonValue {
  const base: Record<string, unknown> = {
    source: TRIAGE_ASSESSMENT_CLINICAL_EVENT_SOURCE,
    namespace: TRIAGE_ASSESSMENT_NAMESPACE_V1,
    savedAt: args.savedAt.toISOString(),
    performerId: args.performerId,
    performerDisplayName: args.performerDisplayName,
    performerRoleTitle: args.performerRoleTitle,
    performerInitials: args.performerInitials,
    snapshot: buildTriageAssessmentSnapshot(args.snapshot),
  };
  return JSON.parse(JSON.stringify(base)) as Prisma.InputJsonValue;
}
