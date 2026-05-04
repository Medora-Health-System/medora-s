import { RoleCode } from "@prisma/client";

/**
 * S22 — RBAC tiers for admin APIs.
 * `MEDORA_SUPER_ADMIN` is not chosen from the facility Admin Users role checklist (assignable roles only);
 * an existing active assignment at the facility is preserved when roles are PATCHed.
 */

/** Facility administrators and Medora platform operators. */
export const FACILITY_OR_PLATFORM_ADMIN_ROLES: readonly RoleCode[] = [RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN];

/** Export automation, env health, backup readiness — not facility `ADMIN` alone. */
export const PLATFORM_OPERATOR_ROLES: readonly RoleCode[] = [RoleCode.MEDORA_SUPER_ADMIN];
