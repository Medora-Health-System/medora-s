import { RoleCode } from "@prisma/client";
import {
  RXNORM_PILOT_ADMIN_ROLES,
  RXNORM_REVIEW_READ_ROLES,
  RXNORM_REVIEW_WRITE_ROLES,
} from "../rxnorm-review/rxnorm-review.roles";

export const KP_READ_ROLES = RXNORM_REVIEW_READ_ROLES;
export const KP_WRITE_ROLES = RXNORM_REVIEW_WRITE_ROLES;
export const KP_ADMIN_ROLES = RXNORM_PILOT_ADMIN_ROLES;

export const KP_REVIEWER_ROLES = [
  RoleCode.MEDICATION_REVIEWER,
  RoleCode.MEDICATION_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
] as const;

export const KP_PHARMACIST_ROLES = [
  RoleCode.PHARMACY,
  RoleCode.MEDICATION_REVIEWER,
  RoleCode.MEDICATION_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
] as const;

export const KP_MEDICAL_ROLES = [
  RoleCode.PROVIDER,
  RoleCode.MEDICATION_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
] as const;

export function isKpAdmin(roles: string[]): boolean {
  return roles.some((r) => (KP_ADMIN_ROLES as readonly string[]).includes(r));
}
