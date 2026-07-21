/**
 * D3D — Unified Observation clinical timeline event kinds.
 */

export const OBSERVATION_TIMELINE_KINDS = [
  "ARRIVAL",
  "PROVIDER_NOTE",
  "NURSING",
  "ORDER",
  "MEDICATION",
  "LAB",
  "IMAGING",
  "ECG",
  "CONSULT",
  "REASSESSMENT",
  "DISPOSITION",
] as const;

export type ObservationTimelineKind = (typeof OBSERVATION_TIMELINE_KINDS)[number];

export type ObservationTimelineEvent = {
  kind: ObservationTimelineKind;
  at: string;
  encounterId: string;
  label?: string | null;
};

export function sortObservationTimeline(
  events: readonly ObservationTimelineEvent[]
): ObservationTimelineEvent[] {
  return [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export function isObservationTimelineKind(value: unknown): value is ObservationTimelineKind {
  return (
    typeof value === "string" &&
    (OBSERVATION_TIMELINE_KINDS as readonly string[]).includes(value)
  );
}
