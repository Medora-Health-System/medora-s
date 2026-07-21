/**
 * D3E — Inpatient clinical timeline event kinds (enterprise timeline consumer).
 */

export const INPATIENT_TIMELINE_EVENT_KINDS = [
  "NOTE",
  "ORDER",
  "LAB",
  "IMAGING",
  "CONSULT",
  "PROCEDURE",
  "MEDICATION",
  "NURSING",
  "DISCHARGE_PLANNING",
] as const;

export type InpatientTimelineEventKind = (typeof INPATIENT_TIMELINE_EVENT_KINDS)[number];

export type InpatientTimelineEventV1 = {
  eventId: string;
  encounterId: string;
  kind: InpatientTimelineEventKind;
  occurredAt: string;
  label: string;
};

export function sortInpatientTimelineEvents(
  events: InpatientTimelineEventV1[]
): InpatientTimelineEventV1[] {
  return [...events].sort((a, b) => {
    const ta = new Date(a.occurredAt).getTime();
    const tb = new Date(b.occurredAt).getTime();
    return ta - tb;
  });
}
