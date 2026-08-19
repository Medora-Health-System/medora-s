/**
 * MEDUI.INP.2E.1 — timeline-first MAR load policy.
 * Does not change administration APIs, persistence, or role authority.
 */

export function isMarShiftTimelineFirstPaintAuthority(input: {
  showFacilityMarShiftTimeline: boolean;
  marTabShowLegacySections: boolean;
}): boolean {
  return input.showFacilityMarShiftTimeline && !input.marTabShowLegacySections;
}

/**
 * Skip the full standalone MAR bundle (orders, administrations, pass-queue,
 * order-events, encounter) on initial inpatient/unified-timeline MAR mount.
 * Preserve the loader for ambulatory/legacy tabs and EncounterClinicalDataProvider.
 */
export function shouldSkipStandaloneInitialMarLoad(input: {
  showFacilityMarShiftTimeline: boolean;
  marTabShowLegacySections: boolean;
  useSharedClinicalData: boolean;
}): boolean {
  return (
    isMarShiftTimelineFirstPaintAuthority(input) && !input.useSharedClinicalData
  );
}

/** Correction history is not required to paint the shift timeline. */
export function shouldDeferMarCorrectionHistoryLoad(input: {
  marTabShowLegacySections: boolean;
  correctionUiOpen: boolean;
}): boolean {
  if (input.correctionUiOpen) return false;
  return !input.marTabShowLegacySections;
}

/** Allergy GET /encounters/:id is required before administer, not before first paint. */
export function shouldDeferMarAllergyEncounterFetch(input: {
  hasEncounterAllergySource: boolean;
  skipStandaloneInitialMarLoad: boolean;
}): boolean {
  if (input.hasEncounterAllergySource) return true;
  return input.skipStandaloneInitialMarLoad;
}

export function marShiftTimelineHasVisibleMedicationCell(input: {
  rows?: Array<{ cells?: Array<{ items?: unknown[] }> } | null> | null;
} | null | undefined): boolean {
  const rows = input?.rows;
  if (!Array.isArray(rows)) return false;
  return rows.some((row) =>
    (row?.cells ?? []).some((cell) => Array.isArray(cell?.items) && cell.items.length > 0)
  );
}
