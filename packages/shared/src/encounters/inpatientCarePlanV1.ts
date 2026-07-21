/**
 * D3E — Multidisciplinary care plan domains.
 */

export const INPATIENT_CARE_PLAN_DISCIPLINES = [
  "GOALS",
  "NURSING",
  "PT",
  "OT",
  "RESPIRATORY",
  "CASE_MANAGEMENT",
  "DIETITIAN",
  "SOCIAL_WORK",
] as const;

export type InpatientCarePlanDiscipline = (typeof INPATIENT_CARE_PLAN_DISCIPLINES)[number];

export type InpatientCarePlanItemV1 = {
  itemId: string;
  encounterId: string;
  discipline: InpatientCarePlanDiscipline;
  goalText: string;
  status: "ACTIVE" | "MET" | "DISCONTINUED";
  updatedAt: string;
};

export function inpatientCarePlanHasActiveGoals(
  items: Array<Pick<InpatientCarePlanItemV1, "status">>
): boolean {
  return items.some((i) => i.status === "ACTIVE");
}
