import {
  MEDICATION_DOSE_EXPANSION_HORIZON_MS,
  MEDICATION_DOSE_HORIZON_REPLENISH_THRESHOLD_MS,
} from "./medicationDosePassWindowDefaults.js";

/** Future coverage from `now` to the latest future dose scheduledAt (0 when none). */
export function computeMedicationDoseFutureCoverageMs(
  now: Date,
  futureScheduledAtTimes: readonly Date[]
): number {
  let maxFutureMs = 0;
  const nowMs = now.getTime();
  for (const scheduledAt of futureScheduledAtTimes) {
    const delta = scheduledAt.getTime() - nowMs;
    if (delta > maxFutureMs) maxFutureMs = delta;
  }
  return maxFutureMs;
}

/** True when rolling horizon maintenance should extend dose materialization. */
export function shouldReplenishMedicationDoseHorizon(futureCoverageMs: number): boolean {
  return futureCoverageMs < MEDICATION_DOSE_HORIZON_REPLENISH_THRESHOLD_MS;
}

/** Target maintenance horizon end — 72 hours from reference instant. */
export function resolveMedicationDoseMaintenanceHorizonEnd(
  referenceAt: Date = new Date()
): Date {
  return new Date(referenceAt.getTime() + MEDICATION_DOSE_EXPANSION_HORIZON_MS);
}

export {
  MEDICATION_DOSE_EXPANSION_HORIZON_MS,
  MEDICATION_DOSE_HORIZON_REPLENISH_THRESHOLD_MS,
};
