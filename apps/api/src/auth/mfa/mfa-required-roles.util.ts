/**
 * Phase 9 — Required-MFA role policy.
 *
 * Default required roles (Phase 9A):
 *   MEDORA_SUPER_ADMIN, ADMIN, PROVIDER, PHARMACY, BILLING
 *
 * Optional override:
 *   `MFA_REQUIRED_ROLES` — comma-separated list of `RoleCode` names. Any value
 *   not present in the enum is ignored. Empty / unset uses the default.
 *
 * MFA is required if **any** active facility role of the user is in the set.
 * RN, LAB, RADIOLOGY, FRONT_DESK are intentionally not required by default.
 */

import { RoleCode } from "@prisma/client";

const DEFAULT_REQUIRED: ReadonlySet<RoleCode> = new Set<RoleCode>([
  RoleCode.MEDORA_SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.PROVIDER,
  RoleCode.PHARMACY,
  RoleCode.BILLING,
]);

export function getRequiredMfaRoles(env: NodeJS.ProcessEnv = process.env): ReadonlySet<RoleCode> {
  const raw = env.MFA_REQUIRED_ROLES?.trim();
  if (!raw) return DEFAULT_REQUIRED;
  const out = new Set<RoleCode>();
  for (const piece of raw.split(",")) {
    const code = piece.trim();
    if (!code) continue;
    if ((Object.values(RoleCode) as string[]).includes(code)) {
      out.add(code as RoleCode);
    }
  }
  return out.size > 0 ? out : DEFAULT_REQUIRED;
}

export function isMfaRequiredForRoles(
  roles: readonly { role: { code: RoleCode } | RoleCode | string }[],
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const required = getRequiredMfaRoles(env);
  for (const r of roles) {
    const code =
      typeof r.role === "string"
        ? (r.role as RoleCode)
        : (r.role as { code: RoleCode }).code;
    if (required.has(code)) return true;
  }
  return false;
}
