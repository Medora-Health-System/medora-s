import { RoleCode } from "@prisma/client";
import {
  RXNORM_PILOT_ADMIN_ROLES,
  RXNORM_REVIEW_READ_ROLES,
  RXNORM_REVIEW_WRITE_ROLES,
} from "../rxnorm-review/rxnorm-review.roles";

export const SBV_READ_ROLES = RXNORM_REVIEW_READ_ROLES;
export const SBV_WRITE_ROLES = RXNORM_REVIEW_WRITE_ROLES;
export const SBV_ADMIN_ROLES = RXNORM_PILOT_ADMIN_ROLES;

export const SBV_PHARMACIST_ROLES = [
  RoleCode.PHARMACY,
  RoleCode.MEDICATION_REVIEWER,
  RoleCode.MEDICATION_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
] as const;

export function isSbvAdmin(roles: string[]): boolean {
  return roles.some((r) => (SBV_ADMIN_ROLES as readonly string[]).includes(r));
}
