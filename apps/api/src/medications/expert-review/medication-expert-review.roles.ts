import {
  RXNORM_PILOT_ADMIN_ROLES,
  RXNORM_REVIEW_READ_ROLES,
  RXNORM_REVIEW_WRITE_ROLES,
} from "../rxnorm-review/rxnorm-review.roles";

export const ER_READ_ROLES = RXNORM_REVIEW_READ_ROLES;
export const ER_WRITE_ROLES = RXNORM_REVIEW_WRITE_ROLES;
export const ER_ADMIN_ROLES = RXNORM_PILOT_ADMIN_ROLES;

export function isErAdmin(roles: string[]): boolean {
  return roles.some((r) => (ER_ADMIN_ROLES as readonly string[]).includes(r));
}
