/**
 * D3E — Discharge planning destinations and checklist.
 */

export const INPATIENT_DISCHARGE_DESTINATIONS = [
  "HOME",
  "REHAB",
  "SKILLED_NURSING",
  "HOSPICE",
  "LTAC",
  "TRANSFER",
  "HOME_HEALTH",
] as const;

export type InpatientDischargeDestination =
  (typeof INPATIENT_DISCHARGE_DESTINATIONS)[number];

export type InpatientDischargePlanV1 = {
  encounterId: string;
  destination: InpatientDischargeDestination | null;
  equipmentNeeded: boolean;
  followUpScheduled: boolean;
  medicationReconciliationComplete: boolean;
  homeHealthArranged: boolean;
};

export function evaluateInpatientDischargeReadiness(
  plan: InpatientDischargePlanV1
): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!plan.destination) missing.push("DESTINATION");
  if (!plan.medicationReconciliationComplete) missing.push("MEDICATION_RECONCILIATION");
  if (!plan.followUpScheduled) missing.push("FOLLOW_UP");
  if (plan.destination === "HOME_HEALTH" && !plan.homeHealthArranged) {
    missing.push("HOME_HEALTH");
  }
  return { ready: missing.length === 0, missing };
}
