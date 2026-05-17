import type { LabRadReconciliationFlag } from "@medora/shared";
import type { analyzeLabRadWorklistItem } from "@/features/orders/labRadiologyOperationalReconciliationUi";

export function pairPassesLabRadReconciliationFilters(
  analysis: ReturnType<typeof analyzeLabRadWorklistItem>,
  filters: {
    needsReconciliation: boolean;
    adjustedTime: boolean;
    delayedWorkflow: boolean;
  }
): boolean {
  if (!filters.needsReconciliation && !filters.adjustedTime && !filters.delayedWorkflow) {
    return true;
  }
  const { flags, needsFollowUp } = analysis;
  if (filters.needsReconciliation && needsFollowUp) return true;
  if (filters.adjustedTime && flags.includes("ADJUSTED_CLINICAL_TIME")) return true;
  if (
    filters.delayedWorkflow &&
    flags.some((f: LabRadReconciliationFlag) =>
      f === "DELAYED_ORDER_TO_MILESTONE" ||
      f === "DELAYED_MILESTONE_TO_RESULT" ||
      f === "STALE_PENDING"
    )
  ) {
    return true;
  }
  return false;
}
