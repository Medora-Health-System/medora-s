/** MEDUI.MEDICATION.ENTERPRISE_MEDICATION_ADMINISTRATION_SAFETY.1 */

export const MEDICATION_FOLLOW_UP_TYPES = [
  "NONE",
  "PAIN",
  "RESPIRATORY",
  "LAB",
  "NEURO",
  "SEDATION",
  "GLUCOSE",
  "COAGULATION",
  "CUSTOM",
] as const;

export type MedicationFollowUpType = (typeof MEDICATION_FOLLOW_UP_TYPES)[number];

export const MEDICATION_ADMINISTRATION_LIFECYCLE_STATES = [
  "ORDERED",
  "VERIFIED",
  "DUE",
  "PREPARING",
  "ADMINISTERED",
  "FOLLOW_UP_REQUIRED",
  "COMPLETED",
] as const;

export type MedicationAdministrationLifecycleState =
  (typeof MEDICATION_ADMINISTRATION_LIFECYCLE_STATES)[number];

export type MedicationFollowUpPathway = "pain" | "respiratory" | "none";

export function resolveMedicationFollowUpPathwayFromType(
  followUpType: MedicationFollowUpType
): MedicationFollowUpPathway {
  if (followUpType === "RESPIRATORY") return "respiratory";
  if (followUpType === "PAIN" || followUpType === "SEDATION") return "pain";
  return "none";
}

export function resolveMedicationFollowUpTypeLabelKey(
  followUpType: MedicationFollowUpType
): string {
  return `medicationFollowUp.types.${followUpType}`;
}
