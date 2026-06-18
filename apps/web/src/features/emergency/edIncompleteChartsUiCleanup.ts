import type { EdIncompleteChartBadgeKey } from "@/features/emergency/edIncompleteChartsFilter";
import type { EdLifecycleBoardView } from "@/features/emergency/edEncounterLifecycleNavigation";

/** Certification / deficiency badges suppressed on My Incomplete Charts cards (detail lives in Review certification). */
export const INCOMPLETE_CHARTS_SUPPRESSED_BADGE_KEYS: readonly EdIncompleteChartBadgeKey[] = [
  "edLifecycle.incompleteCharts.badge.incompleteChart",
  "edLifecycle.incompleteCharts.badge.readyForClosure",
  "edLifecycle.incompleteCharts.badge.missingDocumentation",
  "edLifecycle.incompleteCharts.badge.providerSignatureNeeded",
  "edLifecycle.incompleteCharts.badge.documentationDeficiency",
  "edLifecycle.incompleteCharts.badge.billingNotReady",
  "edLifecycle.incompleteCharts.badge.readyForBilling",
  "edLifecycle.incompleteCharts.badge.ordersNotReconciled",
  "edLifecycle.incompleteCharts.badge.diagnosisMissing",
  "edLifecycle.incompleteCharts.badge.nursingDocumentationNeeded",
] as const;

export function isMyIncompleteChartsBoardView(view: EdLifecycleBoardView): boolean {
  return view === "incompleteCharts";
}

export function resolveIncompleteChartsVisibleBadgeKeys(
  badges: readonly EdIncompleteChartBadgeKey[]
): EdIncompleteChartBadgeKey[] {
  const hidden = new Set<string>(INCOMPLETE_CHARTS_SUPPRESSED_BADGE_KEYS);
  return badges.filter((key) => !hidden.has(key));
}

/** Bed occupancy chip (Occupied, etc.) — departed patients are not active census. */
export function shouldShowIncompleteChartsBedStatusChip(view: EdLifecycleBoardView): boolean {
  return !isMyIncompleteChartsBoardView(view);
}

/** Acuity chip (Monitoring / Critical / Stable) — operational board signal only. */
export function shouldShowIncompleteChartsAcuityChip(view: EdLifecycleBoardView): boolean {
  return !isMyIncompleteChartsBoardView(view);
}

/** "Assigned to you" duplicates Nurse: me / Provider: me on personalized incomplete charts. */
export function shouldShowIncompleteChartsOwnershipBadge(view: EdLifecycleBoardView): boolean {
  return !isMyIncompleteChartsBoardView(view);
}

/** Operational follow-up chips (orders pending, reassessment, LOS escalation). */
export function shouldShowIncompleteChartsOpsChips(view: EdLifecycleBoardView): boolean {
  return !isMyIncompleteChartsBoardView(view);
}
