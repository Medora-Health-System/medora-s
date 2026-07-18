import {
  RXNORM_PILOT_ADMIN_ROLES,
  RXNORM_REVIEW_READ_ROLES,
  RXNORM_REVIEW_WRITE_ROLES,
} from "../rxnorm-review/rxnorm-review.roles";

export const SE_READ_ROLES = RXNORM_REVIEW_READ_ROLES;
export const SE_WRITE_ROLES = RXNORM_REVIEW_WRITE_ROLES;
export const SE_ADMIN_ROLES = RXNORM_PILOT_ADMIN_ROLES;

export function isSeAdmin(roles: string[]): boolean {
  return roles.some((r) => (SE_ADMIN_ROLES as readonly string[]).includes(r));
}
