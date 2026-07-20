/**
 * Production presentation helpers for Chart Certification Review.
 * No certification logic — close / auto-refresh wiring only.
 */

export const CHART_CERTIFICATION_REFRESH_EVENT = "medora:chart-certification-refresh";

/** Notify open certification panels to reload (after chart/doc/MAR/disposition saves). */
export function requestChartCertificationRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHART_CERTIFICATION_REFRESH_EVENT));
}

/**
 * Load with one automatic retry on failure.
 * Returns whether the final attempt succeeded.
 */
export async function loadWithSingleRetry(
  loadOnce: () => Promise<boolean>
): Promise<boolean> {
  const ok = await loadOnce();
  if (ok) return true;
  return loadOnce();
}
