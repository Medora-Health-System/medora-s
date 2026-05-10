/**
 * Phase 10B — read-only operational aggregates for trackboard rows (no PHI in logs).
 * Merge layer only; SQL lives in TrackboardService.
 */

export type TrackboardOperationalAggregate = {
  resultsPendingCount: number;
  criticalResultUnacknowledged: boolean;
  lastNursingReassessmentAt: string | null;
  firstDispositionDocAt: string | null;
};

export function emptyTrackboardOperationalAggregate(): TrackboardOperationalAggregate {
  return {
    resultsPendingCount: 0,
    criticalResultUnacknowledged: false,
    lastNursingReassessmentAt: null,
    firstDispositionDocAt: null,
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
