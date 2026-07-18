import { RoleCode } from "@prisma/client";
import {
  RXNORM_PILOT_ADMIN_ROLES,
  RXNORM_REVIEW_READ_ROLES,
  RXNORM_REVIEW_WRITE_ROLES,
} from "../rxnorm-review/rxnorm-review.roles";

export const PILOT_READ_ROLES = RXNORM_REVIEW_READ_ROLES;
export const PILOT_WRITE_ROLES = RXNORM_REVIEW_WRITE_ROLES;
export const PILOT_ADMIN_ROLES = RXNORM_PILOT_ADMIN_ROLES;
/** Approver: admin path; separation preferred (submitter ≠ approver enforced in service). */
export const PILOT_APPROVER_ROLES = [
  RoleCode.MEDICATION_ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
  RoleCode.ADMIN,
] as const;
export const PILOT_PROVIDER_ROLES = [
  RoleCode.PROVIDER,
  RoleCode.RN,
  RoleCode.PHARMACY,
  RoleCode.MEDICATION_REVIEWER,
  RoleCode.MEDICATION_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
] as const;

export function isPilotAdmin(roles: string[]): boolean {
  return roles.some((r) =>
    (PILOT_ADMIN_ROLES as readonly string[]).includes(r)
  );
}

export function isPilotApprover(roles: string[]): boolean {
  return roles.some((r) =>
    (PILOT_APPROVER_ROLES as readonly string[]).includes(r)
  );
}

export function isPilotWriter(roles: string[]): boolean {
  return roles.some((r) =>
    (PILOT_WRITE_ROLES as readonly string[]).includes(r)
  );
}
