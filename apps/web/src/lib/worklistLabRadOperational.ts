import type { LabRadReconciliationFlag, LabRadWorklistSortMode } from "@medora/shared";
import {
  compareLabRadWorklistPairs,
  pairPassesLabRadEscalationFilters,
  type LabRadEscalationFilterState,
} from "@medora/shared";
import { pairPassesLabRadReconciliationFilters } from "@/lib/worklistLabRadReconciliation";
import type { LabRadWorklistOperationalRow } from "@/features/orders/labRadiologyOperationalEscalationUi";

export type LabRadWorklistOperationalFilters = {
  needsReconciliation: boolean;
  adjustedTime: boolean;
  delayedWorkflow: boolean;
  needsEscalation: boolean;
  criticalDelay: boolean;
  awaitingResultOrFinalization: boolean;
  awaitingAcknowledgement: boolean;
  shiftHandoffReview: boolean;
  adjustedReconciled: boolean;
};

export function operationalFiltersActive(filters: LabRadWorklistOperationalFilters): boolean {
  return Object.values(filters).some(Boolean);
}

export function pairPassesLabRadOperationalFilters(
  row: LabRadWorklistOperationalRow,
  filters: LabRadWorklistOperationalFilters
): boolean {
  const reconActive =
    filters.needsReconciliation || filters.adjustedTime || filters.delayedWorkflow;
  const escActive =
    filters.needsEscalation ||
    filters.criticalDelay ||
    filters.awaitingResultOrFinalization ||
    filters.awaitingAcknowledgement ||
    filters.shiftHandoffReview ||
    filters.adjustedReconciled;

  if (!reconActive && !escActive) return true;

  let reconOk = !reconActive;
  let escOk = !escActive;

  if (reconActive) {
    reconOk = pairPassesLabRadReconciliationFilters(row.reconciliation, {
      needsReconciliation: filters.needsReconciliation,
      adjustedTime: filters.adjustedTime,
      delayedWorkflow: filters.delayedWorkflow,
    });
  }

  if (escActive) {
    const escFilters: LabRadEscalationFilterState = {
      needsEscalation: filters.needsEscalation,
      criticalDelay: filters.criticalDelay,
      awaitingResultOrFinalization: filters.awaitingResultOrFinalization,
      awaitingAcknowledgement: filters.awaitingAcknowledgement,
      shiftHandoffReview: filters.shiftHandoffReview,
      adjustedReconciled: filters.adjustedReconciled,
    };
    escOk = pairPassesLabRadEscalationFilters(
      row.escalation,
      row.reconciliation.flags as LabRadReconciliationFlag[],
      escFilters
    );
  }

  return reconOk && escOk;
}

export function sortLabRadWorklistPairs<T extends { row: LabRadWorklistOperationalRow }>(
  pairs: T[],
  mode: LabRadWorklistSortMode
): T[] {
  return [...pairs].sort((a, b) =>
    compareLabRadWorklistPairs(
      { escalation: a.row.escalation },
      { escalation: b.row.escalation },
      mode
    )
  );
}
