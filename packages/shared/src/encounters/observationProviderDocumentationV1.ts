/**
 * D3D — Observation provider documentation kinds (timeline-capable).
 * Stored as encounter-scoped clinical documentation / notes — not ED MSE.
 */

export const OBSERVATION_PROVIDER_NOTE_KINDS = [
  "INITIAL",
  "PROGRESS",
  "DAILY",
  "REEVALUATION",
  "DISCHARGE",
] as const;

export type ObservationProviderNoteKind = (typeof OBSERVATION_PROVIDER_NOTE_KINDS)[number];

export function isObservationProviderNoteKind(value: unknown): value is ObservationProviderNoteKind {
  return (
    typeof value === "string" &&
    (OBSERVATION_PROVIDER_NOTE_KINDS as readonly string[]).includes(value)
  );
}

export type ObservationProviderNoteDraft = {
  kind: ObservationProviderNoteKind;
  observationEncounterId: string;
  body: string;
  authoredAt?: string | null;
};

export function validateObservationProviderNoteDraft(
  draft: ObservationProviderNoteDraft
): { ok: true } | { ok: false; reason: string } {
  if (!isObservationProviderNoteKind(draft.kind)) {
    return { ok: false, reason: "INVALID_KIND" };
  }
  if (!String(draft.observationEncounterId ?? "").trim()) {
    return { ok: false, reason: "MISSING_ENCOUNTER" };
  }
  if (!String(draft.body ?? "").trim()) {
    return { ok: false, reason: "EMPTY_BODY" };
  }
  return { ok: true };
}

export function observationProviderNoteTimelineOrder(
  kind: ObservationProviderNoteKind
): number {
  switch (kind) {
    case "INITIAL":
      return 10;
    case "PROGRESS":
      return 20;
    case "DAILY":
      return 30;
    case "REEVALUATION":
      return 40;
    case "DISCHARGE":
      return 90;
    default:
      return 50;
  }
}
