import { RoleCode } from "@prisma/client";
import {
  RXNORM_PILOT_ADMIN_ROLES,
  RXNORM_REVIEW_READ_ROLES,
  RXNORM_REVIEW_WRITE_ROLES,
} from "../rxnorm-review/rxnorm-review.roles";

/** Phase 11 — reuse existing RoleCode values (no RoleCode expansion). */
export const SAFETY_VALIDATION_READ_ROLES = RXNORM_REVIEW_READ_ROLES;

export const SAFETY_VALIDATION_REVIEWER_ROLES = [
  RoleCode.MEDICATION_REVIEWER,
  RoleCode.PHARMACY,
  RoleCode.MEDICATION_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
] as const;

/** Adjudicator maps to medication admin / platform admin. */
export const SAFETY_VALIDATION_ADJUDICATOR_ROLES = [
  RoleCode.MEDICATION_ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
  RoleCode.ADMIN,
] as const;

export const SAFETY_VALIDATION_ADMIN_ROLES = RXNORM_PILOT_ADMIN_ROLES;

export const SAFETY_VALIDATION_WRITE_ROLES = RXNORM_REVIEW_WRITE_ROLES;

export function isSafetyValidationAdmin(roles: string[]): boolean {
  return roles.some((r) =>
    (SAFETY_VALIDATION_ADMIN_ROLES as readonly string[]).includes(r)
  );
}

export function isSafetyValidationAdjudicator(roles: string[]): boolean {
  return roles.some((r) =>
    (SAFETY_VALIDATION_ADJUDICATOR_ROLES as readonly string[]).includes(r)
  );
}

export function isSafetyValidationReviewer(roles: string[]): boolean {
  return roles.some((r) =>
    (SAFETY_VALIDATION_REVIEWER_ROLES as readonly string[]).includes(r)
  );
}
