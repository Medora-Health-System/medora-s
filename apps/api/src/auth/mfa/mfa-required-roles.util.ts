/**
 * Phase 9 — Required-MFA role policy.
 *
 * Default required roles (Phase 9 patch — universal MFA):
 *   ALL Medora human-login `RoleCode` values.
 *   Specifically: MEDORA_SUPER_ADMIN, ADMIN, PROVIDER, RN, FRONT_DESK, LAB,
 *   RADIOLOGY, PHARMACY, BILLING.
 *
 * Rationale:
 *   Per regulator + pilot security review, every interactive user on the
 *   platform must complete a 2-step verification before a full session is
 *   issued. There is **no non-required role**; all `RoleCode` values are
 *   human-login roles (the schema has no `SYSTEM` role).
 *
 * Optional override:
 *   `MFA_REQUIRED_ROLES` — comma-separated list of `RoleCode` names. Any value
 *   not present in the enum is ignored. Empty / unset uses the default
 *   "all human roles" policy. The override is intentionally retained so
 *   maintenance / debugging can narrow the gate without redeploy, but
 *   production deployments should leave it **unset**.
 *
 * MFA is required if **any** active facility role of the user is in the set.
 */

import { RoleCode } from "@prisma/client";

/**
 * All `RoleCode` values are interactive (human-login). When `RoleCode` evolves,
 * `Object.values(RoleCode)` keeps this set up-to-date automatically without
 * needing a code edit.
 */
const DEFAULT_REQUIRED: ReadonlySet<RoleCode> = new Set<RoleCode>(
  Object.values(RoleCode) as RoleCode[]
);

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
