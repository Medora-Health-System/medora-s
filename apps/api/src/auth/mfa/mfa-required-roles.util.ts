/**
 * Phase 9 — Required-MFA role policy (enrollment gate before full session).
 *
 * **Default (unset `MFA_REQUIRED_ROLES`):** no role is MFA-required for
 * enrollment. Password login still issues a normal access/refresh session
 * unless `User.mfaEnabled` forces the TOTP challenge branch in `AuthService`.
 * This keeps local/CI e2e and non-MFA pilots working without weakening token
 * validation: MFA grant JWTs remain separate types rejected by `JwtStrategy`.
 *
 * **Explicit policy:** set `MFA_REQUIRED_ROLES` to a comma-separated list of
 * `RoleCode` names. Unknown tokens are ignored. If every token is invalid,
 * the set is empty (same as unset) — typos do not silently widen to “all
 * roles”. Deployments that want **universal** enrollment should list every
 * required `RoleCode` explicitly (e.g. generated from `Object.values(RoleCode)`).
 *
 * MFA enrollment is required if **any** active facility role of the user is
 * in the configured set.
 */

import { RoleCode } from "@prisma/client";

/** Empty default: opt-in via `MFA_REQUIRED_ROLES` only. */
const EMPTY_REQUIRED: ReadonlySet<RoleCode> = new Set();

export function getRequiredMfaRoles(env: NodeJS.ProcessEnv = process.env): ReadonlySet<RoleCode> {
  const raw = env.MFA_REQUIRED_ROLES?.trim();
  if (!raw) return EMPTY_REQUIRED;
  const out = new Set<RoleCode>();
  for (const piece of raw.split(",")) {
    const code = piece.trim();
    if (!code) continue;
    if ((Object.values(RoleCode) as string[]).includes(code)) {
      out.add(code as RoleCode);
    }
  }
  return out;
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
