import { RoleCode } from "@prisma/client";

/** MedicationReviewer + MedicationAdmin (+ platform/facility admins for operational access). */
export const RXNORM_REVIEW_READ_ROLES = [
  RoleCode.MEDICATION_REVIEWER,
  RoleCode.MEDICATION_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
  RoleCode.PHARMACY,
] as const;

export const RXNORM_REVIEW_WRITE_ROLES = [
  RoleCode.MEDICATION_REVIEWER,
  RoleCode.MEDICATION_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
] as const;

export const RXNORM_PILOT_ADMIN_ROLES = [
  RoleCode.MEDICATION_ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
] as const;
