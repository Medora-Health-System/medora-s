import {
  RXNORM_PILOT_ADMIN_ROLES,
  RXNORM_REVIEW_READ_ROLES,
  RXNORM_REVIEW_WRITE_ROLES,
} from "../rxnorm-review/rxnorm-review.roles";

export const REMEDIATION_READ_ROLES = RXNORM_REVIEW_READ_ROLES;
export const REMEDIATION_WRITE_ROLES = RXNORM_REVIEW_WRITE_ROLES;
export const REMEDIATION_ADMIN_ROLES = RXNORM_PILOT_ADMIN_ROLES;

export function isRemediationAdmin(roles: string[]): boolean {
  return roles.some((r) =>
    (REMEDIATION_ADMIN_ROLES as readonly string[]).includes(r)
  );
}
