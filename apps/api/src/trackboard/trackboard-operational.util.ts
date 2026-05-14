/**
 * Phase 10B — read-only operational aggregates for trackboard rows (no PHI in logs).
 * Merge layer only; SQL lives in TrackboardService.
 */

export type TrackboardOperationalAggregate = {
  resultsPendingCount: number;
  criticalResultUnacknowledged: boolean;
  lastNursingReassessmentAt: string | null;
  /** Phase 13G-B — last PROVIDER observation reassessment event (ISO), if any. */
  lastProviderObservationReassessmentAt: string | null;
  /** Phase 13G-C — last RN observation reassessment only (ISO), if any. */
  lastRnObservationReassessmentAt: string | null;
  firstDispositionDocAt: string | null;
  /** Phase 13B — latest triage vitals reading timestamp (ISO) for observation vitals-age hints. */
  lastTriageVitalsRecordedAt: string | null;
};

export function emptyTrackboardOperationalAggregate(): TrackboardOperationalAggregate {
  return {
    resultsPendingCount: 0,
    criticalResultUnacknowledged: false,
    lastNursingReassessmentAt: null,
    lastProviderObservationReassessmentAt: null,
    lastRnObservationReassessmentAt: null,
    firstDispositionDocAt: null,
    lastTriageVitalsRecordedAt: null,
  };
}

export function mergeOperationalIntoEncounters<T extends { id: string }>(
  encounters: T[],
  byEncounterId: Map<string, TrackboardOperationalAggregate>
): Array<T & { trackboardOps: TrackboardOperationalAggregate }> {
  return encounters.map((e) => ({
    ...e,
    trackboardOps: byEncounterId.get(e.id) ?? emptyTrackboardOperationalAggregate(),
  }));
}
