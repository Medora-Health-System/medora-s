import { RoleCode } from "@prisma/client";
import {
  RXNORM_PILOT_ADMIN_ROLES,
  RXNORM_REVIEW_READ_ROLES,
  RXNORM_REVIEW_WRITE_ROLES,
} from "../rxnorm-review/rxnorm-review.roles";

export const RECOMMENDATION_READ_ROLES = RXNORM_REVIEW_READ_ROLES;

export const RECOMMENDATION_WRITE_ROLES = RXNORM_REVIEW_WRITE_ROLES;
export const RECOMMENDATION_ADMIN_ROLES = RXNORM_PILOT_ADMIN_ROLES;

/** Provider-facing shadow read + feedback (read-only recommendations). */
export const RECOMMENDATION_PROVIDER_ROLES = [
  RoleCode.PROVIDER,
  RoleCode.RN,
  RoleCode.PHARMACY,
  RoleCode.MEDICATION_REVIEWER,
  RoleCode.MEDICATION_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
] as const;

export function isRecommendationAdmin(roles: string[]): boolean {
  return roles.some((r) =>
    (RECOMMENDATION_ADMIN_ROLES as readonly string[]).includes(r)
  );
}

export function isRecommendationReviewer(roles: string[]): boolean {
  return roles.some(
    (r) =>
      (RECOMMENDATION_WRITE_ROLES as readonly string[]).includes(r) ||
      (RECOMMENDATION_ADMIN_ROLES as readonly string[]).includes(r)
  );
}
