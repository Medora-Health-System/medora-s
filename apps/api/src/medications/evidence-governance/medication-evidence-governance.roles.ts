import {
  RXNORM_PILOT_ADMIN_ROLES,
  RXNORM_REVIEW_READ_ROLES,
  RXNORM_REVIEW_WRITE_ROLES,
} from "../rxnorm-review/rxnorm-review.roles";

export const EG_READ_ROLES = RXNORM_REVIEW_READ_ROLES;
export const EG_WRITE_ROLES = RXNORM_REVIEW_WRITE_ROLES;
export const EG_ADMIN_ROLES = RXNORM_PILOT_ADMIN_ROLES;

export function isEgAdmin(roles: string[]): boolean {
  return roles.some((r) => (EG_ADMIN_ROLES as readonly string[]).includes(r));
}
